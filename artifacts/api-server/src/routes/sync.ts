/**
 * Authenticated outbox sync endpoint.
 *
 * POST /v1/sync accepts a batch of client-side mutations and applies them
 * server-side, returning which were accepted and which conflicted.
 *
 * Currently handles `diaryEntry` upsert and delete mutations.  Any other
 * entity type or unknown operation is reported as a conflict with reason
 * "unsupported_entity" or "unsupported_operation" so the client knows the
 * mutation was not applied rather than silently dropped.
 *
 * Idempotency: the (user_id, client_id) partial unique index on
 * calora_diary_entries guarantees that re-sending the same upsert simply
 * updates the existing row.  Delete mutations are also safe to retry — a
 * row-not-found DELETE is a no-op.
 *
 * Security: the endpoint requires a valid JWT. Every write is scoped to the
 * authenticated user's internal row; cross-user writes are structurally
 * impossible because userId comes from the verified token, not the payload.
 */
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, aiCaptureSessionsTable, diaryEntriesTable, usersTable } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";
import { normalizeImageMetadata } from "../lib/image-metadata.js";
import { logger } from "../lib/logger.js";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";

const router: IRouter = Router();

// ── Validation ──────────────────────────────────────────────────────────────

const MEALS = new Set(["Breakfast", "Lunch", "Dinner", "Snack"]);
const PROVENANCE = new Set([
  "USDA verified",
  "Brand verified",
  "Barcode verified",
  "Photo estimate",
  "Manual",
  "Recipe",
]);

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function nonNeg(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

type DiaryUpsertPayload = {
  clientId: string;
  /**
   * Optional: a server-recorded capture session UUID that the client can
   * supply to prove image/barcode provenance.  The server verifies the
   * session belongs to the authenticated user and has mode != 'text' before
   * writing it to the diary row. NULL means the sync entry carries no verified
   * capture provenance signal.
   */
  captureSessionId: string | null;
  entryDate: string;
  meal: string;
  name: string;
  serving: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  provenance: string;
  confidence: number;
  notes: string | null;
  /**
   * Optional trusted absolute HTTPS image URL for this entry. NULL when absent
   * or when the supplied value failed URL validation — a fabricated payload
   * can never inject an untrusted or non-HTTPS value here.
   */
  imageUrl: string | null;
  /** Optional short image-source label; forced NULL when imageUrl is NULL. */
  imageSource: string | null;
  syncMetadata: {
    time?: string;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    preparation?: string;
    memoryId?: string;
    plannerMealId?: string;
    sourceRecipeId?: string;
  };
};

const SYNC_METADATA_STRING_LIMITS = {
  time: 40,
  preparation: 500,
  memoryId: 128,
  plannerMealId: 128,
  sourceRecipeId: 128,
} as const;

function parseSyncMetadata(payload: Record<string, unknown>): DiaryUpsertPayload["syncMetadata"] {
  const metadata: DiaryUpsertPayload["syncMetadata"] = {};
  for (const [key, limit] of Object.entries(SYNC_METADATA_STRING_LIMITS)) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      metadata[key as keyof typeof SYNC_METADATA_STRING_LIMITS] = value.trim().slice(0, limit);
    }
  }
  for (const key of ["fiber", "sugar", "sodium"] as const) {
    const value = nonNeg(payload[key]);
    if (value !== null) metadata[key] = value;
  }
  return metadata;
}

function parseDiaryUpsert(
  payload: Record<string, unknown>,
): { ok: true; value: DiaryUpsertPayload } | { ok: false; message: string } {
  if (
    typeof payload.clientId !== "string" ||
    payload.clientId.length < 1 ||
    payload.clientId.length > 128
  )
    return { ok: false, message: "clientId is required" };

  // captureSessionId is optional — null or absent means no provenance claim.
  // When provided it must be a canonical UUID.
  let captureSessionId: string | null = null;
  if (payload.captureSessionId != null) {
    if (
      typeof payload.captureSessionId !== "string" ||
      !UUID_RE.test(payload.captureSessionId)
    )
      return { ok: false, message: "captureSessionId must be a UUID when provided" };
    captureSessionId = payload.captureSessionId;
  }

  if (!isDate(payload.entryDate))
    return { ok: false, message: "A valid entry date is required" };
  if (typeof payload.meal !== "string" || !MEALS.has(payload.meal))
    return { ok: false, message: "Invalid meal" };
  if (
    typeof payload.name !== "string" ||
    payload.name.trim().length < 1 ||
    payload.name.trim().length > 160
  )
    return { ok: false, message: "A food name is required" };
  if (
    typeof payload.serving !== "string" ||
    payload.serving.trim().length < 1 ||
    payload.serving.trim().length > 160
  )
    return { ok: false, message: "A serving is required" };
  if (
    typeof payload.provenance !== "string" ||
    !PROVENANCE.has(payload.provenance)
  )
    return { ok: false, message: "Invalid provenance" };
  const calories = nonNeg(payload.calories);
  const proteinG = nonNeg(payload.proteinG);
  const carbsG = nonNeg(payload.carbsG);
  const fatG = nonNeg(payload.fatG);
  if (
    calories === null ||
    proteinG === null ||
    carbsG === null ||
    fatG === null
  )
    return {
      ok: false,
      message: "Nutrition values must be non-negative numbers",
    };
  if (
    typeof payload.confidence !== "number" ||
    !Number.isInteger(payload.confidence) ||
    payload.confidence < 0 ||
    payload.confidence > 100
  )
    return { ok: false, message: "Confidence must be 0-100" };
  const notes =
    payload.notes != null
      ? typeof payload.notes === "string"
        ? payload.notes.trim().slice(0, 2000) || null
        : null
      : null;
  // Optional image metadata is validated defensively: only absolute
  // trusted HTTPS URLs survive, and a source label without a valid URL is
  // dropped. Invalid values become NULL rather than failing the whole
  // mutation, preserving backward compatibility for clients that omit them.
  const { imageUrl, imageSource } = normalizeImageMetadata(
    payload.imageUrl,
    payload.imageSource,
  );
  return {
    ok: true,
    value: {
      clientId: payload.clientId as string,
      captureSessionId,
      entryDate: payload.entryDate as string,
      meal: payload.meal as string,
      name: (payload.name as string).trim(),
      serving: (payload.serving as string).trim(),
      calories,
      proteinG,
      carbsG,
      fatG,
      provenance: payload.provenance as string,
      confidence: payload.confidence as number,
      notes,
      imageUrl,
      imageSource,
      syncMetadata: parseSyncMetadata(payload),
    },
  };
}

type RawMutation = {
  mutationId: string;
  entity: string;
  operation: string;
  clientUpdatedAt: string;
  payload: Record<string, unknown>;
};

function parseRequest(
  body: unknown,
): { ok: true; deviceId: string; mutations: RawMutation[] } | { ok: false; message: string } {
  if (!body || typeof body !== "object")
    return { ok: false, message: "Request body is required" };
  const b = body as Record<string, unknown>;
  if (typeof b.deviceId !== "string" || b.deviceId.length < 1)
    return { ok: false, message: "deviceId is required" };
  if (!Array.isArray(b.mutations))
    return { ok: false, message: "mutations must be an array" };
  if (b.mutations.length > 100)
    return { ok: false, message: "Too many mutations (max 100)" };

  const mutations: RawMutation[] = [];
  for (const m of b.mutations) {
    if (!m || typeof m !== "object")
      return { ok: false, message: "Each mutation must be an object" };
    const mut = m as Record<string, unknown>;
    if (
      typeof mut.mutationId !== "string" ||
      mut.mutationId.length < 1 ||
      mut.mutationId.length > 256
    )
      return { ok: false, message: "mutationId must be a non-empty string" };
    if (typeof mut.entity !== "string")
      return { ok: false, message: "entity is required" };
    if (typeof mut.operation !== "string")
      return { ok: false, message: "operation is required" };
    if (
      typeof mut.clientUpdatedAt !== "string" ||
      Number.isNaN(Date.parse(mut.clientUpdatedAt))
    )
      return { ok: false, message: "clientUpdatedAt must be a valid date-time" };
    if (
      !mut.payload ||
      typeof mut.payload !== "object" ||
      Array.isArray(mut.payload)
    )
      return { ok: false, message: "payload must be an object" };
    mutations.push({
      mutationId: mut.mutationId as string,
      entity: mut.entity as string,
      operation: mut.operation as string,
      clientUpdatedAt: mut.clientUpdatedAt as string,
      payload: mut.payload as Record<string, unknown>,
    });
  }
  return { ok: true, deviceId: b.deviceId as string, mutations };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when s is a canonical UUID — required for the sync_mutations PK. */
function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function serializeDiaryRecord(row: typeof diaryEntriesTable.$inferSelect) {
  return {
    clientId: row.clientId,
    captureSessionId: row.captureSessionId,
    entryDate: row.entryDate,
    meal: row.meal,
    name: row.name,
    serving: row.serving,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    provenance: row.provenance,
    confidence: row.confidence,
    notes: row.notes,
    imageUrl: row.imageUrl,
    imageSource: row.imageSource,
    ...row.syncMetadata,
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
  };
}

type MutationClaim = "apply" | "accepted" | "stale";

/**
 * Atomically claims the newest mutation for one account-owned client record.
 * The durable ledger doubles as the delete tombstone store, so an old offline
 * upsert cannot resurrect a record deleted on another device.
 */
async function claimDiaryMutation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  mutation: RawMutation,
  clientId: string,
): Promise<MutationClaim> {
  const result = await tx.execute(sql`
    WITH locked AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`${userId}:${clientId}`}, 0)
      )
    ),
    inserted AS (
      INSERT INTO calora_sync_mutations
        (mutation_id, user_id, entity, operation, payload, client_updated_at, processed_at)
      SELECT
        ${mutation.mutationId}::uuid, ${userId}::uuid,
        ${mutation.entity}, ${mutation.operation},
        ${JSON.stringify(mutation.payload)}::jsonb,
        ${mutation.clientUpdatedAt}::timestamptz, now()
      FROM locked
      WHERE NOT EXISTS (
        SELECT 1
        FROM calora_sync_mutations prior
        WHERE prior.user_id = ${userId}::uuid
          AND prior.entity = 'diaryEntry'
          AND prior.payload->>'clientId' = ${clientId}
          AND (
            prior.client_updated_at > ${mutation.clientUpdatedAt}::timestamptz
            OR (
              prior.client_updated_at = ${mutation.clientUpdatedAt}::timestamptz
              AND prior.mutation_id::text > ${mutation.mutationId}
            )
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM calora_diary_entries current_entry
        WHERE current_entry.user_id = ${userId}::uuid
          AND current_entry.client_id = ${clientId}
          AND current_entry.client_updated_at > ${mutation.clientUpdatedAt}::timestamptz
      )
      ON CONFLICT (mutation_id) DO NOTHING
      RETURNING mutation_id
    )
    SELECT 'apply'::text AS status
    WHERE EXISTS (SELECT 1 FROM inserted)
    UNION ALL
    SELECT 'accepted'::text AS status
    WHERE NOT EXISTS (SELECT 1 FROM inserted)
      AND EXISTS (
        SELECT 1
        FROM calora_sync_mutations existing
        WHERE existing.mutation_id = ${mutation.mutationId}::uuid
          AND existing.user_id = ${userId}::uuid
          AND existing.entity = ${mutation.entity}
          AND existing.operation = ${mutation.operation}
          AND existing.client_updated_at = ${mutation.clientUpdatedAt}::timestamptz
          AND existing.payload->>'clientId' = ${clientId}
          AND NOT EXISTS (
            SELECT 1
            FROM calora_sync_mutations newer
            WHERE newer.user_id = ${userId}::uuid
              AND newer.entity = 'diaryEntry'
              AND newer.payload->>'clientId' = ${clientId}
              AND (
                newer.client_updated_at > existing.client_updated_at
                OR (
                  newer.client_updated_at = existing.client_updated_at
                  AND newer.mutation_id::text > existing.mutation_id::text
                )
              )
          )
      )
    LIMIT 1
  `);
  const status = result.rows[0]?.status;
  return status === "apply" || status === "accepted" ? status : "stale";
}

// ── Handler ──────────────────────────────────────────────────────────────────

router.post("/v1/sync", async (req, res) => {
  let deletionFenceRejectionCount = 0;
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res.status(401).json({ message: "Please sign in to sync." });
      return;
    }

    const parsed = parseRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.message });
      return;
    }

    const { mutations } = parsed;
    const userId = await ensureUserRow(user.id, user.email);

    const accepted: string[] = [];
    const conflicts: Array<{ mutationId: string; reason: string }> = [];

    for (const mutation of mutations) {
      // Require a canonical UUID so the mutation can be recorded in
      // calora_sync_mutations (uuid PK) for cross-session deduplication.
      // Non-UUID mutationIds are never safe to accept because they cannot be
      // deduplicated — the client must use crypto.randomUUID().
      if (!isUuid(mutation.mutationId)) {
        conflicts.push({
          mutationId: mutation.mutationId,
          reason: "invalid_mutation_id",
        });
        continue;
      }

      // Reject unsupported entity types explicitly so the client knows the
      // mutation was not applied.
      if (mutation.entity !== "diaryEntry") {
        conflicts.push({
          mutationId: mutation.mutationId,
          reason: "unsupported_entity",
        });
        continue;
      }

      try {
        if (mutation.operation === "upsert") {
          const p = parseDiaryUpsert(mutation.payload);
          if (!p.ok) {
            conflicts.push({
              mutationId: mutation.mutationId,
              reason: "validation_failed",
            });
            continue;
          }
          const v = p.value;

          // ── Capture session verification ───────────────────────────────────
          // When the client supplies a captureSessionId the server verifies:
          //   1. The session exists and belongs to the authenticated user.
          //   2. The session mode is not 'text' (image/barcode only).
          // On failure the session claim is silently dropped — the diary row
           // is still written without a capture_session_id so the client's
           // food log is not lost.
          let verifiedCaptureSessionId: string | null = null;
          if (v.captureSessionId !== null) {
            const sessions = await db
              .select({ id: aiCaptureSessionsTable.id, mode: aiCaptureSessionsTable.mode })
              .from(aiCaptureSessionsTable)
              .innerJoin(usersTable, eq(aiCaptureSessionsTable.userId, usersTable.id))
              .where(
                and(
                  eq(aiCaptureSessionsTable.id, v.captureSessionId),
                  eq(usersTable.id, userId),
                ),
              )
              .limit(1);
            if (sessions.length > 0 && sessions[0].mode !== "text") {
              verifiedCaptureSessionId = sessions[0].id;
            }
            // If the session is not found, doesn't belong to the user, or is
            // not an approved image/barcode mode (text, voice, receipt, etc.),
            // verifiedCaptureSessionId stays null and the row is written
            // without a provenance anchor.
          }

          // Upsert on (user_id, client_id): re-sending the same clientId
          // updates the existing row rather than creating a duplicate.
          // Raw SQL is required because the partial unique index
          // (WHERE client_id IS NOT NULL) cannot be named as a Drizzle
          // conflict target.
          // The diary write and its idempotency ledger entry must be durable
          // together. In particular, a ledger failure must not leave an entry
          // that a retry would treat as already processed (or vice versa).
          await db.transaction(async (tx) => {
            const claim = await claimDiaryMutation(tx, userId, mutation, v.clientId);
            if (claim === "stale") return "stale";
            if (claim === "accepted") return "accepted";

            await tx.execute(sql`
              INSERT INTO calora_diary_entries
                (user_id, client_id, capture_session_id, entry_date, meal, name, serving,
                 calories, protein_g, carbs_g, fat_g, provenance,
                 confidence, notes, image_url, image_source, sync_metadata, client_updated_at)
              VALUES
                (${userId}::uuid, ${v.clientId}, ${verifiedCaptureSessionId}::uuid,
                 ${v.entryDate}::date, ${v.meal},
                 ${v.name}, ${v.serving},
                 ${String(v.calories)}::numeric, ${String(v.proteinG)}::numeric,
                 ${String(v.carbsG)}::numeric, ${String(v.fatG)}::numeric,
                 ${v.provenance}, ${v.confidence}::integer,
                  ${v.notes}, ${v.imageUrl}, ${v.imageSource}, ${JSON.stringify(v.syncMetadata)}::jsonb,
                  ${mutation.clientUpdatedAt}::timestamptz)
              ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL
              DO UPDATE SET
                entry_date          = EXCLUDED.entry_date,
                meal                = EXCLUDED.meal,
                name                = EXCLUDED.name,
                serving             = EXCLUDED.serving,
                calories            = EXCLUDED.calories,
                protein_g           = EXCLUDED.protein_g,
                carbs_g             = EXCLUDED.carbs_g,
                fat_g               = EXCLUDED.fat_g,
                provenance          = EXCLUDED.provenance,
                confidence          = EXCLUDED.confidence,
                notes               = EXCLUDED.notes,
                image_url           = EXCLUDED.image_url,
                image_source        = EXCLUDED.image_source,
                sync_metadata       = EXCLUDED.sync_metadata,
                capture_session_id  = COALESCE(EXCLUDED.capture_session_id, calora_diary_entries.capture_session_id),
                client_updated_at   = EXCLUDED.client_updated_at,
                updated_at          = now()
            `);
            return "apply";
          }).then((claim) => {
            if (claim === "stale") {
              conflicts.push({ mutationId: mutation.mutationId, reason: "stale_write" });
            } else {
              accepted.push(mutation.mutationId);
            }
          });
        } else if (mutation.operation === "delete") {
          const clientId = mutation.payload.clientId;
          if (typeof clientId !== "string" || clientId.length < 1 || clientId.length > 128) {
            conflicts.push({
              mutationId: mutation.mutationId,
              reason: "validation_failed",
            });
            continue;
          }

          // Scoped delete: the WHERE clause ensures one user can never
          // remove another user's diary row even if they guess a client_id.
          await db.transaction(async (tx) => {
            const claim = await claimDiaryMutation(tx, userId, mutation, clientId);
            if (claim === "stale") return "stale";
            if (claim === "accepted") return "accepted";

            await tx.execute(sql`
              DELETE FROM calora_diary_entries
              WHERE user_id = ${userId}::uuid
                AND client_id = ${clientId}
            `);
            return "apply";
          }).then((claim) => {
            if (claim === "stale") {
              conflicts.push({ mutationId: mutation.mutationId, reason: "stale_write" });
            } else {
              accepted.push(mutation.mutationId);
            }
          });
        } else {
          // Unknown diary operation: report as conflict rather than silently
          // discarding the mutation.
          conflicts.push({
            mutationId: mutation.mutationId,
            reason: "unsupported_operation",
          });
        }
      } catch (err) {
        if (classifyAccountDeletionError(err) === ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
          deletionFenceRejectionCount += 1;
          continue;
        }
        logger.error({
          mutationId: mutation.mutationId,
          err,
        }, "Sync mutation failed");
        conflicts.push({ mutationId: mutation.mutationId, reason: "server_error" });
      }
    }

    if (deletionFenceRejectionCount > 0) {
      logger.warn(
        {
          errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
          route: "/v1/sync",
          count: deletionFenceRejectionCount,
        },
        "Account deletion fence rejected sync writes",
      );
      res
        .status(503)
        .json({ message: "Sync is unavailable right now. Please try again later." });
      return;
    }

    const records = await db
      .select()
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId));
    res.json({
      accepted,
      conflicts,
      records: records
        .filter((row) => row.clientId !== null)
        .map(serializeDiaryRecord),
      nextCursor: "",
    });
  } catch (err) {
    const errorClass = classifyAccountDeletionError(err);
    if (errorClass === ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
      logger.warn(
        {
          errorClass,
          route: "/v1/sync",
          count: Math.max(1, deletionFenceRejectionCount),
        },
        "Account deletion fence rejected sync request",
      );
      res
        .status(503)
        .json({ message: "Sync is unavailable right now. Please try again later." });
      return;
    }
    logger.error({ err }, "Sync request failed");
    res
      .status(503)
      .json({ message: "Sync is unavailable right now. Please try again later." });
  }
});

export default router;
