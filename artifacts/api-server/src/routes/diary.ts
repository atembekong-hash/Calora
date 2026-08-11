/**
 * Authenticated food-diary persistence.
 *
 * Local-first clients use this route to durably record confirmed entries. The
 * referral service relies on these server-owned records — never on a client
 * claim — when deciding whether a new account has qualified for its reward.
 *
 * POST /v1/diary/first-log additionally records the referred user's first
 * approved food log. To prevent fabricated payloads from creating that
 * record with a single request, a first-log sync must reference a
 * server-issued capture session:
 *
 *   1. The authenticated user runs a real capture analysis; the server
 *      persists the session + its candidates (see routes/capture.ts).
 *   2. The synced entry must cite that session id, belong to the same user,
 *      be recent, unused, and be nutritionally consistent with what the
 *      server itself analyzed.
 *
 * Idempotent: once any diary entry exists for the user, repeat calls report
 * the existing state and write nothing.
 */
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { CreateDiaryEntryBody, SyncFirstDiaryEntryBody } from "@workspace/api-zod";
import { db, aiCaptureCandidatesTable, aiCaptureSessionsTable, diaryEntriesTable, usersTable } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";

const router: IRouter = Router();

/** A session older than this can no longer anchor a first-log sync. */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const MEALS = new Set(["Breakfast", "Lunch", "Dinner", "Snack"]);
const PROVENANCE = new Set([
  "USDA verified",
  "Brand verified",
  "Barcode verified",
  "Photo estimate",
  "Manual",
  "Recipe",
]);

type DiaryInput = {
  entryDate?: unknown;
  meal?: unknown;
  name?: unknown;
  serving?: unknown;
  calories?: unknown;
  proteinG?: unknown;
  carbsG?: unknown;
  fatG?: unknown;
  provenance?: unknown;
  confidence?: unknown;
  clientUpdatedAt?: unknown;
  notes?: unknown;
};

type ValidDiaryInput = {
  entryDate: string;
  meal: string;
  name: string;
  serving: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  provenance: string;
  confidence: number;
  clientUpdatedAt: string;
  notes: string | null;
};

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parseInput(body: DiaryInput): { ok: true; value: ValidDiaryInput } | { ok: false; message: string } {
  if (!isDate(body.entryDate)) return { ok: false, message: "A valid entry date is required." };
  if (typeof body.meal !== "string" || !MEALS.has(body.meal)) return { ok: false, message: "Choose a valid meal." };
  if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 160) return { ok: false, message: "A food name is required." };
  if (typeof body.serving !== "string" || body.serving.trim().length < 1 || body.serving.trim().length > 160) return { ok: false, message: "A serving is required." };
  if (typeof body.provenance !== "string" || !PROVENANCE.has(body.provenance)) return { ok: false, message: "Choose a valid food source." };
  const calories = numeric(body.calories);
  const proteinG = numeric(body.proteinG);
  const carbsG = numeric(body.carbsG);
  const fatG = numeric(body.fatG);
  if (calories === null || proteinG === null || carbsG === null || fatG === null) return { ok: false, message: "Nutrition values must be non-negative numbers." };
  if (typeof body.confidence !== "number" || !Number.isInteger(body.confidence) || body.confidence < 0 || body.confidence > 100) return { ok: false, message: "Confidence must be between 0 and 100." };
  if (typeof body.clientUpdatedAt !== "string" || Number.isNaN(Date.parse(body.clientUpdatedAt))) return { ok: false, message: "A valid update time is required." };
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") return { ok: false, message: "Notes must be text." };
  return {
    ok: true,
    value: {
      entryDate: body.entryDate,
      meal: body.meal,
      name: body.name.trim(),
      serving: body.serving.trim(),
      // Drizzle represents PostgreSQL numeric columns as strings to preserve
      // the exact decimal value at the persistence boundary.
      calories: String(calories),
      proteinG: String(proteinG),
      carbsG: String(carbsG),
      fatG: String(fatG),
      provenance: body.provenance,
      confidence: body.confidence,
      clientUpdatedAt: body.clientUpdatedAt,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null,
    },
  };
}

/** Creates the internal data owner lazily from the JWT identity. */
async function ensureDataUser(externalId: string, email: string | null) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.externalId, externalId)).limit(1);
  if (existing[0]) return existing[0];
  try {
    const inserted = await db.insert(usersTable).values({ externalId, email }).returning();
    return inserted[0];
  } catch {
    const concurrent = await db.select().from(usersTable).where(eq(usersTable.externalId, externalId)).limit(1);
    if (!concurrent[0]) throw new Error("Unable to create the diary owner.");
    return concurrent[0];
  }
}

function serialize(row: typeof diaryEntriesTable.$inferSelect) {
  return {
    id: row.id,
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
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/v1/diary", async (req, res) => {
  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ message: "Please sign in to view your diary." });
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!isDate(date)) return res.status(400).json({ message: "A valid date is required." });
  const userId = await ensureUserRow(auth.id, auth.email);
  const rows = await db.select().from(diaryEntriesTable).where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.entryDate, date))).orderBy(desc(diaryEntriesTable.createdAt));
  return res.json({ date, entries: rows.map(serialize) });
});

router.post("/v1/diary", async (req, res) => {
  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ message: "Please sign in to save a diary entry." });
  const parsed = CreateDiaryEntryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid diary entry" });
  const entry = parsed.data;
  const userId = await ensureUserRow(auth.id, auth.email);
  const values: typeof diaryEntriesTable.$inferInsert = {
    userId,
    entryDate: entry.entryDate.toISOString().slice(0, 10),
    meal: entry.meal,
    name: entry.name,
    serving: entry.serving,
    calories: String(entry.calories),
    proteinG: String(entry.proteinG),
    carbsG: String(entry.carbsG),
    fatG: String(entry.fatG),
    provenance: entry.provenance,
    confidence: entry.confidence,
    notes: entry.notes ?? null,
    clientUpdatedAt: entry.clientUpdatedAt,
  };
  const [created] = await db.insert(diaryEntriesTable).values(values).returning();
  return res.status(201).json(serialize(created));
});

router.delete("/v1/diary/:entryId", async (req, res) => {
  const auth = await verifyBearerToken(req);
  if (!auth) return res.status(401).json({ message: "Please sign in to delete a diary entry." });
  const userId = await ensureUserRow(auth.id, auth.email);
  await db.delete(diaryEntriesTable).where(and(eq(diaryEntriesTable.id, req.params.entryId), eq(diaryEntriesTable.userId, userId)));
  return res.status(204).send();
});

// ── POST /v1/diary/first-log ────────────────────────────────────────────────
router.post("/v1/diary/first-log", async (req, res) => {
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res.status(401).json({ message: "Please sign in first." });
      return;
    }

    const parsed = SyncFirstDiaryEntryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid diary entry" });
      return;
    }
    const entry = parsed.data;

    const userId = await ensureUserRow(user.id, user.email);

    const existing = await db
      .select({ id: diaryEntriesTable.id })
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId))
      .limit(1);
    if (existing.length > 0) {
      res.json({ synced: true, alreadyExisted: true });
      return;
    }

    // ── Server-verified provenance ─────────────────────────────────────
    // The cited capture session must exist, belong to this user, be
    // recent, and not have anchored a sync before.
    const sessions = await db
      .select()
      .from(aiCaptureSessionsTable)
      .where(
        and(
          eq(aiCaptureSessionsTable.id, entry.captureSessionId),
          eq(aiCaptureSessionsTable.userId, userId),
        ),
      )
      .limit(1);
    const session = sessions[0];
    if (!session || session.reviewedAt !== null || Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE_MS) {
      res.status(422).json({ message: "This entry doesn't match a recent food scan. Log a meal with capture first." });
      return;
    }

    // The submitted nutrition must be consistent with what the server
    // analyzed (portion edits allowed within a generous band).
    const candidates = await db
      .select({ calories: aiCaptureCandidatesTable.calories })
      .from(aiCaptureCandidatesTable)
      .where(eq(aiCaptureCandidatesTable.sessionId, entry.captureSessionId));
    const analyzedCalories = candidates.reduce((sum, c) => sum + Number(c.calories), 0);
    const withinBand =
      analyzedCalories > 0 &&
      entry.calories >= analyzedCalories * 0.25 &&
      entry.calories <= analyzedCalories * 2.5 + 100;
    if (!withinBand) {
      res.status(422).json({ message: "This entry doesn't match the scanned meal's nutrition." });
      return;
    }

    // Claim the session (single use) and write the entry atomically — a
    // failed insert must not consume the user's only qualifying session.
    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(aiCaptureSessionsTable)
        .set({ reviewedAt: sql`now()` })
        .where(
          and(
            eq(aiCaptureSessionsTable.id, entry.captureSessionId),
            sql`${aiCaptureSessionsTable.reviewedAt} IS NULL`,
          ),
        )
        .returning({ id: aiCaptureSessionsTable.id });
      if (rows.length === 0) return false;

      const values: typeof diaryEntriesTable.$inferInsert = {
        userId,
        entryDate: entry.entryDate.toISOString().slice(0, 10),
        meal: entry.meal,
        name: entry.name,
        serving: entry.serving,
        calories: String(entry.calories),
        proteinG: String(entry.proteinG),
        carbsG: String(entry.carbsG),
        fatG: String(entry.fatG),
        provenance: entry.provenance,
        confidence: entry.confidence,
        notes: entry.notes,
        clientUpdatedAt: entry.clientUpdatedAt,
      };
      await tx.insert(diaryEntriesTable).values(values);
      return true;
    });

    if (!claimed) {
      res.status(422).json({ message: "This food scan was already used." });
      return;
    }

    res.json({ synced: true, alreadyExisted: false });
  } catch (err) {
    console.error("[diary] first-log sync failed:", err);
    res.status(503).json({ message: "Diary sync is unavailable right now. Please try again later." });
  }
});

export default router;
