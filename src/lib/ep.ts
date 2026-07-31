import { daysBetween } from "@/lib/dates";

/**
 * EP pipeline maths.
 *
 * Kept pure and separate from the queries so the awkward parts — a track that
 * has never moved, a release with no tracks, the difference between "slow" and
 * "stalled" — are testable without a database.
 */

export const EP_STAGES = [
  { value: "idea", label: "Idea", short: "Idea" },
  { value: "writing", label: "Writing", short: "Write" },
  { value: "arrangement", label: "Arrangement", short: "Arr" },
  { value: "tracking", label: "Tracking", short: "Track" },
  { value: "mixing", label: "Mixing", short: "Mix" },
  { value: "mastering", label: "Mastering", short: "Master" },
  { value: "released", label: "Released", short: "Out" },
] as const;

export type EpStage = (typeof EP_STAGES)[number]["value"];

const ORDER = EP_STAGES.map((stage) => stage.value) as readonly EpStage[];

export function stageIndex(stage: EpStage): number {
  return ORDER.indexOf(stage);
}

export function stageLabel(stage: EpStage): string {
  return EP_STAGES[stageIndex(stage)]?.label ?? stage;
}

export function nextStage(stage: EpStage): EpStage | null {
  const index = stageIndex(stage);
  return index >= 0 && index < ORDER.length - 1 ? ORDER[index + 1] : null;
}

export function previousStage(stage: EpStage): EpStage | null {
  const index = stageIndex(stage);
  return index > 0 ? ORDER[index - 1] : null;
}

/** 0–100. "Released" is the only 100; idea is deliberately not zero. */
export function trackProgress(stage: EpStage): number {
  const index = stageIndex(stage);
  if (index < 0) return 0;
  return Math.round((index / (ORDER.length - 1)) * 100);
}

/**
 * Release progress: the mean of its tracks.
 *
 * Averaging rather than counting finished tracks, because five singles all at
 * mixing is real progress toward shipping, and a count would report it as zero.
 */
export function releaseProgress(stages: EpStage[]): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((sum, stage) => sum + trackProgress(stage), 0);
  return Math.round(total / stages.length);
}

/**
 * How long a track has sat where it is, and whether that is worth flagging.
 *
 * Thresholds are per stage rather than global: an idea can sit for months
 * harmlessly, but a mix left for a month usually means it is stuck. Released
 * tracks are never stale — they are finished.
 */
const STALE_AFTER_DAYS: Record<EpStage, number | null> = {
  idea: null,
  writing: 45,
  arrangement: 30,
  tracking: 30,
  mixing: 21,
  mastering: 14,
  released: null,
};

export function stageAge(
  stage: EpStage,
  stageUpdatedOn: string,
  today: string,
): { days: number; stale: boolean } {
  const days = Math.max(0, daysBetween(stageUpdatedOn, today));
  const threshold = STALE_AFTER_DAYS[stage];
  return { days, stale: threshold !== null && days >= threshold };
}

/** Days until a target date; negative means overdue. Null when none is set. */
export function daysUntil(targetDate: string | null, today: string): number | null {
  if (!targetDate) return null;
  return daysBetween(today, targetDate);
}

/**
 * Time spent in each completed stage, from the transition history.
 *
 * This is the point of recording events rather than only the current stage: it
 * answers "tracking took three weeks, mixing has been sitting for five", which
 * the current stage alone can never tell you.
 */
export function timeInStages(
  events: { toStage: EpStage; changedOn: string }[],
  today: string,
): { stage: EpStage; days: number; ongoing: boolean }[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => (a.changedOn < b.changedOn ? -1 : 1));

  return sorted.map((event, index) => {
    const next = sorted[index + 1];
    const end = next ? next.changedOn : today;
    return {
      stage: event.toStage,
      days: Math.max(0, daysBetween(event.changedOn, end)),
      ongoing: !next,
    };
  });
}
