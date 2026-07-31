"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { answerQuestion, type AnswerState } from "@/app/actions/theory";
import { Button, Card, cn } from "@/components/ui";

/**
 * One quiz question, graded on the server.
 *
 * The correct answer is never sent to the browser before you answer — it comes
 * back only in the action's result. Otherwise it would sit in the page source,
 * which rather defeats the point of testing yourself.
 */

/**
 * No local "selected" state here on purpose. Tracking it meant an onClick
 * handler that re-rendered the button mid-click and cancelled the form
 * submission outright. `useFormStatus` gives the pending state for free, which
 * is the only feedback needed between tap and grade.
 */
function ChoiceButton({ choice }: { choice: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="choice"
      value={choice}
      disabled={pending}
      className={cn(
        "w-full rounded-xl border border-line bg-surface-2 p-3 text-left text-ink transition",
        "hover:border-line-strong disabled:opacity-50",
      )}
    >
      {choice}
    </button>
  );
}

export function QuizCard({
  questionId,
  conceptId,
  conceptTitle,
  prompt,
  choices,
  remaining,
}: {
  questionId: number;
  conceptId: number;
  conceptTitle: string;
  prompt: string;
  choices: string[];
  remaining: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<AnswerState, FormData>(answerQuestion, {
    status: "idle",
  });

  const answered = state.status === "answered";

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs tracking-wide text-ink-faint uppercase">
          {conceptTitle}
        </span>
        <span className="text-xs tabular-nums text-ink-faint">
          {remaining} left
        </span>
      </div>

      <p className="text-lg leading-snug font-medium">{prompt}</p>

      {answered ? (
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-xl border p-3",
              state.isCorrect
                ? "border-positive/40 bg-positive/10"
                : "border-danger/40 bg-danger/10",
            )}
          >
            <p className={state.isCorrect ? "font-medium text-positive" : "font-medium text-danger"}>
              {state.isCorrect ? "Correct" : "Not quite"}
            </p>
            {!state.isCorrect ? (
              <p className="mt-1 text-sm text-ink">
                The answer is <strong>{state.correctAnswer}</strong>.
              </p>
            ) : null}
            {state.explanation ? (
              <p className="mt-1 text-sm text-ink-muted">{state.explanation}</p>
            ) : null}
          </div>

          <p className="text-xs text-ink-faint">
            Next review {state.nextDueOn}.
          </p>

          <Button
            type="button"
            className="w-full"
            onClick={() => router.refresh()}
          >
            {remaining > 1 ? "Next question" : "Finish"}
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="questionId" value={questionId} />
          <input type="hidden" name="conceptId" value={conceptId} />
          {choices.map((choice) => (
            <ChoiceButton key={choice} choice={choice} />
          ))}
        </form>
      )}
    </Card>
  );
}
