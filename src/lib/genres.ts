/**
 * Genre coverage maths.
 *
 * The twelve-month goal is "versatile across most major genres", which needs a
 * concrete definition to be trackable at all. These functions supply it, kept
 * pure so the thresholds can be argued with and tested.
 */

export type GenreStanding = {
  genreId: number;
  rating: number | null;
  songs: number;
  minutes: number;
};

/**
 * The rating at which a genre counts as covered.
 *
 * 3 of 5 means "I can hold my own in this style", not "I have mastered it".
 * Versatility is breadth, so the bar is deliberately not set at expert.
 */
export const COVERED_AT = 3;

/** Ratings 1-5, with what each one is claiming. */
export const RATING_LABELS: Record<number, string> = {
  1: "Unfamiliar",
  2: "Dabbled",
  3: "Comfortable",
  4: "Strong",
  5: "Fluent",
};

export function coverage(standings: GenreStanding[]): {
  covered: number;
  rated: number;
  total: number;
  pct: number;
} {
  const rated = standings.filter((standing) => standing.rating !== null).length;
  const covered = standings.filter(
    (standing) => (standing.rating ?? 0) >= COVERED_AT,
  ).length;

  return {
    covered,
    rated,
    total: standings.length,
    // Measured against every genre, not just the rated ones: an unrated genre
    // is not covered, and hiding that would flatter the number.
    pct: standings.length === 0 ? 0 : Math.round((covered / standings.length) * 100),
  };
}

/**
 * Genres worth attention next: unrated first, then weakest, then those with no
 * repertoire to back the rating up.
 *
 * A genre you rate 4 but have never learned a song in is a claim without
 * evidence, so it ranks above a genre rated 3 with five songs behind it.
 */
export function suggestFocus(standings: GenreStanding[], limit = 3): number[] {
  return [...standings]
    .sort((a, b) => {
      if (a.rating === null && b.rating !== null) return -1;
      if (b.rating === null && a.rating !== null) return 1;
      if ((a.rating ?? 0) !== (b.rating ?? 0)) return (a.rating ?? 0) - (b.rating ?? 0);
      return a.songs - b.songs;
    })
    .slice(0, limit)
    .map((standing) => standing.genreId);
}

/** First day of the month containing `date`, as YYYY-MM-01. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** "July 2026" from a YYYY-MM-DD. */
export function monthLabel(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

/**
 * Whether a rating is backed by anything observable.
 *
 * Self-rating alone drifts — this is what lets the map distinguish a genre you
 * have actually played in from one you merely feel positive about.
 */
export function hasEvidence(standing: GenreStanding): boolean {
  return standing.songs > 0 || standing.minutes >= 60;
}
