import {
  addRepertoire,
  deleteRepertoire,
  setRepertoireStatus,
} from "@/app/actions/skills";
import { Button, Card, Field, Input, SectionHeading, Select, cn } from "@/components/ui";

type Song = {
  id: number;
  title: string;
  artist: string | null;
  genreId: number | null;
  difficulty: number;
  status: "learning" | "performable" | "polished";
  learnedOn: string | null;
};

const STATUS_LABEL = {
  learning: "Learning",
  performable: "Performable",
  polished: "Polished",
} as const;

/** Clicking the status pill advances it, same interaction as the skill tree. */
const NEXT_STATUS = {
  learning: "performable",
  performable: "polished",
  polished: "learning",
} as const;

const STATUS_STYLE = {
  learning: "border-line text-ink-muted",
  performable: "border-accent/50 text-accent",
  polished: "border-positive/50 text-positive",
} as const;

export function Repertoire({
  instrumentId,
  songs,
  genres,
  redirectTo,
}: {
  instrumentId: number;
  songs: Song[];
  genres: { id: number; name: string }[];
  redirectTo: string;
}) {
  const counts = {
    learning: songs.filter((song) => song.status === "learning").length,
    performable: songs.filter((song) => song.status === "performable").length,
    polished: songs.filter((song) => song.status === "polished").length,
  };

  return (
    <Card className="space-y-4">
      <SectionHeading
        title="Repertoire"
        action={
          <span className="text-sm tabular-nums text-ink-muted">
            {songs.length} {songs.length === 1 ? "song" : "songs"}
            {counts.polished > 0 ? (
              <span className="text-positive"> · {counts.polished} polished</span>
            ) : null}
          </span>
        }
      />

      {songs.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing logged yet. Songs you learn here also count as evidence of genre
          coverage on the genre map.
        </p>
      ) : (
        <ul className="space-y-2">
          {songs.map((song) => (
            <li
              key={song.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{song.title}</p>
                <p className="truncate text-sm text-ink-faint">
                  {song.artist ?? "Unknown artist"}
                  {" · "}
                  {"★".repeat(song.difficulty)}
                  {song.learnedOn ? ` · learned ${song.learnedOn}` : ""}
                </p>
              </div>

              <form action={setRepertoireStatus}>
                <input type="hidden" name="repertoireId" value={song.id} />
                <input type="hidden" name="status" value={NEXT_STATUS[song.status]} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  className={cn(
                    "min-h-11 rounded-lg border px-3 text-xs transition hover:border-line-strong",
                    STATUS_STYLE[song.status],
                  )}
                >
                  {STATUS_LABEL[song.status]}
                </button>
              </form>

              <form action={deleteRepertoire}>
                <input type="hidden" name="repertoireId" value={song.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button
                  type="submit"
                  aria-label={`Remove ${song.title}`}
                  className="min-h-11 px-2 text-xs text-ink-faint hover:text-danger"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-xl border border-line bg-surface-2 p-3">
        <summary className="cursor-pointer text-sm text-ink-muted">Add a song</summary>
        <form action={addRepertoire} className="mt-3 space-y-3">
          <input type="hidden" name="instrumentId" value={instrumentId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <Field label="Title">
            <Input name="title" required placeholder="Song title" />
          </Field>
          <Field label="Artist">
            <Input name="artist" placeholder="Optional" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Difficulty">
              <Select name="difficulty" defaultValue="2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {"★".repeat(value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Genre">
              <Select name="genreId" defaultValue="">
                <option value="">Not specified</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Button type="submit" variant="secondary">
            Add song
          </Button>
        </form>
      </details>
    </Card>
  );
}
