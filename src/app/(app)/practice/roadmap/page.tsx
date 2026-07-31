import Link from "next/link";

import {
  addMilestone,
  deleteMilestone,
  setGoalWindow,
  setMilestoneStatus,
} from "@/app/actions/planning";
import {
  Button,
  Card,
  DomainTag,
  Field,
  Input,
  SectionHeading,
  Select,
  Textarea,
  cn,
} from "@/components/ui";
import { getGoalProgress, getRoadmap, getSettings } from "@/db/queries";
import { todayIn } from "@/lib/dates";
import { DOMAINS } from "@/lib/domains";

export const dynamic = "force-dynamic";

export const metadata = { title: "Roadmap · Tuning Fork" };

const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
} as const;

/** Clicking cycles; dropped is reachable but not on the happy path. */
const NEXT_STATUS = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
  dropped: "pending",
} as const;

const STATUS_STYLE = {
  pending: "border-line text-ink-muted",
  in_progress: "border-accent/50 text-accent",
  done: "border-positive/50 text-positive",
  dropped: "border-line text-ink-faint line-through",
} as const;

export default async function RoadmapPage() {
  const [settings, quarters, progress] = await Promise.all([
    getSettings(),
    getRoadmap(),
    getGoalProgress(),
  ]);

  const today = todayIn(settings.timezone);

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-sm text-ink-muted">
            The 12-month goal, broken into quarters.
          </p>
        </div>
        <Link
          href="/practice"
          className="shrink-0 text-sm text-ink-muted underline-offset-4 hover:underline"
        >
          Practice
        </Link>
      </header>

      <Card className="mb-4">
        <SectionHeading
          title="Progress to goal"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {progress.done}/{progress.total} milestones
            </span>
          }
        />
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">{progress.percent}%</span>
          <span className="text-sm text-ink-faint">weighted completion</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-positive"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {settings.goalStartOn && settings.goalEndOn ? (
          <p className="mt-2 text-xs text-ink-faint">
            {settings.goalStartOn} → {settings.goalEndOn}
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-faint">
            No goal window set. The quarters below are unanchored until you set one.
          </p>
        )}
      </Card>

      <div className="space-y-4">
        {quarters.map((quarter) => {
          const counted = quarter.milestones.filter((m) => m.status !== "dropped");
          const done = counted.filter((m) => m.status === "done").length;
          const current = today >= quarter.startsOn && today <= quarter.endsOn;

          return (
            <Card key={quarter.id} className={cn(current && "border-accent/50")}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-medium">
                    {quarter.label}
                    {current ? <span className="ml-2 text-xs text-accent">now</span> : null}
                  </h2>
                  {quarter.theme ? (
                    <p className="text-sm text-ink-muted">{quarter.theme}</p>
                  ) : null}
                  <p className="text-xs text-ink-faint">
                    {quarter.startsOn} → {quarter.endsOn}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                  {done}/{counted.length}
                </span>
              </div>

              {quarter.milestones.length === 0 ? (
                <p className="text-sm text-ink-muted">No milestones yet.</p>
              ) : (
                <ul className="space-y-2">
                  {quarter.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium",
                            milestone.status === "dropped" && "text-ink-faint line-through",
                          )}
                        >
                          {milestone.title}
                        </p>
                        {milestone.description ? (
                          <p className="text-sm text-ink-muted">{milestone.description}</p>
                        ) : null}
                        <p className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                          {milestone.domain ? <DomainTag domain={milestone.domain} /> : null}
                          <span>weight {Number(milestone.weight)}</span>
                          {milestone.completedOn ? (
                            <span>· done {milestone.completedOn}</span>
                          ) : null}
                        </p>
                      </div>

                      <form action={setMilestoneStatus}>
                        <input type="hidden" name="milestoneId" value={milestone.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={NEXT_STATUS[milestone.status]}
                        />
                        <button
                          type="submit"
                          className={cn(
                            "min-h-11 rounded-lg border px-3 text-xs transition hover:border-line-strong",
                            STATUS_STYLE[milestone.status],
                          )}
                        >
                          {STATUS_LABEL[milestone.status]}
                        </button>
                      </form>

                      {milestone.status !== "dropped" ? (
                        <form action={setMilestoneStatus}>
                          <input type="hidden" name="milestoneId" value={milestone.id} />
                          <input type="hidden" name="status" value="dropped" />
                          <button
                            type="submit"
                            aria-label={`Drop ${milestone.title}`}
                            title="Drop this milestone"
                            className="min-h-11 px-2 text-xs text-ink-faint hover:text-ink"
                          >
                            Drop
                          </button>
                        </form>
                      ) : (
                        <form action={deleteMilestone}>
                          <input type="hidden" name="milestoneId" value={milestone.id} />
                          <button
                            type="submit"
                            aria-label={`Delete ${milestone.title}`}
                            className="min-h-11 px-2 text-xs text-ink-faint hover:text-danger"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <details className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
                <summary className="cursor-pointer text-sm text-ink-muted">
                  Add a milestone to {quarter.label}
                </summary>
                <form action={addMilestone} className="mt-3 space-y-3">
                  <input type="hidden" name="quarterId" value={quarter.id} />
                  <Field label="Title">
                    <Input
                      name="title"
                      required
                      placeholder="e.g. Play all major scales hands together at 100bpm"
                    />
                  </Field>
                  <Field label="Detail">
                    <Textarea name="description" rows={2} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Domain">
                      <Select name="domain" defaultValue="">
                        <option value="">None</option>
                        {DOMAINS.map((domain) => (
                          <option key={domain.value} value={domain.value}>
                            {domain.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Weight" hint="How much this counts, 1 to 10.">
                      <Input
                        type="number"
                        inputMode="numeric"
                        name="weight"
                        min={1}
                        max={10}
                        defaultValue={1}
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="secondary">
                    Add milestone
                  </Button>
                </form>
              </details>
            </Card>
          );
        })}
      </div>

      <details className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm text-ink-muted">
          Set the 12-month window
        </summary>
        <form action={setGoalWindow} className="mt-4 space-y-3">
          <Field
            label="Goal starts on"
            hint="The four quarters are re-anchored to this date."
          >
            <Input
              type="date"
              name="goalStartOn"
              defaultValue={settings.goalStartOn ?? today}
              required
            />
          </Field>
          <Button type="submit" variant="secondary">
            Save window
          </Button>
        </form>
      </details>
    </>
  );
}
