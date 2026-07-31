/**
 * Accuracy and trend maths for drill attempts.
 *
 * Pure functions so the awkward cases — a single attempt, a tie, a run of
 * perfect scores, division by zero — can be tested without a database or a
 * browser.
 */

export type Attempt = {
  questionsTotal: number;
  questionsCorrect: number;
  occurredOn: string;
  difficulty: number;
};

/** 0–100, rounded. Returns null when there is nothing to divide by. */
export function accuracy(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}

/**
 * Accuracy across a set of attempts, weighted by question count.
 *
 * Weighted rather than an average of per-attempt percentages: a 20-question
 * drill says more about where you are than a 3-question one, and averaging the
 * percentages would let a tiny drill swing the number as hard as a long one.
 */
export function overallAccuracy(attempts: Attempt[]): number | null {
  const total = attempts.reduce((sum, attempt) => sum + attempt.questionsTotal, 0);
  const correct = attempts.reduce((sum, attempt) => sum + attempt.questionsCorrect, 0);
  return accuracy(correct, total);
}

/**
 * Change in accuracy between the most recent attempts and the ones before.
 *
 * Compares two equal-sized windows so the comparison is like for like. Returns
 * null until there are enough attempts to say anything honest — showing a trend
 * off two data points would be noise dressed up as signal.
 */
export function accuracyTrend(
  attempts: Attempt[],
  window = 5,
): { recent: number; previous: number; delta: number } | null {
  if (attempts.length < window * 2) return null;

  // `attempts` arrives oldest first.
  const recentSlice = attempts.slice(-window);
  const previousSlice = attempts.slice(-window * 2, -window);

  const recent = overallAccuracy(recentSlice);
  const previous = overallAccuracy(previousSlice);
  if (recent === null || previous === null) return null;

  return { recent, previous, delta: recent - previous };
}

/** The hardest difficulty at which accuracy has held at or above `threshold`. */
export function comfortableDifficulty(
  attempts: Attempt[],
  threshold = 80,
): number | null {
  let best: number | null = null;

  for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
    const atLevel = attempts.filter((attempt) => attempt.difficulty === difficulty);
    if (atLevel.length === 0) continue;

    const level = overallAccuracy(atLevel);
    if (level !== null && level >= threshold) best = difficulty;
  }
  return best;
}

/** Per-difficulty breakdown, only for levels that have been attempted. */
export function byDifficulty(attempts: Attempt[]) {
  return [1, 2, 3, 4, 5]
    .map((difficulty) => {
      const atLevel = attempts.filter((attempt) => attempt.difficulty === difficulty);
      return {
        difficulty,
        attempts: atLevel.length,
        accuracy: overallAccuracy(atLevel),
      };
    })
    .filter((row) => row.attempts > 0);
}
