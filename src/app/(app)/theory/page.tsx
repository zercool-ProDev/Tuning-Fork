import Link from "next/link";

import { resetConcept } from "@/app/actions/theory";
import { Button, Card, SectionHeading, cn } from "@/components/ui";
import { getCurriculum, getQuizStats, getToday } from "@/db/queries";
import { strength } from "@/lib/srs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Theory · Tuning Fork" };

/** The curriculum path, in the order the stages were agreed. */
const STAGE_LABELS: Record<string, string> = {
  intervals: "Intervals",
  triads: "Triads",
  sevenths: "7th Chords",
  modes: "Modes",
  functional_harmony: "Functional Harmony",
  ii_v_i: "ii-V-I & Reharmonization",
  voice_leading: "Voice Leading",
};

const STAGE_ORDER = Object.keys(STAGE_LABELS);

const STRENGTH_STYLE = {
  New: "text-ink-faint",
  Learning: "text-accent",
  Familiar: "text-accent",
  Solid: "text-positive",
} as const;

export default async function TheoryPage() {
  const [curriculum, stats, today] = await Promise.all([
    getCurriculum(),
    getQuizStats(),
    getToday(),
  ]);

  const due = curriculum.filter(
    (concept) => concept.questionCount > 0 && (concept.dueOn === null || concept.dueOn <= today),
  );
  // A concept is "started" once it has a schedule at all. Keying off
  // repetitions would count a concept you attempted and got wrong as untouched,
  // which is exactly backwards.
  const started = curriculum.filter((concept) => concept.dueOn !== null).length;
  const accuracy =
    stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : null;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Music theory</h1>
        <p className="text-sm text-ink-muted">
          Intervals through voice leading, with weak concepts resurfacing on their own.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="px-3 py-3 text-center">
          <p className="text-xl font-semibold tabular-nums sm:text-2xl">{due.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">due now</p>
        </Card>
        <Card className="px-3 py-3 text-center">
          <p className="text-xl font-semibold tabular-nums sm:text-2xl">
            {started}/{curriculum.length}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">started</p>
        </Card>
        <Card className="px-3 py-3 text-center">
          <p className="text-xl font-semibold tabular-nums sm:text-2xl">
            {accuracy !== null ? `${accuracy}%` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">quiz accuracy</p>
        </Card>
      </div>

      <Link href="/theory/review" className="mb-6 block">
        <Button className="w-full" disabled={due.length === 0}>
          {due.length > 0 ? `Review ${due.length} concept${due.length === 1 ? "" : "s"}` : "Nothing due"}
        </Button>
      </Link>

      {STAGE_ORDER.map((stage) => {
        const concepts = curriculum.filter((concept) => concept.stage === stage);
        if (concepts.length === 0) return null;

        return (
          <div key={stage} className="mb-5">
            <SectionHeading
              title={STAGE_LABELS[stage]}
              action={
                <span className="text-xs tabular-nums text-ink-faint">
                  {concepts.filter((concept) => concept.dueOn !== null).length}/
                  {concepts.length}
                </span>
              }
            />
            <div className="space-y-2">
              {concepts.map((concept) => {
                const state =
                  concept.repetitions === null
                    ? null
                    : {
                        easeFactor: concept.easeFactor ?? 2.5,
                        intervalDays: concept.intervalDays ?? 0,
                        repetitions: concept.repetitions,
                        lapses: concept.lapses,
                        dueOn: concept.dueOn ?? today,
                      };
                const level = strength(state);
                const isDue =
                  concept.questionCount > 0 &&
                  (concept.dueOn === null || concept.dueOn <= today);

                return (
                  <Card key={concept.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{concept.title}</p>
                        {concept.summary ? (
                          <p className="mt-0.5 text-sm text-ink-muted">{concept.summary}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-faint">
                          <span className={STRENGTH_STYLE[level.label]}>{level.label}</span>
                          {concept.questionCount === 0
                            ? " · no questions yet"
                            : ` · ${concept.questionCount} question${concept.questionCount === 1 ? "" : "s"}`}
                          {concept.lapses > 0 ? ` · ${concept.lapses} lapse${concept.lapses === 1 ? "" : "s"}` : ""}
                          {isDue
                            ? " · due now"
                            : concept.dueOn
                              ? ` · next ${concept.dueOn}`
                              : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              level.label === "Solid" ? "bg-positive" : "bg-accent",
                            )}
                            style={{ width: `${level.pct}%` }}
                          />
                        </span>
                        {concept.dueOn !== null ? (
                          <form action={resetConcept}>
                            <input type="hidden" name="conceptId" value={concept.id} />
                            <button
                              type="submit"
                              className="text-[11px] text-ink-faint hover:text-ink"
                            >
                              Reset
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
