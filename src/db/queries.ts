import "server-only";

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { todayIn } from "@/lib/dates";

/**
 * Settings singleton. Falls back to sane defaults rather than throwing, so a
 * database that has not been seeded still renders instead of erroring.
 */
export async function getSettings() {
  const [row] = await db()
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, 1))
    .limit(1);

  return (
    row ?? {
      id: 1,
      timezone: "UTC",
      goalStartOn: null,
      goalEndOn: null,
      weeklyMinutesTarget: 420,
      currentFocus: null,
      updatedAt: new Date(),
    }
  );
}

/** Today's date in the configured timezone. */
export async function getToday() {
  const settings = await getSettings();
  return todayIn(settings.timezone);
}

export async function getInstruments() {
  return db()
    .select()
    .from(schema.instruments)
    .orderBy(asc(schema.instruments.sortOrder));
}

export async function getGenres() {
  return db().select().from(schema.genres).orderBy(asc(schema.genres.sortOrder));
}

export async function getEpTracks() {
  return db()
    .select()
    .from(schema.epTracks)
    .orderBy(asc(schema.epTracks.position));
}

export type SessionSegment = typeof schema.sessionSegments.$inferSelect;
export type PracticeSession = typeof schema.practiceSessions.$inferSelect;
export type JournalEntry = typeof schema.journalEntries.$inferSelect;

export type SessionWithDetail = PracticeSession & {
  segments: SessionSegment[];
  journal: JournalEntry | null;
};

/**
 * Recent sessions with their segments and journal entry.
 *
 * Three queries rather than one join: a join would multiply the session row by
 * its segments and need de-duplicating in JS, and at personal-tracker volumes
 * three indexed round trips are cheaper than that complexity.
 */
export async function getRecentSessions(limit = 30): Promise<SessionWithDetail[]> {
  const sessions = await db()
    .select()
    .from(schema.practiceSessions)
    .orderBy(desc(schema.practiceSessions.occurredOn), desc(schema.practiceSessions.id))
    .limit(limit);

  if (sessions.length === 0) return [];

  const ids = sessions.map((session) => session.id);

  const [segments, journals] = await Promise.all([
    db()
      .select()
      .from(schema.sessionSegments)
      .where(sql`${schema.sessionSegments.sessionId} in ${ids}`)
      .orderBy(asc(schema.sessionSegments.id)),
    db()
      .select()
      .from(schema.journalEntries)
      .where(sql`${schema.journalEntries.sessionId} in ${ids}`),
  ]);

  const segmentsBySession = new Map<number, SessionSegment[]>();
  for (const segment of segments) {
    const list = segmentsBySession.get(segment.sessionId) ?? [];
    list.push(segment);
    segmentsBySession.set(segment.sessionId, list);
  }

  const journalBySession = new Map(
    journals.filter((entry) => entry.sessionId !== null).map((entry) => [entry.sessionId!, entry]),
  );

  return sessions.map((session) => ({
    ...session,
    segments: segmentsBySession.get(session.id) ?? [],
    journal: journalBySession.get(session.id) ?? null,
  }));
}

export async function getSession(id: number): Promise<SessionWithDetail | null> {
  const [session] = await db()
    .select()
    .from(schema.practiceSessions)
    .where(eq(schema.practiceSessions.id, id))
    .limit(1);

  if (!session) return null;

  const [segments, journals] = await Promise.all([
    db()
      .select()
      .from(schema.sessionSegments)
      .where(eq(schema.sessionSegments.sessionId, id))
      .orderBy(asc(schema.sessionSegments.id)),
    db()
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.sessionId, id))
      .limit(1),
  ]);

  return { ...session, segments, journal: journals[0] ?? null };
}

/**
 * Minutes per day over a window, for streaks and the heatmap.
 * One GROUP BY over the unified log — the payoff of the single-timeline design.
 */
export async function getDailyMinutes(fromDate: string) {
  return db()
    .select({
      day: schema.practiceSessions.occurredOn,
      minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int`,
      sessions: sql<number>`count(distinct ${schema.practiceSessions.id})::int`,
    })
    .from(schema.practiceSessions)
    .leftJoin(
      schema.sessionSegments,
      eq(schema.sessionSegments.sessionId, schema.practiceSessions.id),
    )
    .where(gte(schema.practiceSessions.occurredOn, fromDate))
    .groupBy(schema.practiceSessions.occurredOn)
    .orderBy(asc(schema.practiceSessions.occurredOn));
}

/** Total minutes per domain since a date. */
export async function getMinutesByDomain(fromDate: string) {
  return db()
    .select({
      domain: schema.sessionSegments.domain,
      minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int`,
    })
    .from(schema.sessionSegments)
    .innerJoin(
      schema.practiceSessions,
      eq(schema.sessionSegments.sessionId, schema.practiceSessions.id),
    )
    .where(gte(schema.practiceSessions.occurredOn, fromDate))
    .groupBy(schema.sessionSegments.domain)
    .orderBy(desc(sql`sum(${schema.sessionSegments.minutes})`));
}

/** Days with any logged practice since a date, newest first. */
export async function getPracticeDays(fromDate: string): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ day: schema.practiceSessions.occurredOn })
    .from(schema.practiceSessions)
    .where(and(gte(schema.practiceSessions.occurredOn, fromDate)))
    .orderBy(desc(schema.practiceSessions.occurredOn));
  return rows.map((row) => row.day);
}

/* -------------------------------------------------------------------------- */
/* Skill trees, repertoire, fluency and production projects                   */
/* -------------------------------------------------------------------------- */

export type SkillNodeWithProgress = typeof schema.skillNodes.$inferSelect & {
  status: (typeof schema.skillStatusEnum.enumValues)[number];
  achievedOn: string | null;
  progressNotes: string | null;
};

export async function getInstrumentByKey(key: string) {
  const [row] = await db()
    .select()
    .from(schema.instruments)
    .where(eq(schema.instruments.key, key))
    .limit(1);
  return row ?? null;
}

/**
 * A whole tree with each node's current status.
 *
 * Left join rather than inner: a node seeded after the initial progress rows
 * were created would otherwise vanish from the tree entirely, which is a much
 * worse failure than showing it as not started.
 */
export async function getSkillTree(
  treeKind: "instrument" | "logic",
  instrumentId: number | null,
): Promise<SkillNodeWithProgress[]> {
  const rows = await db()
    .select({
      node: schema.skillNodes,
      status: schema.skillProgress.status,
      achievedOn: schema.skillProgress.achievedOn,
      notes: schema.skillProgress.notes,
    })
    .from(schema.skillNodes)
    .leftJoin(
      schema.skillProgress,
      eq(schema.skillProgress.skillNodeId, schema.skillNodes.id),
    )
    .where(
      instrumentId === null
        ? eq(schema.skillNodes.treeKind, treeKind)
        : and(
            eq(schema.skillNodes.treeKind, treeKind),
            eq(schema.skillNodes.instrumentId, instrumentId),
          ),
    )
    .orderBy(asc(schema.skillNodes.tier), asc(schema.skillNodes.sortOrder));

  return rows.map((row) => ({
    ...row.node,
    status: row.status ?? "not_started",
    achievedOn: row.achievedOn,
    progressNotes: row.notes,
  }));
}

/** Done-node counts for every tree at once, for the hub page. */
export async function getTreeProgressSummary() {
  return db()
    .select({
      treeKind: schema.skillNodes.treeKind,
      instrumentId: schema.skillNodes.instrumentId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${schema.skillProgress.status} = 'done')::int`,
      inProgress: sql<number>`count(*) filter (where ${schema.skillProgress.status} = 'in_progress')::int`,
    })
    .from(schema.skillNodes)
    .leftJoin(
      schema.skillProgress,
      eq(schema.skillProgress.skillNodeId, schema.skillNodes.id),
    )
    .groupBy(schema.skillNodes.treeKind, schema.skillNodes.instrumentId);
}

export async function getRepertoire(instrumentId: number) {
  return db()
    .select()
    .from(schema.repertoire)
    .where(eq(schema.repertoire.instrumentId, instrumentId))
    .orderBy(desc(schema.repertoire.id));
}

/** Ratings oldest first, so a trend line reads left to right. */
export async function getFluencyRatings(instrumentId: number) {
  return db()
    .select()
    .from(schema.fluencyRatings)
    .where(eq(schema.fluencyRatings.instrumentId, instrumentId))
    .orderBy(asc(schema.fluencyRatings.ratedOn), asc(schema.fluencyRatings.id));
}

/** Latest fluency rating per instrument, for the hub page. */
export async function getLatestFluency() {
  const rows = await db()
    .select({
      instrumentId: schema.fluencyRatings.instrumentId,
      rating: schema.fluencyRatings.rating,
      ratedOn: schema.fluencyRatings.ratedOn,
    })
    .from(schema.fluencyRatings)
    .orderBy(asc(schema.fluencyRatings.ratedOn), asc(schema.fluencyRatings.id));

  // Ascending order means the last write per instrument wins, i.e. the latest.
  const latest = new Map<number, { rating: number; ratedOn: string }>();
  for (const row of rows) {
    latest.set(row.instrumentId, { rating: row.rating, ratedOn: row.ratedOn });
  }
  return latest;
}

export async function getProductionProjects() {
  return db()
    .select()
    .from(schema.productionProjects)
    .orderBy(desc(schema.productionProjects.id));
}

/** Minutes logged against a tree's domain, for the "time invested" line. */
export async function getInstrumentMinutes(instrumentId: number) {
  const [row] = await db()
    .select({ minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int` })
    .from(schema.sessionSegments)
    .where(eq(schema.sessionSegments.instrumentId, instrumentId));
  return row?.minutes ?? 0;
}

export async function getDomainMinutes(domain: (typeof schema.domainEnum.enumValues)[number]) {
  const [row] = await db()
    .select({ minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int` })
    .from(schema.sessionSegments)
    .where(eq(schema.sessionSegments.domain, domain));
  return row?.minutes ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Drills: ear training and sight reading                                     */
/* -------------------------------------------------------------------------- */

export type DrillType = typeof schema.drillTypes.$inferSelect;
export type DrillAttempt = typeof schema.drillAttempts.$inferSelect;

export async function getDrillTypes() {
  return db()
    .select()
    .from(schema.drillTypes)
    .orderBy(asc(schema.drillTypes.sortOrder));
}

export async function getDrillTypeByKey(key: string) {
  const [row] = await db()
    .select()
    .from(schema.drillTypes)
    .where(eq(schema.drillTypes.key, key))
    .limit(1);
  return row ?? null;
}

/** Attempts oldest first, so a trend line and the window comparison read forward. */
export async function getDrillAttempts(drillTypeId: number, limit = 200) {
  const rows = await db()
    .select()
    .from(schema.drillAttempts)
    .where(eq(schema.drillAttempts.drillTypeId, drillTypeId))
    .orderBy(desc(schema.drillAttempts.occurredOn), desc(schema.drillAttempts.id))
    .limit(limit);
  return rows.reverse();
}

/**
 * Per-drill-type totals for the hub, in one query rather than one per type.
 * Weighted accuracy, matching lib/accuracy so the two never disagree.
 */
export async function getDrillSummary() {
  const rows = await db()
    .select({
      drillTypeId: schema.drillAttempts.drillTypeId,
      attempts: sql<number>`count(*)::int`,
      totalQuestions: sql<number>`sum(${schema.drillAttempts.questionsTotal})::int`,
      totalCorrect: sql<number>`sum(${schema.drillAttempts.questionsCorrect})::int`,
      lastOn: sql<string | null>`max(${schema.drillAttempts.occurredOn})`,
      bestDifficulty: sql<number>`max(${schema.drillAttempts.difficulty})::int`,
    })
    .from(schema.drillAttempts)
    .groupBy(schema.drillAttempts.drillTypeId);

  return new Map(rows.map((row) => [row.drillTypeId, row]));
}

/** Recent attempts across every drill type, for the drills hub. */
export async function getRecentDrillAttempts(limit = 8) {
  return db()
    .select({
      attempt: schema.drillAttempts,
      drillName: schema.drillTypes.name,
      drillKey: schema.drillTypes.key,
    })
    .from(schema.drillAttempts)
    .innerJoin(
      schema.drillTypes,
      eq(schema.drillTypes.id, schema.drillAttempts.drillTypeId),
    )
    .orderBy(desc(schema.drillAttempts.occurredOn), desc(schema.drillAttempts.id))
    .limit(limit);
}

/* -------------------------------------------------------------------------- */
/* Theory: curriculum, quizzes and spaced repetition                          */
/* -------------------------------------------------------------------------- */

export type TheoryConcept = typeof schema.theoryConcepts.$inferSelect;
export type SrsItem = typeof schema.srsItems.$inferSelect;

export type ConceptWithSrs = TheoryConcept & {
  easeFactor: number | null;
  intervalDays: number | null;
  repetitions: number | null;
  lapses: number;
  dueOn: string | null;
  lastReviewedAt: Date | null;
  questionCount: number;
};

/**
 * The whole curriculum with each concept's schedule state.
 *
 * Left join on srs_items: a concept never studied has no row yet, and should
 * appear as new rather than disappear from the curriculum.
 */
export async function getCurriculum(): Promise<ConceptWithSrs[]> {
  const rows = await db()
    .select({
      concept: schema.theoryConcepts,
      easeFactor: schema.srsItems.easeFactor,
      intervalDays: schema.srsItems.intervalDays,
      repetitions: schema.srsItems.repetitions,
      lapses: schema.srsItems.lapses,
      dueOn: schema.srsItems.dueOn,
      lastReviewedAt: schema.srsItems.lastReviewedAt,
      questionCount: sql<number>`(
        select count(*)::int from quiz_questions q
        where q.concept_id = ${schema.theoryConcepts.id}
      )`,
    })
    .from(schema.theoryConcepts)
    .leftJoin(schema.srsItems, eq(schema.srsItems.conceptId, schema.theoryConcepts.id))
    .orderBy(asc(schema.theoryConcepts.orderIndex));

  return rows.map((row) => ({
    ...row.concept,
    easeFactor: row.easeFactor === null ? null : Number(row.easeFactor),
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
    lapses: row.lapses ?? 0,
    dueOn: row.dueOn,
    lastReviewedAt: row.lastReviewedAt,
    questionCount: row.questionCount,
  }));
}

export async function getConceptBySlug(slug: string) {
  const [row] = await db()
    .select()
    .from(schema.theoryConcepts)
    .where(eq(schema.theoryConcepts.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getPrerequisites(conceptId: number) {
  return db()
    .select({ id: schema.theoryConcepts.id, title: schema.theoryConcepts.title, slug: schema.theoryConcepts.slug })
    .from(schema.theoryPrerequisites)
    .innerJoin(
      schema.theoryConcepts,
      eq(schema.theoryConcepts.id, schema.theoryPrerequisites.requiresConceptId),
    )
    .where(eq(schema.theoryPrerequisites.conceptId, conceptId));
}

export async function getQuestionsForConcept(conceptId: number) {
  return db()
    .select()
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.conceptId, conceptId))
    .orderBy(asc(schema.quizQuestions.id));
}

/**
 * Pick a question for a review, preferring ones answered least recently.
 *
 * Per-concept scheduling only pays off if the question varies; always serving
 * the lowest id would recreate the per-question memorisation the design was
 * meant to avoid.
 */
export async function pickQuestionForConcept(conceptId: number) {
  const [row] = await db()
    .select({
      question: schema.quizQuestions,
      lastAnswered: sql<string | null>`(
        select max(a.answered_at)::text from quiz_attempts a
        where a.question_id = ${schema.quizQuestions.id}
      )`,
    })
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.conceptId, conceptId))
    .orderBy(sql`(
      select max(a.answered_at) from quiz_attempts a
      where a.question_id = ${schema.quizQuestions.id}
    ) asc nulls first`, sql`random()`)
    .limit(1);

  return row?.question ?? null;
}

/** Concepts due for review today or earlier, plus never-studied ones. */
export async function getReviewQueue(today: string): Promise<ConceptWithSrs[]> {
  const curriculum = await getCurriculum();
  return curriculum.filter(
    (concept) =>
      concept.questionCount > 0 &&
      (concept.dueOn === null || concept.dueOn <= today),
  );
}

export async function getQuizStats() {
  const [row] = await db()
    .select({
      attempts: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${schema.quizAttempts.isCorrect})::int`,
    })
    .from(schema.quizAttempts);
  return row ?? { attempts: 0, correct: 0 };
}
