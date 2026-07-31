import { addFluencyRating } from "@/app/actions/skills";
import { Button, Card, SectionHeading, cn } from "@/components/ui";

type Rating = { id: number; rating: number; ratedOn: string; notes: string | null };

/**
 * Self-rated fluency, as a trend rather than a single number.
 *
 * The ratings table is append-only on purpose: the point is watching the line
 * move over months, which an overwritten value could never show.
 */
export function Fluency({
  instrumentId,
  ratings,
  redirectTo,
}: {
  instrumentId: number;
  ratings: Rating[];
  redirectTo: string;
}) {
  const latest = ratings.at(-1);
  const first = ratings[0];
  const delta = latest && first && ratings.length > 1 ? latest.rating - first.rating : 0;

  // Only the recent history is worth showing on a phone.
  const recent = ratings.slice(-12);
  const peak = Math.max(10, ...recent.map((entry) => entry.rating));

  return (
    <Card className="space-y-4">
      <SectionHeading
        title="Fluency"
        action={
          latest ? (
            <span className="text-sm tabular-nums text-ink-muted">
              {latest.rating}/10
              {delta !== 0 ? (
                <span className={delta > 0 ? "text-positive" : "text-ink-faint"}>
                  {" "}
                  {delta > 0 ? "+" : "−"}
                  {Math.abs(delta)} since {first.ratedOn.slice(0, 7)}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-sm text-ink-faint">Not rated yet</span>
          )
        }
      />

      {/* A single rating drawn as a bar chart is one full-width block, which
          reads as a filled meter rather than a trend. Wait for a second point. */}
      {recent.length > 1 ? (
        <div className="flex h-16 items-end gap-1">
          {recent.map((entry) => (
            <div
              key={entry.id}
              title={`${entry.ratedOn}: ${entry.rating}/10`}
              className="flex-1 rounded-t bg-accent/70"
              style={{ height: `${(entry.rating / peak) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <form action={addFluencyRating} className="space-y-2">
        <input type="hidden" name="instrumentId" value={instrumentId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <p className="text-sm text-ink-muted">Rate where you are today</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <Button
              key={value}
              type="submit"
              name="rating"
              value={value}
              variant="secondary"
              className={cn(
                "min-w-11 flex-1 px-0",
                latest?.rating === value && "border-accent text-accent",
              )}
            >
              {value}
            </Button>
          ))}
        </div>
      </form>
    </Card>
  );
}
