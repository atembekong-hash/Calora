import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { isDatabaseIntegrationTestEnabled } from "./db-integration-gate.js";
import type { RecipePhotoInput } from "../lib/recipe-media.js";
import {
  currentDatabaseContext,
  withVerifiedDatabaseIdentity,
} from "../lib/database-identity.js";

const RUN_DB_INTEGRATION_TESTS = isDatabaseIntegrationTestEnabled();

// recipe-media imports @workspace/db. Do not load it while collecting a
// disabled integration suite, including when DATABASE_URL is intentionally
// absent from an offline run.
const {
  acknowledgeOwnerRecipeMediaRendered,
  claimRecipeMedia,
  findOwnerRecipeMedia,
  issueRecipeMediaUrlState,
  listOwnerRecipeMedia,
  markRecipeMediaError,
  retryOwnerRecipeMedia,
  setOwnerRecipeMediaReview,
  updateRecipeMediaStored,
} = (
  RUN_DB_INTEGRATION_TESTS ? await import("../lib/recipe-media.js") : {}
) as typeof import("../lib/recipe-media.js");
const ownerA = `recipe-media-owner-a-${randomUUID()}`;
const ownerB = `recipe-media-owner-b-${randomUUID()}`;
const clientRecipeId = `client-recipe-${randomUUID()}`;
const recipe: RecipePhotoInput = {
  clientRecipeId,
  title: "Chickenless Almond Tofu Bowl",
  description: "A savory plant-based dinner bowl.",
  ingredients: ["tofu", "almonds", "brown rice", "broccoli"],
  instructions: ["Bake the tofu.", "Glaze with almonds.", "Serve over rice."],
  cuisine: "Fusion",
  category: "Dinner bowl",
  mealType: "Dinner",
  dietaryContext: ["Vegan", "Chickenless", "No poultry"],
};

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)(
  "recipe media persistence (real database)",
  () => {
    async function asOwner<T>(
      owner: string,
      operation: (queryExecutor?: {
        query: <R = unknown>(
          text: string,
          values?: unknown[],
        ) => Promise<{ rows: R[] }>;
      }) => Promise<T>,
    ): Promise<T> {
      return withVerifiedDatabaseIdentity(
        owner,
        async (_database, _inTransaction, queryExecutor) =>
          operation(queryExecutor),
      );
    }

    async function ownerQuery<T = unknown>(
      owner: string,
      text: string,
      values: unknown[] = [],
    ) {
      return asOwner(owner, async (queryExecutor) =>
        (queryExecutor ?? currentDatabaseContext()?.queryExecutor)!.query<T>(
          text,
          values,
        ),
      );
    }

    afterAll(async () => {
      await ownerQuery(
        ownerA,
        "DELETE FROM calora_recipe_media WHERE owner_external_id = ANY($1::text[])",
        [[ownerA, ownerB]],
      );
    });

    it("persists one owner-scoped canonical version and exposes explicit retry, review, render, and supersession states", async () => {
      const initial = await asOwner(ownerA, () =>
        claimRecipeMedia(ownerA, recipe),
      );
      expect(initial.claimed).toBe(true);
      expect(initial.row).toMatchObject({
        owner_external_id: ownerA,
        client_recipe_id: clientRecipeId,
        status: "generating",
        semantic_review_state: "needs_review",
        attempts: 1,
      });

      const duplicate = await asOwner(ownerA, () =>
        claimRecipeMedia(ownerA, recipe),
      );
      expect(duplicate.claimed).toBe(false);
      expect(duplicate.row.id).toBe(initial.row.id);

      await ownerQuery(
        ownerA,
        `UPDATE calora_recipe_media SET last_attempt_at = NOW() - interval '10 minutes' WHERE id = $1`,
        [initial.row.id],
      );
      const reclaimed = await asOwner(ownerA, () =>
        claimRecipeMedia(ownerA, recipe),
      );
      expect(reclaimed).toMatchObject({
        claimed: true,
        row: { id: initial.row.id, status: "generating", attempts: 2 },
      });

      expect(
        await asOwner(ownerB, () =>
          findOwnerRecipeMedia(ownerB, { mediaId: initial.row.id }),
        ),
      ).toBeNull();
      expect(
        await asOwner(ownerB, () =>
          retryOwnerRecipeMedia(ownerB, initial.row.id),
        ),
      ).toBeNull();
      expect(
        await asOwner(ownerB, () =>
          setOwnerRecipeMediaReview(ownerB, initial.row.id, "accepted"),
        ),
      ).toBeNull();
      expect(
        await asOwner(ownerB, () =>
          acknowledgeOwnerRecipeMediaRendered(ownerB, initial.row.id),
        ),
      ).toBe(false);

      await asOwner(ownerA, () =>
        markRecipeMediaError(ownerA, initial.row.id, "provider_unavailable"),
      );
      expect(
        await asOwner(ownerA, () =>
          findOwnerRecipeMedia(ownerA, { mediaId: initial.row.id }),
        ),
      ).toMatchObject({
        status: "retryable_error",
        last_error_code: "provider_unavailable",
      });

      const retry = await asOwner(ownerA, () =>
        retryOwnerRecipeMedia(ownerA, initial.row.id),
      );
      expect(retry).toMatchObject({
        status: "generating",
        semantic_review_state: "needs_review",
        attempts: 3,
        last_error_code: null,
      });

      const stored = await asOwner(ownerA, () =>
        updateRecipeMediaStored(ownerA, initial.row.id),
      );
      expect(stored.status).toBe("stored");
      expect(
        await asOwner(ownerA, () =>
          setOwnerRecipeMediaReview(ownerA, initial.row.id, "accepted"),
        ),
      ).toMatchObject({
        semantic_review_state: "accepted",
      });
      const ready = await asOwner(ownerA, () =>
        issueRecipeMediaUrlState(ownerA, initial.row.id),
      );
      expect(ready.status).toBe("url_ready");
      expect(
        await asOwner(ownerA, () =>
          acknowledgeOwnerRecipeMediaRendered(ownerA, initial.row.id),
        ),
      ).toBe(true);
      expect(
        (await asOwner(ownerA, () => listOwnerRecipeMedia(ownerA))).map(
          (row) => row.id,
        ),
      ).toContain(initial.row.id);
      expect(await asOwner(ownerB, () => listOwnerRecipeMedia(ownerB))).toEqual(
        [],
      );

      const changedRecipe = {
        ...recipe,
        ingredients: [...recipe.ingredients, "lime"],
        instructions: [...recipe.instructions, "Finish with lime."],
      };
      const changed = await asOwner(ownerA, () =>
        claimRecipeMedia(ownerA, changedRecipe),
      );
      expect(changed.claimed).toBe(true);
      expect(changed.row.id).not.toBe(initial.row.id);
      expect(changed.row.content_hash).not.toBe(initial.row.content_hash);
      await asOwner(ownerA, () =>
        updateRecipeMediaStored(ownerA, changed.row.id),
      );
      await asOwner(ownerA, () =>
        setOwnerRecipeMediaReview(ownerA, changed.row.id, "accepted"),
      );
      await asOwner(ownerA, () =>
        issueRecipeMediaUrlState(ownerA, changed.row.id),
      );

      expect(
        await asOwner(ownerA, () =>
          findOwnerRecipeMedia(ownerA, { mediaId: initial.row.id }),
        ),
      ).toMatchObject({
        status: "superseded",
      });
      expect(
        (await asOwner(ownerA, () => listOwnerRecipeMedia(ownerA))).map(
          (row) => row.id,
        ),
      ).toEqual([changed.row.id]);
    });
  },
);
