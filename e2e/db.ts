import { readFileSync } from "node:fs";
import pg from "pg";

/**
 * Direct database access for test setup.
 *
 * Specs that mutate shared rows — the EP has exactly one release and five
 * seeded tracks — need to reset between tests, not just once per suite.
 * Otherwise they pass alone and fail together, which is the failure mode that
 * makes a suite worse than no suite.
 */
export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const file = readFileSync(".env.local", "utf8");
    const match = /^DATABASE_URL=(.*)$/m.exec(file);
    if (match) return match[1].trim();
  } catch {
    // fall through
  }

  throw new Error(
    "DATABASE_URL is not set and .env.local has none. The e2e suite needs a database it may write to.",
  );
}

export async function withPool<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const url = databaseUrl();
  const pool = new pg.Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

/** Put the EP back to its seeded shape: five singles at idea, no history. */
export async function resetEp() {
  await withPool(async (pool) => {
    await pool.query("delete from ep_track_stage_events");
    await pool.query("delete from ep_tracks where position > 5");
    await pool.query(
      "update ep_tracks set stage = 'idea', stage_updated_at = now(), target_date = null, notes = null, title = 'Track ' || position",
    );
    await pool.query(
      "update ep_releases set target_date = null, notes = null, title = 'Debut EP'",
    );
  });
}

/** Clear genre ratings, deep dives and listening notes. */
export async function resetGenres() {
  await withPool(async (pool) => {
    await pool.query("delete from genre_ratings");
    await pool.query("delete from genre_deep_dives");
    await pool.query("delete from listening_notes");
  });
}
