"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/components/ui";
import { formatMinutes, formatSessionDate } from "@/lib/dates";
import { heatmapWeeks, intensity } from "@/lib/streaks";

/**
 * Contribution heatmap over the practice log.
 *
 * A year of weeks is far wider than a phone, so the grid scrolls inside its own
 * container and is scrolled to the right edge on mount — the recent weeks are
 * the ones worth seeing first, and without this you land on last autumn.
 */

const LEVEL_CLASS = [
  "bg-surface-2",
  "bg-accent/25",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
] as const;

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function Heatmap({
  today,
  minutesByDay,
  weeks = 27,
}: {
  today: string;
  minutesByDay: Record<string, number>;
  weeks?: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);

  const grid = heatmapWeeks(today, weeks);

  // A month label sits above the first week whose Sunday starts a new month.
  const monthLabels = grid.map((column, index) => {
    const first = column.find(Boolean);
    if (!first) return null;
    const previous = index > 0 ? grid[index - 1].find(Boolean) : null;
    if (previous && previous.slice(5, 7) === first.slice(5, 7)) return null;
    return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(
      new Date(`${first}T12:00:00Z`),
    );
  });

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1">
          {/* Sticky so the day labels stay put while the weeks scroll past. */}
          <div className="sticky left-0 z-10 flex shrink-0 flex-col gap-1 bg-surface-1 pt-5 pr-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={index}
                className="h-3 text-[10px] leading-3 text-ink-faint"
                style={{ width: "1.75rem" }}
              >
                {label}
              </span>
            ))}
          </div>

          {grid.map((column, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              <span className="h-4 text-[10px] leading-4 text-ink-faint">
                {monthLabels[weekIndex] ?? ""}
              </span>
              {column.map((date, dayIndex) => {
                if (!date) {
                  return <span key={dayIndex} className="size-3" aria-hidden />;
                }
                const minutes = minutesByDay[date] ?? 0;
                return (
                  <span
                    key={date}
                    title={`${formatSessionDate(date, today)} · ${formatMinutes(minutes)}`}
                    className={cn(
                      "size-3 rounded-[3px]",
                      LEVEL_CLASS[intensity(minutes)],
                      date === today && "ring-1 ring-ink-faint",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-ink-faint">
        <span>Less</span>
        {LEVEL_CLASS.map((className, index) => (
          <span key={index} className={cn("size-3 rounded-[3px]", className)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
