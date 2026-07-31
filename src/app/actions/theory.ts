"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";
import { initialState, schedule } from "@/lib/srs";

function int(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Record an answer and advance the concept's schedule.
 *
 * The attempt is stored regardless of outcome so accuracy over time is a real
 * record, while the schedule move is what decides when the concept resurfaces.
 * Grading happens on the server: the correct answer is never sent to the client
 * before the question is answered, so it cannot be read out of the page source.
 */
export type AnswerState =
  | { status: "idle" }
  | {
      status: "answered";
      isCorrect: boolean;
      correctAnswer: string;
      explanation: string | null;
      nextDueOn: string;
    };

export async function answerQuestion(
  _previous: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const questionId = int(formData.get("questionId"));
  const conceptId = int(formData.get("conceptId"));
  const choice = formData.get("choice");

  if (questionId === null || conceptId === null || typeof choice !== "string") {
    return { status: "idle" };
  }

  const [question] = await db()
    .select()
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.id, questionId))
    .limit(1);

  if (!question) return { status: "idle" };

  const accepted = (question.answer ?? []).map((value) =>
    String(value).trim().toLowerCase(),
  );
  const isCorrect = accepted.includes(choice.trim().toLowerCase());

  const today = await getToday();

  await db().insert(schema.quizAttempts).values({
    questionId,
    isCorrect,
    response: { choice },
  });

  const [existing] = await db()
    .select()
    .from(schema.srsItems)
    .where(eq(schema.srsItems.conceptId, conceptId))
    .limit(1);

  const current = existing
    ? {
        easeFactor: Number(existing.easeFactor),
        intervalDays: existing.intervalDays,
        repetitions: existing.repetitions,
        lapses: existing.lapses,
        dueOn: existing.dueOn,
      }
    : initialState(today);

  const next = schedule(current, isCorrect, today);

  await db()
    .insert(schema.srsItems)
    .values({
      conceptId,
      easeFactor: next.easeFactor.toFixed(2),
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueOn: next.dueOn,
      lastReviewedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.srsItems.conceptId,
      set: {
        easeFactor: next.easeFactor.toFixed(2),
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueOn: next.dueOn,
        lastReviewedAt: sql`now()`,
      },
    });

  /**
   * No revalidatePath here, deliberately.
   *
   * It refreshes the route this action was called from, which swapped in the
   * next question and unmounted the card before the verdict could render — the
   * answer was graded but you never saw whether you got it right. Both /theory
   * and /theory/review are force-dynamic, so there is no cache to bust anyway;
   * the client refreshes explicitly on "Next question".
   */

  return {
    status: "answered",
    isCorrect,
    correctAnswer: String((question.answer ?? [])[0] ?? ""),
    explanation: question.explanation,
    nextDueOn: next.dueOn,
  };
}

/** Push a concept back into the queue, for when you want to drill it again. */
export async function resetConcept(formData: FormData) {
  const conceptId = int(formData.get("conceptId"));
  if (conceptId === null) return;

  await db().delete(schema.srsItems).where(eq(schema.srsItems.conceptId, conceptId));

  revalidatePath("/theory");
  revalidatePath("/theory/review");
}
