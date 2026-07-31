"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { logDrillAttempt, type DrillFormState } from "@/app/actions/drills";
import { Button, Card, Field, Input, SectionHeading, cn } from "@/components/ui";

/** Typical drill lengths, so the common case is one tap. */
const TOTAL_PRESETS = [10, 20, 25, 50];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Log attempt"}
    </Button>
  );
}

/**
 * Log a drill run done in an external trainer.
 *
 * The form clears itself on success rather than navigating away: drills come in
 * bursts, and after one round you usually want to do another and record that
 * too, not be bounced back to a list.
 */
export function DrillForm({
  drillTypeId,
  today,
  lastDifficulty,
}: {
  drillTypeId: number;
  today: string;
  lastDifficulty: number;
}) {
  const [total, setTotal] = useState("20");
  const [correct, setCorrect] = useState("");
  const [difficulty, setDifficulty] = useState(lastDifficulty);
  const [nonce, setNonce] = useState(0);

  // Declared after the state it clears, so the closure sees the real setters.
  const [state, formAction] = useActionState<DrillFormState, FormData>(
    async (previous, formData) => {
      const result = await logDrillAttempt(previous, formData);
      if (!result.error) {
        setCorrect("");
        // Remounts the form so the uncontrolled duration and date reset too.
        setNonce((value) => value + 1);
      }
      return result;
    },
    { error: null },
  );

  const totalNumber = Number.parseInt(total, 10) || 0;
  const correctNumber = Number.parseInt(correct, 10);
  const preview =
    totalNumber > 0 && Number.isFinite(correctNumber) && correctNumber <= totalNumber
      ? Math.round((correctNumber / totalNumber) * 100)
      : null;

  return (
    <Card className="space-y-4">
      <SectionHeading
        title="Log an attempt"
        action={
          preview !== null ? (
            <span className="text-sm tabular-nums text-accent">{preview}%</span>
          ) : null
        }
      />

      <form action={formAction} className="space-y-4" key={nonce}>
        <input type="hidden" name="drillTypeId" value={drillTypeId} />
        <input type="hidden" name="difficulty" value={difficulty} />

        <Field label="Questions">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {TOTAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTotal(String(preset))}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border px-3 text-sm tabular-nums transition",
                    total === String(preset)
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
              min={1}
              max={500}
              name="questionsTotal"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
          </div>
        </Field>

        <Field label="Got right">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={totalNumber || undefined}
            name="questionsCorrect"
            value={correct}
            onChange={(event) => setCorrect(event.target.value)}
            placeholder={`0 to ${totalNumber || "?"}`}
            required
            autoFocus
          />
        </Field>

        <Field label="Difficulty" hint="Defaults to whatever you drilled last time.">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={difficulty === value}
                onClick={() => setDifficulty(value)}
                className={cn(
                  "min-h-11 flex-1 rounded-xl border text-sm transition",
                  difficulty === value
                    ? "border-accent bg-accent font-semibold text-accent-ink"
                    : "border-line bg-surface-2 text-ink-muted hover:text-ink",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Minutes" hint="Optional.">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              name="durationMinutes"
              placeholder="—"
            />
          </Field>
          <Field label="Date">
            <Input type="date" name="occurredOn" max={today} defaultValue={today} />
          </Field>
        </div>

        {state.error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-surface-1 px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </Card>
  );
}
