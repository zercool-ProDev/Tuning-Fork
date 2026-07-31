import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSession, updateSession } from "@/app/actions/sessions";
import { SessionForm, type SegmentDraft } from "@/components/session-form";
import { Button, Card } from "@/components/ui";
import {
  getEpTracks,
  getGenres,
  getInstruments,
  getSession,
  getToday,
} from "@/db/queries";
import type { DomainValue } from "@/lib/domains";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit session · Tuning Fork" };

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number.parseInt(id, 10);
  if (!Number.isFinite(sessionId)) notFound();

  const [session, today, instruments, genres, epTracks] = await Promise.all([
    getSession(sessionId),
    getToday(),
    getInstruments(),
    getGenres(),
    getEpTracks(),
  ]);

  if (!session) notFound();

  const segments: SegmentDraft[] = session.segments.map((segment, index) => ({
    key: index + 1,
    domain: segment.domain as DomainValue,
    minutes: String(segment.minutes),
    instrumentId: segment.instrumentId ? String(segment.instrumentId) : "",
    genreId: segment.genreId ? String(segment.genreId) : "",
    epTrackId: segment.epTrackId ? String(segment.epTrackId) : "",
    notes: segment.notes ?? "",
  }));

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Edit session</h1>
        <Link href="/sessions" className="text-sm text-ink-muted underline-offset-4 hover:underline">
          Cancel
        </Link>
      </header>

      <SessionForm
        action={updateSession}
        today={today}
        instruments={instruments.map((row) => ({ id: row.id, name: row.name }))}
        genres={genres.map((row) => ({ id: row.id, name: row.name }))}
        epTracks={epTracks.map((row) => ({ id: row.id, name: row.title }))}
        submitLabel="Save changes"
        initial={{
          sessionId: session.id,
          occurredOn: session.occurredOn,
          energy: session.energy,
          segments,
          whatWorked: session.journal?.whatWorked ?? "",
          whatDidnt: session.journal?.whatDidnt ?? "",
          focusNext: session.journal?.focusNext ?? "",
        }}
      />

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Delete this session</p>
          <p className="text-sm text-ink-muted">
            Removes its blocks and reflection too. This cannot be undone.
          </p>
        </div>
        <form action={deleteSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <Button type="submit" variant="danger">
            Delete
          </Button>
        </form>
      </Card>
    </>
  );
}
