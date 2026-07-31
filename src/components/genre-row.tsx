import { rateGenre } from "@/app/actions/genres";
import { cn } from "@/components/ui";
import { formatMinutes } from "@/lib/dates";
import { COVERED_AT, RATING_LABELS, hasEvidence } from "@/lib/genres";

type Genre = {
  id: number;
  name: string;
  rating: number | null;
  ratedOn: string | null;
  history: { rating: number; ratedOn: string }[];
  songs: number;
  minutes: number;
  notes: number;
};

/**
 * One genre in the map: name, a five-step rating, and the evidence behind it.
 *
 * A row rather than a grid cell. Twelve genres by five ratings in a true grid
 * gives sixty tap targets too small for a thumb; a row per genre keeps every
 * button at a usable size and still scans top to bottom.
 */
export function GenreRow({ genre, focus }: { genre: Genre; focus: boolean }) {
  const covered = (genre.rating ?? 0) >= COVERED_AT;
  const evidence = hasEvidence({
    genreId: genre.id,
    rating: genre.rating,
    songs: genre.songs,
    minutes: genre.minutes,
  });
  const previous = genre.history.length > 1 ? genre.history.at(-2)!.rating : null;
  const delta = previous !== null && genre.rating !== null ? genre.rating - previous : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        covered ? "border-line bg-surface-2" : "border-line bg-surface-1",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        {/* The badge sits beside the heading, not inside it, so the accessible
            name of the heading stays the genre itself. */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate font-medium">{genre.name}</h3>
          {focus ? (
            <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
              focus
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            covered ? "text-positive" : "text-ink-faint",
          )}
        >
          {genre.rating !== null ? RATING_LABELS[genre.rating] : "Not rated"}
          {delta !== 0 ? (
            <span className={delta > 0 ? " text-positive" : " text-ink-faint"}>
              {" "}
              {delta > 0 ? "↑" : "↓"}
            </span>
          ) : null}
        </span>
      </div>

      <form action={rateGenre} className="mt-2 flex gap-1.5">
        <input type="hidden" name="genreId" value={genre.id} />
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="submit"
            name="rating"
            value={value}
            aria-label={`Rate ${genre.name} ${value} of 5 — ${RATING_LABELS[value]}`}
            aria-pressed={genre.rating === value}
            className={cn(
              "min-h-11 flex-1 rounded-lg border text-sm tabular-nums transition",
              genre.rating === value
                ? value >= COVERED_AT
                  ? "border-positive bg-positive/20 font-semibold text-ink"
                  : "border-accent bg-accent/20 font-semibold text-ink"
                : "border-line bg-surface-2 text-ink-faint hover:text-ink",
            )}
          >
            {value}
          </button>
        ))}
      </form>

      <p className="mt-2 text-[11px] text-ink-faint">
        {genre.songs > 0 ? `${genre.songs} song${genre.songs === 1 ? "" : "s"}` : "no songs"}
        {genre.minutes > 0 ? ` · ${formatMinutes(genre.minutes)}` : ""}
        {genre.notes > 0 ? ` · ${genre.notes} note${genre.notes === 1 ? "" : "s"}` : ""}
        {genre.rating !== null && !evidence ? (
          <span className="text-accent"> · rated but nothing logged yet</span>
        ) : null}
      </p>
    </div>
  );
}
