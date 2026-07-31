"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";
import { DOMAINS } from "@/lib/domains";

const VALID_DOMAINS = new Set<string>(DOMAINS.map((domain) => domain.value));
const MILESTONE_STATUSES = new Set(
  schema.milestoneStatusEnum.enumValues as readonly string[],
);

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

/** Ensure a plan row exists for the week, returning its id. */
async function planIdFor(weekStart: string): Promise<number> {
  const [existing] = await db()
    .select({ id: schema.practicePlans.id })
    .from(schema.practicePlans)
    .where(eq(schema.practicePlans.weekStart, weekStart))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db()
    .insert(schema.practicePlans)
    .values({ weekStart })
    .returning({ id: schema.practicePlans.id });
  return created.id;
}

export async function addPlanItem(formData: FormData) {
  const weekStart = text(formData.get("weekStart"));
  const domain = formData.get("domain");
  const targetMinutes = int(formData.get("targetMinutes"));

  if (!weekStart || typeof domain !== "string" || !VALID_DOMAINS.has(domain)) return;
  if (targetMinutes === null || targetMinutes <= 0) return;

  const planId = await planIdFor(weekStart);

  await db().insert(schema.practicePlanItems).values({
    planId,
    domain: domain as (typeof schema.domainEnum.enumValues)[number],
    instrumentId: int(formData.get("instrumentId")),
    // A week is 10080 minutes; anything beyond that is a typo, not a plan.
    targetMinutes: Math.min(targetMinutes, 10_080),
  });

  revalidatePath("/practice/planner");
}

export async function deletePlanItem(formData: FormData) {
  const id = int(formData.get("itemId"));
  if (id === null) return;

  await db().delete(schema.practicePlanItems).where(eq(schema.practicePlanItems.id, id));
  revalidatePath("/practice/planner");
}

/** Copy last week's plan forward, so a routine does not need retyping weekly. */
export async function copyPlanFromPreviousWeek(formData: FormData) {
  const weekStart = text(formData.get("weekStart"));
  const previousWeekStart = text(formData.get("previousWeekStart"));
  if (!weekStart || !previousWeekStart) return;

  const [previousPlan] = await db()
    .select({ id: schema.practicePlans.id })
    .from(schema.practicePlans)
    .where(eq(schema.practicePlans.weekStart, previousWeekStart))
    .limit(1);
  if (!previousPlan) return;

  const items = await db()
    .select()
    .from(schema.practicePlanItems)
    .where(eq(schema.practicePlanItems.planId, previousPlan.id));
  if (items.length === 0) return;

  const planId = await planIdFor(weekStart);

  // Replace rather than append, so copying twice does not double the targets.
  await db()
    .delete(schema.practicePlanItems)
    .where(eq(schema.practicePlanItems.planId, planId));

  await db().insert(schema.practicePlanItems).values(
    items.map((item) => ({
      planId,
      domain: item.domain,
      instrumentId: item.instrumentId,
      targetMinutes: item.targetMinutes,
      dayOfWeek: item.dayOfWeek,
      notes: item.notes,
    })),
  );

  revalidatePath("/practice/planner");
}

export async function addMilestone(formData: FormData) {
  const quarterId = int(formData.get("quarterId"));
  const title = text(formData.get("title"));
  if (quarterId === null || title === null) return;

  const weight = int(formData.get("weight")) ?? 1;
  const domain = formData.get("domain");

  await db().insert(schema.milestones).values({
    quarterId,
    title,
    description: text(formData.get("description")),
    domain:
      typeof domain === "string" && VALID_DOMAINS.has(domain)
        ? (domain as (typeof schema.domainEnum.enumValues)[number])
        : null,
    weight: String(Math.max(1, Math.min(weight, 10))),
  });

  revalidatePath("/practice/roadmap");
  revalidatePath("/");
}

export async function setMilestoneStatus(formData: FormData) {
  const id = int(formData.get("milestoneId"));
  const status = formData.get("status");
  if (id === null || typeof status !== "string" || !MILESTONE_STATUSES.has(status)) return;

  const typed = status as (typeof schema.milestoneStatusEnum.enumValues)[number];

  await db()
    .update(schema.milestones)
    .set({
      status: typed,
      completedOn: typed === "done" ? await getToday() : null,
    })
    .where(eq(schema.milestones.id, id));

  revalidatePath("/practice/roadmap");
  revalidatePath("/");
}

export async function deleteMilestone(formData: FormData) {
  const id = int(formData.get("milestoneId"));
  if (id === null) return;

  await db().delete(schema.milestones).where(eq(schema.milestones.id, id));
  revalidatePath("/practice/roadmap");
  revalidatePath("/");
}

/** Set the 12-month goal window, which anchors the roadmap quarters. */
export async function setGoalWindow(formData: FormData) {
  const start = text(formData.get("goalStartOn"));
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return;

  const startDate = new Date(`${start}T12:00:00Z`);
  const end = new Date(startDate);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  const goalEndOn = end.toISOString().slice(0, 10);

  await db()
    .insert(schema.settings)
    .values({ id: 1, goalStartOn: start, goalEndOn })
    .onConflictDoUpdate({
      target: schema.settings.id,
      set: { goalStartOn: start, goalEndOn, updatedAt: sql`now()` },
    });

  // Re-anchor the four quarters to the new window.
  const quarters = await db()
    .select()
    .from(schema.roadmapQuarters)
    .orderBy(schema.roadmapQuarters.quarterIndex);

  for (const quarter of quarters) {
    const startsOn = new Date(startDate);
    startsOn.setUTCMonth(startsOn.getUTCMonth() + (quarter.quarterIndex - 1) * 3);
    const endsOn = new Date(startsOn);
    endsOn.setUTCMonth(endsOn.getUTCMonth() + 3);
    endsOn.setUTCDate(endsOn.getUTCDate() - 1);

    await db()
      .update(schema.roadmapQuarters)
      .set({
        startsOn: startsOn.toISOString().slice(0, 10),
        endsOn: endsOn.toISOString().slice(0, 10),
      })
      .where(eq(schema.roadmapQuarters.id, quarter.id));
  }

  revalidatePath("/practice/roadmap");
  revalidatePath("/");
}
