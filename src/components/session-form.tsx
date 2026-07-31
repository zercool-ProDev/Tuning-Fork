"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  cn,
} from "@/components/ui";
import { DOMAINS, INSTRUMENT_DOMAINS, type DomainValue, domainMeta } from "@/lib/domains";
import { formatMinutes } from "@/lib/dates";
import type { SessionFormState } from "@/app/actions/sessions";

export type SegmentDraft = {
  key: number;
  domain: DomainValue | "";
  minutes: string;
  instrumentId: string;
  genreId: string;
  epTrackId: string;
  notes: string;
};

type Option = { id: number; name: string };

/** Quick-add durations. These cover most real practice blocks in one tap. */
const MINUTE_PRESETS = [10, 15, 20, 30, 45, 60];

let nextKey = 1;

function emptySegment(domain: DomainValue | "" = ""): SegmentDraft {
  return {
    key: nextKey++,
    domain,
    minutes: "",
    instrumentId: "",
    genreId: "",
    epTrackId: "",
    notes: "",
  };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function SessionForm({
  action,
  today,
  instruments,
  genres,
  epTracks,
  initial,
  submitLabel = "Save session",
}: {
  action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  today: string;
  instruments: Option[];
  genres: Option[];
  epTracks: Option[];
  initial?: {
    sessionId: number;
    occurredOn: string;
    energy: number | null;
    segments: SegmentDraft[];
    whatWorked: string;
    whatDidnt: string;
    focusNext: string;
  };
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });

  const [segments, setSegments] = useState<SegmentDraft[]>(
    initial?.segments.length ? initial.segments : [emptySegment("instrument")],
  );
  const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null);

  const total = segments.reduce(
    (sum, segment) => sum + (Number.parseInt(segment.minutes, 10) || 0),
    0,
  );

  function update(key: number, patch: Partial<SegmentDraft>) {
    setSegments((current) =>
      current.map((segment) => (segment.key === key ? { ...segment, ...patch } : segment)),
    );
  }

  return (
    <form action={formAction} className="space-y-4 pb-4">
      {initial ? <input type="hidden" name="sessionId" value={initial.sessionId} /> : null}

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" hint="Backdate a session you forgot to log.">
            <Input
              type="date"
              name="occurredOn"
              max={today}
              defaultValue={initial?.occurredOn ?? today}
              required
            />
          </Field>

          <Field label="Energy" hint="Optional. How the session felt.">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={energy === value}
                  onClick={() => setEnergy(energy === value ? null : value)}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border text-sm transition",
                    energy === value
                      ? "border-accent bg-accent font-semibold text-accent-ink"
                      : "border-line bg-surface-2 text-ink-muted hover:text-ink",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <input type="hidden" name="energy" value={energy ?? ""} />
      </Card>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            Practice blocks
          </h2>
          <span className="text-sm tabular-nums text-ink-muted">
            {formatMinutes(total)} total
          </span>
        </div>

        {segments.map((segment, index) => {
          const meta = segment.domain ? domainMeta(segment.domain) : null;
          const showInstrument =
            segment.domain && INSTRUMENT_DOMAINS.includes(segment.domain as DomainValue);

          return (
            <Card key={segment.key} className="space-y-3">
              <div
                className="-m-4 mb-0 h-1 rounded-t-[var(--radius-card)]"
                style={{ background: meta?.color ?? "var(--color-line)" }}
                aria-hidden
              />

              <div className="flex items-start gap-3 pt-3">
                <Field label="Domain" className="flex-1">
                  <Select
                    name={`segment.${index}.domain`}
                    value={segment.domain}
                    onChange={(event) =>
                      update(segment.key, {
                        domain: event.target.value as DomainValue,
                        instrumentId: "",
                        genreId: "",
                        epTrackId: "",
                      })
                    }
                  >
                    <option value="">Choose…</option>
                    {DOMAINS.map((domain) => (
                      <option key={domain.value} value={domain.value}>
                        {domain.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                {segments.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove block ${index + 1}`}
                    className="mt-7 px-3"
                    onClick={() =>
                      setSegments((current) =>
                        current.filter((item) => item.key !== segment.key),
                      )
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>

              <Field label="Minutes">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {MINUTE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => update(segment.key, { minutes: String(preset) })}
                        className={cn(
                          "min-h-11 rounded-xl border px-3 text-sm tabular-nums transition",
                          segment.minutes === String(preset)
                            ? "border-accent bg-accent font-semibold text-accent-ink"
                            : "border-line bg-surface-2 text-ink-muted hover:text-ink",
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1440}
                    placeholder="Or type minutes"
                    name={`segment.${index}.minutes`}
                    value={segment.minutes}
                    onChange={(event) => update(segment.key, { minutes: event.target.value })}
                  />
                </div>
              </Field>

              {showInstrument ? (
                <Field label="Instrument">
                  <Select
                    name={`segment.${index}.instrumentId`}
                    value={segment.instrumentId}
                    onChange={(event) =>
                      update(segment.key, { instrumentId: event.target.value })
                    }
                  >
                    <option value="">Not specified</option>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>
                        {instrument.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {segment.domain === "genre" ? (
                <Field label="Genre">
                  <Select
                    name={`segment.${index}.genreId`}
                    value={segment.genreId}
                    onChange={(event) => update(segment.key, { genreId: event.target.value })}
                  >
                    <option value="">Not specified</option>
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.id}>
                        {genre.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {segment.domain === "ep" ? (
                <Field label="Track">
                  <Select
                    name={`segment.${index}.epTrackId`}
                    value={segment.epTrackId}
                    onChange={(event) => update(segment.key, { epTrackId: event.target.value })}
                  >
                    <option value="">Not specified</option>
                    {epTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field label="Notes" hint="Optional. What you worked on in this block.">
                <Textarea
                  name={`segment.${index}.notes`}
                  value={segment.notes}
                  rows={2}
                  onChange={(event) => update(segment.key, { notes: event.target.value })}
                />
              </Field>
            </Card>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setSegments((current) => [...current, emptySegment()])}
        >
          + Add another block
        </Button>
      </div>

      <Card className="space-y-4">
        <h2 className="text-xs font-medium tracking-wide text-ink-faint uppercase">
          Reflection
        </h2>
        <Field label="What worked">
          <Textarea name="whatWorked" rows={2} defaultValue={initial?.whatWorked ?? ""} />
        </Field>
        <Field label="What didn't">
          <Textarea name="whatDidnt" rows={2} defaultValue={initial?.whatDidnt ?? ""} />
        </Field>
        <Field label="Focus next time">
          <Textarea name="focusNext" rows={2} defaultValue={initial?.focusNext ?? ""} />
        </Field>
      </Card>

      {state.error ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface-1 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
