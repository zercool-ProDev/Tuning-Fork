-- Tuning Fork: upgrade an existing database to add drill practice links.
--
-- Run this ONCE in the Neon SQL editor if your database was created with
-- an earlier setup.sql. Safe to run twice: every statement is guarded.

BEGIN;

-- ===== schema =====
ALTER TABLE "drill_types" ADD COLUMN IF NOT EXISTS "practice_url" text;
ALTER TABLE "drill_types" ADD COLUMN IF NOT EXISTS "practice_label" text;

-- ===== practice links =====
-- COALESCE so a link you have already edited in the app is preserved.
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Ear Training → Interval') WHERE key = 'intervals';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Ear Training → Chord') WHERE key = 'triads';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Ear Training → Chord (7th chords)') WHERE key = 'seventh_chords';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Ear Training → Chord Progression') WHERE key = 'progressions';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'no exact match — try Ear Training') WHERE key = 'rhythm_dictation';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Ear Training → Scale') WHERE key = 'melodic_dictation';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Note Identification') WHERE key = 'notation_reading';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'no exact match — try Note Identification') WHERE key = 'rhythm_reading';
UPDATE drill_types SET practice_url = COALESCE(practice_url, 'https://www.musictheory.net/exercises'), practice_label = COALESCE(practice_label, 'Keyboard Identification') WHERE key = 'chart_reading';

-- ===== record the migration as applied =====
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT '4d192a6581e8ba71401b22d9c0121597e08a0b06fa40ba759fa246aeb8bcf8a5', 1785533194932 WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '4d192a6581e8ba71401b22d9c0121597e08a0b06fa40ba759fa246aeb8bcf8a5');

COMMIT;
