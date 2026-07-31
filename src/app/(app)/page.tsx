import Link from "next/link";

import { updateFocus } from "@/app/actions/settings";
import { Heatmap } from "@/components/heatmap";
import { SessionCard } from "@/components/session-card";
import { WeekBars } from "@/components/week-bars";
import {
  Button,
  Card,
  DomainTag,
  EmptyState,
  Field,
  Input,
  SectionHeading,
} from "@/components/ui";
import {
  getDailyMinutes,
  getEpTracks,
  getGenres,
  getInstruments,
  getMinutesByDomain,
  getRecentSessions,
  getSettings,
} from "@/db/queries";
import { addDays, formatMinutes, todayIn } from "@/lib/dates";
import { domainMeta } from "@/lib/domains";
import { currentStreak, daysThisMonth, longestStreak } from "@/lib/streaks";

export const dynamic = "force-dynamic";

const HEATMAP_WEEKS = 27;

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="px-3 py-3 text-center">
      <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{label}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  const settings = await getSettings();
  const today = todayIn(settings.timezone);

  // One window covers the heatmap, the week bars and every streak figure.
  const heatmapStart = addDays(today, -(HEATMAP_WEEKS * 7));

  const [daily, byDomain, sessions, instruments, genres, epTracks] = await Promise.all([
    getDailyMinutes(heatmapStart),
    getMinutesByDomain(addDays(today, -29)),
    getRecentSessions(3),
    getInstruments(),
    getGenres(),
    getEpTracks(),
  ]);

  const minutesByDay: Record<string, number> = {};
  for (const row of daily) minutesByDay[row.day] = row.minutes;

  const practiceDays = new Set(daily.filter((row) => row.minutes > 0).map((row) => row.day));

  const weekStart = addDays(today, -6);
  const previousWeekStart = addDays(today, -13);

  const sumBetween = (from: string, to: string) =>
    daily
      .filter((row) => row.day >= from && row.day <= to)
      .reduce((sum, row) => sum + row.minutes, 0);

  const weekMinutes = sumBetween(weekStart, today);
  const previousWeekMinutes = sumBetween(previousWeekStart, addDays(weekStart, -1));
  const weekDelta = weekMinutes - previousWeekMinutes;

  const target = settings.weeklyMinutesTarget;
  const weekPct = target > 0 ? Math.round((weekMinutes / target) * 100) : 0;

  const totalDomainMinutes = byDomain.reduce((sum, row) => sum + row.minutes, 0);

  const labels = {
    instruments: new Map(instruments.map((row) => [row.id, row.name])),
    genres: new Map(genres.map((row) => [row.id, row.name])),
    epTracks: new Map(epTracks.map((row) => [row.id, row.title])),
  };

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          {settings.currentFocus ?? "No focus set for this week."}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatTile value={formatMinutes(minutesByDay[today] ?? 0)} label="today" />
        <StatTile value={currentStreak(practiceDays, today)} label="day streak" />
        <StatTile value={longestStreak(practiceDays)} label="longest streak" />
        <StatTile value={daysThisMonth(practiceDays, today)} label="days this month" />
      </div>

      <Card className="mb-4">
        <SectionHeading
          title="This week"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {formatMinutes(weekMinutes)}
              {previousWeekMinutes > 0 ? (
                <span className={weekDelta >= 0 ? "text-positive" : "text-ink-faint"}>
                  {" "}
                  {weekDelta >= 0 ? "+" : "−"}
                  {formatMinutes(Math.abs(weekDelta))} vs last
                </span>
              ) : null}
            </span>
          }
        />
        <WeekBars today={today} minutesByDay={minutesByDay} />

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-faint">
            <span>Weekly target</span>
            <span className="tabular-nums">
              {weekPct}% of {formatMinutes(target)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, weekPct)}%` }}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <SectionHeading title="Consistency" />
        <Heatmap today={today} minutesByDay={minutesByDay} weeks={HEATMAP_WEEKS} />
      </Card>

      <Card className="mb-4">
        <SectionHeading
          title="Where the time went"
          action={<span className="text-xs text-ink-faint">last 30 days</span>}
        />
        {byDomain.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing logged in the last 30 days.</p>
        ) : (
          <>
            <div className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {byDomain.map((row) => (
                <span
                  key={row.domain}
                  style={{
                    width: `${(row.minutes / totalDomainMinutes) * 100}%`,
                    background: domainMeta(row.domain).color,
                  }}
                />
              ))}
            </div>
            <ul className="space-y-1.5">
              {byDomain.map((row) => (
                <li key={row.domain} className="flex items-baseline justify-between gap-3">
                  <DomainTag domain={row.domain} />
                  <span className="text-sm tabular-nums text-ink-muted">
                    {formatMinutes(row.minutes)}
                    <span className="ml-2 text-ink-faint">
                      {Math.round((row.minutes / totalDomainMinutes) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Link href="/log" className="mb-6 block">
        <Button className="w-full">Log a session</Button>
      </Link>

      <SectionHeading
        title="Recent"
        action={
          sessions.length > 0 ? (
            <Link
              href="/sessions"
              className="text-sm text-ink-muted underline-offset-4 hover:underline"
            >
              All sessions
            </Link>
          ) : null
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Log a practice block and the streak, week shape and domain split all start filling in from that one entry."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} today={today} labels={labels} />
          ))}
        </div>
      )}

      <details className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm text-ink-muted">
          Focus &amp; weekly target
        </summary>
        <form action={updateFocus} className="mt-4 space-y-3">
          <Field label="This week's focus" hint="Shown under the dashboard heading.">
            <Input
              name="currentFocus"
              defaultValue={settings.currentFocus ?? ""}
              placeholder="e.g. Ghost notes and ii-V-I in all keys"
            />
          </Field>
          <Field label="Weekly target (minutes)">
            <Input
              type="number"
              inputMode="numeric"
              name="weeklyMinutesTarget"
              min={1}
              max={10080}
              defaultValue={target}
            />
          </Field>
          <Button type="submit" variant="secondary">
            Save
          </Button>
        </form>
      </details>

      <footer className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs text-ink-faint">
        <span>Times shown in {settings.timezone.replace("_", " ")}</span>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="underline-offset-4 hover:text-ink hover:underline">
            Sign out
          </button>
        </form>
      </footer>
    </>
  );
}
