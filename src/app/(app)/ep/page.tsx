import Link from "next/link";

import { addTrack, updateRelease } from "@/app/actions/ep";
import { EpTrackCard } from "@/components/ep-track";
import { Button, Card, EmptyState, Field, Input, SectionHeading, Textarea, cn } from "@/components/ui";
import { getRelease, getToday, getTracksWithContext } from "@/db/queries";
import {
  EP_STAGES,
  daysUntil,
  releaseProgress,
  stageAge,
  stageIndex,
  type EpStage,
} from "@/lib/ep";

export const dynamic = "force-dynamic";

export const metadata = { title: "EP · Tuning Fork" };

export default async function EpPage() {
  const [release, today] = await Promise.all([getRelease(), getToday()]);

  if (!release) {
    return (
      <>
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">EP</h1>
        </header>
        <EmptyState
          title="No release yet"
          body="The seed creates one. Run npm run db:seed, or add a release row, and the pipeline appears here."
          action={
            <Link href="/practice">
              <Button>Back to practice</Button>
            </Link>
          }
        />
      </>
    );
  }

  const tracks = await getTracksWithContext(release.id);
  const stages = tracks.map((track) => track.stage as EpStage);
  const progress = releaseProgress(stages);
  const untilRelease = daysUntil(release.targetDate, today);

  const stalling = tracks.filter((track) =>
    stageAge(
      track.stage as EpStage,
      track.stageUpdatedAt.toISOString().slice(0, 10),
      today,
    ).stale,
  );

  // How many tracks sit at each stage, for the pipeline summary.
  const counts = EP_STAGES.map((stage) => ({
    ...stage,
    count: stages.filter((value) => value === stage.value).length,
  }));

  const released = stages.filter((stage) => stage === "released").length;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{release.title}</h1>
        <p className="text-sm text-ink-muted">
          {tracks.length} {tracks.length === 1 ? "single" : "singles"} · {released} released
          {untilRelease !== null
            ? untilRelease < 0
              ? ` · ${Math.abs(untilRelease)}d past target`
              : ` · ${untilRelease}d to target`
            : ""}
        </p>
      </header>

      <Card className="mb-4">
        <SectionHeading
          title="Pipeline"
          action={<span className="text-sm tabular-nums text-ink-muted">{progress}%</span>}
        />
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full", progress === 100 ? "bg-positive" : "bg-accent")}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Where the five sit, at a glance. */}
        <div className="flex items-end gap-1">
          {counts.map((stage) => (
            <div key={stage.value} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "w-full rounded-md text-center text-xs tabular-nums transition",
                  stage.count > 0
                    ? "bg-accent/20 py-2 font-medium text-ink"
                    : "bg-surface-2 py-2 text-ink-faint",
                )}
              >
                {stage.count || "·"}
              </span>
              <span className="text-[9px] leading-none text-ink-faint">{stage.short}</span>
            </div>
          ))}
        </div>

        {stalling.length > 0 ? (
          <p className="mt-3 text-xs text-danger">
            {stalling.length} track{stalling.length === 1 ? "" : "s"} stalling:{" "}
            {stalling.map((track) => track.title).join(", ")}
          </p>
        ) : null}
      </Card>

      <SectionHeading title="Singles" />
      <div className="mb-6 space-y-3">
        {tracks.length === 0 ? (
          <EmptyState title="No tracks yet" body="Add the first single below." />
        ) : (
          tracks
            .slice()
            .sort(
              (a, b) =>
                stageIndex(b.stage as EpStage) - stageIndex(a.stage as EpStage) ||
                a.position - b.position,
            )
            .map((track) => (
              <EpTrackCard
                key={track.id}
                today={today}
                track={{
                  ...track,
                  stage: track.stage as EpStage,
                }}
              />
            ))
        )}
      </div>

      <details className="mb-4 rounded-[var(--radius-card)] border border-line bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm text-ink-muted">Add a single</summary>
        <form action={addTrack} className="mt-3 space-y-3">
          <input type="hidden" name="releaseId" value={release.id} />
          <Field label="Title">
            <Input name="title" required placeholder="Working title is fine" />
          </Field>
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>
      </details>

      <details className="rounded-[var(--radius-card)] border border-line bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm text-ink-muted">Release details</summary>
        <form action={updateRelease} className="mt-3 space-y-3">
          <input type="hidden" name="releaseId" value={release.id} />
          <Field label="Title">
            <Input name="title" defaultValue={release.title} />
          </Field>
          <Field label="Target release date">
            <Input type="date" name="targetDate" defaultValue={release.targetDate ?? ""} />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" rows={2} defaultValue={release.notes ?? ""} />
          </Field>
          <Button type="submit" variant="secondary">
            Save
          </Button>
        </form>
      </details>
    </>
  );
}
