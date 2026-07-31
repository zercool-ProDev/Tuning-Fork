"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { getToday } from "@/db/queries";
import { DOMAINS, INSTRUMENT_DOMAINS, type DomainValue } from "@/lib/domains";

const VALID_DOMAINS = new Set<string>(DOMAINS.map((domain) => domain.value));

export type SessionFormState = { error: string | null };

type ParsedSegment = {
  domain: DomainValue;
  minutes: number;
  instrumentId: number | null;
  genreId: number | null;
  epTrackId: number | null;
  notes: string | null;
};

function optionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Pull the repeated segment fields out of the form.
 *
 * The client names them `segment.<index>.<field>`, and indices are not
 * guaranteed contiguous because rows can be removed before submitting. Segments
 * with no domain selected are dropped rather than rejected, so a half-filled
 * row someone changed their mind about does not block the save.
 */
function parseSegments(formData: FormData): ParsedSegment[] {
  const indices = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^segment\.(\d+)\./.exec(key);
    if (match) indices.add(match[1]);
  }

  const segments: ParsedSegment[] = [];
  for (const index of [...indices].sort((a, b) => Number(a) - Number(b))) {
    const domain = formData.get(`segment.${index}.domain`);
    if (typeof domain !== "string" || !VALID_DOMAINS.has(domain)) continue;

    const minutes = optionalInt(formData.get(`segment.${index}.minutes`)) ?? 0;
    const instrumentId = INSTRUMENT_DOMAINS.includes(domain as DomainValue)
      ? optionalInt(formData.get(`segment.${index}.instrumentId`))
      : null;

    segments.push({
      domain: domain as DomainValue,
      minutes: Math.max(0, Math.min(minutes, 24 * 60)),
      instrumentId,
      genreId: domain === "genre" ? optionalInt(formData.get(`segment.${index}.genreId`)) : null,
      epTrackId: domain === "ep" ? optionalInt(formData.get(`segment.${index}.epTrackId`)) : null,
      notes: optionalText(formData.get(`segment.${index}.notes`)),
    });
  }
  return segments;
}

function parseCommon(formData: FormData) {
  const occurredOn = formData.get("occurredOn");
  const energyRaw = optionalInt(formData.get("energy"));

  return {
    occurredOn: typeof occurredOn === "string" ? occurredOn : "",
    // Out-of-range energy is dropped rather than clamped: a bad value here is a
    // bug, not a preference, and silently storing 5 would be a quiet lie.
    energy: energyRaw !== null && energyRaw >= 1 && energyRaw <= 5 ? energyRaw : null,
    whatWorked: optionalText(formData.get("whatWorked")),
    whatDidnt: optionalText(formData.get("whatDidnt")),
    focusNext: optionalText(formData.get("focusNext")),
  };
}

function validate(occurredOn: string, segments: ParsedSegment[]): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return "Pick a valid date for this session.";
  }
  if (segments.length === 0) {
    return "Add at least one practice block before saving.";
  }
  if (segments.every((segment) => segment.minutes === 0)) {
    return "Give at least one block some minutes.";
  }
  return null;
}

export async function createSession(
  _previous: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const common = parseCommon(formData);
  const segments = parseSegments(formData);

  const error = validate(common.occurredOn, segments);
  if (error) return { error };

  const today = await getToday();
  if (common.occurredOn > today) {
    return { error: "That date is in the future." };
  }

  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);

  const [session] = await db()
    .insert(schema.practiceSessions)
    .values({
      occurredOn: common.occurredOn,
      totalMinutes,
      energy: common.energy,
    })
    .returning();

  await db().insert(schema.sessionSegments).values(
    segments.map((segment) => ({
      sessionId: session.id,
      domain: segment.domain,
      minutes: segment.minutes,
      instrumentId: segment.instrumentId,
      genreId: segment.genreId,
      epTrackId: segment.epTrackId,
      notes: segment.notes,
    })),
  );

  if (common.whatWorked || common.whatDidnt || common.focusNext) {
    await db().insert(schema.journalEntries).values({
      sessionId: session.id,
      occurredOn: common.occurredOn,
      whatWorked: common.whatWorked,
      whatDidnt: common.whatDidnt,
      focusNext: common.focusNext,
    });
  }

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect("/sessions?saved=1");
}

export async function updateSession(
  _previous: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const id = optionalInt(formData.get("sessionId"));
  if (id === null) return { error: "Missing session id." };

  const common = parseCommon(formData);
  const segments = parseSegments(formData);

  const error = validate(common.occurredOn, segments);
  if (error) return { error };

  const today = await getToday();
  if (common.occurredOn > today) {
    return { error: "That date is in the future." };
  }

  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);

  await db()
    .update(schema.practiceSessions)
    .set({
      occurredOn: common.occurredOn,
      totalMinutes,
      energy: common.energy,
    })
    .where(eq(schema.practiceSessions.id, id));

  /**
   * Segments are replaced wholesale rather than diffed. They carry no identity
   * worth preserving — nothing references a segment row — so replacing is both
   * simpler and immune to the reordering bugs a diff would invite.
   */
  await db()
    .delete(schema.sessionSegments)
    .where(eq(schema.sessionSegments.sessionId, id));

  await db().insert(schema.sessionSegments).values(
    segments.map((segment) => ({
      sessionId: id,
      domain: segment.domain,
      minutes: segment.minutes,
      instrumentId: segment.instrumentId,
      genreId: segment.genreId,
      epTrackId: segment.epTrackId,
      notes: segment.notes,
    })),
  );

  const hasJournal = Boolean(common.whatWorked || common.whatDidnt || common.focusNext);
  await db().delete(schema.journalEntries).where(eq(schema.journalEntries.sessionId, id));
  if (hasJournal) {
    await db().insert(schema.journalEntries).values({
      sessionId: id,
      occurredOn: common.occurredOn,
      whatWorked: common.whatWorked,
      whatDidnt: common.whatDidnt,
      focusNext: common.focusNext,
    });
  }

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect("/sessions?saved=1");
}

export async function deleteSession(formData: FormData) {
  const id = optionalInt(formData.get("sessionId"));
  if (id === null) return;

  // Segments and the journal entry cascade via their foreign keys.
  await db().delete(schema.practiceSessions).where(eq(schema.practiceSessions.id, id));

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect("/sessions?deleted=1");
}
