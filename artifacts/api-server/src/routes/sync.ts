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
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";

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
};

function parseDiaryUpsert(
  payload: Record<string, unknown>,
): { ok: true; value: DiaryUpsertPayload } | { ok: false; message: string } {
  if (
    typeof payload.clientId !== "string" ||
    payload.clientId.length < 1 ||
    payload.clientId.length > 128
  )
    return { ok: false, message: "clientId is required" };
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
  return {
    ok: true,
    value: {
      clientId: payload.clientId,
      entryDate: payload.entryDate,
      meal: payload.meal,
      name: payload.name.trim(),
      serving: payload.serving.trim(),
      calories,
      proteinG,
      carbsG,
      fatG,
      provenance: payload.provenance,
      confidence: payload.confidence,
      notes,
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
    if (typeof mut.clientUpdatedAt !== "string")
      return { ok: false, message: "clientUpdatedAt is required" };
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

// ── Handler ──────────────────────────────────────────────────────────────────

router.post("/v1/sync", async (req, res) => {
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
    if (mutations.length === 0) {
      res.json({ accepted: [], conflicts: [], nextCursor: "" });
      return;
    }

    const userId = await ensureUserRow(user.id, user.email);

    const accepted: string[] = [];
    const conflicts: Array<{ mutationId: string; reason: string }> = [];

    for (const mutation of mutations) {
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

          // Upsert on (user_id, client_id): re-sending the same clientId
          // updates the existing row rather than creating a duplicate.
          // Raw SQL is required because the partial unique index
          // (WHERE client_id IS NOT NULL) cannot be named as a Drizzle
          // conflict target.
          await db.execute(sql`
            INSERT INTO calora_diary_entries
              (user_id, client_id, entry_date, meal, name, serving,
               calories, protein_g, carbs_g, fat_g, provenance,
               confidence, notes, client_updated_at)
            VALUES
              (${userId}::uuid, ${v.clientId}, ${v.entryDate}::date, ${v.meal},
               ${v.name}, ${v.serving},
               ${String(v.calories)}::numeric, ${String(v.proteinG)}::numeric,
               ${String(v.carbsG)}::numeric, ${String(v.fatG)}::numeric,
               ${v.provenance}, ${v.confidence}::integer,
               ${v.notes}, now())
            ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL
            DO UPDATE SET
              entry_date        = EXCLUDED.entry_date,
              meal              = EXCLUDED.meal,
              name              = EXCLUDED.name,
              serving           = EXCLUDED.serving,
              calories          = EXCLUDED.calories,
              protein_g         = EXCLUDED.protein_g,
              carbs_g           = EXCLUDED.carbs_g,
              fat_g             = EXCLUDED.fat_g,
              provenance        = EXCLUDED.provenance,
              confidence        = EXCLUDED.confidence,
              notes             = EXCLUDED.notes,
              client_updated_at = EXCLUDED.client_updated_at,
              updated_at        = now()
          `);

          // Record the accepted mutation for cross-session deduplication.
          // ON CONFLICT DO NOTHING means a second sync of the same mutationId
          // (after an app restart) never creates a duplicate log entry.
          if (isUuid(mutation.mutationId)) {
            await db.execute(sql`
              INSERT INTO calora_sync_mutations
                (mutation_id, user_id, entity, operation, payload, client_updated_at, processed_at)
              VALUES
                (${mutation.mutationId}::uuid, ${userId}::uuid,
                 ${mutation.entity}, ${mutation.operation},
                 ${JSON.stringify(mutation.payload)}::jsonb,
                 ${mutation.clientUpdatedAt}::timestamptz, now())
              ON CONFLICT (mutation_id) DO NOTHING
            `);
          }

          accepted.push(mutation.mutationId);
        } else if (mutation.operation === "delete") {
          const clientId = mutation.payload.clientId;
          if (typeof clientId !== "string" || clientId.length < 1) {
            conflicts.push({
              mutationId: mutation.mutationId,
              reason: "validation_failed",
            });
            continue;
          }

          // Scoped delete: the WHERE clause ensures one user can never
          // remove another user's diary row even if they guess a client_id.
          await db.execute(sql`
            DELETE FROM calora_diary_entries
            WHERE user_id = ${userId}::uuid
              AND client_id = ${clientId}
          `);

          // Record the delete mutation for auditability across sessions.
          if (isUuid(mutation.mutationId)) {
            await db.execute(sql`
              INSERT INTO calora_sync_mutations
                (mutation_id, user_id, entity, operation, payload, client_updated_at, processed_at)
              VALUES
                (${mutation.mutationId}::uuid, ${userId}::uuid,
                 ${mutation.entity}, ${mutation.operation},
                 ${JSON.stringify(mutation.payload)}::jsonb,
                 ${mutation.clientUpdatedAt}::timestamptz, now())
              ON CONFLICT (mutation_id) DO NOTHING
            `);
          }

          accepted.push(mutation.mutationId);
        } else {
          // Unknown diary operation: report as conflict rather than silently
          // discarding the mutation.
          conflicts.push({
            mutationId: mutation.mutationId,
            reason: "unsupported_operation",
          });
        }
      } catch (err) {
        console.error("[sync] mutation failed", {
          mutationId: mutation.mutationId,
          err,
        });
        conflicts.push({ mutationId: mutation.mutationId, reason: "server_error" });
      }
    }

    res.json({ accepted, conflicts, nextCursor: "" });
  } catch (err) {
    console.error("[sync] request failed", err);
    res
      .status(503)
      .json({ message: "Sync is unavailable right now. Please try again later." });
  }
});

export default router;
