"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { db, schema } from "@/db";

/**
 * Update the dashboard's focus line and weekly minutes target.
 *
 * Upserts rather than updates so a database whose settings row was never seeded
 * still works instead of silently doing nothing.
 */
export async function updateFocus(formData: FormData) {
  const focusRaw = formData.get("currentFocus");
  const targetRaw = formData.get("weeklyMinutesTarget");

  const currentFocus =
    typeof focusRaw === "string" && focusRaw.trim() !== "" ? focusRaw.trim() : null;

  const parsedTarget =
    typeof targetRaw === "string" ? Number.parseInt(targetRaw, 10) : Number.NaN;
  // 0 would divide by zero in the progress bar; a week has 10080 minutes.
  const weeklyMinutesTarget = Number.isFinite(parsedTarget)
    ? Math.max(1, Math.min(parsedTarget, 10_080))
    : 420;

  await db()
    .insert(schema.settings)
    .values({ id: 1, currentFocus, weeklyMinutesTarget })
    .onConflictDoUpdate({
      target: schema.settings.id,
      set: { currentFocus, weeklyMinutesTarget, updatedAt: sql`now()` },
    });

  revalidatePath("/");
}
