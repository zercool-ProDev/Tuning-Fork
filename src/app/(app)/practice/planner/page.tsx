import Link from "next/link";

import {
  addPlanItem,
  copyPlanFromPreviousWeek,
  deletePlanItem,
} from "@/app/actions/planning";
import {
  Button,
  Card,
  DomainTag,
  Field,
  Input,
  SectionHeading,
  Select,
  cn,
} from "@/components/ui";
import {
  getInstruments,
  getMinutesByDomainBetween,
  getPlan,
  getSettings,
} from "@/db/queries";
import { addDays, formatMinutes, todayIn } from "@/lib/dates";
import { DOMAINS } from "@/lib/domains";

export const dynamic = "force-dynamic";

export const metadata = { title: "Planner · Tuning Fork" };

/** Monday of the week containing `date`. */
function weekStartOf(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  // getUTCDay is Sunday-based; shift so weeks run Monday to Sunday.
  return addDays(date, weekday === 0 ? -6 : -(weekday - 1));
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const [params, settings, instruments] = await Promise.all([
    searchParams,
    getSettings(),
    getInstruments(),
  ]);

  const today = todayIn(settings.timezone);
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "")
    ? weekStartOf(params.week!)
    : weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const previousWeekStart = addDays(weekStart, -7);

  const [{ items }, actual] = await Promise.all([
    getPlan(weekStart),
    getMinutesByDomainBetween(weekStart, weekEnd),
  ]);

  const instrumentNames = new Map(instruments.map((row) => [row.id, row.name]));

  /**
   * Actual minutes matched to a plan row. An item naming an instrument only
   * counts that instrument's time; a general one counts the whole domain.
   */
  function actualFor(domain: string, instrumentId: number | null) {
    return actual
      .filter(
        (row) =>
          row.domain === domain &&
          (instrumentId === null || row.instrumentId === instrumentId),
      )
      .reduce((sum, row) => sum + row.minutes, 0);
  }

  const plannedTotal = items.reduce((sum, item) => sum + item.targetMinutes, 0);
  const actualTotal = actual.reduce((sum, row) => sum + row.minutes, 0);
  const isThisWeek = weekStart === weekStartOf(today);

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly plan</h1>
          <p className="text-sm text-ink-muted">
            {isThisWeek ? "This week" : `Week of ${weekStart}`} · {weekStart} to {weekEnd}
          </p>
        </div>
        <Link
          href="/practice"
          className="shrink-0 text-sm text-ink-muted underline-offset-4 hover:underline"
        >
          Practice
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        <Link href={`/practice/planner?week=${previousWeekStart}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            ← Previous
          </Button>
        </Link>
        <Link href={`/practice/planner?week=${addDays(weekStart, 7)}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Next →
          </Button>
        </Link>
      </div>

      <Card className="mb-4">
        <SectionHeading
          title="Plan vs actual"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {formatMinutes(actualTotal)} of {formatMinutes(plannedTotal)}
            </span>
          }
        />

        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No plan for this week yet. Add the blocks you intend to practise and this
            fills in from your logged sessions automatically.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const done = actualFor(item.domain, item.instrumentId);
              const pct =
                item.targetMinutes > 0
                  ? Math.min(100, Math.round((done / item.targetMinutes) * 100))
                  : 0;
              const met = done >= item.targetMinutes;

              return (
                <li key={item.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <DomainTag domain={item.domain} />
                      {item.instrumentId ? (
                        <span className="text-xs text-ink-faint">
                          {instrumentNames.get(item.instrumentId)}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "text-sm tabular-nums",
                          met ? "text-positive" : "text-ink-muted",
                        )}
                      >
                        {formatMinutes(done)} / {formatMinutes(item.targetMinutes)}
                      </span>
                      <form action={deletePlanItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${item.domain} target`}
                          className="text-xs text-ink-faint hover:text-danger"
                        >
                          ✕
                        </button>
                      </form>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn("h-full rounded-full", met ? "bg-positive" : "bg-accent")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mb-4 space-y-3">
        <SectionHeading title="Add a target" />
        <form action={addPlanItem} className="space-y-3">
          <input type="hidden" name="weekStart" value={weekStart} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Domain">
              <Select name="domain" defaultValue="instrument">
                {DOMAINS.map((domain) => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Minutes this week">
              <Input
                type="number"
                inputMode="numeric"
                name="targetMinutes"
                min={1}
                max={10080}
                defaultValue={120}
                required
              />
            </Field>
          </div>
          <Field
            label="Instrument"
            hint="Optional. Narrows an instrument or sight-reading target to one instrument."
          >
            <Select name="instrumentId" defaultValue="">
              <option value="">Any</option>
              {instruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary">
            Add target
          </Button>
        </form>
      </Card>

      <form action={copyPlanFromPreviousWeek}>
        <input type="hidden" name="weekStart" value={weekStart} />
        <input type="hidden" name="previousWeekStart" value={previousWeekStart} />
        <Button type="submit" variant="ghost" className="w-full">
          Copy last week&apos;s plan
        </Button>
      </form>
    </>
  );
}
