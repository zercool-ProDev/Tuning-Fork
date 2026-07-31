"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";
import { monthStart } from "@/lib/genres";

function int(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Record a self-rating.
 *
 * Append-only, like instrument fluency: the map shows the latest, but the
 * history is what turns "I think I'm better at jazz now" into something you can
 * actually check.
 */
export async function rateGenre(formData: FormData) {
  const genreId = int(formData.get("genreId"));
  const rating = int(formData.get("rating"));
  if (genreId === null || rating === null || rating < 1 || rating > 5) return;

  await db().insert(schema.genreRatings).values({
    genreId,
    rating,
    ratedOn: await getToday(),
  });

  revalidatePath("/genres");
  revalidatePath("/practice");
}

/**
 * Set or replace this month's deep dive.
 *
 * One dive per month, enforced by a unique index on `month`, so starting a new
 * one replaces rather than accumulating parallel dives nobody finishes.
 */
export async function setDeepDive(formData: FormData) {
  const genreId = int(formData.get("genreId"));
  if (genreId === null) return;

  const today = await getToday();
  const month = monthStart(today);

  await db()
    .insert(schema.genreDeepDives)
    .values({ genreId, month, goals: text(formData.get("goals")) })
    .onConflictDoUpdate({
      target: schema.genreDeepDives.month,
      set: { genreId, goals: text(formData.get("goals")) },
    });

  revalidatePath("/genres");
}

export async function updateDeepDive(formData: FormData) {
  const diveId = int(formData.get("diveId"));
  if (diveId === null) return;

  const complete = formData.get("complete") === "1";

  await db()
    .update(schema.genreDeepDives)
    .set({
      goals: text(formData.get("goals")),
      summary: text(formData.get("summary")),
      completedAt: complete ? new Date() : null,
    })
    .where(eq(schema.genreDeepDives.id, diveId));

  revalidatePath("/genres");
}

export async function completeDeepDive(formData: FormData) {
  const diveId = int(formData.get("diveId"));
  if (diveId === null) return;

  // Toggle, so a dive marked done by mistake can be reopened.
  await db()
    .update(schema.genreDeepDives)
    .set({
      completedAt: sql`case when ${schema.genreDeepDives.completedAt} is null then now() else null end`,
    })
    .where(eq(schema.genreDeepDives.id, diveId));

  revalidatePath("/genres");
}

export async function addListeningNote(formData: FormData) {
  const trackTitle = text(formData.get("trackTitle"));
  if (trackTitle === null) return;

  const url = text(formData.get("url"));

  await db().insert(schema.listeningNotes).values({
    trackTitle,
    artist: text(formData.get("artist")),
    genreId: int(formData.get("genreId")),
    // Only http(s) links, so a stored value can never be a javascript: URL.
    url: url && /^https?:\/\//i.test(url) ? url : null,
    whatINoticed: text(formData.get("whatINoticed")),
    listenedOn: await getToday(),
  });

  revalidatePath("/genres");
}

export async function deleteListeningNote(formData: FormData) {
  const noteId = int(formData.get("noteId"));
  if (noteId === null) return;

  await db().delete(schema.listeningNotes).where(eq(schema.listeningNotes.id, noteId));
  revalidatePath("/genres");
}
