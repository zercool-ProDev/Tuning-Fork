import { readFileSync } from "node:fs";
import pg from "pg";

/**
 * Reset the practice log before the suite runs.
 *
 * Without this the specs quietly depend on each other — one leaves a session
 * behind and the next asserts an empty dashboard, so they pass alone and fail
 * together, or pass once and fail on a re-run. Resetting up front makes every
 * test start from the same known state.
 *
 * Only practice data and settings are touched; the seeded reference content is
 * left alone since the tests read from it.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const file = readFileSync(".env.local", "utf8");
    const match = /^DATABASE_URL=(.*)$/m.exec(file);
    if (match) return match[1].trim();
  } catch {
    // fall through to the error below
  }

  throw new Error(
    "DATABASE_URL is not set and .env.local has none. The e2e suite needs a database it may write to.",
  );
}

export default async function globalSetup() {
  const url = databaseUrl();
  const pool = new pg.Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });

  try {
    // Segments and journal entries cascade from practice_sessions.
    await pool.query("delete from practice_sessions");
    await pool.query("delete from repertoire");
    await pool.query("delete from fluency_ratings");
    await pool.query("delete from production_projects");
    await pool.query("delete from drill_attempts");
    await pool.query("delete from quiz_attempts");
    await pool.query("delete from srs_items");
    await pool.query(
      "update skill_progress set status = 'not_started', achieved_on = null, session_id = null",
    );
    await pool.query(
      "update settings set current_focus = null, weekly_minutes_target = 420 where id = 1",
    );
  } finally {
    await pool.end();
  }
}
