import { addDays, daysBetween } from "@/lib/dates";

/**
 * Streak and consistency maths.
 *
 * Pure functions over a set of YYYY-MM-DD strings, deliberately separated from
 * the queries so the edge cases — an empty today, a gap over a month boundary,
 * a single isolated day — can be tested without a database.
 */

/**
 * Consecutive days ending today, or ending yesterday if today is still empty.
 *
 * The grace for today is the whole point: a streak that resets to zero every
 * midnight and only recovers after you practise is discouraging at exactly the
 * moment it should be doing the opposite.
 */
export function currentStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive days anywhere in the set. */
export function longestStreak(days: Set<string>): number {
  if (days.size === 0) return 0;

  const sorted = [...days].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    run = daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Days practised within the calendar month containing `today`. */
export function daysThisMonth(days: Set<string>, today: string): number {
  const prefix = today.slice(0, 7);
  let count = 0;
  for (const day of days) if (day.startsWith(prefix)) count += 1;
  return count;
}

/**
 * Buckets a day's minutes into a heatmap intensity, 0–4.
 *
 * Thresholds are absolute rather than relative to the busiest day, so the grid
 * means the same thing month to month. A relative scale would make a light week
 * look identical to a heavy one.
 */
export function intensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

/**
 * Calendar grid for the heatmap: whole weeks, Sunday-first, oldest week first,
 * ending on the week containing `today`. Days outside the range are null so the
 * grid stays rectangular without inventing data.
 */
export function heatmapWeeks(
  today: string,
  weeks: number,
): (string | null)[][] {
  // Step back to the Sunday of the current week.
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const thisSunday = addDays(today, -weekday);
  const firstSunday = addDays(thisSunday, -(weeks - 1) * 7);

  const grid: (string | null)[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const column: (string | null)[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(firstSunday, week * 7 + offset);
      // Future days in the current week render as gaps, not as zero-practice.
      column.push(date > today ? null : date);
    }
    grid.push(column);
  }
  return grid;
}
