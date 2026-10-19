import { describe, expect, it } from 'vitest';
import { sanitizeGeneratedRecipeMediaForPersistence } from '../generatedRecipeImagePersistence';
import {
  generatedRecipeImageLifecycleKey,
  reconcileGeneratedRecipeMedia,
  type GeneratedRecipeImageCandidate,
} from '../generatedRecipeImageLifecycle';

const IMAGE_ID = '123e4567-e89b-42d3-a456-426614174000';
const PREVIEW_URL = 'https://storage.example/private/recipe-photos/account-a/123e4567-e89b-42d3-a456-426614174000.png?preview=1';

function reviewRecipe(overrides: Partial<GeneratedRecipeImageCandidate> = {}): GeneratedRecipeImageCandidate {
  return {
    id: 'recipe-7',
    isLocal: true,
    sourceType: 'calora_ai',
    imageProvenance: 'generated',
    imageId: IMAGE_ID,
    imageMediaId: '11111111-1111-4111-8111-111111111111',
    image: null,
    imageStatus: 'stored',
    imageReviewState: 'needs_review',
    imagePreviewUrl: PREVIEW_URL,
    imagePreviewUrlExpiresAt: '2026-10-19T23:00:00.000Z',
    name: 'Lemony lentil bowl',
    description: 'A bright dinner.',
    ingredients: ['lentils'],
    instructions: 'Cook and serve.',
    tags: ['Calora AI'],
    ...overrides,
  };
}

describe('generated recipe preview security and lifecycle boundaries', () => {
  it('does not make a transient preview URL rerun the reconciliation lifecycle', () => {
    const beforePreview = reviewRecipe({ imagePreviewUrl: null, imagePreviewUrlExpiresAt: null });
    const withPreview = reviewRecipe();

    expect(generatedRecipeImageLifecycleKey([withPreview]))
      .toBe(generatedRecipeImageLifecycleKey([beforePreview]));
  });

  it('preserves a valid in-memory review preview when the no-store media list omits its locator', () => {
    const recipe = reviewRecipe();
    const listResource = {
      mediaId: recipe.imageMediaId!,
      clientRecipeId: recipe.id,
      contentHash: 'a'.repeat(64),
      imageId: IMAGE_ID,
      modelVersion: 'model-1',
      promptVersion: 'prompt-1',
      status: 'stored' as const,
      semanticReviewState: 'needs_review' as const,
      attempts: 1,
      createdAt: '2026-10-19T12:00:00.000Z',
      updatedAt: '2026-10-19T12:00:00.000Z',
    };

    expect(reconcileGeneratedRecipeMedia(recipe, listResource)).toMatchObject({
      imagePreviewUrl: PREVIEW_URL,
      imagePreviewUrlExpiresAt: recipe.imagePreviewUrlExpiresAt,
      imageStatus: 'stored',
      imageReviewState: 'needs_review',
    });
  });

  it('removes signed accepted and review preview locators from persisted recipe state while retaining stable media identity', () => {
    const sanitized = sanitizeGeneratedRecipeMediaForPersistence([{
      ...reviewRecipe({
        image: 'https://storage.example/private/recipe-photos/account-a/accepted.png?capability=1',
        imageReviewState: 'accepted',
        imageStatus: 'url_ready',
      }),
    }]);

    expect(sanitized[0]).toMatchObject({
      id: 'recipe-7',
      imageId: IMAGE_ID,
      imageMediaId: '11111111-1111-4111-8111-111111111111',
      imageStatus: 'url_ready',
      imageReviewState: 'accepted',
    });
    expect(sanitized[0]).not.toHaveProperty('image');
    expect(sanitized[0]).not.toHaveProperty('imageUrlExpiresAt');
    expect(sanitized[0]).not.toHaveProperty('imagePreviewUrl');
    expect(sanitized[0]).not.toHaveProperty('imagePreviewUrlExpiresAt');
  });
});
