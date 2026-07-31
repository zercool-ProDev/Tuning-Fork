import Link from "next/link";

import { Card } from "@/components/ui";
import {
  getCurriculum,
  getGenresWithContext,
  getRelease,
  getTracksWithContext,
  getDrillSummary,
  getDrillTypes,
  getInstruments,
  getLatestFluency,
  getToday,
  getTreeProgressSummary,
} from "@/db/queries";
import { accuracy } from "@/lib/accuracy";
import { releaseProgress, stageAge, type EpStage } from "@/lib/ep";
import { coverage } from "@/lib/genres";

export const dynamic = "force-dynamic";

export const metadata = { title: "Practice · Tuning Fork" };

/**
 * Hub for every practice area.
 *
 * The bottom bar tops out at about five thumb-reachable items, and the plan has
 * more areas than that. Rather than cramming them in or hiding them behind a
 * "more" menu, they live here — each card carrying a live number so the page
 * earns its place instead of being a bare menu.
 */
function AreaCard({
  href,
  name,
  stat,
  detail,
  pct,
  urgent,
}: {
  href: string;
  name: string;
  stat: string;
  detail: string;
  pct?: number;
  urgent?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition hover:border-line-strong">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium">{name}</h3>
          <span
            className={
              urgent ? "text-sm tabular-nums text-accent" : "text-sm tabular-nums text-ink-muted"
            }
          >
            {stat}
          </span>
        </div>
        {pct !== undefined ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-positive" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-ink-faint">{detail}</p>
      </Card>
    </Link>
  );
}

export default async function PracticePage() {
  const [today, instruments, trees, fluency, drillTypes, drills, curriculum, release, genres] =
    await Promise.all([
      getToday(),
      getInstruments(),
      getTreeProgressSummary(),
      getLatestFluency(),
      getDrillTypes(),
      getDrillSummary(),
      getCurriculum(),
      getRelease(),
      getGenresWithContext(),
    ]);

  const epTracks = release ? await getTracksWithContext(release.id) : [];
  const epStages = epTracks.map((track) => track.stage as EpStage);
  const epProgress = releaseProgress(epStages);
  const epStalling = epTracks.filter((track) =>
    stageAge(track.stage as EpStage, track.stageUpdatedAt.toISOString().slice(0, 10), today).stale,
  ).length;

  const genreStats = coverage(
    genres.map((genre) => ({
      genreId: genre.id,
      rating: genre.rating,
      songs: genre.songs,
      minutes: genre.minutes,
    })),
  );

  const instrumentTrees = trees.filter((row) => row.treeKind === "instrument");
  const skillsDone = instrumentTrees.reduce((sum, row) => sum + row.done, 0);
  const skillsTotal = instrumentTrees.reduce((sum, row) => sum + row.total, 0);
  const logic = trees.find((row) => row.treeKind === "logic");

  const ratedCount = instruments.filter((instrument) => fluency.has(instrument.id)).length;

  const drillTotals = [...drills.values()].reduce(
    (sum, row) => ({
      questions: sum.questions + row.totalQuestions,
      correct: sum.correct + row.totalCorrect,
      attempts: sum.attempts + row.attempts,
    }),
    { questions: 0, correct: 0, attempts: 0 },
  );
  const drillAccuracy = accuracy(drillTotals.correct, drillTotals.questions);
  const drillsStarted = drills.size;

  const dueConcepts = curriculum.filter(
    (concept) => concept.questionCount > 0 && (concept.dueOn === null || concept.dueOn <= today),
  ).length;
  const conceptsStarted = curriculum.filter((concept) => concept.dueOn !== null).length;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-sm text-ink-muted">Everything you are working on, in one place.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <AreaCard
          href="/skills"
          name="Instruments"
          stat={skillsTotal > 0 ? `${Math.round((skillsDone / skillsTotal) * 100)}%` : "—"}
          pct={skillsTotal > 0 ? (skillsDone / skillsTotal) * 100 : 0}
          detail={`${skillsDone}/${skillsTotal} skills · ${ratedCount}/${instruments.length} rated for fluency`}
        />

        <AreaCard
          href="/skills/logic"
          name="Logic Pro"
          stat={logic && logic.total > 0 ? `${Math.round((logic.done / logic.total) * 100)}%` : "—"}
          pct={logic && logic.total > 0 ? (logic.done / logic.total) * 100 : 0}
          detail={`${logic?.done ?? 0}/${logic?.total ?? 0} production skills`}
        />

        <AreaCard
          href="/drills"
          name="Ear & Sight Reading"
          stat={drillAccuracy !== null ? `${drillAccuracy}%` : "—"}
          pct={drillAccuracy ?? 0}
          detail={
            drillTotals.attempts > 0
              ? `${drillTotals.attempts} attempts across ${drillsStarted}/${drillTypes.length} drills`
              : `${drillTypes.length} drills, none logged yet`
          }
        />

        <AreaCard
          href="/genres"
          name="Genres"
          stat={`${genreStats.covered}/${genreStats.total}`}
          pct={genreStats.pct}
          detail={`${genreStats.pct}% covered · ${genreStats.rated} rated`}
        />

        <AreaCard
          href="/ep"
          name="EP"
          stat={epStalling > 0 ? `${epStalling} stalling` : `${epProgress}%`}
          urgent={epStalling > 0}
          pct={epProgress}
          detail={
            epTracks.length > 0
              ? `${epTracks.length} singles · ${epStages.filter((s) => s === "released").length} released`
              : "No tracks yet"
          }
        />

        <AreaCard
          href="/theory"
          name="Music Theory"
          stat={dueConcepts > 0 ? `${dueConcepts} due` : "clear"}
          urgent={dueConcepts > 0}
          pct={curriculum.length > 0 ? (conceptsStarted / curriculum.length) * 100 : 0}
          detail={`${conceptsStarted}/${curriculum.length} concepts started`}
        />
      </div>
    </>
  );
}
