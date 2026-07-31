import Link from "next/link";

import { Button, Card, DomainTag, EmptyState, SectionHeading } from "@/components/ui";
import { SessionCard } from "@/components/session-card";
import {
  getDailyMinutes,
  getEpTracks,
  getGenres,
  getInstruments,
  getMinutesByDomain,
  getPracticeDays,
  getRecentSessions,
  getSettings,
} from "@/db/queries";
import { addDays, formatMinutes, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Consecutive days of practice, counting back from today.
 *
 * A streak survives today being empty — it is only broken once yesterday is
 * empty too. Otherwise every streak would read as zero each morning until the
 * first session, which is exactly when the number is meant to be motivating.
 */
function currentStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export default async function TodayPage() {
  const settings = await getSettings();
  const today = todayIn(settings.timezone);
  const weekStart = addDays(today, -6);

  const [dailyMinutes, practiceDays, byDomain, sessions, instruments, genres, epTracks] =
    await Promise.all([
      getDailyMinutes(weekStart),
      getPracticeDays(addDays(today, -400)),
      getMinutesByDomain(weekStart),
      getRecentSessions(3),
      getInstruments(),
      getGenres(),
      getEpTracks(),
    ]);

  const dayMap = new Map(dailyMinutes.map((row) => [row.day, row.minutes]));
  const todayMinutes = dayMap.get(today) ?? 0;
  const weekMinutes = dailyMinutes.reduce((sum, row) => sum + row.minutes, 0);
  const streak = currentStreak(new Set(practiceDays), today);
  const target = settings.weeklyMinutesTarget;
  const weekPct = target > 0 ? Math.min(100, Math.round((weekMinutes / target) * 100)) : 0;

  const labels = {
    instruments: new Map(instruments.map((row) => [row.id, row.name])),
    genres: new Map(genres.map((row) => [row.id, row.name])),
    epTracks: new Map(epTracks.map((row) => [row.id, row.title])),
  };

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-ink-muted">
          {settings.currentFocus ?? "Personal music development tracker"}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-semibold tabular-nums">{formatMinutes(todayMinutes)}</p>
          <p className="mt-0.5 text-xs text-ink-faint">today</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold tabular-nums">{streak}</p>
          <p className="mt-0.5 text-xs text-ink-faint">day streak</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold tabular-nums">{formatMinutes(weekMinutes)}</p>
          <p className="mt-0.5 text-xs text-ink-faint">last 7 days</p>
        </Card>
      </div>

      <Card className="mb-4">
        <SectionHeading
          title="Weekly target"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {weekPct}% of {formatMinutes(target)}
            </span>
          }
        />
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        {byDomain.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {byDomain.map((row) => (
              <DomainTag key={row.domain} domain={row.domain} minutes={row.minutes} />
            ))}
          </div>
        ) : null}
      </Card>

      <Link href="/log" className="mb-6 block">
        <Button className="w-full">Log a session</Button>
      </Link>

      <SectionHeading
        title="Recent"
        action={
          sessions.length > 0 ? (
            <Link href="/sessions" className="text-sm text-ink-muted underline-offset-4 hover:underline">
              All sessions
            </Link>
          ) : null
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Log a practice block and your streak, weekly total and domain split all start filling in from that one entry."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} today={today} labels={labels} />
          ))}
        </div>
      )}

      <footer className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs text-ink-faint">
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
