import Link from "next/link";

import { Card, DomainTag, SectionHeading } from "@/components/ui";
import { getDrillSummary, getDrillTypes, getRecentDrillAttempts, getToday } from "@/db/queries";
import { accuracy } from "@/lib/accuracy";
import { formatSessionDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Drills · Tuning Fork" };

type Summary = {
  attempts: number;
  totalQuestions: number;
  totalCorrect: number;
  lastOn: string | null;
  bestDifficulty: number;
};

function DrillCard({
  drillKey,
  name,
  description,
  summary,
  today,
}: {
  drillKey: string;
  name: string;
  description: string | null;
  summary: Summary | undefined;
  today: string;
}) {
  const overall = summary ? accuracy(summary.totalCorrect, summary.totalQuestions) : null;

  return (
    <Link href={`/drills/${drillKey}`} className="block">
      <Card className="transition hover:border-line-strong">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium">{name}</h3>
          <span className="text-sm tabular-nums text-ink-muted">
            {overall !== null ? `${overall}%` : "—"}
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={overall !== null && overall >= 80 ? "h-full bg-positive" : "h-full bg-accent"}
            style={{ width: `${overall ?? 0}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-ink-faint">
          {summary
            ? `${summary.attempts} ${summary.attempts === 1 ? "attempt" : "attempts"} · up to level ${summary.bestDifficulty} · last ${formatSessionDate(summary.lastOn!, today).toLowerCase()}`
            : (description ?? "Not started")}
        </p>
      </Card>
    </Link>
  );
}

export default async function DrillsPage() {
  const [types, summary, recent, today] = await Promise.all([
    getDrillTypes(),
    getDrillSummary(),
    getRecentDrillAttempts(6),
    getToday(),
  ]);

  const ear = types.filter((type) => type.domain === "ear_training");
  const sight = types.filter((type) => type.domain === "sight_reading");

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Drills</h1>
        <p className="text-sm text-ink-muted">
          Log runs from your trainer of choice. What matters is the trend, not any one score.
        </p>
      </header>

      <div className="mb-3 flex items-center gap-3">
        <DomainTag domain="ear_training" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {ear.map((type) => (
          <DrillCard
            key={type.id}
            drillKey={type.key}
            name={type.name}
            description={type.description}
            summary={summary.get(type.id)}
            today={today}
          />
        ))}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <DomainTag domain="sight_reading" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {sight.map((type) => (
          <DrillCard
            key={type.id}
            drillKey={type.key}
            name={type.name}
            description={type.description}
            summary={summary.get(type.id)}
            today={today}
          />
        ))}
      </div>

      {recent.length > 0 ? (
        <>
          <SectionHeading title="Recent attempts" />
          <Card>
            <ul className="space-y-2">
              {recent.map(({ attempt, drillName, drillKey }) => {
                const value = accuracy(attempt.questionsCorrect, attempt.questionsTotal);
                return (
                  <li key={attempt.id} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/drills/${drillKey}`}
                      className="truncate text-sm underline-offset-4 hover:underline"
                    >
                      {drillName}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                      {attempt.questionsCorrect}/{attempt.questionsTotal}
                      <span
                        className={
                          (value ?? 0) >= 80 ? "ml-2 text-positive" : "ml-2 text-ink-faint"
                        }
                      >
                        {value}%
                      </span>
                      <span className="ml-2 text-ink-faint">
                        {formatSessionDate(attempt.occurredOn, today)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      ) : null}
    </>
  );
}
