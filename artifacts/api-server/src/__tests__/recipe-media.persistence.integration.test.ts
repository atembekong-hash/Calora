import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isDatabaseIntegrationTestEnabled } from './db-integration-gate.js';
import type { RecipePhotoInput } from '../lib/recipe-media.js';

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
} = (RUN_DB_INTEGRATION_TESTS
  ? await import('../lib/recipe-media.js')
  : {}) as typeof import('../lib/recipe-media.js');
const ownerA = `recipe-media-owner-a-${randomUUID()}`;
const ownerB = `recipe-media-owner-b-${randomUUID()}`;
const clientRecipeId = `client-recipe-${randomUUID()}`;
const recipe: RecipePhotoInput = {
  clientRecipeId,
  title: 'Chickenless Almond Tofu Bowl',
  description: 'A savory plant-based dinner bowl.',
  ingredients: ['tofu', 'almonds', 'brown rice', 'broccoli'],
  instructions: ['Bake the tofu.', 'Glaze with almonds.', 'Serve over rice.'],
  cuisine: 'Fusion',
  category: 'Dinner bowl',
  mealType: 'Dinner',
  dietaryContext: ['Vegan', 'Chickenless', 'No poultry'],
};

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)('recipe media persistence (real database)', () => {
  afterAll(async () => {
    const { pool } = await import('@workspace/db');
    await pool.query(
      'DELETE FROM calora_recipe_media WHERE owner_external_id = ANY($1::text[])',
      [[ownerA, ownerB]],
    );
  });

  it('persists one owner-scoped canonical version and exposes explicit retry, review, render, and supersession states', async () => {
    const { pool } = await import('@workspace/db');
    const initial = await claimRecipeMedia(ownerA, recipe);
    expect(initial.claimed).toBe(true);
    expect(initial.row).toMatchObject({
      owner_external_id: ownerA,
      client_recipe_id: clientRecipeId,
      status: 'generating',
      semantic_review_state: 'needs_review',
      attempts: 1,
    });

    const duplicate = await claimRecipeMedia(ownerA, recipe);
    expect(duplicate.claimed).toBe(false);
    expect(duplicate.row.id).toBe(initial.row.id);

    await pool.query(
      `UPDATE calora_recipe_media
       SET last_attempt_at = NOW() - interval '10 minutes'
       WHERE id = $1`,
      [initial.row.id],
    );
    const reclaimed = await claimRecipeMedia(ownerA, recipe);
    expect(reclaimed).toMatchObject({
      claimed: true,
      row: { id: initial.row.id, status: 'generating', attempts: 2 },
    });

    expect(await findOwnerRecipeMedia(ownerB, { mediaId: initial.row.id })).toBeNull();
    expect(await retryOwnerRecipeMedia(ownerB, initial.row.id)).toBeNull();
    expect(await setOwnerRecipeMediaReview(ownerB, initial.row.id, 'accepted')).toBeNull();
    expect(await acknowledgeOwnerRecipeMediaRendered(ownerB, initial.row.id)).toBe(false);

    await markRecipeMediaError(ownerA, initial.row.id, 'provider_unavailable');
    expect(await findOwnerRecipeMedia(ownerA, { mediaId: initial.row.id })).toMatchObject({
      status: 'retryable_error',
      last_error_code: 'provider_unavailable',
    });

    const retry = await retryOwnerRecipeMedia(ownerA, initial.row.id);
    expect(retry).toMatchObject({
      status: 'generating',
      semantic_review_state: 'needs_review',
      attempts: 3,
      last_error_code: null,
    });

    const stored = await updateRecipeMediaStored(ownerA, initial.row.id);
    expect(stored.status).toBe('stored');
    expect(await setOwnerRecipeMediaReview(ownerA, initial.row.id, 'accepted')).toMatchObject({
      semantic_review_state: 'accepted',
    });
    const ready = await issueRecipeMediaUrlState(ownerA, initial.row.id);
    expect(ready.status).toBe('url_ready');
    expect(await acknowledgeOwnerRecipeMediaRendered(ownerA, initial.row.id)).toBe(true);
    expect((await listOwnerRecipeMedia(ownerA)).map((row) => row.id)).toContain(initial.row.id);
    expect(await listOwnerRecipeMedia(ownerB)).toEqual([]);

    const changedRecipe = {
      ...recipe,
      ingredients: [...recipe.ingredients, 'lime'],
      instructions: [...recipe.instructions, 'Finish with lime.'],
    };
    const changed = await claimRecipeMedia(ownerA, changedRecipe);
    expect(changed.claimed).toBe(true);
    expect(changed.row.id).not.toBe(initial.row.id);
    expect(changed.row.content_hash).not.toBe(initial.row.content_hash);
    await updateRecipeMediaStored(ownerA, changed.row.id);
    await setOwnerRecipeMediaReview(ownerA, changed.row.id, 'accepted');
    await issueRecipeMediaUrlState(ownerA, changed.row.id);

    expect(await findOwnerRecipeMedia(ownerA, { mediaId: initial.row.id })).toMatchObject({
      status: 'superseded',
    });
    expect((await listOwnerRecipeMedia(ownerA)).map((row) => row.id)).toEqual([changed.row.id]);
  });
});
