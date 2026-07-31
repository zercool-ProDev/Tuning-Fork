import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteDrillAttempt } from "@/app/actions/drills";
import { AccuracyTrend } from "@/components/accuracy-trend";
import { DrillForm } from "@/components/drill-form";
import { Card, DomainTag, SectionHeading } from "@/components/ui";
import { getDrillAttempts, getDrillTypeByKey, getToday } from "@/db/queries";
import { accuracy } from "@/lib/accuracy";
import { formatSessionDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const drill = await getDrillTypeByKey(key);
  if (!drill) notFound();

  const [attempts, today] = await Promise.all([
    getDrillAttempts(drill.id),
    getToday(),
  ]);

  // Default the difficulty picker to whatever was drilled last.
  const lastDifficulty = attempts.at(-1)?.difficulty ?? 1;
  const history = [...attempts].reverse().slice(0, 20);

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{drill.name}</h1>
          <div className="mt-1">
            <DomainTag domain={drill.domain} />
          </div>
        </div>
        <Link href="/drills" className="shrink-0 text-sm text-ink-muted underline-offset-4 hover:underline">
          All drills
        </Link>
      </header>

      {drill.description ? (
        <p className="mb-4 text-sm text-ink-muted">{drill.description}</p>
      ) : null}

      <div className="space-y-4">
        <AccuracyTrend attempts={attempts} />

        <DrillForm
          drillTypeId={drill.id}
          today={today}
          lastDifficulty={lastDifficulty}
        />

        {history.length > 0 ? (
          <Card>
            <SectionHeading
              title="History"
              action={
                <span className="text-xs text-ink-faint">
                  {attempts.length} total
                </span>
              }
            />
            <ul className="space-y-1.5">
              {history.map((attempt) => {
                const value = accuracy(attempt.questionsCorrect, attempt.questionsTotal);
                return (
                  <li
                    key={attempt.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-ink-faint">
                      {formatSessionDate(attempt.occurredOn, today)}
                      <span className="ml-2">L{attempt.difficulty}</span>
                    </span>
                    <span className="flex items-baseline gap-3">
                      <span className="tabular-nums text-ink-muted">
                        {attempt.questionsCorrect}/{attempt.questionsTotal}
                      </span>
                      <span
                        className={
                          (value ?? 0) >= 80
                            ? "w-10 text-right tabular-nums text-positive"
                            : "w-10 text-right tabular-nums text-ink-muted"
                        }
                      >
                        {value}%
                      </span>
                      <form action={deleteDrillAttempt}>
                        <input type="hidden" name="attemptId" value={attempt.id} />
                        <button
                          type="submit"
                          aria-label={`Delete attempt from ${attempt.occurredOn}`}
                          className="text-xs text-ink-faint hover:text-danger"
                        >
                          ×
                        </button>
                      </form>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
