import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const usersTable = pgTable("calora_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  externalIdIndex: uniqueIndex("calora_users_external_id_idx").on(table.externalId),
}));

export const profilesTable = pgTable("calora_profiles", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),
  activityLevel: text("activity_level").notNull(),
  dietPreference: text("diet_preference").notNull(),
  age: integer("age").notNull(),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }).notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
  targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 1 }).notNull(),
  calorieTarget: integer("calorie_target").notNull(),
  consentVersion: text("consent_version").notNull(),
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const foodItemsTable = pgTable("calora_food_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  sourceId: text("source_id").notNull(),
  barcode: text("barcode"),
  name: text("name").notNull(),
  brand: text("brand"),
  servingAmount: numeric("serving_amount", { precision: 9, scale: 3 }).notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: numeric("calories", { precision: 9, scale: 2 }).notNull(),
  proteinG: numeric("protein_g", { precision: 9, scale: 2 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 9, scale: 2 }).notNull(),
  fatG: numeric("fat_g", { precision: 9, scale: 2 }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  correctionVersion: integer("correction_version").default(1).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceIndex: uniqueIndex("calora_food_source_idx").on(table.source, table.sourceId),
}));

export const diaryEntriesTable = pgTable("calora_diary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  foodItemId: uuid("food_item_id").references(() => foodItemsTable.id, { onDelete: "set null" }),
  entryDate: date("entry_date").notNull(),
  meal: text("meal").notNull(),
  name: text("name").notNull(),
  serving: text("serving").notNull(),
  calories: numeric("calories", { precision: 9, scale: 2 }).notNull(),
  proteinG: numeric("protein_g", { precision: 9, scale: 2 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 9, scale: 2 }).notNull(),
  fatG: numeric("fat_g", { precision: 9, scale: 2 }).notNull(),
  provenance: text("provenance").notNull(),
  confidence: integer("confidence").notNull(),
  notes: text("notes"),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const weightEntriesTable = pgTable("calora_weight_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
  source: text("source").notNull(),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userDateIndex: uniqueIndex("calora_weight_user_date_idx").on(table.userId, table.entryDate),
}));

export const savedMealsTable = pgTable("calora_saved_meals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").default("meal").notNull(),
  calories: numeric("calories", { precision: 9, scale: 2 }).notNull(),
  proteinG: numeric("protein_g", { precision: 9, scale: 2 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 9, scale: 2 }).notNull(),
  fatG: numeric("fat_g", { precision: 9, scale: 2 }).notNull(),
  foodIds: jsonb("food_ids").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipesTable = pgTable("calora_recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  yieldServings: numeric("yield_servings", { precision: 7, scale: 2 }).notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipeItemsTable = pgTable("calora_recipe_items", {
  recipeId: uuid("recipe_id").notNull().references(() => recipesTable.id, { onDelete: "cascade" }),
  foodItemId: uuid("food_item_id").notNull().references(() => foodItemsTable.id, { onDelete: "restrict" }),
  quantityGrams: numeric("quantity_grams", { precision: 9, scale: 3 }).notNull(),
  preparationState: text("preparation_state"),
}, (table) => ({
  recipeFoodKey: primaryKey({ columns: [table.recipeId, table.foodItemId] }),
}));

export const aiCaptureSessionsTable = pgTable("calora_ai_capture_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  inputUri: text("input_uri"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const aiCaptureCandidatesTable = pgTable("calora_ai_capture_candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => aiCaptureSessionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  calories: numeric("calories", { precision: 9, scale: 2 }).notNull(),
  proteinG: numeric("protein_g", { precision: 9, scale: 2 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 9, scale: 2 }).notNull(),
  fatG: numeric("fat_g", { precision: 9, scale: 2 }).notNull(),
  confidence: integer("confidence").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
  accepted: boolean("accepted").default(false).notNull(),
});

export const subscriptionsTable = pgTable("calora_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  productId: text("product_id").notNull(),
  entitlement: text("entitlement").notNull(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userProductIndex: uniqueIndex("calora_subscription_user_product_idx").on(table.userId, table.productId),
}));

export const syncMutationsTable = pgTable("calora_sync_mutations", {
  mutationId: uuid("mutation_id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  operation: text("operation").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const consentEventsTable = pgTable("calora_consent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(),
  version: text("version").notNull(),
  accepted: boolean("accepted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const insertProfileSchema = createInsertSchema(profilesTable);
export const insertFoodItemSchema = createInsertSchema(foodItemsTable);
export const insertDiaryEntrySchema = createInsertSchema(diaryEntriesTable);
export const insertWeightEntrySchema = createInsertSchema(weightEntriesTable);
export const insertSavedMealSchema = createInsertSchema(savedMealsTable);
export const insertRecipeSchema = createInsertSchema(recipesTable);
export const insertRecipeItemSchema = createInsertSchema(recipeItemsTable);
export const insertAiCaptureSessionSchema = createInsertSchema(aiCaptureSessionsTable);
export const insertAiCaptureCandidateSchema = createInsertSchema(aiCaptureCandidatesTable);
export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable);
export const insertSyncMutationSchema = createInsertSchema(syncMutationsTable);
export const insertConsentEventSchema = createInsertSchema(consentEventsTable);

export type User = typeof usersTable.$inferSelect;
export type Profile = typeof profilesTable.$inferSelect;
export type FoodItem = typeof foodItemsTable.$inferSelect;
export type DiaryEntry = typeof diaryEntriesTable.$inferSelect;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;
export type SavedMeal = typeof savedMealsTable.$inferSelect;
export type Recipe = typeof recipesTable.$inferSelect;
export type RecipeItem = typeof recipeItemsTable.$inferSelect;
export type AiCaptureSession = typeof aiCaptureSessionsTable.$inferSelect;
export type AiCaptureCandidate = typeof aiCaptureCandidatesTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type SyncMutation = typeof syncMutationsTable.$inferSelect;
export type ConsentEvent = typeof consentEventsTable.$inferSelect;

export const userIdSchema = z.string().uuid();