-- Tuning Fork: complete database setup.
--
-- Paste this whole file into the Neon SQL editor and run it once.
-- Creates every table, loads the reference content, and records the
-- migrations as applied so a later `npm run db:migrate` agrees with it.
--
-- Generated from drizzle/*.sql + drizzle/seed.sql. Do not edit by hand.

BEGIN;

-- ===== migration: 0000_fantastic_whirlwind =====
CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ===== migration: 0001_init_tracker =====
CREATE TYPE "public"."domain" AS ENUM('ear_training', 'sight_reading', 'theory', 'logic_production', 'instrument', 'genre', 'ep');
CREATE TYPE "public"."drill_source" AS ENUM('manual', 'in_app');
CREATE TYPE "public"."ep_stage" AS ENUM('idea', 'writing', 'arrangement', 'tracking', 'mixing', 'mastering', 'released');
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'in_progress', 'done', 'dropped');
CREATE TYPE "public"."project_status" AS ENUM('active', 'shelved', 'finished');
CREATE TYPE "public"."quiz_kind" AS ENUM('multiple_choice', 'short_answer');
CREATE TYPE "public"."repertoire_status" AS ENUM('learning', 'performable', 'polished');
CREATE TYPE "public"."skill_status" AS ENUM('not_started', 'in_progress', 'done');
CREATE TYPE "public"."theory_stage" AS ENUM('intervals', 'triads', 'sevenths', 'modes', 'functional_harmony', 'ii_v_i', 'voice_leading');
CREATE TYPE "public"."tree_kind" AS ENUM('instrument', 'logic');
CREATE TABLE "drill_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"drill_type_id" integer NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"questions_total" integer NOT NULL,
	"questions_correct" integer NOT NULL,
	"duration_seconds" integer,
	"source" "drill_source" DEFAULT 'manual' NOT NULL,
	"occurred_on" date NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drill_attempts_counts_sane" CHECK ("drill_attempts"."questions_total" > 0 and "drill_attempts"."questions_correct" between 0 and "drill_attempts"."questions_total"),
	CONSTRAINT "drill_attempts_difficulty_range" CHECK ("drill_attempts"."difficulty" between 1 and 5)
);

CREATE TABLE "drill_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"domain" "domain" NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "drill_types_key_unique" UNIQUE("key")
);

CREATE TABLE "ep_releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"target_date" date,
	"released_on" date,
	"notes" text
);

CREATE TABLE "ep_track_stage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"from_stage" "ep_stage",
	"to_stage" "ep_stage" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" integer
);

CREATE TABLE "ep_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"stage" "ep_stage" DEFAULT 'idea' NOT NULL,
	"target_date" date,
	"stage_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "ep_tracks_position" UNIQUE("release_id","position")
);

CREATE TABLE "fluency_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"rated_on" date NOT NULL,
	"session_id" integer,
	"notes" text,
	CONSTRAINT "fluency_ratings_range" CHECK ("fluency_ratings"."rating" between 1 and 10)
);

CREATE TABLE "genre_deep_dives" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" integer NOT NULL,
	"month" date NOT NULL,
	"goals" text,
	"summary" text,
	"completed_at" timestamp with time zone
);

CREATE TABLE "genre_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"rated_on" date NOT NULL,
	"notes" text,
	CONSTRAINT "genre_ratings_range" CHECK ("genre_ratings"."rating" between 1 and 5)
);

CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "genres_key_unique" UNIQUE("key")
);

CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "instruments_key_unique" UNIQUE("key")
);

CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"occurred_on" date NOT NULL,
	"what_worked" text,
	"what_didnt" text,
	"focus_next" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "listening_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" integer,
	"track_title" text NOT NULL,
	"artist" text,
	"url" text,
	"what_i_noticed" text,
	"listened_on" date NOT NULL,
	"session_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"quarter_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" "domain",
	"weight" numeric(5, 2) DEFAULT '1' NOT NULL,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"completed_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "practice_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"domain" "domain" NOT NULL,
	"instrument_id" integer,
	"target_minutes" integer DEFAULT 0 NOT NULL,
	"day_of_week" integer,
	"notes" text,
	CONSTRAINT "practice_plan_items_dow_range" CHECK ("practice_plan_items"."day_of_week" is null or ("practice_plan_items"."day_of_week" between 0 and 6))
);

CREATE TABLE "practice_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"notes" text,
	CONSTRAINT "practice_plans_week_start_unique" UNIQUE("week_start")
);

CREATE TABLE "practice_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_on" date NOT NULL,
	"started_at" timestamp with time zone,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"energy" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_sessions_energy_range" CHECK ("practice_sessions"."energy" is null or ("practice_sessions"."energy" between 1 and 5))
);

CREATE TABLE "production_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ep_track_id" integer,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"session_id" integer,
	"is_correct" boolean NOT NULL,
	"response" jsonb,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"kind" "quiz_kind" DEFAULT 'multiple_choice' NOT NULL,
	"choices" jsonb,
	"answer" jsonb NOT NULL,
	"explanation" text,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "repertoire" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"genre_id" integer,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"status" "repertoire_status" DEFAULT 'learning' NOT NULL,
	"started_on" date,
	"learned_on" date,
	"notes" text
);

CREATE TABLE "roadmap_quarters" (
	"id" serial PRIMARY KEY NOT NULL,
	"quarter_index" integer NOT NULL,
	"label" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"theme" text,
	CONSTRAINT "roadmap_quarters_quarter_index_unique" UNIQUE("quarter_index")
);

CREATE TABLE "session_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"domain" "domain" NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"instrument_id" integer,
	"genre_id" integer,
	"ep_track_id" integer,
	"skill_node_id" integer,
	"production_project_id" integer,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"goal_start_on" date,
	"goal_end_on" date,
	"weekly_minutes_target" integer DEFAULT 420 NOT NULL,
	"current_focus" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);

CREATE TABLE "skill_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tree_kind" "tree_kind" NOT NULL,
	"instrument_id" integer,
	"parent_id" integer,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tier" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skill_nodes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "skill_nodes_instrument_matches_kind" CHECK (("skill_nodes"."tree_kind" = 'instrument' and "skill_nodes"."instrument_id" is not null)
          or ("skill_nodes"."tree_kind" = 'logic' and "skill_nodes"."instrument_id" is null))
);

CREATE TABLE "skill_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill_node_id" integer NOT NULL,
	"status" "skill_status" DEFAULT 'not_started' NOT NULL,
	"achieved_on" date,
	"session_id" integer,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_progress_skill_node_id_unique" UNIQUE("skill_node_id")
);

CREATE TABLE "srs_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept_id" integer NOT NULL,
	"ease_factor" numeric(4, 2) DEFAULT '2.50' NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_on" date NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	CONSTRAINT "srs_items_concept_id_unique" UNIQUE("concept_id")
);

CREATE TABLE "theory_concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"stage" "theory_stage" NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"parent_id" integer,
	CONSTRAINT "theory_concepts_slug_unique" UNIQUE("slug")
);

CREATE TABLE "theory_prerequisites" (
	"concept_id" integer NOT NULL,
	"requires_concept_id" integer NOT NULL,
	CONSTRAINT "theory_prerequisites_pair" UNIQUE("concept_id","requires_concept_id"),
	CONSTRAINT "theory_prerequisites_no_self" CHECK ("theory_prerequisites"."concept_id" <> "theory_prerequisites"."requires_concept_id")
);

ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_drill_type_id_drill_types_id_fk" FOREIGN KEY ("drill_type_id") REFERENCES "public"."drill_types"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ep_track_stage_events" ADD CONSTRAINT "ep_track_stage_events_track_id_ep_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ep_track_stage_events" ADD CONSTRAINT "ep_track_stage_events_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ep_tracks" ADD CONSTRAINT "ep_tracks_release_id_ep_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."ep_releases"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fluency_ratings" ADD CONSTRAINT "fluency_ratings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fluency_ratings" ADD CONSTRAINT "fluency_ratings_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "genre_deep_dives" ADD CONSTRAINT "genre_deep_dives_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "genre_ratings" ADD CONSTRAINT "genre_ratings_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "listening_notes" ADD CONSTRAINT "listening_notes_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "listening_notes" ADD CONSTRAINT "listening_notes_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_quarter_id_roadmap_quarters_id_fk" FOREIGN KEY ("quarter_id") REFERENCES "public"."roadmap_quarters"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_plan_id_practice_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_ep_track_id_ep_tracks_id_fk" FOREIGN KEY ("ep_track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_ep_track_id_ep_tracks_id_fk" FOREIGN KEY ("ep_track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_skill_node_id_skill_nodes_id_fk" FOREIGN KEY ("skill_node_id") REFERENCES "public"."skill_nodes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_production_project_id_production_projects_id_fk" FOREIGN KEY ("production_project_id") REFERENCES "public"."production_projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_parent_id_skill_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."skill_nodes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_skill_node_id_skill_nodes_id_fk" FOREIGN KEY ("skill_node_id") REFERENCES "public"."skill_nodes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "srs_items" ADD CONSTRAINT "srs_items_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "theory_concepts" ADD CONSTRAINT "theory_concepts_parent_id_theory_concepts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."theory_concepts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "theory_prerequisites" ADD CONSTRAINT "theory_prerequisites_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "theory_prerequisites" ADD CONSTRAINT "theory_prerequisites_requires_concept_id_theory_concepts_id_fk" FOREIGN KEY ("requires_concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "drill_attempts_occurred_on_idx" ON "drill_attempts" USING btree ("occurred_on");
CREATE INDEX "drill_attempts_type_idx" ON "drill_attempts" USING btree ("drill_type_id");
CREATE INDEX "ep_track_stage_events_track_idx" ON "ep_track_stage_events" USING btree ("track_id");
CREATE INDEX "fluency_ratings_instrument_idx" ON "fluency_ratings" USING btree ("instrument_id","rated_on");
CREATE UNIQUE INDEX "genre_deep_dives_month_idx" ON "genre_deep_dives" USING btree ("month");
CREATE INDEX "genre_ratings_genre_idx" ON "genre_ratings" USING btree ("genre_id","rated_on");
CREATE INDEX "listening_notes_listened_on_idx" ON "listening_notes" USING btree ("listened_on");
CREATE INDEX "milestones_quarter_idx" ON "milestones" USING btree ("quarter_id");
CREATE INDEX "practice_plan_items_plan_idx" ON "practice_plan_items" USING btree ("plan_id");
CREATE INDEX "practice_sessions_occurred_on_idx" ON "practice_sessions" USING btree ("occurred_on");
CREATE INDEX "quiz_attempts_question_idx" ON "quiz_attempts" USING btree ("question_id");
CREATE INDEX "quiz_questions_concept_idx" ON "quiz_questions" USING btree ("concept_id");
CREATE INDEX "repertoire_instrument_idx" ON "repertoire" USING btree ("instrument_id");
CREATE INDEX "session_segments_session_idx" ON "session_segments" USING btree ("session_id");
CREATE INDEX "session_segments_domain_idx" ON "session_segments" USING btree ("domain");
CREATE INDEX "skill_nodes_tree_idx" ON "skill_nodes" USING btree ("tree_kind","instrument_id");
CREATE INDEX "srs_items_due_on_idx" ON "srs_items" USING btree ("due_on");
-- ===== migration: 0002_drill_practice_url =====
ALTER TABLE "drill_types" ADD COLUMN "practice_url" text;
ALTER TABLE "drill_types" ADD COLUMN "practice_label" text;
-- ===== record migrations as applied =====
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT '9089dbeca973057accde6a02a46663807ad05594a0f7bb9b31563583b3a13c64', 1785447324925 WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '9089dbeca973057accde6a02a46663807ad05594a0f7bb9b31563583b3a13c64');
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT '63dc25cea8bed32541ef42314e55619180607c7028b049d1180b10cc6b443b7a', 1785458390659 WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '63dc25cea8bed32541ef42314e55619180607c7028b049d1180b10cc6b443b7a');
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT '4d192a6581e8ba71401b22d9c0121597e08a0b06fa40ba759fa246aeb8bcf8a5', 1785533194932 WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '4d192a6581e8ba71401b22d9c0121597e08a0b06fa40ba759fa246aeb8bcf8a5');

-- ===== reference content =====

INSERT INTO public.drill_types VALUES (1, 'intervals', 'Intervals', 'ear_training', 'Identify ascending, descending and harmonic intervals.', 1, 'https://www.musictheory.net/exercises', 'Ear Training → Interval');
INSERT INTO public.drill_types VALUES (2, 'triads', 'Triads', 'ear_training', 'Major, minor, diminished and augmented triads by ear.', 2, 'https://www.musictheory.net/exercises', 'Ear Training → Chord');
INSERT INTO public.drill_types VALUES (3, 'seventh_chords', '7th Chords', 'ear_training', 'maj7, min7, dom7, half-diminished and diminished 7ths.', 3, 'https://www.musictheory.net/exercises', 'Ear Training → Chord (7th chords)');
INSERT INTO public.drill_types VALUES (4, 'progressions', 'Chord Progressions', 'ear_training', 'Hear and name progressions by scale degree.', 4, 'https://www.musictheory.net/exercises', 'Ear Training → Chord Progression');
INSERT INTO public.drill_types VALUES (5, 'rhythm_dictation', 'Rhythm Dictation', 'ear_training', 'Transcribe rhythms after one or two hearings.', 5, 'https://www.musictheory.net/exercises', 'no exact match — try Ear Training');
INSERT INTO public.drill_types VALUES (6, 'melodic_dictation', 'Melodic Dictation', 'ear_training', 'Transcribe short melodic phrases.', 6, 'https://www.musictheory.net/exercises', 'Ear Training → Scale');
INSERT INTO public.drill_types VALUES (7, 'notation_reading', 'Notation Reading', 'sight_reading', 'Timed reading of pitched notation at increasing tempo.', 7, 'https://www.musictheory.net/exercises', 'Note Identification');
INSERT INTO public.drill_types VALUES (8, 'rhythm_reading', 'Rhythm Reading', 'sight_reading', 'Read and perform rhythms at sight, no pitch.', 8, 'https://www.musictheory.net/exercises', 'no exact match — try Note Identification');
INSERT INTO public.drill_types VALUES (9, 'chart_reading', 'Chart / Lead Sheet Reading', 'sight_reading', 'Read chord charts and Nashville numbers in real time.', 9, 'https://www.musictheory.net/exercises', 'Keyboard Identification');
INSERT INTO public.ep_releases VALUES (1, 'Debut EP', NULL, NULL, 'Five original singles.');
INSERT INTO public.ep_tracks VALUES (1, 1, 'Track 1', 1, 'idea', NULL, '2026-07-31 21:38:56.90201+00', NULL);
INSERT INTO public.ep_tracks VALUES (2, 1, 'Track 2', 2, 'idea', NULL, '2026-07-31 21:38:56.90201+00', NULL);
INSERT INTO public.ep_tracks VALUES (3, 1, 'Track 3', 3, 'idea', NULL, '2026-07-31 21:38:56.90201+00', NULL);
INSERT INTO public.ep_tracks VALUES (4, 1, 'Track 4', 4, 'idea', NULL, '2026-07-31 21:38:56.90201+00', NULL);
INSERT INTO public.ep_tracks VALUES (5, 1, 'Track 5', 5, 'idea', NULL, '2026-07-31 21:38:56.90201+00', NULL);
INSERT INTO public.instruments VALUES (1, 'drums', 'Drums', 1);
INSERT INTO public.instruments VALUES (2, 'bass', 'Bass', 2);
INSERT INTO public.instruments VALUES (3, 'guitar', 'Guitar', 3);
INSERT INTO public.instruments VALUES (4, 'keys', 'Keys', 4);
INSERT INTO public.genres VALUES (1, 'pop', 'Pop', 1);
INSERT INTO public.genres VALUES (2, 'rnb', 'R&B', 2);
INSERT INTO public.genres VALUES (3, 'jazz', 'Jazz', 3);
INSERT INTO public.genres VALUES (4, 'hip_hop', 'Hip-Hop', 4);
INSERT INTO public.genres VALUES (5, 'rock', 'Rock', 5);
INSERT INTO public.genres VALUES (6, 'gospel', 'Gospel / Worship', 6);
INSERT INTO public.genres VALUES (7, 'funk', 'Funk', 7);
INSERT INTO public.genres VALUES (8, 'soul', 'Soul', 8);
INSERT INTO public.genres VALUES (9, 'electronic', 'Electronic', 9);
INSERT INTO public.genres VALUES (10, 'country', 'Country', 10);
INSERT INTO public.genres VALUES (11, 'latin', 'Latin', 11);
INSERT INTO public.genres VALUES (12, 'reggae', 'Reggae', 12);
INSERT INTO public.roadmap_quarters VALUES (1, 1, 'Q1', '2026-07-31', '2026-10-30', 'Foundations: technique, intervals, first grooves');
INSERT INTO public.roadmap_quarters VALUES (2, 2, 'Q2', '2026-10-31', '2027-01-30', 'Fluency: diatonic harmony, repertoire, first demos');
INSERT INTO public.roadmap_quarters VALUES (3, 3, 'Q3', '2027-01-31', '2027-04-30', 'Depth: jazz harmony, genre range, tracking the EP');
INSERT INTO public.roadmap_quarters VALUES (4, 4, 'Q4', '2027-05-01', '2027-07-31', 'Ship: mixing, mastering, release');
INSERT INTO public.theory_concepts VALUES (1, 'interval-quality', 'Interval Quality & Size', 'Naming intervals by number and quality: major, minor, perfect, augmented, diminished.', 'intervals', 0, NULL);
INSERT INTO public.theory_concepts VALUES (2, 'interval-inversion', 'Interval Inversion', 'Inverting intervals and the rule that the sizes sum to nine.', 'intervals', 1, NULL);
INSERT INTO public.theory_concepts VALUES (3, 'triad-construction', 'Triad Construction', 'Building major, minor, diminished and augmented triads from stacked thirds.', 'triads', 2, NULL);
INSERT INTO public.theory_concepts VALUES (4, 'triad-inversions', 'Triad Inversions & Figured Bass', 'Root position, first and second inversion, and how they are figured.', 'triads', 3, NULL);
INSERT INTO public.theory_concepts VALUES (5, 'diatonic-triads', 'Diatonic Triads of the Major Scale', 'The I ii iii IV V vi vii° pattern and why the qualities fall where they do.', 'triads', 4, NULL);
INSERT INTO public.theory_concepts VALUES (6, 'seventh-chord-types', 'Seventh Chord Types', 'maj7, min7, dominant 7, half-diminished and fully diminished.', 'sevenths', 5, NULL);
INSERT INTO public.theory_concepts VALUES (7, 'diatonic-sevenths', 'Diatonic Sevenths', 'Imaj7 ii-7 iii-7 IVmaj7 V7 vi-7 vii-7b5 and their functions.', 'sevenths', 6, NULL);
INSERT INTO public.theory_concepts VALUES (8, 'modes-of-major', 'Modes of the Major Scale', 'Ionian through Locrian as rotations, and the characteristic note of each.', 'modes', 7, NULL);
INSERT INTO public.theory_concepts VALUES (9, 'modal-harmony', 'Modal Harmony & Avoid Notes', 'Which chords establish a mode, and which notes undermine it.', 'modes', 8, NULL);
INSERT INTO public.theory_concepts VALUES (10, 'tonic-subdominant-dominant', 'Tonic, Subdominant, Dominant', 'The three functional families and how chords substitute within them.', 'functional_harmony', 9, NULL);
INSERT INTO public.theory_concepts VALUES (11, 'cadences', 'Cadences', 'Authentic, plagal, half and deceptive cadences.', 'functional_harmony', 10, NULL);
INSERT INTO public.theory_concepts VALUES (12, 'secondary-dominants', 'Secondary Dominants', 'V/V and friends: tonicising a chord that is not the tonic.', 'functional_harmony', 11, NULL);
INSERT INTO public.theory_concepts VALUES (13, 'ii-v-i-major', 'ii-V-I in Major', 'The central jazz cadence, its voicings and its guide tones.', 'ii_v_i', 12, NULL);
INSERT INTO public.theory_concepts VALUES (14, 'ii-v-i-minor', 'ii-V-i in Minor', 'Half-diminished ii, altered V, and the minor tonic options.', 'ii_v_i', 13, NULL);
INSERT INTO public.theory_concepts VALUES (15, 'tritone-substitution', 'Tritone Substitution', 'Substituting bII7 for V7 and the shared tritone that makes it work.', 'ii_v_i', 14, NULL);
INSERT INTO public.theory_concepts VALUES (16, 'reharmonization', 'Reharmonization Techniques', 'Backdoor ii-V, modal interchange, chord scale substitution.', 'ii_v_i', 15, NULL);
INSERT INTO public.theory_concepts VALUES (17, 'voice-leading-basics', 'Voice Leading Fundamentals', 'Common tones, stepwise motion, and avoiding parallel fifths and octaves.', 'voice_leading', 16, NULL);
INSERT INTO public.theory_concepts VALUES (18, 'guide-tone-lines', 'Guide Tone Lines', 'Threading 3rds and 7ths through a progression to imply the harmony.', 'voice_leading', 17, NULL);
INSERT INTO public.theory_concepts VALUES (19, 'four-part-voicing', 'Four-Part Voicing & Drop 2', 'Close position, drop 2 and drop 3 voicings across instruments.', 'voice_leading', 18, NULL);
INSERT INTO public.quiz_questions VALUES (1, 1, 'How many semitones are in a perfect fifth?', 'multiple_choice', '["5", "6", "7", "8"]', '["7"]', 'A perfect fifth spans seven semitones, e.g. C up to G.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (2, 1, 'What interval is C up to E flat?', 'multiple_choice', '["Major third", "Minor third", "Augmented second", "Perfect fourth"]', '["Minor third"]', 'Three semitones spanning three letter names is a minor third.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (3, 2, 'A major sixth inverts to which interval?', 'multiple_choice', '["Minor third", "Major third", "Minor sixth", "Perfect fourth"]', '["Minor third"]', 'Sizes sum to nine and quality flips: major sixth becomes minor third.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (4, 3, 'Which triad is built from a minor third with a major third on top?', 'multiple_choice', '["Major", "Minor", "Diminished", "Augmented"]', '["Minor"]', 'Minor third then major third gives a minor triad, e.g. A C E.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (5, 3, 'What are the notes of an F major triad?', 'multiple_choice', '["F A C", "F A flat C", "F A C sharp", "F B flat D"]', '["F A C"]', 'Root, major third, perfect fifth.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (6, 4, 'A triad with its third in the bass is in which position?', 'multiple_choice', '["Root position", "First inversion", "Second inversion", "Third inversion"]', '["First inversion"]', 'Third in the bass is first inversion, figured 6.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (7, 5, 'What quality is the vi chord in a major key?', 'multiple_choice', '["Major", "Minor", "Diminished", "Augmented"]', '["Minor"]', 'In major the pattern is I ii iii IV V vi vii°, so vi is minor.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (8, 5, 'Which diatonic triad in a major key is diminished?', 'multiple_choice', '["ii", "iii", "vi", "vii"]', '["vii"]', 'The triad on the leading tone is diminished.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (9, 6, 'Which seventh chord is a major triad with a minor seventh?', 'multiple_choice', '["Major 7", "Minor 7", "Dominant 7", "Half-diminished 7"]', '["Dominant 7"]', 'Major triad plus minor seventh, e.g. G B D F.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (10, 6, 'What are the notes of Cmaj7?', 'multiple_choice', '["C E G B flat", "C E G B", "C E flat G B flat", "C E G A"]', '["C E G B"]', 'Major triad plus major seventh.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (11, 7, 'In C major, what is the ii-7 chord?', 'multiple_choice', '["D-7", "E-7", "F maj7", "G7"]', '["D-7"]', 'D F A C, the seventh chord on the second degree.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (12, 8, 'Which mode has a flat second as its characteristic note?', 'multiple_choice', '["Dorian", "Phrygian", "Lydian", "Mixolydian"]', '["Phrygian"]', 'Phrygian''s flat second is what gives it its distinctive colour.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (13, 8, 'Lydian differs from Ionian by which single note?', 'multiple_choice', '["Flat third", "Sharp fourth", "Flat sixth", "Flat seventh"]', '["Sharp fourth"]', 'Lydian raises the fourth degree.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (14, 9, 'Which chord most strongly establishes Dorian rather than Aeolian?', 'multiple_choice', '["i-7", "IV7 (major IV)", "bVI maj7", "v-7"]', '["IV7 (major IV)"]', 'The major IV comes from Dorian''s natural sixth, the mode''s defining note.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (15, 10, 'Which function does the iii chord most commonly substitute for?', 'multiple_choice', '["Tonic", "Subdominant", "Dominant", "None"]', '["Tonic"]', 'iii shares two notes with I and usually acts as a tonic substitute.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (16, 11, 'V moving to vi is which cadence?', 'multiple_choice', '["Authentic", "Plagal", "Half", "Deceptive"]', '["Deceptive"]', 'The dominant resolves somewhere other than the expected tonic.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (17, 12, 'In C major, what chord is V/V?', 'multiple_choice', '["G7", "D7", "A7", "E7"]', '["D7"]', 'The dominant of G, which is itself the dominant of C.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (18, 13, 'What is the ii-V-I in the key of F major?', 'multiple_choice', '["G-7 C7 Fmaj7", "A-7 D7 Gmaj7", "C-7 F7 B flat maj7", "D-7 G7 Cmaj7"]', '["G-7 C7 Fmaj7"]', 'Second, fifth and first degrees of F major.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (19, 14, 'The ii chord in a minor ii-V-i is usually which quality?', 'multiple_choice', '["Minor 7", "Half-diminished 7", "Dominant 7", "Major 7"]', '["Half-diminished 7"]', 'The natural minor second degree gives a -7b5.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (20, 15, 'In C major, which chord is the tritone substitute for G7?', 'multiple_choice', '["D flat 7", "C sharp maj7", "F7", "B7"]', '["D flat 7"]', 'Db7 shares the B/F tritone with G7.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (21, 17, 'Which motion should generally be avoided between two voices?', 'multiple_choice', '["Contrary motion", "Oblique motion", "Parallel fifths", "Stepwise motion"]', '["Parallel fifths"]', 'Parallel fifths and octaves collapse the independence of the voices.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.quiz_questions VALUES (22, 18, 'Guide tone lines are built primarily from which chord tones?', 'multiple_choice', '["Root and fifth", "Third and seventh", "Fifth and ninth", "Root and third"]', '["Third and seventh"]', 'Thirds and sevenths define chord quality and move by step through a ii-V-I.', 1, '2026-07-31 21:38:56.88378+00');
INSERT INTO public.skill_nodes VALUES (1, 'instrument', 1, NULL, 'drums-grip-posture', 'Grip & Posture', 'Matched grip, seat height, relaxed stroke.', 1, 0);
INSERT INTO public.skill_nodes VALUES (2, 'instrument', 1, NULL, 'drums-basic-beat', 'Basic Rock Beat', 'Steady 8th-note groove at 80-120 bpm.', 1, 1);
INSERT INTO public.skill_nodes VALUES (3, 'instrument', 1, NULL, 'drums-rudiments', 'Core Rudiments', 'Single, double, paradiddle, flam.', 2, 2);
INSERT INTO public.skill_nodes VALUES (4, 'instrument', 1, NULL, 'drums-fills', 'Fills & Transitions', 'One-bar fills that land on the one.', 2, 3);
INSERT INTO public.skill_nodes VALUES (5, 'instrument', 1, NULL, 'drums-shuffle-swing', 'Shuffle & Swing', 'Triplet feel, jazz ride pattern.', 3, 4);
INSERT INTO public.skill_nodes VALUES (6, 'instrument', 1, NULL, 'drums-ghost-notes', 'Ghost Notes & Dynamics', 'R&B and funk pocket playing.', 3, 5);
INSERT INTO public.skill_nodes VALUES (7, 'instrument', 1, NULL, 'drums-odd-time', 'Odd Time Signatures', '5/4, 7/8 and comfortable counting.', 4, 6);
INSERT INTO public.skill_nodes VALUES (8, 'instrument', 1, NULL, 'drums-independence', 'Four-Way Independence', 'Limbs moving independently under a groove.', 4, 7);
INSERT INTO public.skill_nodes VALUES (9, 'instrument', 2, NULL, 'bass-fretting-hand', 'Fretting Hand Technique', 'One-finger-per-fret, clean notes, no buzz.', 1, 0);
INSERT INTO public.skill_nodes VALUES (10, 'instrument', 2, NULL, 'bass-root-notes', 'Root Note Playing', 'Locking roots to the kick drum.', 1, 1);
INSERT INTO public.skill_nodes VALUES (11, 'instrument', 2, NULL, 'bass-major-minor-scales', 'Scales & Positions', 'Major, minor and pentatonic across the neck.', 2, 2);
INSERT INTO public.skill_nodes VALUES (12, 'instrument', 2, NULL, 'bass-walking-lines', 'Walking Bass Lines', 'Quarter-note lines through changes.', 3, 3);
INSERT INTO public.skill_nodes VALUES (13, 'instrument', 2, NULL, 'bass-slap', 'Slap & Pop', 'Thumb slap, finger pop, muting.', 3, 4);
INSERT INTO public.skill_nodes VALUES (14, 'instrument', 2, NULL, 'bass-groove-pocket', 'Groove & Pocket', 'Sitting behind, on, and ahead of the beat.', 2, 5);
INSERT INTO public.skill_nodes VALUES (15, 'instrument', 2, NULL, 'bass-chord-tones', 'Chord Tone Targeting', 'Outlining harmony rather than roots alone.', 4, 6);
INSERT INTO public.skill_nodes VALUES (16, 'instrument', 3, NULL, 'guitar-open-chords', 'Open Chords', 'Clean CAGED open shapes and changes.', 1, 0);
INSERT INTO public.skill_nodes VALUES (17, 'instrument', 3, NULL, 'guitar-barre-chords', 'Barre Chords', 'E and A shape barres across the neck.', 2, 1);
INSERT INTO public.skill_nodes VALUES (18, 'instrument', 3, NULL, 'guitar-strumming', 'Strumming & Rhythm', 'Consistent patterns, muting, dynamics.', 1, 2);
INSERT INTO public.skill_nodes VALUES (19, 'instrument', 3, NULL, 'guitar-pentatonic', 'Pentatonic Positions', 'Five positions and connecting them.', 2, 3);
INSERT INTO public.skill_nodes VALUES (20, 'instrument', 3, NULL, 'guitar-fingerstyle', 'Fingerstyle', 'Travis picking, independent bass and melody.', 3, 4);
INSERT INTO public.skill_nodes VALUES (21, 'instrument', 3, NULL, 'guitar-extended-chords', 'Extended & Jazz Chords', '7ths, 9ths, drop 2 voicings.', 4, 5);
INSERT INTO public.skill_nodes VALUES (22, 'instrument', 3, NULL, 'guitar-lead-phrasing', 'Lead Phrasing', 'Bends, vibrato, target notes, space.', 3, 6);
INSERT INTO public.skill_nodes VALUES (23, 'instrument', 4, NULL, 'keys-hand-position', 'Hand Position & Posture', 'Curved fingers, relaxed wrists, thumb-under.', 1, 0);
INSERT INTO public.skill_nodes VALUES (24, 'instrument', 4, NULL, 'keys-major-scales', 'Major Scales, All Keys', 'Two octaves, hands together, evenly.', 2, 1);
INSERT INTO public.skill_nodes VALUES (25, 'instrument', 4, NULL, 'keys-triads-inversions', 'Triads & Inversions', 'All inversions in all keys, both hands.', 2, 2);
INSERT INTO public.skill_nodes VALUES (26, 'instrument', 4, NULL, 'keys-seventh-voicings', 'Seventh Chord Voicings', 'Rootless and shell voicings.', 3, 3);
INSERT INTO public.skill_nodes VALUES (27, 'instrument', 4, NULL, 'keys-comping', 'Comping', 'Rhythmic accompaniment behind a singer or soloist.', 3, 4);
INSERT INTO public.skill_nodes VALUES (28, 'instrument', 4, NULL, 'keys-gospel-runs', 'Gospel Voicings & Runs', 'Passing chords, fills, worship progressions.', 4, 5);
INSERT INTO public.skill_nodes VALUES (29, 'instrument', 4, NULL, 'keys-two-hand-independence', 'Two-Hand Independence', 'Bass line and comping simultaneously.', 4, 6);
INSERT INTO public.skill_nodes VALUES (30, 'logic', NULL, NULL, 'logic-session-setup', 'Session Setup & Templates', 'Sample rate, buffer, track stacks, saving a template.', 1, 0);
INSERT INTO public.skill_nodes VALUES (31, 'logic', NULL, NULL, 'logic-recording-comping', 'Recording & Take Comping', 'Take folders, quick swipe comping.', 1, 1);
INSERT INTO public.skill_nodes VALUES (32, 'logic', NULL, NULL, 'logic-editing', 'Editing & Flex Time', 'Quantising, Flex Time, Flex Pitch basics.', 2, 2);
INSERT INTO public.skill_nodes VALUES (33, 'logic', NULL, NULL, 'logic-eq', 'EQ Fundamentals', 'Subtractive EQ, resonance sweeping, high-pass discipline.', 2, 3);
INSERT INTO public.skill_nodes VALUES (34, 'logic', NULL, NULL, 'logic-compression', 'Compression', 'Ratio, attack, release, and hearing gain reduction.', 2, 4);
INSERT INTO public.skill_nodes VALUES (35, 'logic', NULL, NULL, 'logic-gain-staging', 'Gain Staging', 'Healthy levels from input to master bus.', 1, 5);
INSERT INTO public.skill_nodes VALUES (36, 'logic', NULL, NULL, 'logic-reverb-delay', 'Reverb & Delay', 'Sends, pre-delay, and creating depth.', 3, 6);
INSERT INTO public.skill_nodes VALUES (37, 'logic', NULL, NULL, 'logic-arrangement', 'Arrangement', 'Sections, tension and release, arrangement markers.', 3, 7);
INSERT INTO public.skill_nodes VALUES (38, 'logic', NULL, NULL, 'logic-sound-design', 'Sound Design', 'Alchemy and Retro Synth, layering, sampling.', 4, 8);
INSERT INTO public.skill_nodes VALUES (39, 'logic', NULL, NULL, 'logic-vocal-production', 'Vocal Production', 'Comping, tuning, de-essing, doubles and stacks.', 3, 9);
INSERT INTO public.skill_nodes VALUES (40, 'logic', NULL, NULL, 'logic-automation', 'Automation', 'Volume rides, filter sweeps, keeping a mix moving.', 3, 10);
INSERT INTO public.skill_nodes VALUES (41, 'logic', NULL, NULL, 'logic-bus-processing', 'Bus & Parallel Processing', 'Drum bus, parallel compression, glue.', 4, 11);
INSERT INTO public.skill_nodes VALUES (42, 'logic', NULL, NULL, 'logic-mixing-balance', 'Mix Balance & Panning', 'Static balance first, stereo image second.', 3, 12);
INSERT INTO public.skill_nodes VALUES (43, 'logic', NULL, NULL, 'logic-mastering', 'Mastering Basics', 'Loudness targets, limiting, referencing.', 4, 13);
INSERT INTO public.skill_nodes VALUES (44, 'logic', NULL, NULL, 'logic-referencing', 'Referencing & Translation', 'Checking a mix on phone, car, headphones.', 4, 14);
INSERT INTO public.settings VALUES (1, 'America/Chicago', NULL, NULL, 420, NULL, '2026-07-31 21:38:56.837561+00');
INSERT INTO public.skill_progress VALUES (1, 1, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (2, 2, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (3, 3, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (4, 4, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (5, 5, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (6, 6, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (7, 7, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (8, 8, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (9, 9, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (10, 10, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (11, 11, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (12, 12, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (13, 13, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (14, 14, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (15, 15, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (16, 16, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (17, 17, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (18, 18, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (19, 19, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (20, 20, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (21, 21, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (22, 22, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (23, 23, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (24, 24, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (25, 25, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (26, 26, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (27, 27, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (28, 28, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (29, 29, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (30, 30, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (31, 31, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (32, 32, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (33, 33, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (34, 34, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (35, 35, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (36, 36, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (37, 37, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (38, 38, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (39, 39, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (40, 40, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (41, 41, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (42, 42, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (43, 43, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.skill_progress VALUES (44, 44, 'not_started', NULL, NULL, NULL, '2026-07-31 21:38:56.895921+00');
INSERT INTO public.theory_prerequisites VALUES (2, 1);
INSERT INTO public.theory_prerequisites VALUES (3, 1);
INSERT INTO public.theory_prerequisites VALUES (4, 3);
INSERT INTO public.theory_prerequisites VALUES (5, 3);
INSERT INTO public.theory_prerequisites VALUES (6, 3);
INSERT INTO public.theory_prerequisites VALUES (7, 6);
INSERT INTO public.theory_prerequisites VALUES (7, 5);
INSERT INTO public.theory_prerequisites VALUES (8, 5);
INSERT INTO public.theory_prerequisites VALUES (9, 8);
INSERT INTO public.theory_prerequisites VALUES (10, 7);
INSERT INTO public.theory_prerequisites VALUES (11, 10);
INSERT INTO public.theory_prerequisites VALUES (12, 10);
INSERT INTO public.theory_prerequisites VALUES (13, 12);
INSERT INTO public.theory_prerequisites VALUES (13, 7);
INSERT INTO public.theory_prerequisites VALUES (14, 13);
INSERT INTO public.theory_prerequisites VALUES (15, 13);
INSERT INTO public.theory_prerequisites VALUES (16, 15);
INSERT INTO public.theory_prerequisites VALUES (16, 14);
INSERT INTO public.theory_prerequisites VALUES (17, 11);
INSERT INTO public.theory_prerequisites VALUES (18, 17);
INSERT INTO public.theory_prerequisites VALUES (18, 13);
INSERT INTO public.theory_prerequisites VALUES (19, 18);
SELECT pg_catalog.setval('public.drill_attempts_id_seq', 1, false);
SELECT pg_catalog.setval('public.drill_types_id_seq', 9, true);
SELECT pg_catalog.setval('public.ep_releases_id_seq', 1, true);
SELECT pg_catalog.setval('public.ep_track_stage_events_id_seq', 1, false);
SELECT pg_catalog.setval('public.ep_tracks_id_seq', 5, true);
SELECT pg_catalog.setval('public.fluency_ratings_id_seq', 1, false);
SELECT pg_catalog.setval('public.genre_deep_dives_id_seq', 1, false);
SELECT pg_catalog.setval('public.genre_ratings_id_seq', 1, false);
SELECT pg_catalog.setval('public.genres_id_seq', 12, true);
SELECT pg_catalog.setval('public.instruments_id_seq', 4, true);
SELECT pg_catalog.setval('public.journal_entries_id_seq', 1, false);
SELECT pg_catalog.setval('public.listening_notes_id_seq', 1, false);
SELECT pg_catalog.setval('public.milestones_id_seq', 1, false);
SELECT pg_catalog.setval('public.practice_plan_items_id_seq', 1, false);
SELECT pg_catalog.setval('public.practice_plans_id_seq', 1, false);
SELECT pg_catalog.setval('public.practice_sessions_id_seq', 1, false);
SELECT pg_catalog.setval('public.production_projects_id_seq', 1, false);
SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 1, false);
SELECT pg_catalog.setval('public.quiz_questions_id_seq', 22, true);
SELECT pg_catalog.setval('public.repertoire_id_seq', 1, false);
SELECT pg_catalog.setval('public.roadmap_quarters_id_seq', 4, true);
SELECT pg_catalog.setval('public.session_segments_id_seq', 1, false);
SELECT pg_catalog.setval('public.skill_nodes_id_seq', 44, true);
SELECT pg_catalog.setval('public.skill_progress_id_seq', 44, true);
SELECT pg_catalog.setval('public.srs_items_id_seq', 1, false);
SELECT pg_catalog.setval('public.theory_concepts_id_seq', 19, true);

COMMIT;
