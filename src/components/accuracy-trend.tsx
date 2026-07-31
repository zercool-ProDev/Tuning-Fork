import { Card, SectionHeading, cn } from "@/components/ui";
import { accuracy, accuracyTrend, byDifficulty, comfortableDifficulty, overallAccuracy } from "@/lib/accuracy";
import type { Attempt } from "@/lib/accuracy";

/**
 * Accuracy as a trend, which is what the spec asked for rather than raw scores.
 *
 * The line is drawn as an SVG polyline rather than bars: accuracy is a
 * continuous quantity moving over time, and bars would imply each attempt is a
 * discrete tally worth comparing side by side.
 */
export function AccuracyTrend({ attempts }: { attempts: Attempt[] }) {
  const overall = overallAccuracy(attempts);
  const trend = accuracyTrend(attempts);
  const comfortable = comfortableDifficulty(attempts);
  const levels = byDifficulty(attempts);

  // Enough points to read as a line without becoming a smear on a phone.
  const points = attempts.slice(-30).map((attempt, index, all) => {
    const value = accuracy(attempt.questionsCorrect, attempt.questionsTotal) ?? 0;
    const x = all.length === 1 ? 50 : (index / (all.length - 1)) * 100;
    return { x, y: 100 - value, value };
  });

  return (
    <Card className="space-y-4">
      <SectionHeading
        title="Accuracy"
        action={
          overall !== null ? (
            <span className="text-sm tabular-nums text-ink-muted">
              {overall}% overall
              {trend ? (
                <span className={trend.delta >= 0 ? "text-positive" : "text-danger"}>
                  {" "}
                  {trend.delta >= 0 ? "+" : "−"}
                  {Math.abs(trend.delta)} recently
                </span>
              ) : null}
            </span>
          ) : null
        }
      />

      {points.length < 2 ? (
        <p className="text-sm text-ink-muted">
          {points.length === 0
            ? "No attempts logged yet. Record one below and the trend starts building."
            : "One attempt so far. A second gives this something to plot."}
        </p>
      ) : (
        <div className="relative h-28 pr-8">
          {/* The scale is a fixed 0-100% rather than fitted to the data, so the
              line means the same thing week to week. The axis labels are what
              stop the unused lower half reading as a rendering bug. */}
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
          <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-positive/30" />
          <span className="absolute top-0 right-0 text-[10px] text-ink-faint">100%</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2 text-[10px] text-ink-faint">
            50%
          </span>
          <span className="absolute right-0 bottom-0 text-[10px] text-ink-faint">0%</span>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="size-full"
            role="img"
            aria-label={`Accuracy over the last ${points.length} attempts, currently ${overall}%`}
          >
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute top-[20%] left-0 -translate-y-1/2 bg-surface-1 pr-1 text-[10px] text-positive/70">
            80%
          </span>
        </div>
      )}

      {trend ? (
        <p className="text-xs text-ink-faint">
          Last 5 attempts {trend.recent}%, the 5 before {trend.previous}%.
        </p>
      ) : attempts.length > 0 ? (
        <p className="text-xs text-ink-faint">
          {10 - attempts.length} more {10 - attempts.length === 1 ? "attempt" : "attempts"} before
          a trend can be read fairly.
        </p>
      ) : null}

      {levels.length > 0 ? (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-xs text-ink-faint">
            {comfortable
              ? `Comfortable up to difficulty ${comfortable} — 80% or better there.`
              : "Not yet at 80% on any difficulty."}
          </p>
          <ul className="space-y-1.5">
            {levels.map((level) => (
              <li key={level.difficulty} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-ink-faint">Level {level.difficulty}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      (level.accuracy ?? 0) >= 80 ? "bg-positive" : "bg-accent",
                    )}
                    style={{ width: `${level.accuracy ?? 0}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-ink-muted">
                  {level.accuracy}% · {level.attempts}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
