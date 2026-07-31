import {
  addProductionProject,
  deleteProductionProject,
  setProjectStatus,
} from "@/app/actions/skills";
import { Button, Card, Field, Input, SectionHeading, Select, Textarea, cn } from "@/components/ui";

type Project = {
  id: number;
  name: string;
  epTrackId: number | null;
  status: "active" | "shelved" | "finished";
  notes: string | null;
};

const STATUS_LABEL = { active: "Active", shelved: "Shelved", finished: "Finished" } as const;
const NEXT_STATUS = { active: "finished", finished: "shelved", shelved: "active" } as const;
const STATUS_STYLE = {
  active: "border-accent/50 text-accent",
  shelved: "border-line text-ink-faint",
  finished: "border-positive/50 text-positive",
} as const;

/**
 * Real Logic sessions, as opposed to the skill tree's technique milestones.
 *
 * A project can name the EP track it belongs to, which is what later lets the
 * EP pipeline show production work against a specific single rather than
 * treating the two as unrelated.
 */
export function ProductionProjects({
  projects,
  epTracks,
}: {
  projects: Project[];
  epTracks: { id: number; title: string }[];
}) {
  const trackTitles = new Map(epTracks.map((track) => [track.id, track.title]));
  const active = projects.filter((project) => project.status === "active").length;

  return (
    <Card className="space-y-4">
      <SectionHeading
        title="Project log"
        action={
          <span className="text-sm tabular-nums text-ink-muted">
            {projects.length} total
            {active > 0 ? <span className="text-accent"> · {active} active</span> : null}
          </span>
        }
      />

      {projects.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No projects yet. Log the real Logic sessions here — what you built and what
          you learned doing it.
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-xl border border-line bg-surface-2 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.name}</p>
                  {project.epTrackId ? (
                    <p className="truncate text-xs text-ink-faint">
                      EP · {trackTitles.get(project.epTrackId) ?? "unknown track"}
                    </p>
                  ) : null}
                </div>

                <form action={setProjectStatus}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="status" value={NEXT_STATUS[project.status]} />
                  <button
                    type="submit"
                    className={cn(
                      "min-h-11 rounded-lg border px-3 text-xs transition hover:border-line-strong",
                      STATUS_STYLE[project.status],
                    )}
                  >
                    {STATUS_LABEL[project.status]}
                  </button>
                </form>

                <form action={deleteProductionProject}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${project.name}`}
                    className="min-h-11 px-2 text-xs text-ink-faint hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              </div>

              {project.notes ? (
                <p className="mt-2 text-sm text-ink-muted">{project.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-xl border border-line bg-surface-2 p-3">
        <summary className="cursor-pointer text-sm text-ink-muted">Add a project</summary>
        <form action={addProductionProject} className="mt-3 space-y-3">
          <Field label="Name">
            <Input name="name" required placeholder="e.g. Verse beat sketch" />
          </Field>
          <Field label="EP track" hint="Optional. Links this project to a single.">
            <Select name="epTrackId" defaultValue="">
              <option value="">Not an EP track</option>
              {epTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" hint="What you practised or learned.">
            <Textarea name="notes" rows={2} />
          </Field>
          <Button type="submit" variant="secondary">
            Add project
          </Button>
        </form>
      </details>
    </Card>
  );
}
