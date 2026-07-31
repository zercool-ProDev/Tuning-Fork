import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Strip anything credential-shaped out of a driver error before showing it to
 * an unauthenticated caller. Connection errors frequently echo the connection
 * string back, which would otherwise leak the database password.
 */
function redact(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
    .replace(/password=[^\s&"']+/gi, "password=[redacted]");
}

/** Which required environment variables are present. Never their values. */
function envStatus() {
  return {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    PASSCODE_HASH: Boolean(process.env.PASSCODE_HASH),
  };
}

/**
 * Public health check. Reports whether the app can reach Postgres and read and
 * write, plus which environment variables are configured — enough to diagnose a
 * broken deployment without being able to log in first.
 *
 * Deliberately leaks nothing: no practice data, no variable values, and the raw
 * database error is included only for an authenticated caller, since driver
 * errors can echo fragments of the connection string.
 */
export async function GET() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authenticated =
    Boolean(secret) && (await verifySessionToken(token, secret!));

  const env = envStatus();

  if (!env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, database: "not_configured", env },
      { status: 503 },
    );
  }

  try {
    const now = new Date().toISOString();
    await db()
      .insert(schema.appMeta)
      .values({ key: "last_health_check", value: now })
      .onConflictDoUpdate({
        target: schema.appMeta.key,
        set: { value: now, updatedAt: sql`now()` },
      });

    const [row] = await db()
      .select()
      .from(schema.appMeta)
      .where(sql`${schema.appMeta.key} = 'last_health_check'`);

    return NextResponse.json({
      ok: true,
      database: "connected",
      readWrite: "verified",
      env,
      lastHealthCheck: row?.value ?? null,
    });
  } catch (error) {
    // Drizzle wraps driver errors in a DrizzleQueryError whose own message is
    // just the failed SQL. The useful part ("relation does not exist",
    // authentication failures, DNS errors) is down the cause chain, so walk it.
    const chain: string[] = [];
    let current: unknown = error;
    while (current instanceof Error) {
      chain.push(current.message);
      current = current.cause;
    }
    const message = chain.length > 0 ? chain.join(" | ") : String(error);

    // Missing tables is a distinct, expected state before migrations are run,
    // and worth naming rather than reporting as a generic failure.
    const migrationsPending = /relation .* does not exist/i.test(message);

    return NextResponse.json(
      {
        ok: false,
        database: migrationsPending ? "connected" : "unreachable",
        migrations: migrationsPending ? "pending" : undefined,
        env,
        // Redacted for anyone, full detail once signed in. A health check that
        // cannot explain its own failure until you are already logged in is
        // useless precisely when it matters most.
        error: authenticated ? message : redact(message),
      },
      { status: 503 },
    );
  }
}
