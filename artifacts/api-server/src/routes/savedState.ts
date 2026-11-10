import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { type CaloraDatabase } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";
import { assertAccountWritable } from "../lib/account-deletion-state.js";
import { withVerifiedDatabaseIdentity } from "../lib/database-identity.js";

const router: IRouter = Router();
const SavedMeal = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(240),
  kind: z.enum(["meal", "recipe"]),
  foodIds: z.array(z.string().max(160)).max(200),
  calories: z.number().finite().min(0).max(100000),
  protein: z.number().finite().min(0).max(10000),
  carbs: z.number().finite().min(0).max(10000),
  fat: z.number().finite().min(0).max(10000),
  mealType: z.string().max(40).optional(),
}).strict();
const SavedState = z.object({
  savedMeals: z.array(SavedMeal).max(1000),
  savedRecipeIds: z.array(z.string().min(1).max(160)).max(2000),
  deletedMealIds: z.array(z.string().min(1).max(160)).max(2000),
  deletedRecipeIds: z.array(z.string().min(1).max(160)).max(4000),
  clientUpdatedAt: z.string().datetime(),
}).strict();

type SavedStateValue = z.infer<typeof SavedState>;
export function mergeState(existing: SavedStateValue | null, incoming: SavedStateValue): SavedStateValue {
  const old = existing ?? { savedMeals: [], savedRecipeIds: [], deletedMealIds: [], deletedRecipeIds: [], clientUpdatedAt: "1970-01-01T00:00:00.000Z" };
  const deletedMeals = new Set([...old.deletedMealIds, ...incoming.deletedMealIds]);
  const deletedRecipes = new Set([...old.deletedRecipeIds, ...incoming.deletedRecipeIds]);
  const meals = new Map(old.savedMeals.map((meal) => [meal.id, meal]));
  for (const meal of incoming.savedMeals) {
    if (!deletedMeals.has(meal.id)) meals.set(meal.id, meal);
  }
  for (const id of incoming.deletedMealIds) meals.delete(id);
  const recipes = new Set([...old.savedRecipeIds, ...incoming.savedRecipeIds]);
  for (const id of incoming.deletedRecipeIds) recipes.delete(id);
  return {
    savedMeals: [...meals.values()],
    savedRecipeIds: [...recipes],
    deletedMealIds: [...deletedMeals],
    deletedRecipeIds: [...deletedRecipes],
    clientUpdatedAt: new Date(Math.max(Date.parse(old.clientUpdatedAt), Date.parse(incoming.clientUpdatedAt))).toISOString(),
  };
}
async function readState(database: CaloraDatabase, userId: string) {
  const result = await database.execute(sql`SELECT saved_meals, saved_recipe_ids, deleted_meal_ids, deleted_recipe_ids, client_updated_at FROM calora_saved_state_sync WHERE user_id = ${userId}::uuid LIMIT 1`);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? {
    savedMeals: Array.isArray(row.saved_meals) ? row.saved_meals : [],
    savedRecipeIds: Array.isArray(row.saved_recipe_ids) ? row.saved_recipe_ids : [],
    deletedMealIds: Array.isArray(row.deleted_meal_ids) ? row.deleted_meal_ids : [],
    deletedRecipeIds: Array.isArray(row.deleted_recipe_ids) ? row.deleted_recipe_ids : [],
    clientUpdatedAt: new Date(String(row.client_updated_at)).toISOString(),
  } : null;
}
export function publicState(state: SavedStateValue) {
  const deletedMeals = new Set(state.deletedMealIds);
  const deletedRecipes = new Set(state.deletedRecipeIds);
  return {
    savedMeals: state.savedMeals.filter((meal) => !deletedMeals.has(meal.id)),
    savedRecipeIds: state.savedRecipeIds.filter((id) => !deletedRecipes.has(id)),
    updatedAt: state.clientUpdatedAt,
  };
}
router.get("/v1/saved-state", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) { res.status(401).json({ message: "Please sign in to restore saved recipes." }); return; }
  const state = await withVerifiedDatabaseIdentity(auth.id, async (database, inTransaction) => {
    const userId = await ensureUserRow(auth.id, auth.email, database, inTransaction);
    return readState(database, userId);
  });
  res.json(publicState(state ?? { savedMeals: [], savedRecipeIds: [], deletedMealIds: [], deletedRecipeIds: [], clientUpdatedAt: new Date(0).toISOString() }));
});
router.put("/v1/saved-state", async (req, res): Promise<void> => {
  const auth = await verifyBearerToken(req);
  if (!auth) { res.status(401).json({ message: "Please sign in to sync saved recipes." }); return; }
  const parsed = SavedState.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid saved-state payload." }); return; }
  const result = await withVerifiedDatabaseIdentity(auth.id, async (database, inTransaction) => {
    const userId = await ensureUserRow(auth.id, auth.email, database, inTransaction);
    await assertAccountWritable(auth.id, database, true);
    const existing = await readState(database, userId);
    const merged = mergeState(existing, parsed.data);
    await database.execute(sql`INSERT INTO calora_saved_state_sync (user_id, saved_meals, saved_recipe_ids, deleted_meal_ids, deleted_recipe_ids, client_updated_at, updated_at)
      VALUES (${userId}::uuid, ${JSON.stringify(merged.savedMeals)}::jsonb, ${JSON.stringify(merged.savedRecipeIds)}::jsonb, ${JSON.stringify(merged.deletedMealIds)}::jsonb, ${JSON.stringify(merged.deletedRecipeIds)}::jsonb, ${merged.clientUpdatedAt}::timestamptz, now())
      ON CONFLICT (user_id) DO UPDATE SET saved_meals = EXCLUDED.saved_meals, saved_recipe_ids = EXCLUDED.saved_recipe_ids, deleted_meal_ids = EXCLUDED.deleted_meal_ids, deleted_recipe_ids = EXCLUDED.deleted_recipe_ids, client_updated_at = EXCLUDED.client_updated_at, updated_at = now()`);
    return publicState(merged);
  });
  res.json(result);
});
export default router;
