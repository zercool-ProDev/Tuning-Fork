"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";

export type DrillFormState = { error: string | null };

function int(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Record a completed drill run.
 *
 * `source` is fixed to "manual" here: these are scores typed in from an
 * external trainer. The column exists so a future in-app engine can write
 * "in_app" rows into the same table and keep the accuracy trend continuous
 * across the switchover rather than restarting it.
 */
export async function logDrillAttempt(
  _previous: DrillFormState,
  formData: FormData,
): Promise<DrillFormState> {
  const drillTypeId = int(formData.get("drillTypeId"));
  const total = int(formData.get("questionsTotal"));
  const correct = int(formData.get("questionsCorrect"));
  const difficulty = int(formData.get("difficulty")) ?? 1;
  const durationRaw = int(formData.get("durationMinutes"));
  const occurredOnRaw = formData.get("occurredOn");

  if (drillTypeId === null) return { error: "Pick a drill." };
  if (total === null || total <= 0) return { error: "How many questions were there?" };
  if (correct === null || correct < 0) return { error: "How many did you get right?" };
  if (correct > total) {
    return { error: `You can't get ${correct} right out of ${total}.` };
  }
  if (difficulty < 1 || difficulty > 5) return { error: "Difficulty must be 1 to 5." };

  const today = await getToday();
  const occurredOn =
    typeof occurredOnRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(occurredOnRaw)
      ? occurredOnRaw
      : today;

  if (occurredOn > today) return { error: "That date is in the future." };

  await db().insert(schema.drillAttempts).values({
    drillTypeId,
    difficulty,
    questionsTotal: total,
    questionsCorrect: correct,
    durationSeconds: durationRaw !== null && durationRaw > 0 ? durationRaw * 60 : null,
    source: "manual",
    occurredOn,
  });

  revalidatePath("/drills");
  return { error: null };
}

export async function deleteDrillAttempt(formData: FormData) {
  const id = int(formData.get("attemptId"));
  if (id === null) return;

  await db().delete(schema.drillAttempts).where(eq(schema.drillAttempts.id, id));
  revalidatePath("/drills");
}
