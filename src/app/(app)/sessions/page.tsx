import Link from "next/link";

import { Button, EmptyState } from "@/components/ui";
import { SessionCard } from "@/components/session-card";
import {
  getEpTracks,
  getGenres,
  getInstruments,
  getRecentSessions,
  getToday,
} from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sessions · Tuning Fork" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const [params, today, sessions, instruments, genres, epTracks] = await Promise.all([
    searchParams,
    getToday(),
    getRecentSessions(50),
    getInstruments(),
    getGenres(),
    getEpTracks(),
  ]);

  const labels = {
    instruments: new Map(instruments.map((row) => [row.id, row.name])),
    genres: new Map(genres.map((row) => [row.id, row.name])),
    epTracks: new Map(epTracks.map((row) => [row.id, row.title])),
  };

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <Link href="/log" className="text-sm text-accent underline-offset-4 hover:underline">
          Log a session
        </Link>
      </header>

      {params.saved ? (
        <p className="mb-4 rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm text-positive">
          Session saved.
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-4 rounded-xl border border-line bg-surface-1 px-4 py-3 text-sm text-ink-muted">
          Session deleted.
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Log your first practice block and it will show up here, along with the time split across domains."
          action={
            <Link href="/log">
              <Button>Log a session</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} today={today} labels={labels} />
          ))}
        </div>
      )}
    </>
  );
}
