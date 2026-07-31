/**
 * Date helpers that respect the configured timezone.
 *
 * Every "what day is it" question in the app has to go through here. Computing
 * a day boundary from the server's UTC clock would put an 11pm Central session
 * on the following day, which silently breaks streaks and puts heatmap cells in
 * the wrong square — the kind of bug that looks like the app losing data.
 */

/** Today's calendar date in the given timezone, as YYYY-MM-DD. */
export function todayIn(timezone: string): string {
  // en-CA formats as YYYY-MM-DD, which is also the shape Postgres `date` wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Shift a YYYY-MM-DD string by whole days without tripping over DST. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  // Anchored at UTC noon so a ±1 day shift never lands on a DST discontinuity.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const parse = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** "Mon 14 Jul", or "Today" / "Yesterday" when close enough to be worth it. */
export function formatSessionDate(isoDate: string, today: string): string {
  const delta = daysBetween(isoDate, today);
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";

  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(delta > 300 ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** "1h 25m", "45m", "—". */
export function formatMinutes(minutes: number): string {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
