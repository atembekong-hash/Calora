import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, privacyRightsRequestsTable } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";
import {
  assertAccountWritable,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";

const router: IRouter = Router();

export const PrivacyRightsRequestBody = z.object({
  requestType: z.enum([
    "access",
    "correct",
    "delete",
    "portability",
    "restrict",
    "withdraw_consent",
  ]),
  note: z.string().trim().max(1_000).optional(),
});

function serializeRequest(row: typeof privacyRightsRequestsTable.$inferSelect) {
  return {
    id: row.id,
    requestType: row.requestType,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}

router.get("/v1/privacy/requests", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res
      .status(401)
      .json({ message: "Please sign in to view privacy requests." });
    return;
  }
  const userId = await ensureUserRow(auth.id, auth.email);
  const rows = await db
    .select()
    .from(privacyRightsRequestsTable)
    .where(eq(privacyRightsRequestsTable.userId, userId))
    .orderBy(desc(privacyRightsRequestsTable.createdAt))
    .limit(50);
  res.json({ requests: rows.map(serializeRequest) });
});

router.post("/v1/privacy/requests", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res
      .status(401)
      .json({ message: "Please sign in to submit a privacy request." });
    return;
  }
  const parsed = PrivacyRightsRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid privacy request.",
    });
    return;
  }
  try {
    await assertAccountWritable(auth.id);
  } catch (error) {
    if (classifyAccountDeletionError(error)) {
      res.status(409).json({
        message:
          "Privacy requests are unavailable while account deletion is in progress.",
      });
      return;
    }
    throw error;
  }
  const userId = await ensureUserRow(auth.id, auth.email);
  const [created] = await db
    .insert(privacyRightsRequestsTable)
    .values({
      userId,
      requestType: parsed.data.requestType,
      requesterNote: parsed.data.note || null,
    })
    .returning();
  if (!created) {
    res.status(500).json({ message: "Privacy request could not be recorded." });
    return;
  }
  res.status(201).json({ request: serializeRequest(created) });
});

export default router;
