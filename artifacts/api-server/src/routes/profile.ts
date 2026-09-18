/**
 * Durable account profile persistence.
 *
 * The mobile client keeps a local-first copy for offline use, but onboarding
 * completion must also survive an app reinstall. The authenticated profile is
 * keyed by the server-resolved Calora user row, never by a client-supplied id.
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { db, profilesTable, usersTable } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";

const router: IRouter = Router();

function serializeProfile(
  row: typeof profilesTable.$inferSelect,
  name: string | null | undefined,
) {
  return {
    name: name?.trim() || "Calora member",
    goal: row.goal,
    activity: row.activityLevel,
    diet: row.dietPreference,
    age: row.age,
    heightCm: Number(row.heightCm),
    weightKg: Number(row.weightKg),
    targetWeightKg: Number(row.targetWeightKg),
    calorieTarget: row.calorieTarget,
    consentVersion: row.consentVersion,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readProfile(userId: string) {
  const rows = await db
    .select({
      profile: profilesTable,
      name: usersTable.displayName,
    })
    .from(profilesTable)
    .innerJoin(usersTable, eq(usersTable.id, profilesTable.userId))
    .where(eq(profilesTable.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

router.get("/v1/profile", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res.status(401).json({ message: "Please sign in to view your profile." });
    return;
  }

  const userId = await ensureUserRow(auth.id, auth.email);
  const row = await readProfile(userId);
  if (!row) {
    res.status(404).json({ message: "No profile has been saved for this account." });
    return;
  }

  res.json(serializeProfile(row.profile, row.name));
});

router.put("/v1/profile", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res.status(401).json({ message: "Please sign in to save your profile." });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid profile." });
    return;
  }

  const userId = await ensureUserRow(auth.id, auth.email);
  const now = new Date();
  const input = parsed.data;
  const [profile] = await db
    .insert(profilesTable)
    .values({
      userId,
      goal: input.goal,
      activityLevel: input.activity,
      dietPreference: input.diet,
      age: input.age,
      heightCm: String(input.heightCm),
      weightKg: String(input.weightKg),
      targetWeightKg: String(input.targetWeightKg),
      calorieTarget: input.calorieTarget,
      consentVersion: input.consentVersion,
      consentAcceptedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profilesTable.userId,
      set: {
        goal: input.goal,
        activityLevel: input.activity,
        dietPreference: input.diet,
        age: input.age,
        heightCm: String(input.heightCm),
        weightKg: String(input.weightKg),
        targetWeightKg: String(input.targetWeightKg),
        calorieTarget: input.calorieTarget,
        consentVersion: input.consentVersion,
        consentAcceptedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  await db
    .update(usersTable)
    .set({ displayName: input.name.trim(), updatedAt: now })
    .where(eq(usersTable.id, userId));

  res.json(serializeProfile(profile, input.name));
});

/**
 * "Clear all data" is an account reset, not only a device reset. Removing the
 * server profile prevents the next launch from restoring onboarding immediately
 * after local state has been cleared.
 */
router.delete("/v1/profile", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res.status(401).json({ message: "Please sign in to clear your profile." });
    return;
  }

  const userId = await ensureUserRow(auth.id, auth.email);
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  await db
    .update(usersTable)
    .set({ displayName: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.status(204).send();
});

export default router;