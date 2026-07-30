import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db, schema } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proves the deployed app can reach Postgres and both read and write, which is
 * the thing worth knowing when a device shows stale or missing data.
 */
export async function GET() {
  try {
    const now = new Date();
    await db()
      .insert(schema.appMeta)
      .values({ key: "last_health_check", value: now.toISOString() })
      .onConflictDoUpdate({
        target: schema.appMeta.key,
        set: { value: now.toISOString(), updatedAt: sql`now()` },
      });

    const [row] = await db()
      .select()
      .from(schema.appMeta)
      .where(sql`${schema.appMeta.key} = 'last_health_check'`);

    return NextResponse.json({
      ok: true,
      database: "connected",
      readWrite: "verified",
      lastHealthCheck: row?.value ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
