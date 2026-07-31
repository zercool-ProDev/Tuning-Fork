import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";

import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client, with the driver chosen from the connection string.
 *
 * Neon hosts use Neon's HTTP driver: each query is a stateless fetch, so there
 * is no connection pool to exhaust across serverless invocations. The tradeoff
 * is no interactive transactions — if a feature needs one, that path should use
 * the websocket pool driver instead.
 *
 * Anything else (a local Postgres) falls back to node-postgres over TCP, which
 * is what makes it possible to run and test the app against a local database
 * rather than only against production.
 *
 * Created lazily so importing this module never throws at build time.
 */
type Client = ReturnType<typeof create>;

let cached: Client | undefined;

function create() {
  const url = databaseUrl();
  const isNeon = /neon\.(tech|build)/.test(new URL(url).hostname);

  if (isNeon) {
    return drizzleNeon(neon(url), { schema });
  }

  return drizzlePg(new pg.Pool({ connectionString: url }), { schema });
}

export function db() {
  cached ??= create();
  return cached as ReturnType<typeof drizzleNeon<typeof schema>>;
}

export { schema };
