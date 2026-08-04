/**
 * Tier names for the skill trees.
 *
 * "Tier 5" says nothing about where you actually are. Named stages answer the
 * question the tree exists to answer — what level am I at on this instrument,
 * and what does the next one demand of me.
 */
export const TIER_LABELS: Record<number, { name: string; blurb: string }> = {
  1: { name: "Foundations", blurb: "Holding the instrument correctly and making a clean sound." },
  2: { name: "Developing", blurb: "The core vocabulary most songs are built from." },
  3: { name: "Fluent", blurb: "Playing with feel, not just accuracy." },
  4: { name: "Advanced", blurb: "Independence, extended harmony, harder time." },
  5: { name: "Professional", blurb: "The techniques that separate a player from a hobbyist." },
  6: { name: "Mastery", blurb: "Performing, improvising and recording at a releasable standard." },
};

export function tierLabel(tier: number) {
  return TIER_LABELS[tier] ?? { name: `Tier ${tier}`, blurb: "" };
}

/**
 * What to work on next: the first unfinished node in the lowest tier that is
 * not yet complete. Prefers something already in progress, so the suggestion
 * pushes you to finish rather than to start yet another thing.
 */
export function nextSkill<T extends { tier: number; status: string; sortOrder: number }>(
  nodes: T[],
): T | null {
  const unfinished = nodes.filter((node) => node.status !== "done");
  if (unfinished.length === 0) return null;

  const lowestTier = Math.min(...unfinished.map((node) => node.tier));
  const inTier = unfinished.filter((node) => node.tier === lowestTier);

  return (
    inTier.find((node) => node.status === "in_progress") ??
    [...inTier].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  );
}
