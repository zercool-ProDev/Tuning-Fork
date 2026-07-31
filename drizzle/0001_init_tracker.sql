CREATE TYPE "public"."domain" AS ENUM('ear_training', 'sight_reading', 'theory', 'logic_production', 'instrument', 'genre', 'ep');--> statement-breakpoint
CREATE TYPE "public"."drill_source" AS ENUM('manual', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."ep_stage" AS ENUM('idea', 'writing', 'arrangement', 'tracking', 'mixing', 'mastering', 'released');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'in_progress', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'shelved', 'finished');--> statement-breakpoint
CREATE TYPE "public"."quiz_kind" AS ENUM('multiple_choice', 'short_answer');--> statement-breakpoint
CREATE TYPE "public"."repertoire_status" AS ENUM('learning', 'performable', 'polished');--> statement-breakpoint
CREATE TYPE "public"."skill_status" AS ENUM('not_started', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."theory_stage" AS ENUM('intervals', 'triads', 'sevenths', 'modes', 'functional_harmony', 'ii_v_i', 'voice_leading');--> statement-breakpoint
CREATE TYPE "public"."tree_kind" AS ENUM('instrument', 'logic');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "drill_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"domain" "domain" NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "drill_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ep_releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"target_date" date,
	"released_on" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ep_track_stage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"from_stage" "ep_stage",
	"to_stage" "ep_stage" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" integer
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "fluency_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"rated_on" date NOT NULL,
	"session_id" integer,
	"notes" text,
	CONSTRAINT "fluency_ratings_range" CHECK ("fluency_ratings"."rating" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "genre_deep_dives" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" integer NOT NULL,
	"month" date NOT NULL,
	"goals" text,
	"summary" text,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "genre_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"rated_on" date NOT NULL,
	"notes" text,
	CONSTRAINT "genre_ratings_range" CHECK ("genre_ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "genres_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "instruments_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"occurred_on" date NOT NULL,
	"what_worked" text,
	"what_didnt" text,
	"focus_next" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "practice_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"notes" text,
	CONSTRAINT "practice_plans_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_on" date NOT NULL,
	"started_at" timestamp with time zone,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"energy" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_sessions_energy_range" CHECK ("practice_sessions"."energy" is null or ("practice_sessions"."energy" between 1 and 5))
);
--> statement-breakpoint
CREATE TABLE "production_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ep_track_id" integer,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"session_id" integer,
	"is_correct" boolean NOT NULL,
	"response" jsonb,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "roadmap_quarters" (
	"id" serial PRIMARY KEY NOT NULL,
	"quarter_index" integer NOT NULL,
	"label" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"theme" text,
	CONSTRAINT "roadmap_quarters_quarter_index_unique" UNIQUE("quarter_index")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "theory_prerequisites" (
	"concept_id" integer NOT NULL,
	"requires_concept_id" integer NOT NULL,
	CONSTRAINT "theory_prerequisites_pair" UNIQUE("concept_id","requires_concept_id"),
	CONSTRAINT "theory_prerequisites_no_self" CHECK ("theory_prerequisites"."concept_id" <> "theory_prerequisites"."requires_concept_id")
);
--> statement-breakpoint
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_drill_type_id_drill_types_id_fk" FOREIGN KEY ("drill_type_id") REFERENCES "public"."drill_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_track_stage_events" ADD CONSTRAINT "ep_track_stage_events_track_id_ep_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_track_stage_events" ADD CONSTRAINT "ep_track_stage_events_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_tracks" ADD CONSTRAINT "ep_tracks_release_id_ep_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."ep_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fluency_ratings" ADD CONSTRAINT "fluency_ratings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fluency_ratings" ADD CONSTRAINT "fluency_ratings_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_deep_dives" ADD CONSTRAINT "genre_deep_dives_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_ratings" ADD CONSTRAINT "genre_ratings_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_notes" ADD CONSTRAINT "listening_notes_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_notes" ADD CONSTRAINT "listening_notes_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_quarter_id_roadmap_quarters_id_fk" FOREIGN KEY ("quarter_id") REFERENCES "public"."roadmap_quarters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_plan_id_practice_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_projects" ADD CONSTRAINT "production_projects_ep_track_id_ep_tracks_id_fk" FOREIGN KEY ("ep_track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repertoire" ADD CONSTRAINT "repertoire_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_ep_track_id_ep_tracks_id_fk" FOREIGN KEY ("ep_track_id") REFERENCES "public"."ep_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_skill_node_id_skill_nodes_id_fk" FOREIGN KEY ("skill_node_id") REFERENCES "public"."skill_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_production_project_id_production_projects_id_fk" FOREIGN KEY ("production_project_id") REFERENCES "public"."production_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_parent_id_skill_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."skill_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_skill_node_id_skill_nodes_id_fk" FOREIGN KEY ("skill_node_id") REFERENCES "public"."skill_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_items" ADD CONSTRAINT "srs_items_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theory_concepts" ADD CONSTRAINT "theory_concepts_parent_id_theory_concepts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."theory_concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theory_prerequisites" ADD CONSTRAINT "theory_prerequisites_concept_id_theory_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theory_prerequisites" ADD CONSTRAINT "theory_prerequisites_requires_concept_id_theory_concepts_id_fk" FOREIGN KEY ("requires_concept_id") REFERENCES "public"."theory_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drill_attempts_occurred_on_idx" ON "drill_attempts" USING btree ("occurred_on");--> statement-breakpoint
CREATE INDEX "drill_attempts_type_idx" ON "drill_attempts" USING btree ("drill_type_id");--> statement-breakpoint
CREATE INDEX "ep_track_stage_events_track_idx" ON "ep_track_stage_events" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "fluency_ratings_instrument_idx" ON "fluency_ratings" USING btree ("instrument_id","rated_on");--> statement-breakpoint
CREATE UNIQUE INDEX "genre_deep_dives_month_idx" ON "genre_deep_dives" USING btree ("month");--> statement-breakpoint
CREATE INDEX "genre_ratings_genre_idx" ON "genre_ratings" USING btree ("genre_id","rated_on");--> statement-breakpoint
CREATE INDEX "listening_notes_listened_on_idx" ON "listening_notes" USING btree ("listened_on");--> statement-breakpoint
CREATE INDEX "milestones_quarter_idx" ON "milestones" USING btree ("quarter_id");--> statement-breakpoint
CREATE INDEX "practice_plan_items_plan_idx" ON "practice_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_occurred_on_idx" ON "practice_sessions" USING btree ("occurred_on");--> statement-breakpoint
CREATE INDEX "quiz_attempts_question_idx" ON "quiz_attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_concept_idx" ON "quiz_questions" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "repertoire_instrument_idx" ON "repertoire" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "session_segments_session_idx" ON "session_segments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_segments_domain_idx" ON "session_segments" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "skill_nodes_tree_idx" ON "skill_nodes" USING btree ("tree_kind","instrument_id");--> statement-breakpoint
CREATE INDEX "srs_items_due_on_idx" ON "srs_items" USING btree ("due_on");