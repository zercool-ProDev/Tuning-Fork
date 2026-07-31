import {
  addListeningNote,
  completeDeepDive,
  deleteListeningNote,
  setDeepDive,
  updateDeepDive,
} from "@/app/actions/genres";
import { GenreRow } from "@/components/genre-row";
import {
  Button,
  Card,
  Field,
  Input,
  SectionHeading,
  Select,
  Textarea,
  cn,
} from "@/components/ui";
import { getDeepDives, getGenresWithContext, getListeningNotes, getToday } from "@/db/queries";
import { formatSessionDate } from "@/lib/dates";
import { COVERED_AT, coverage, monthLabel, monthStart, suggestFocus } from "@/lib/genres";

export const dynamic = "force-dynamic";

export const metadata = { title: "Genres · Tuning Fork" };

export default async function GenresPage() {
  const [genres, dives, notes, today] = await Promise.all([
    getGenresWithContext(),
    getDeepDives(),
    getListeningNotes(20),
    getToday(),
  ]);

  const standings = genres.map((genre) => ({
    genreId: genre.id,
    rating: genre.rating,
    songs: genre.songs,
    minutes: genre.minutes,
  }));

  const stats = coverage(standings);
  const focus = new Set(suggestFocus(standings));

  const thisMonth = monthStart(today);
  const currentDive = dives.find((row) => row.dive.month === thisMonth) ?? null;
  const pastDives = dives.filter((row) => row.dive.month !== thisMonth);

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Genre map</h1>
        <p className="text-sm text-ink-muted">
          Versatility is breadth. Comfortable ({COVERED_AT}+) in a genre counts as covered.
        </p>
      </header>

      <Card className="mb-4">
        <SectionHeading
          title="Coverage"
          action={
            <span className="text-sm tabular-nums text-ink-muted">
              {stats.covered}/{stats.total} genres
            </span>
          }
        />
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full", stats.pct === 100 ? "bg-positive" : "bg-accent")}
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {stats.pct}% covered · {stats.rated}/{stats.total} rated at all
        </p>
      </Card>

      <Card className="mb-4">
        <SectionHeading
          title="Deep dive"
          action={<span className="text-xs text-ink-faint">{monthLabel(thisMonth)}</span>}
        />

        {currentDive ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">{currentDive.genreName}</p>
              <form action={completeDeepDive}>
                <input type="hidden" name="diveId" value={currentDive.dive.id} />
                <button
                  type="submit"
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition",
                    currentDive.dive.completedAt
                      ? "border-positive/50 text-positive"
                      : "border-line text-ink-muted hover:text-ink",
                  )}
                >
                  {currentDive.dive.completedAt ? "Completed" : "Mark complete"}
                </button>
              </form>
            </div>

            <form action={updateDeepDive} className="space-y-3">
              <input type="hidden" name="diveId" value={currentDive.dive.id} />
              <Field label="Goals">
                <Textarea name="goals" rows={2} defaultValue={currentDive.dive.goals ?? ""} />
              </Field>
              <Field label="What you found">
                <Textarea name="summary" rows={2} defaultValue={currentDive.dive.summary ?? ""} />
              </Field>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
          </div>
        ) : (
          <form action={setDeepDive} className="space-y-3">
            <p className="text-sm text-ink-muted">
              Pick one genre to live in this month. The map suggests the thinnest ones.
            </p>
            {/* Suggestions live beside the field rather than inside the option
                labels, so an option always reads as just the genre name. */}
            <Field
              label="Genre"
              hint={`Thinnest right now: ${genres
                .filter((genre) => focus.has(genre.id))
                .map((genre) => genre.name)
                .join(", ")}`}
            >
              <Select name="genreId" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Goals" hint="What would count as a good month here.">
              <Textarea name="goals" rows={2} />
            </Field>
            <Button type="submit" variant="secondary">
              Start deep dive
            </Button>
          </form>
        )}

        {pastDives.length > 0 ? (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
            {pastDives.slice(0, 6).map((row) => (
              <li key={row.dive.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-muted">{row.genreName}</span>
                <span className="text-xs text-ink-faint">
                  {monthLabel(row.dive.month)}
                  {row.dive.completedAt ? " · done" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <SectionHeading title="Proficiency" />
      <div className="mb-6 space-y-2">
        {genres.map((genre) => (
          <GenreRow key={genre.id} genre={genre} focus={focus.has(genre.id)} />
        ))}
      </div>

      <SectionHeading
        title="Listening journal"
        action={<span className="text-xs text-ink-faint">{notes.length} recent</span>}
      />
      <Card className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing yet. Log reference tracks and what you noticed in them — it is the
            fastest way into a genre you do not play yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map(({ note, genreName }) => (
              <li key={note.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-medium">
                    {note.url ? (
                      <a
                        href={note.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {note.trackTitle}
                      </a>
                    ) : (
                      note.trackTitle
                    )}
                  </p>
                  <form action={deleteListeningNote}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <button
                      type="submit"
                      aria-label={`Delete note on ${note.trackTitle}`}
                      className="text-xs text-ink-faint hover:text-danger"
                    >
                      ×
                    </button>
                  </form>
                </div>
                <p className="text-xs text-ink-faint">
                  {note.artist ?? "Unknown artist"}
                  {genreName ? ` · ${genreName}` : ""}
                  {` · ${formatSessionDate(note.listenedOn, today)}`}
                </p>
                {note.whatINoticed ? (
                  <p className="mt-1 text-sm text-ink-muted">{note.whatINoticed}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-xl border border-line bg-surface-2 p-3">
          <summary className="cursor-pointer text-sm text-ink-muted">Add a track</summary>
          <form action={addListeningNote} className="mt-3 space-y-3">
            <Field label="Track">
              <Input name="trackTitle" required placeholder="Track title" />
            </Field>
            <Field label="Artist">
              <Input name="artist" placeholder="Optional" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Link" hint="Optional.">
                <Input name="url" type="url" placeholder="https://" />
              </Field>
            </div>
            <Field label="What you noticed" hint="The bit worth stealing.">
              <Textarea name="whatINoticed" rows={2} />
            </Field>
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </details>
      </Card>
    </>
  );
}
