"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { nextStage, previousStage, type EpStage } from "@/lib/ep";

const STAGES = new Set(schema.epStageEnum.enumValues as readonly string[]);

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
 * Move a track to a new stage, recording the transition.
 *
 * The event row is the whole point: current stage alone cannot say where a
 * track stalls, and "mixing has been sitting for five weeks" is the number
 * that actually matters against a twelve-month deadline.
 *
 * Moving to the stage a track is already in is a no-op rather than a duplicate
 * event, so a double tap does not corrupt the history.
 */
async function moveTrack(trackId: number, to: EpStage) {
  const [track] = await db()
    .select()
    .from(schema.epTracks)
    .where(eq(schema.epTracks.id, trackId))
    .limit(1);

  if (!track || track.stage === to) return;

  await db()
    .update(schema.epTracks)
    .set({ stage: to, stageUpdatedAt: new Date() })
    .where(eq(schema.epTracks.id, trackId));

  await db().insert(schema.epTrackStageEvents).values({
    trackId,
    fromStage: track.stage,
    toStage: to,
  });

  revalidatePath("/ep");
  revalidatePath("/practice");
}

export async function advanceTrack(formData: FormData) {
  const trackId = int(formData.get("trackId"));
  const current = formData.get("currentStage");
  if (trackId === null || typeof current !== "string" || !STAGES.has(current)) return;

  const to = nextStage(current as EpStage);
  if (to) await moveTrack(trackId, to);
}

export async function regressTrack(formData: FormData) {
  const trackId = int(formData.get("trackId"));
  const current = formData.get("currentStage");
  if (trackId === null || typeof current !== "string" || !STAGES.has(current)) return;

  const to = previousStage(current as EpStage);
  if (to) await moveTrack(trackId, to);
}

/** Jump straight to a stage, for when reality skipped a step. */
export async function setTrackStage(formData: FormData) {
  const trackId = int(formData.get("trackId"));
  const stage = formData.get("stage");
  if (trackId === null || typeof stage !== "string" || !STAGES.has(stage)) return;

  await moveTrack(trackId, stage as EpStage);
}

export async function updateTrack(formData: FormData) {
  const trackId = int(formData.get("trackId"));
  if (trackId === null) return;

  const title = text(formData.get("title"));
  const targetDateRaw = formData.get("targetDate");
  const targetDate =
    typeof targetDateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw)
      ? targetDateRaw
      : null;

  await db()
    .update(schema.epTracks)
    .set({
      // An empty title would leave the track unidentifiable, so it is ignored.
      ...(title ? { title } : {}),
      targetDate,
      notes: text(formData.get("notes")),
    })
    .where(eq(schema.epTracks.id, trackId));

  revalidatePath("/ep");
}

export async function updateRelease(formData: FormData) {
  const releaseId = int(formData.get("releaseId"));
  if (releaseId === null) return;

  const title = text(formData.get("title"));
  const targetDateRaw = formData.get("targetDate");
  const targetDate =
    typeof targetDateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw)
      ? targetDateRaw
      : null;

  await db()
    .update(schema.epReleases)
    .set({ ...(title ? { title } : {}), targetDate, notes: text(formData.get("notes")) })
    .where(eq(schema.epReleases.id, releaseId));

  revalidatePath("/ep");
}

export async function addTrack(formData: FormData) {
  const releaseId = int(formData.get("releaseId"));
  const title = text(formData.get("title"));
  if (releaseId === null || title === null) return;

  const [row] = await db()
    .select({ max: sql<number>`coalesce(max(${schema.epTracks.position}), 0)::int` })
    .from(schema.epTracks)
    .where(eq(schema.epTracks.releaseId, releaseId));

  await db().insert(schema.epTracks).values({
    releaseId,
    title,
    position: (row?.max ?? 0) + 1,
    stage: "idea",
  });

  revalidatePath("/ep");
}

export async function deleteTrack(formData: FormData) {
  const trackId = int(formData.get("trackId"));
  if (trackId === null) return;

  // Stage events cascade; session segments and projects null out their link.
  await db().delete(schema.epTracks).where(eq(schema.epTracks.id, trackId));

  revalidatePath("/ep");
  revalidatePath("/practice");
}
