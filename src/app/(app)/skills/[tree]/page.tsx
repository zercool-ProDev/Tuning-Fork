import Link from "next/link";
import { notFound } from "next/navigation";

import { Fluency } from "@/components/fluency";
import { ProductionProjects } from "@/components/production-projects";
import { Repertoire } from "@/components/repertoire";
import { SkillTree } from "@/components/skill-tree";
import {
  getEpTracks,
  getFluencyRatings,
  getGenres,
  getInstrumentByKey,
  getInstrumentMinutes,
  getDomainMinutes,
  getProductionProjects,
  getRepertoire,
  getSkillTree,
} from "@/db/queries";
import { formatMinutes } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * One route for all five trees.
 *
 * `tree` is either an instrument key (drums, bass, guitar, keys) or the literal
 * "logic". The instrument branch adds repertoire and fluency; the Logic branch
 * adds the project log. Everything else — the tree itself, its progress, its
 * interaction — is shared.
 */
export default async function TreePage({
  params,
}: {
  params: Promise<{ tree: string }>;
}) {
  const { tree } = await params;

  if (tree === "logic") {
    const [nodes, projects, epTracks, minutes] = await Promise.all([
      getSkillTree("logic", null),
      getProductionProjects(),
      getEpTracks(),
      getDomainMinutes("logic_production"),
    ]);

    return (
      <>
        <Header title="Logic Pro" minutes={minutes} />
        <div className="space-y-4">
          <SkillTree nodes={nodes} redirectTo="/skills/logic" />
          <ProductionProjects
            projects={projects}
            epTracks={epTracks.map((track) => ({ id: track.id, title: track.title }))}
          />
        </div>
      </>
    );
  }

  const instrument = await getInstrumentByKey(tree);
  if (!instrument) notFound();

  const redirectTo = `/skills/${tree}`;
  const [nodes, songs, ratings, genres, minutes] = await Promise.all([
    getSkillTree("instrument", instrument.id),
    getRepertoire(instrument.id),
    getFluencyRatings(instrument.id),
    getGenres(),
    getInstrumentMinutes(instrument.id),
  ]);

  return (
    <>
      <Header title={instrument.name} minutes={minutes} />
      <div className="space-y-4">
        <Fluency
          instrumentId={instrument.id}
          ratings={ratings}
          redirectTo={redirectTo}
        />
        <SkillTree nodes={nodes} redirectTo={redirectTo} />
        <Repertoire
          instrumentId={instrument.id}
          songs={songs}
          genres={genres.map((genre) => ({ id: genre.id, name: genre.name }))}
          redirectTo={redirectTo}
        />
      </div>
    </>
  );
}

function Header({ title, minutes }: { title: string; minutes: number }) {
  return (
    <header className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {minutes > 0 ? (
          <p className="text-sm text-ink-muted">{formatMinutes(minutes)} logged all time</p>
        ) : null}
      </div>
      <Link href="/skills" className="text-sm text-ink-muted underline-offset-4 hover:underline">
        All instruments
      </Link>
    </header>
  );
}
