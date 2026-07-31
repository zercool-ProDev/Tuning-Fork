import { addDays } from "@/lib/dates";

/**
 * Spaced repetition, SM-2, scheduled per concept rather than per question.
 *
 * A review therefore pulls a fresh question from a weak concept instead of
 * re-showing one whose shape you have memorised. Grading is binary — you either
 * got the question right or you did not — which maps onto SM-2's 0-5 quality
 * scale at two fixed points rather than asking you to self-rate every card.
 */

export type SrsState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueOn: string;
};

/** A concept never studied yet: due immediately, at SM-2's default ease. */
export function initialState(today: string): SrsState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueOn: today,
  };
}

const MIN_EASE = 1.3;

/** SM-2's ease adjustment for a given answer quality. */
function nextEase(ease: number, quality: number): number {
  const adjusted =
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASE, Math.round(adjusted * 100) / 100);
}

/**
 * Advance a concept's schedule after an answer.
 *
 * A wrong answer resets the interval to one day and counts a lapse, but keeps
 * the repetition history in `lapses` so a concept you repeatedly trip over is
 * visible as genuinely weak rather than just looking new again.
 */
export function schedule(
  state: SrsState,
  correct: boolean,
  today: string,
): SrsState {
  /**
   * Binary grading mapped onto two fixed SM-2 qualities.
   *
   * 4 is the neutral point: its ease adjustment works out to exactly zero, so a
   * correct answer leaves ease alone and only a failure degrades it. That is
   * deliberate. Using 5 for correct would let ease inflate on every success and
   * stretch intervals on concepts you have merely been lucky with, and with
   * binary grading there is no way to tell "perfect recall" from "just about
   * got there" to justify the boost.
   */
  const quality = correct ? 4 : 2;
  const easeFactor = nextEase(state.easeFactor, quality);

  if (!correct) {
    return {
      easeFactor,
      intervalDays: 1,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueOn: addDays(today, 1),
    };
  }

  const repetitions = state.repetitions + 1;
  // The first two intervals are fixed; after that SM-2 multiplies by ease.
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * easeFactor);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: state.lapses,
    dueOn: addDays(today, intervalDays),
  };
}

/**
 * How well a concept is known, for display only.
 *
 * Thresholds are in days of interval rather than repetition count, because an
 * interval is what actually says "this will still be there in a month".
 */
export function strength(state: SrsState | null): {
  label: "New" | "Learning" | "Familiar" | "Solid";
  pct: number;
} {
  if (!state || state.repetitions === 0) return { label: "New", pct: 0 };
  if (state.intervalDays < 6) return { label: "Learning", pct: 25 };
  if (state.intervalDays < 21) return { label: "Familiar", pct: 60 };
  return { label: "Solid", pct: 100 };
}

/** Concepts due today or earlier, weakest first so the shakiest come up first. */
export function sortByPriority<T extends { dueOn: string | null; lapses: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.dueOn === null && b.dueOn !== null) return 1;
    if (b.dueOn === null && a.dueOn !== null) return -1;
    if (a.dueOn !== null && b.dueOn !== null && a.dueOn !== b.dueOn) {
      return a.dueOn < b.dueOn ? -1 : 1;
    }
    return b.lapses - a.lapses;
  });
}
