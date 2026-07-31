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
