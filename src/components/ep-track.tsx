import {
  advanceTrack,
  deleteTrack,
  regressTrack,
  setTrackStage,
  updateTrack,
} from "@/app/actions/ep";
import { Button, Card, Field, Input, Textarea, cn } from "@/components/ui";
import { formatMinutes } from "@/lib/dates";
import {
  EP_STAGES,
  daysUntil,
  nextStage,
  previousStage,
  stageAge,
  stageIndex,
  stageLabel,
  timeInStages,
  trackProgress,
  type EpStage,
} from "@/lib/ep";

type Track = {
  id: number;
  title: string;
  position: number;
  stage: EpStage;
  targetDate: string | null;
  stageUpdatedAt: Date;
  notes: string | null;
  minutes: number;
  projects: { id: number; name: string; status: string }[];
  events: { toStage: string; changedOn: string }[];
};

/**
 * One single, with its stage rail.
 *
 * A seven-column kanban is unusable on a phone, so the pipeline runs
 * horizontally per track instead: seven dots, the current one filled. Tapping a
 * dot jumps straight there, for when reality skipped a step.
 */
export function EpTrackCard({ track, today }: { track: Track; today: string }) {
  const index = stageIndex(track.stage);
  const progress = trackProgress(track.stage);
  const stageUpdatedOn = track.stageUpdatedAt.toISOString().slice(0, 10);
  const age = stageAge(track.stage, stageUpdatedOn, today);
  const until = daysUntil(track.targetDate, today);
  const history = timeInStages(
    track.events.map((event) => ({ toStage: event.toStage as EpStage, changedOn: event.changedOn })),
    today,
  );
  const completed = history.filter((entry) => !entry.ongoing && entry.days > 0);

  const forward = nextStage(track.stage);
  const back = previousStage(track.stage);
  const released = track.stage === "released";

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-medium">
          <span className="mr-2 text-ink-faint tabular-nums">{track.position}</span>
          {track.title}
        </h3>
        <span
          className={cn(
            "shrink-0 text-sm tabular-nums",
            released ? "text-positive" : "text-ink-muted",
          )}
        >
          {progress}%
        </span>
      </div>

      {/* Stage rail. Each dot is a form so it works without JavaScript. */}
      <div className="flex items-center gap-1">
        {EP_STAGES.map((stage, stageIdx) => {
          const passed = stageIdx <= index;
          return (
            <form key={stage.value} action={setTrackStage} className="flex-1">
              <input type="hidden" name="trackId" value={track.id} />
              <input type="hidden" name="stage" value={stage.value} />
              <button
                type="submit"
                aria-label={`Move ${track.title} to ${stage.label}`}
                aria-current={stageIdx === index ? "step" : undefined}
                className="group flex w-full flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "h-1.5 w-full rounded-full transition",
                    stageIdx === index
                      ? released
                        ? "bg-positive"
                        : "bg-accent"
                      : passed
                        ? "bg-accent/40"
                        : "bg-surface-3 group-hover:bg-line-strong",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] leading-none",
                    stageIdx === index ? "font-medium text-ink" : "text-ink-faint",
                  )}
                >
                  {stage.short}
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className={age.stale ? "font-medium text-danger" : "text-ink-faint"}>
          {released
            ? `Released ${age.days === 0 ? "today" : `${age.days}d ago`}`
            : age.days === 0
              ? `Moved to ${stageLabel(track.stage)} today`
              : `${age.days}d in ${stageLabel(track.stage)}`}
          {age.stale ? " — stalling" : ""}
        </span>

        {until !== null && !released ? (
          <span className={until < 0 ? "text-danger" : "text-ink-faint"}>
            {until < 0 ? `${Math.abs(until)}d overdue` : `${until}d to target`}
          </span>
        ) : null}

        {track.minutes > 0 ? (
          <span className="text-ink-faint">{formatMinutes(track.minutes)} logged</span>
        ) : null}

        {track.projects.length > 0 ? (
          <span className="text-ink-faint">
            {track.projects.length} Logic project{track.projects.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {completed.length > 0 ? (
        <p className="text-xs text-ink-faint">
          {completed
            .map((entry) => `${stageLabel(entry.stage)} took ${entry.days}d`)
            .join(" · ")}
        </p>
      ) : null}

      {track.notes ? <p className="text-sm text-ink-muted">{track.notes}</p> : null}

      <div className="flex gap-2">
        {back ? (
          <form action={regressTrack}>
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="currentStage" value={track.stage} />
            <Button type="submit" variant="secondary" className="px-3">
              ← {stageLabel(back)}
            </Button>
          </form>
        ) : null}
        {forward ? (
          <form action={advanceTrack} className="flex-1">
            <input type="hidden" name="trackId" value={track.id} />
            <input type="hidden" name="currentStage" value={track.stage} />
            <Button type="submit" className="w-full">
              {stageLabel(forward)} →
            </Button>
          </form>
        ) : null}
      </div>

      <details className="rounded-xl border border-line bg-surface-2 p-3">
        <summary className="cursor-pointer text-sm text-ink-muted">Details</summary>
        <form action={updateTrack} className="mt-3 space-y-3">
          <input type="hidden" name="trackId" value={track.id} />
          <Field label="Title">
            <Input name="title" defaultValue={track.title} />
          </Field>
          <Field label="Target date" hint="When you want this one finished.">
            <Input type="date" name="targetDate" defaultValue={track.targetDate ?? ""} />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" rows={2} defaultValue={track.notes ?? ""} />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </div>
        </form>

        <form action={deleteTrack} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="trackId" value={track.id} />
          <button
            type="submit"
            className="text-xs text-ink-faint hover:text-danger"
            aria-label={`Delete ${track.title}`}
          >
            Delete this track
          </button>
        </form>
      </details>
    </Card>
  );
}
