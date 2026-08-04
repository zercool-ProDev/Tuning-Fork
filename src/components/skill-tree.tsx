import { setSkillStatus } from "@/app/actions/skills";
import { Card, SectionHeading, cn } from "@/components/ui";
import type { SkillNodeWithProgress } from "@/db/queries";
import { nextSkill, tierLabel } from "@/lib/tiers";

/**
 * The shared skill tree. One component renders all four instrument trees and
 * the Logic Pro tree — the reuse this stage exists for.
 *
 * Nodes are grouped by tier, which reads as a progression without pretending to
 * be a strict dependency graph. Nothing is locked: a real player dips into an
 * advanced technique early, and a tree that refused to let you tick something
 * off would be lying about how practice actually goes.
 */

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "Working on it",
  done: "Done",
} as const;

/** Clicking cycles forward; this is the whole interaction. */
const NEXT_STATUS = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
} as const;

const STATUS_STYLE = {
  not_started: "border-line bg-surface-2 text-ink-muted",
  in_progress: "border-accent/50 bg-accent/10 text-ink",
  done: "border-positive/40 bg-positive/10 text-ink",
} as const;

function TierGroup({
  tier,
  nodes,
  redirectTo,
}: {
  tier: number;
  nodes: SkillNodeWithProgress[];
  redirectTo: string;
}) {
  const done = nodes.filter((node) => node.status === "done").length;
  const label = tierLabel(tier);
  const complete = done === nodes.length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium tracking-wide text-ink-faint uppercase">
          {label.name}
          {complete ? <span className="ml-2 text-positive">cleared</span> : null}
        </h3>
        <span className="text-xs tabular-nums text-ink-faint">
          {done}/{nodes.length}
        </span>
      </div>
      {label.blurb ? (
        <p className="-mt-1 text-xs text-ink-faint">{label.blurb}</p>
      ) : null}

      <ul className="space-y-2">
        {nodes.map((node) => (
          <li key={node.id}>
            <form action={setSkillStatus}>
              <input type="hidden" name="nodeId" value={node.id} />
              <input type="hidden" name="status" value={NEXT_STATUS[node.status]} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button
                type="submit"
                aria-label={`${node.title} — ${STATUS_LABEL[node.status]}. Change to ${STATUS_LABEL[NEXT_STATUS[node.status]]}.`}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:border-line-strong",
                  STATUS_STYLE[node.status],
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px]",
                    node.status === "done"
                      ? "border-positive bg-positive text-surface-0"
                      : node.status === "in_progress"
                        ? "border-accent text-accent"
                        : "border-line-strong text-transparent",
                  )}
                >
                  {node.status === "done" ? "✓" : node.status === "in_progress" ? "•" : "○"}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{node.title}</span>
                  {node.description ? (
                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {node.description}
                    </span>
                  ) : null}
                  {node.status === "done" && node.achievedOn ? (
                    <span className="mt-1 block text-xs text-ink-faint">
                      Done {node.achievedOn}
                    </span>
                  ) : null}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkillTree({
  nodes,
  redirectTo,
}: {
  nodes: SkillNodeWithProgress[];
  redirectTo: string;
}) {
  const tiers = [...new Set(nodes.map((node) => node.tier))].sort((a, b) => a - b);
  const done = nodes.filter((node) => node.status === "done").length;
  const inProgress = nodes.filter((node) => node.status === "in_progress").length;
  const pct = nodes.length > 0 ? Math.round((done / nodes.length) * 100) : 0;
  const next = nextSkill(nodes);

  return (
    <Card className="space-y-5">
      <div>
        <SectionHeading
          title="Skill tree"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {done}/{nodes.length} done
              {inProgress > 0 ? (
                <span className="text-accent"> · {inProgress} in progress</span>
              ) : null}
            </span>
          }
        />
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-positive" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Tap a skill to move it on: not started → working on it → done.
        </p>

        {next ? (
          <p className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <span className="text-ink-faint">Next up · {tierLabel(next.tier).name}</span>
            <br />
            <span className="font-medium">{next.title}</span>
          </p>
        ) : (
          <p className="mt-3 rounded-xl border border-positive/40 bg-surface-2 p-3 text-sm">
            <span className="font-medium text-positive">Every tier cleared.</span>{" "}
            <span className="text-ink-muted">
              Nothing left to tick here — the honest next step is repertoire that
              demands these skills, and rating your fluency again to see whether it
              has actually moved.
            </span>
          </p>
        )}
      </div>

      {tiers.map((tier) => (
        <TierGroup
          key={tier}
          tier={tier}
          nodes={nodes.filter((node) => node.tier === tier)}
          redirectTo={redirectTo}
        />
      ))}
    </Card>
  );
}
