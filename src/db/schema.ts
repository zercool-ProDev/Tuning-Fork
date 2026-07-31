/**
 * Database schema.
 *
 * Structure follows one decision: practice history is a single append-only
 * timeline (`practiceSessions` -> `sessionSegments`), and every domain's
 * current state hangs off that timeline rather than keeping its own private
 * log. The nullable foreign keys on `sessionSegments` are what let the domains
 * talk to each other — a segment can point at the instrument, genre, EP track,
 * skill node or production project it was about.
 *
 * Everything lives in one file on purpose: the spine references the domain
 * tables and several domain tables reference sessions back, so splitting by
 * domain would mean circular imports between modules.
 */

import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The seven practice domains. Structural, so this is a real enum rather than a
 * lookup table — adding one is a deliberate migration, not a data edit.
 */
export const domainEnum = pgEnum("domain", [
  "ear_training",
  "sight_reading",
  "theory",
  "logic_production",
  "instrument",
  "genre",
  "ep",
]);

/** Curriculum path, in order. */
export const theoryStageEnum = pgEnum("theory_stage", [
  "intervals",
  "triads",
  "sevenths",
  "modes",
  "functional_harmony",
  "ii_v_i",
  "voice_leading",
]);

export const epStageEnum = pgEnum("ep_stage", [
  "idea",
  "writing",
  "arrangement",
  "tracking",
  "mixing",
  "mastering",
  "released",
]);

export const skillStatusEnum = pgEnum("skill_status", [
  "not_started",
  "in_progress",
  "done",
]);

export const repertoireStatusEnum = pgEnum("repertoire_status", [
  "learning",
  "performable",
  "polished",
]);

export const quizKindEnum = pgEnum("quiz_kind", [
  "multiple_choice",
  "short_answer",
]);

/**
 * Where a drill attempt came from. `manual` is you typing in a score from an
 * external trainer; `in_app` is reserved for the future built-in engine. Both
 * land in the same table so the accuracy trend stays continuous across the
 * switchover.
 */
export const drillSourceEnum = pgEnum("drill_source", ["manual", "in_app"]);

export const treeKindEnum = pgEnum("tree_kind", ["instrument", "logic"]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "done",
  "dropped",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "shelved",
  "finished",
]);

/* -------------------------------------------------------------------------- */
/* Infrastructure                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Key/value singletons. Used by `/api/health` to prove the app can both read
 * and write Postgres, which is the check that catches a broken deployment
 * before it looks like missing data on one device.
 */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Spine                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Singleton settings row, pinned to id = 1 by a check constraint so a second
 * row cannot be inserted by accident.
 *
 * `timezone` is load-bearing: streaks, the heatmap and "this week" are all
 * computed in this zone. Without it an 11pm session logged on a phone in a
 * different zone lands on the wrong day and silently breaks a streak.
 */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    timezone: text("timezone").notNull().default("UTC"),
    goalStartOn: date("goal_start_on"),
    goalEndOn: date("goal_end_on"),
    weeklyMinutesTarget: integer("weekly_minutes_target").notNull().default(420),
    currentFocus: text("current_focus"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("settings_singleton", sql`${table.id} = 1`)],
);

/**
 * One row per sitting. `occurredOn` is deliberately separate from `createdAt`
 * so a forgotten session can be backdated without lying about when the row was
 * written.
 */
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: serial("id").primaryKey(),
    occurredOn: date("occurred_on").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    totalMinutes: integer("total_minutes").notNull().default(0),
    energy: integer("energy"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("practice_sessions_occurred_on_idx").on(table.occurredOn),
    check(
      "practice_sessions_energy_range",
      sql`${table.energy} is null or (${table.energy} between 1 and 5)`,
    ),
  ],
);

/**
 * The unified practice log. Every domain writes here and nowhere else.
 *
 * The nullable foreign keys are the anti-silo mechanism: a segment tagged
 * `instrument` can name which instrument, an `ep` segment can name the track it
 * moved. Exactly zero or one of them is meaningful for a given domain, so they
 * are all optional rather than split into per-domain child tables.
 */
export const sessionSegments = pgTable(
  "session_segments",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" }),
    domain: domainEnum("domain").notNull(),
    minutes: integer("minutes").notNull().default(0),

    // Optional links into the domain tables. At most one is set in practice.
    instrumentId: integer("instrument_id").references(() => instruments.id, {
      onDelete: "set null",
    }),
    genreId: integer("genre_id").references(() => genres.id, {
      onDelete: "set null",
    }),
    epTrackId: integer("ep_track_id").references(() => epTracks.id, {
      onDelete: "set null",
    }),
    skillNodeId: integer("skill_node_id").references(() => skillNodes.id, {
      onDelete: "set null",
    }),
    productionProjectId: integer("production_project_id").references(
      () => productionProjects.id,
      { onDelete: "set null" },
    ),

    /** Domain-specific extras that have not yet earned a real column. */
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_segments_session_idx").on(table.sessionId),
    index("session_segments_domain_idx").on(table.domain),
  ],
);

/**
 * Reflection log. `sessionId` is nullable so a thought that arrives away from
 * the instrument still has somewhere to go.
 */
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => practiceSessions.id, {
    onDelete: "cascade",
  }),
  occurredOn: date("occurred_on").notNull(),
  whatWorked: text("what_worked"),
  whatDidnt: text("what_didnt"),
  focusNext: text("focus_next"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Ear training and sight reading                                             */
/* -------------------------------------------------------------------------- */

export const drillTypes = pgTable("drill_types", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  domain: domainEnum("domain").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * One row per completed drill run.
 *
 * Accuracy is intentionally *not* a stored generated column — it is
 * `questionsCorrect / questionsTotal` and is computed at query time, keeping
 * the first migration free of generated-column syntax risk.
 */
export const drillAttempts = pgTable(
  "drill_attempts",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => practiceSessions.id, {
      onDelete: "set null",
    }),
    drillTypeId: integer("drill_type_id")
      .notNull()
      .references(() => drillTypes.id, { onDelete: "cascade" }),
    difficulty: integer("difficulty").notNull().default(1),
    questionsTotal: integer("questions_total").notNull(),
    questionsCorrect: integer("questions_correct").notNull(),
    durationSeconds: integer("duration_seconds"),
    source: drillSourceEnum("source").notNull().default("manual"),
    occurredOn: date("occurred_on").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("drill_attempts_occurred_on_idx").on(table.occurredOn),
    index("drill_attempts_type_idx").on(table.drillTypeId),
    check(
      "drill_attempts_counts_sane",
      sql`${table.questionsTotal} > 0 and ${table.questionsCorrect} between 0 and ${table.questionsTotal}`,
    ),
    check(
      "drill_attempts_difficulty_range",
      sql`${table.difficulty} between 1 and 5`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Music theory                                                               */
/* -------------------------------------------------------------------------- */

export const theoryConcepts = pgTable("theory_concepts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  stage: theoryStageEnum("stage").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  parentId: integer("parent_id").references((): AnyPgColumn => theoryConcepts.id, {
    onDelete: "set null",
  }),
});

/** Curriculum as a graph rather than a flat ordered list. */
export const theoryPrerequisites = pgTable(
  "theory_prerequisites",
  {
    conceptId: integer("concept_id")
      .notNull()
      .references(() => theoryConcepts.id, { onDelete: "cascade" }),
    requiresConceptId: integer("requires_concept_id")
      .notNull()
      .references(() => theoryConcepts.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("theory_prerequisites_pair").on(
      table.conceptId,
      table.requiresConceptId,
    ),
    check(
      "theory_prerequisites_no_self",
      sql`${table.conceptId} <> ${table.requiresConceptId}`,
    ),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: serial("id").primaryKey(),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => theoryConcepts.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    kind: quizKindEnum("kind").notNull().default("multiple_choice"),
    /** Ordered answer options for multiple choice; null for short answer. */
    choices: jsonb("choices").$type<string[] | null>(),
    /** Accepted answer(s). Array so short-answer can allow synonyms. */
    answer: jsonb("answer").$type<string[]>().notNull(),
    explanation: text("explanation"),
    difficulty: integer("difficulty").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quiz_questions_concept_idx").on(table.conceptId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => practiceSessions.id, {
      onDelete: "set null",
    }),
    isCorrect: boolean("is_correct").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>(),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quiz_attempts_question_idx").on(table.questionId)],
);

/**
 * Spaced repetition state, scheduled per *concept* rather than per question.
 *
 * A review therefore pulls a fresh question from the concept instead of
 * re-showing one whose shape you have memorised. Coarser than per-question
 * SM-2, and deliberately so at this question volume — moving to per-question
 * later is an additive migration.
 */
export const srsItems = pgTable(
  "srs_items",
  {
    id: serial("id").primaryKey(),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => theoryConcepts.id, { onDelete: "cascade" })
      .unique(),
    easeFactor: numeric("ease_factor", { precision: 4, scale: 2 })
      .notNull()
      .default("2.50"),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueOn: date("due_on").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (table) => [index("srs_items_due_on_idx").on(table.dueOn)],
);

/* -------------------------------------------------------------------------- */
/* Instruments, skills and production                                         */
/* -------------------------------------------------------------------------- */

export const instruments = pgTable("instruments", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * One tree table serving all four instrument trees *and* the Logic Pro tree.
 * The tree UI therefore gets built once and reused five times.
 *
 * `instrumentId` is null for Logic nodes, set for instrument nodes.
 */
export const skillNodes = pgTable(
  "skill_nodes",
  {
    id: serial("id").primaryKey(),
    treeKind: treeKindEnum("tree_kind").notNull(),
    instrumentId: integer("instrument_id").references(() => instruments.id, {
      onDelete: "cascade",
    }),
    parentId: integer("parent_id").references((): AnyPgColumn => skillNodes.id, {
      onDelete: "cascade",
    }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    tier: integer("tier").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("skill_nodes_tree_idx").on(table.treeKind, table.instrumentId),
    check(
      "skill_nodes_instrument_matches_kind",
      sql`(${table.treeKind} = 'instrument' and ${table.instrumentId} is not null)
          or (${table.treeKind} = 'logic' and ${table.instrumentId} is null)`,
    ),
  ],
);

/** Current state of a skill node, plus the session that moved it. */
export const skillProgress = pgTable("skill_progress", {
  id: serial("id").primaryKey(),
  skillNodeId: integer("skill_node_id")
    .notNull()
    .references(() => skillNodes.id, { onDelete: "cascade" })
    .unique(),
  status: skillStatusEnum("status").notNull().default("not_started"),
  achievedOn: date("achieved_on"),
  sessionId: integer("session_id").references(() => practiceSessions.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Songs learned. `genreId` quietly feeds the genre map — repertoire is the
 * hardest evidence of genre coverage there is.
 */
export const repertoire = pgTable(
  "repertoire",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist"),
    genreId: integer("genre_id").references(() => genres.id, {
      onDelete: "set null",
    }),
    difficulty: integer("difficulty").notNull().default(1),
    status: repertoireStatusEnum("status").notNull().default("learning"),
    startedOn: date("started_on"),
    learnedOn: date("learned_on"),
    notes: text("notes"),
  },
  (table) => [index("repertoire_instrument_idx").on(table.instrumentId)],
);

/** Append-only, so fluency is a trend line rather than one overwritten number. */
export const fluencyRatings = pgTable(
  "fluency_ratings",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    ratedOn: date("rated_on").notNull(),
    sessionId: integer("session_id").references(() => practiceSessions.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
  },
  (table) => [
    index("fluency_ratings_instrument_idx").on(
      table.instrumentId,
      table.ratedOn,
    ),
    check("fluency_ratings_range", sql`${table.rating} between 1 and 10`),
  ],
);

/** Real Logic sessions. Links to an EP track when the project is one of them. */
export const productionProjects = pgTable("production_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  epTrackId: integer("ep_track_id").references(() => epTracks.id, {
    onDelete: "set null",
  }),
  status: projectStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Genre                                                                      */
/* -------------------------------------------------------------------------- */

export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Append-only; the grid shows the latest rating per genre. */
export const genreRatings = pgTable(
  "genre_ratings",
  {
    id: serial("id").primaryKey(),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    ratedOn: date("rated_on").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("genre_ratings_genre_idx").on(table.genreId, table.ratedOn),
    check("genre_ratings_range", sql`${table.rating} between 1 and 5`),
  ],
);

export const genreDeepDives = pgTable(
  "genre_deep_dives",
  {
    id: serial("id").primaryKey(),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
    /** First day of the month being dived into. */
    month: date("month").notNull(),
    goals: text("goals"),
    summary: text("summary"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("genre_deep_dives_month_idx").on(table.month)],
);

export const listeningNotes = pgTable(
  "listening_notes",
  {
    id: serial("id").primaryKey(),
    genreId: integer("genre_id").references(() => genres.id, {
      onDelete: "set null",
    }),
    trackTitle: text("track_title").notNull(),
    artist: text("artist"),
    url: text("url"),
    whatINoticed: text("what_i_noticed"),
    listenedOn: date("listened_on").notNull(),
    sessionId: integer("session_id").references(() => practiceSessions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("listening_notes_listened_on_idx").on(table.listenedOn)],
);

/* -------------------------------------------------------------------------- */
/* EP                                                                         */
/* -------------------------------------------------------------------------- */

export const epReleases = pgTable("ep_releases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  targetDate: date("target_date"),
  releasedOn: date("released_on"),
  notes: text("notes"),
});

export const epTracks = pgTable(
  "ep_tracks",
  {
    id: serial("id").primaryKey(),
    releaseId: integer("release_id")
      .notNull()
      .references(() => epReleases.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    stage: epStageEnum("stage").notNull().default("idea"),
    targetDate: date("target_date"),
    stageUpdatedAt: timestamp("stage_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  (table) => [unique("ep_tracks_position").on(table.releaseId, table.position)],
);

/**
 * Stage transition history.
 *
 * Current stage alone cannot tell you where you stall. This is what lets the
 * pipeline view say "tracking took three weeks, mixing has been sitting for
 * five" — which on a 12-month deadline is the number that actually matters.
 */
export const epTrackStageEvents = pgTable(
  "ep_track_stage_events",
  {
    id: serial("id").primaryKey(),
    trackId: integer("track_id")
      .notNull()
      .references(() => epTracks.id, { onDelete: "cascade" }),
    fromStage: epStageEnum("from_stage"),
    toStage: epStageEnum("to_stage").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sessionId: integer("session_id").references(() => practiceSessions.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("ep_track_stage_events_track_idx").on(table.trackId)],
);

/* -------------------------------------------------------------------------- */
/* Planner and roadmap                                                        */
/* -------------------------------------------------------------------------- */

export const practicePlans = pgTable("practice_plans", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),
  notes: text("notes"),
});

export const practicePlanItems = pgTable(
  "practice_plan_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => practicePlans.id, { onDelete: "cascade" }),
    domain: domainEnum("domain").notNull(),
    instrumentId: integer("instrument_id").references(() => instruments.id, {
      onDelete: "set null",
    }),
    targetMinutes: integer("target_minutes").notNull().default(0),
    /** 0 = Sunday. Null means "any day this week". */
    dayOfWeek: integer("day_of_week"),
    notes: text("notes"),
  },
  (table) => [
    index("practice_plan_items_plan_idx").on(table.planId),
    check(
      "practice_plan_items_dow_range",
      sql`${table.dayOfWeek} is null or (${table.dayOfWeek} between 0 and 6)`,
    ),
  ],
);

export const roadmapQuarters = pgTable("roadmap_quarters", {
  id: serial("id").primaryKey(),
  quarterIndex: integer("quarter_index").notNull().unique(),
  label: text("label").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  theme: text("theme"),
});

/**
 * The dashboard's headline number is weighted completion of these:
 *   sum(weight) filter (status = 'done') / sum(weight)
 * It only moves when something actually finishes.
 */
export const milestones = pgTable(
  "milestones",
  {
    id: serial("id").primaryKey(),
    quarterId: integer("quarter_id")
      .notNull()
      .references(() => roadmapQuarters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    domain: domainEnum("domain"),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("1"),
    status: milestoneStatusEnum("status").notNull().default("pending"),
    completedOn: date("completed_on"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("milestones_quarter_idx").on(table.quarterId)],
);
