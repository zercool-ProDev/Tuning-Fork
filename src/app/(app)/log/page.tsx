import Link from "next/link";

import { createSession } from "@/app/actions/sessions";
import { SessionForm } from "@/components/session-form";
import { getEpTracks, getGenres, getInstruments, getToday } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Log a session · Tuning Fork" };

export default async function LogPage() {
  const [today, instruments, genres, epTracks] = await Promise.all([
    getToday(),
    getInstruments(),
    getGenres(),
    getEpTracks(),
  ]);

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Log a session</h1>
        <Link href="/sessions" className="text-sm text-ink-muted underline-offset-4 hover:underline">
          Cancel
        </Link>
      </header>

      <SessionForm
        action={createSession}
        today={today}
        instruments={instruments.map((row) => ({ id: row.id, name: row.name }))}
        genres={genres.map((row) => ({ id: row.id, name: row.name }))}
        epTracks={epTracks.map((row) => ({ id: row.id, name: row.title }))}
      />
    </>
  );
}
