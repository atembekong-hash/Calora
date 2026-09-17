/**
 * Referral qualification must be anchored to a server-observed capture.
 *
 * A plain diary row is intentionally not enough: both POST /v1/diary and an
 * unanchored POST /v1/sync accept client-supplied nutrition fields so they can
 * remain useful for local-first/manual logging. Those rows must never unlock a
 * paid entitlement.
 *
 * The two qualifying persistence paths are:
 *   1. /v1/diary/first-log, which stamps reviewed_at only after the server has
 *      claimed a recent, owner-scoped capture and checked its nutrition.
 *   2. /v1/sync, which stores capture_session_id only after verifying that the
 *      session was server-created for this account.
 *
 * The allowlist is deliberate. Excluding unknown and text/voice/receipt modes
 * prevents a future capture mode from becoming a reward signal accidentally.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  aiCaptureSessionsTable,
  db,
  diaryEntriesTable,
  usersTable,
} from "@workspace/db";

/** Capture modes backed by an image or exact barcode lookup. */
export const QUALIFYING_CAPTURE_MODES = [
  "food",
  "barcode",
  "nutrition_label",
] as const;

/**
 * Returns true when the authenticated user has completed a server-observed
 * capture-backed meal save.
 */
export async function hasSavedDiaryEntry(supabaseUserId: string): Promise<boolean> {
  // first-log: reviewed_at is only stamped by the server-side capture claim
  // after the entry has passed owner, freshness, single-use, and nutrition
  // consistency checks.
  const firstLogSessions = await db
    .select({ id: aiCaptureSessionsTable.id })
    .from(aiCaptureSessionsTable)
    .innerJoin(usersTable, eq(aiCaptureSessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(usersTable.externalId, supabaseUserId),
        isNotNull(aiCaptureSessionsTable.reviewedAt),
        inArray(aiCaptureSessionsTable.mode, [...QUALIFYING_CAPTURE_MODES]),
      ),
    )
    .limit(1);
  if (firstLogSessions.length > 0) return true;

  // outbox sync: the row must retain a non-null server-verified session
  // belonging to the same authenticated account. Client-only rows are not
  // eligible even if their nutrition payload is syntactically valid.
  const syncedEntries = await db
    .select({ id: diaryEntriesTable.id })
    .from(diaryEntriesTable)
    .innerJoin(usersTable, eq(diaryEntriesTable.userId, usersTable.id))
    .innerJoin(
      aiCaptureSessionsTable,
      eq(diaryEntriesTable.captureSessionId, aiCaptureSessionsTable.id),
    )
    .where(
      and(
        eq(usersTable.externalId, supabaseUserId),
        isNotNull(diaryEntriesTable.captureSessionId),
        inArray(aiCaptureSessionsTable.mode, [...QUALIFYING_CAPTURE_MODES]),
      ),
    )
    .limit(1);
  return syncedEntries.length > 0;
}
