import { cn } from "@/components/ui";
import { addDays, formatMinutes } from "@/lib/dates";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * The last seven days as bars.
 *
 * Heights are scaled to the busiest day in the window rather than to the weekly
 * target — the question this answers is "how is this week shaped", and a fixed
 * scale would flatten every bar to nothing on a light week.
 */
export function WeekBars({
  today,
  minutesByDay,
}: {
  today: string;
  minutesByDay: Record<string, number>;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, -(6 - index));
    return { date, minutes: minutesByDay[date] ?? 0 };
  });

  const peak = Math.max(...days.map((day) => day.minutes), 1);

  return (
    <div className="flex items-end justify-between gap-1.5">
      {days.map((day) => {
        const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
        const height = day.minutes > 0 ? Math.max(8, (day.minutes / peak) * 100) : 3;

        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-ink-faint">
              {day.minutes > 0 ? formatMinutes(day.minutes) : ""}
            </span>
            <div className="flex h-20 w-full items-end">
              <div
                className={cn(
                  "w-full rounded-md",
                  day.minutes > 0 ? "bg-accent" : "bg-surface-3",
                )}
                style={{ height: `${height}%` }}
                title={`${day.date}: ${formatMinutes(day.minutes)}`}
              />
            </div>
            <span
              className={cn(
                "text-[11px]",
                day.date === today ? "font-semibold text-ink" : "text-ink-faint",
              )}
            >
              {WEEKDAY_INITIALS[weekday]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
