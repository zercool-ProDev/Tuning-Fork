import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver.
 *
 * The HTTP driver is the right fit for serverless: each query is a stateless
 * fetch, so there is no connection pool to exhaust across lambda invocations.
 * The tradeoff is no interactive transactions — if a feature later needs one,
 * switch that path to the websocket `Pool` driver.
 *
 * Created lazily so importing this module never throws at build time.
 */
let cached: ReturnType<typeof create> | undefined;

function create() {
  return drizzle(neon(databaseUrl()), { schema });
}

export function db() {
  cached ??= create();
  return cached;
}

export { schema };
