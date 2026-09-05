import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  index,
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
  /**
   * Stable client-generated identifier (the local log id). Used as an
   * idempotency key for the sync endpoint so repeated pushes don't create
   * duplicate rows. Nullable for rows written before sync was introduced.
   */
  clientId: text("client_id"),
  /**
   * Server-verified capture session that originated this diary entry.
   * Written by POST /v1/sync when the client supplies a captureSessionId.
   * The sync handler verifies the session belongs to the authenticated user
   * and has mode != 'text' before recording it here.  NULL means the entry
   * was either written via the bare /v1/diary endpoint or synced without a
   * session reference.
   *
    * This provenance is retained for nutrition traceability. Referral
    * qualification instead accepts any valid authenticated saved meal.
   */
  captureSessionId: uuid("capture_session_id").references(() => aiCaptureSessionsTable.id, { onDelete: "set null" }),
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
  /**
   * Optional absolute http/https URL of a representative image for this
   * entry (e.g. an Open Food Facts product photo). NULL when the entry has
   * no associated image. Only validated absolute http/https URLs are ever
   * written here — see the sync/diary route validators.
   */
  imageUrl: text("image_url"),
  /**
   * Optional short label describing where imageUrl came from
   * (e.g. "Open Food Facts", "user_photo"). NULL when imageUrl is NULL.
   */
  imageSource: text("image_source"),
  /**
   * Allowlisted client-only diary details that must survive account restore
   * without expanding the relational nutrition/query surface.
   */
  syncMetadata: jsonb("sync_metadata").$type<{
    time?: string;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    preparation?: string;
    memoryId?: string;
    plannerMealId?: string;
    sourceRecipeId?: string;
  }>().default({}).notNull(),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userClientIdIndex: uniqueIndex("calora_diary_entries_user_client_id_idx")
    .on(table.userId, table.clientId)
    .where(sql`${table.clientId} IS NOT NULL`),
}));

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

/**
 * One-time server-issued proof that a user completed an authenticated food
 * capture and explicitly approved the review. Referral rewards may only use
 * this proof — never a client-supplied diary payload or seeded demo entry.
 */
export const referralQualificationsTable = pgTable("calora_referral_qualifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalUserId: text("external_user_id").notNull(),
  captureSessionId: text("capture_session_id").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIndex: uniqueIndex("calora_referral_qualification_session_idx").on(table.captureSessionId),
  userIndex: uniqueIndex("calora_referral_qualification_user_idx").on(table.externalUserId),
}));

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

/**
 * Referral program tables.
 *
 * Keyed by the Supabase Auth user id (text) rather than calora_users — the
 * referral flow runs on freshly signed-up accounts that may not have a synced
 * profile row yet, and the API server verifies identity from the Supabase JWT.
 */
export const referralCodesTable = pgTable("calora_referral_codes", {
  userId: text("user_id").primaryKey(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIndex: uniqueIndex("calora_referral_codes_code_idx").on(table.code),
}));

export const referralRedemptionsTable = pgTable("calora_referral_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  referrerUserId: text("referrer_user_id").notNull(),
  /** One redemption per referred account, enforced by the unique index. */
  referredUserId: text("referred_user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | rewarded
  /**
   * Server-observed proof that the referred user saved a meal.
   * Activation never grants rewards while this is NULL.
   */
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  /** Which server-side signal qualified this redemption (saved_meal). */
  qualifiedSignal: text("qualified_signal"),
  referredRewardedAt: timestamp("referred_rewarded_at", { withTimezone: true }),
  referrerRewardedAt: timestamp("referrer_rewarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  referredIndex: uniqueIndex("calora_referral_redemptions_referred_idx").on(table.referredUserId),
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

/**
 * Durable idempotency / replay-prevention ledger for the Coach Fact Context
 * dark path.
 *
 * Design invariants (Task 473):
 *  - One row per (externalUserId, requestNonce): the nonce is consumed on
 *    first claim and cannot be replayed — even if the provider call later
 *    fails, the nonce is still spent to prevent replay-with-different-facts.
 *  - NO facts, messages, prompt text, or other content stored here. This
 *    table carries only the structural metadata needed to detect a replay.
 *  - Server-written only: never readable or writable from a client path.
 *  - TTL: rows older than the fact-context window (60 s + skew) are stale;
 *    a periodic vacuum can remove them, but they are harmless if left.
 */
export const coachFactContextIdempotencyTable = pgTable("calora_coach_fact_context_idempotency", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalUserId: text("external_user_id").notNull(),
  requestNonce: text("request_nonce").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  userNonceIndex: uniqueIndex("calora_coach_fact_context_idempotency_user_nonce_idx").on(table.externalUserId, table.requestNonce),
}));

/**
 * Server-owned operational configuration key/value store.
 *
 * Only the server writes here. Client requests can never modify this table.
 * The global kill-switch for any server feature is set by inserting/updating
 * a row with the feature's key. Application code reads this table directly;
 * it is not exposed via any client-facing API.
 *
 * Schema: key (PK) → value (jsonb) with server-managed updatedAt.
 */
export const serverConfigTable = pgTable("calora_server_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Server-owned named cohort memberships.
 *
 * Populated exclusively by offline review and explicit server-side approval.
 * Client requests can never add or read cohort memberships — the server
 * reads this table directly to make rollout decisions.
 *
 * Default behaviour: deny-all. An absent row means the user is not in any
 * cohort; the server never infers membership from a missing row.
 *
 * `cohortName` is a typed constant in server code (never free-form client
 * input) so code review can track every membership change.
 */
export const cohortMembershipsTable = pgTable("calora_cohort_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  cohortName: text("cohort_name").notNull(),
  externalUserId: text("external_user_id").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  addedBy: text("added_by").notNull(),
  /**
   * Hard expiry for this membership. NULL means no time-based expiry (row
   * deletion is required to revoke). Non-NULL means the rollout gate must
   * verify NOW() < expiresAt before granting access.
   */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /**
   * Timestamp of the last explicit server-side approval review. Must be
   * non-NULL for a membership to be considered active; a NULL value means
   * the row was inserted without a review pass and is treated as inactive.
   */
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => ({
  cohortUserIndex: uniqueIndex("calora_cohort_memberships_cohort_user_idx").on(table.cohortName, table.externalUserId),
}));

export const consentEventsTable = pgTable("calora_consent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(),
  version: text("version").notNull(),
  accepted: boolean("accepted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The current server-authoritative decision for a narrowly-scoped Coach data
 * purpose. This ledger deliberately contains consent metadata only: never
 * Fact Context, Foundation facts, prompts, or conversation content.
 */
export const coachFactContextConsentsTable = pgTable("calora_coach_fact_context_consents", {
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  documentVersion: text("document_version").notNull(),
  /**
   * Server-enforced state constraint. Only the two explicit terminal values
   * are permitted — no free-form text from application logic can be stored.
   */
  state: text("state").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPurposeKey: primaryKey({ columns: [table.userId, table.purpose] }),
  userPurposeIndex: uniqueIndex("calora_coach_fact_context_consents_user_purpose_idx").on(table.userId, table.purpose),
  stateCheck: check("calora_coach_fact_context_consents_state_chk", sql`${table.state} IN ('consented_current', 'revoked')`),
}));

export const recipeNutritionTable = pgTable("calora_recipe_nutrition", {
  mealId: text("meal_id").primaryKey(),
  calories: integer("calories").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Persistent fixed-window rate-limit buckets for POST /v1/capture/analyze.
 *
 * One row per rate-limit key (user:<id> or ip:<address>). The upsert that
 * checks and increments the counter is a single atomic SQL statement, so
 * state is consistent across server restarts and multiple instances.
 */
export const captureRateLimitsTable = pgTable("calora_capture_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/**
 * A one-way identity tombstone used to fence writes after account deletion
 * starts, without retaining the Supabase user id itself.
 */
export const accountDeletionStatesTable = pgTable("calora_account_deletion_states", {
  identityFingerprint: text("identity_fingerprint").primaryKey(),
  state: text("state").notNull(),
  operationId: uuid("operation_id"),
  stage: text("stage").notNull().default("application"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  /** Retained only while a server-owned erasure operation remains incomplete. */
  recoveryExternalUserId: text("recovery_external_user_id"),
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastError: text("last_error"),
});

/**
 * Shared cooldown records for aggregate account-deletion recovery warnings.
 *
 * The key is a server-generated digest, never an account identifier or
 * provider error. Rows are short-lived operational state and are pruned by
 * the recovery claim path.
 */
export const recoveryWarningSuppressionsTable = pgTable("calora_recovery_warning_suppressions", {
  warningKey: text("warning_key").primaryKey(),
  emittedAt: timestamp("emitted_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  expiresAtIndex: index("calora_recovery_warning_suppressions_expires_at_idx").on(table.expiresAt),
}));

export const insertRecipeNutritionSchema = createInsertSchema(recipeNutritionTable);
export type RecipeNutrition = typeof recipeNutritionTable.$inferSelect;

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
export const insertCoachFactContextConsentSchema = createInsertSchema(coachFactContextConsentsTable);
export const insertServerConfigSchema = createInsertSchema(serverConfigTable);
export const insertCohortMembershipSchema = createInsertSchema(cohortMembershipsTable);
export const insertCoachFactContextIdempotencySchema = createInsertSchema(coachFactContextIdempotencyTable);

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
export type ServerConfig = typeof serverConfigTable.$inferSelect;
export type CohortMembership = typeof cohortMembershipsTable.$inferSelect;
export type CoachFactContextIdempotency = typeof coachFactContextIdempotencyTable.$inferSelect;
export type CoachFactContextConsent = typeof coachFactContextConsentsTable.$inferSelect;

export const userIdSchema = z.string().uuid();
