import { setDrillPracticeLink } from "@/app/actions/drills";
import { Button, Field, Input } from "@/components/ui";

/**
 * Where to actually do the drill.
 *
 * The app deliberately does not generate exercises — that was the "log now,
 * engine later" call in stage 5 — so the loop is: drill on the linked site,
 * come back, record the score. Putting the link right above the log form keeps
 * both halves of that loop on one screen.
 *
 * The URL is editable because any link I pick will eventually rot or turn out
 * to be the wrong exercise, and that should not need a deploy to fix.
 */
export function PracticeLink({
  drillId,
  url,
  label,
}: {
  drillId: number;
  url: string | null;
  label: string | null;
}) {
  return (
    <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-surface-1 p-4">
      {url ? (
        <>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-ink transition hover:brightness-110"
          >
            Practice this drill ↗
          </a>
          <p className="mt-2 text-center text-xs text-ink-faint">
            {label ? <>On the site, pick <span className="text-ink-muted">{label}</span>. </> : null}
            Opens in a new tab — come back and log your score below.
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          No practice link set for this drill yet.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-ink-faint">
          Change practice link
        </summary>
        <form action={setDrillPracticeLink} className="mt-3 space-y-3">
          <input type="hidden" name="drillId" value={drillId} />
          <Field label="URL">
            <Input
              type="url"
              name="practiceUrl"
              defaultValue={url ?? ""}
              placeholder="https://www.musictheory.net/exercises"
            />
          </Field>
          <Field label="What it is called" hint="Shown under the button.">
            <Input
              name="practiceLabel"
              defaultValue={label ?? ""}
              placeholder="e.g. Interval Ear Training"
            />
          </Field>
          <Button type="submit" variant="secondary">
            Save link
          </Button>
        </form>
      </details>
    </div>
  );
}
