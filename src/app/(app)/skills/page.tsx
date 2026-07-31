import Link from "next/link";

import { Card, SectionHeading } from "@/components/ui";
import {
  getInstruments,
  getLatestFluency,
  getTreeProgressSummary,
} from "@/db/queries";
import { formatMinutes } from "@/lib/dates";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Skills · Tuning Fork" };

/** Minutes logged per instrument, plus the Logic Pro domain total, in one pass. */
async function timeByTree() {
  const [instrumentRows, [logicRow]] = await Promise.all([
    db()
      .select({
        instrumentId: schema.sessionSegments.instrumentId,
        minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int`,
      })
      .from(schema.sessionSegments)
      .where(sql`${schema.sessionSegments.instrumentId} is not null`)
      .groupBy(schema.sessionSegments.instrumentId),
    db()
      .select({ minutes: sql<number>`coalesce(sum(${schema.sessionSegments.minutes}), 0)::int` })
      .from(schema.sessionSegments)
      .where(eq(schema.sessionSegments.domain, "logic_production")),
  ]);

  return {
    byInstrument: new Map(
      instrumentRows
        .filter((row) => row.instrumentId !== null)
        .map((row) => [row.instrumentId!, row.minutes]),
    ),
    logic: logicRow?.minutes ?? 0,
  };
}

function TreeCard({
  href,
  name,
  done,
  total,
  inProgress,
  minutes,
  fluency,
}: {
  href: string;
  name: string;
  done: number;
  total: number;
  inProgress: number;
  minutes: number;
  fluency?: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link href={href} className="block">
      <Card className="transition hover:border-line-strong">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium">{name}</h3>
          {/* The headline number and the bar must measure the same thing, so
              this is always skill progress; fluency is labelled below. */}
          <span className="text-sm tabular-nums text-ink-muted">{pct}%</span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-positive" style={{ width: `${pct}%` }} />
        </div>

        <p className="mt-2 text-xs text-ink-faint">
          {done}/{total} skills
          {inProgress > 0 ? ` · ${inProgress} in progress` : ""}
          {fluency !== undefined ? ` · fluency ${fluency}/10` : ""}
          {minutes > 0 ? ` · ${formatMinutes(minutes)} logged` : ""}
        </p>
      </Card>
    </Link>
  );
}

export default async function SkillsPage() {
  const [instruments, summary, fluency, time] = await Promise.all([
    getInstruments(),
    getTreeProgressSummary(),
    getLatestFluency(),
    timeByTree(),
  ]);

  const byInstrument = new Map(
    summary
      .filter((row) => row.treeKind === "instrument" && row.instrumentId !== null)
      .map((row) => [row.instrumentId!, row]),
  );
  const logic = summary.find((row) => row.treeKind === "logic");

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-ink-muted">
          Technique milestones, repertoire and fluency across every instrument.
        </p>
      </header>

      <SectionHeading title="Instruments" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {instruments.map((instrument) => {
          const row = byInstrument.get(instrument.id);
          return (
            <TreeCard
              key={instrument.id}
              href={`/skills/${instrument.key}`}
              name={instrument.name}
              done={row?.done ?? 0}
              total={row?.total ?? 0}
              inProgress={row?.inProgress ?? 0}
              minutes={time.byInstrument.get(instrument.id) ?? 0}
              fluency={fluency.get(instrument.id)?.rating}
            />
          );
        })}
      </div>

      <SectionHeading title="Production" />
      <TreeCard
        href="/skills/logic"
        name="Logic Pro"
        done={logic?.done ?? 0}
        total={logic?.total ?? 0}
        inProgress={logic?.inProgress ?? 0}
        minutes={time.logic}
      />
    </>
  );
}
