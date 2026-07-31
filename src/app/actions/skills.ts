"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";

const SKILL_STATUSES = new Set(schema.skillStatusEnum.enumValues as readonly string[]);
const REPERTOIRE_STATUSES = new Set(
  schema.repertoireStatusEnum.enumValues as readonly string[],
);
const PROJECT_STATUSES = new Set(schema.projectStatusEnum.enumValues as readonly string[]);

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
 * Set a skill node's status.
 *
 * Upserts rather than updates so a node added to the seed after the initial
 * progress rows were created still works instead of silently doing nothing.
 * `achievedOn` is stamped when a node reaches done and cleared if it is moved
 * back, so the date always reflects the current state rather than a stale one.
 */
export async function setSkillStatus(formData: FormData) {
  const nodeId = int(formData.get("nodeId"));
  const status = formData.get("status");
  const redirectTo = text(formData.get("redirectTo")) ?? "/skills";

  if (nodeId === null || typeof status !== "string" || !SKILL_STATUSES.has(status)) {
    return;
  }

  const typed = status as (typeof schema.skillStatusEnum.enumValues)[number];
  const achievedOn = typed === "done" ? await getToday() : null;

  await db()
    .insert(schema.skillProgress)
    .values({ skillNodeId: nodeId, status: typed, achievedOn })
    .onConflictDoUpdate({
      target: schema.skillProgress.skillNodeId,
      set: { status: typed, achievedOn, updatedAt: sql`now()` },
    });

  revalidatePath(redirectTo);
  revalidatePath("/skills");
}

export async function addFluencyRating(formData: FormData) {
  const instrumentId = int(formData.get("instrumentId"));
  const rating = int(formData.get("rating"));
  const redirectTo = text(formData.get("redirectTo")) ?? "/skills";

  if (instrumentId === null || rating === null || rating < 1 || rating > 10) return;

  await db().insert(schema.fluencyRatings).values({
    instrumentId,
    rating,
    ratedOn: await getToday(),
    notes: text(formData.get("notes")),
  });

  revalidatePath(redirectTo);
  revalidatePath("/skills");
}

export async function addRepertoire(formData: FormData) {
  const instrumentId = int(formData.get("instrumentId"));
  const title = text(formData.get("title"));
  const redirectTo = text(formData.get("redirectTo")) ?? "/skills";

  if (instrumentId === null || title === null) return;

  const difficulty = int(formData.get("difficulty")) ?? 1;
  const status = formData.get("status");
  const genreId = int(formData.get("genreId"));

  await db().insert(schema.repertoire).values({
    instrumentId,
    title,
    artist: text(formData.get("artist")),
    genreId,
    difficulty: Math.max(1, Math.min(difficulty, 5)),
    status:
      typeof status === "string" && REPERTOIRE_STATUSES.has(status)
        ? (status as (typeof schema.repertoireStatusEnum.enumValues)[number])
        : "learning",
    startedOn: await getToday(),
  });

  revalidatePath(redirectTo);
}

export async function setRepertoireStatus(formData: FormData) {
  const id = int(formData.get("repertoireId"));
  const status = formData.get("status");
  const redirectTo = text(formData.get("redirectTo")) ?? "/skills";

  if (id === null || typeof status !== "string" || !REPERTOIRE_STATUSES.has(status)) return;

  const typed = status as (typeof schema.repertoireStatusEnum.enumValues)[number];

  await db()
    .update(schema.repertoire)
    .set({
      status: typed,
      // "Learned" means performable or better; going back clears the date.
      learnedOn: typed === "learning" ? null : await getToday(),
    })
    .where(eq(schema.repertoire.id, id));

  revalidatePath(redirectTo);
}

export async function deleteRepertoire(formData: FormData) {
  const id = int(formData.get("repertoireId"));
  const redirectTo = text(formData.get("redirectTo")) ?? "/skills";
  if (id === null) return;

  await db().delete(schema.repertoire).where(eq(schema.repertoire.id, id));
  revalidatePath(redirectTo);
}

export async function addProductionProject(formData: FormData) {
  const name = text(formData.get("name"));
  if (name === null) return;

  await db().insert(schema.productionProjects).values({
    name,
    epTrackId: int(formData.get("epTrackId")),
    notes: text(formData.get("notes")),
  });

  revalidatePath("/skills/logic");
}

export async function setProjectStatus(formData: FormData) {
  const id = int(formData.get("projectId"));
  const status = formData.get("status");
  if (id === null || typeof status !== "string" || !PROJECT_STATUSES.has(status)) return;

  await db()
    .update(schema.productionProjects)
    .set({ status: status as (typeof schema.projectStatusEnum.enumValues)[number] })
    .where(eq(schema.productionProjects.id, id));

  revalidatePath("/skills/logic");
}

export async function deleteProductionProject(formData: FormData) {
  const id = int(formData.get("projectId"));
  if (id === null) return;

  await db().delete(schema.productionProjects).where(eq(schema.productionProjects.id, id));
  revalidatePath("/skills/logic");
}
