import { sql } from "drizzle-orm";

import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Placeholder home screen. Its only real job right now is to show, on whichever
 * device you open it from, that the server can reach Postgres — the guarantee
 * that makes phone and laptop show the same data.
 */
async function checkDatabase() {
  try {
    const now = new Date().toISOString();
    await db()
      .insert(schema.appMeta)
      .values({ key: "last_visit", value: now })
      .onConflictDoUpdate({
        target: schema.appMeta.key,
        set: { value: now, updatedAt: sql`now()` },
      });

    const [row] = await db()
      .select()
      .from(schema.appMeta)
      .where(sql`${schema.appMeta.key} = 'last_visit'`);

    return { ok: true as const, lastVisit: row?.value ?? null };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function Home() {
  const status = await checkDatabase();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Tuning Fork</h1>
        <p className="text-sm text-zinc-500">Personal music development tracker</p>
      </header>

      <section className="rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-medium text-zinc-400">Foundation status</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Auth</dt>
            <dd className="text-emerald-400">signed in</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Database</dt>
            <dd className={status.ok ? "text-emerald-400" : "text-red-400"}>
              {status.ok ? "connected (read + write)" : "unreachable"}
            </dd>
          </div>
          {status.ok ? (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Last visit recorded</dt>
              <dd className="text-zinc-300">{status.lastVisit}</dd>
            </div>
          ) : (
            <p className="pt-1 font-mono text-xs break-all text-red-400">
              {status.message}
            </p>
          )}
        </dl>
      </section>

      <p className="text-sm text-zinc-500">
        Feature schema not built yet — waiting on the spec and an agreed
        architecture.
      </p>

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
