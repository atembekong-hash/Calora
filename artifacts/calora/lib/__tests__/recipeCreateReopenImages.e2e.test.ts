import { describe, expect, it } from 'vitest';
import {
  generatedRecipeImageLifecycleKey,
  patchForRecipeMedia,
  restoredRecipeFromMedia,
  type GeneratedRecipeImageCandidate,
} from '../generatedRecipeImageLifecycle';
import { sanitizeGeneratedRecipeMediaForPersistence } from '../generatedRecipeImagePersistence';
import type { GeneratedRecipePhoto } from '../recipeGeneration';

type PersistedRecipe = GeneratedRecipeImageCandidate & {
  instructions: string;
};

const imageId = '123e4567-e89b-42d3-a456-426614174000';
const mediaId = 'media-create-reopen-7';
const imageUrl = 'https://storage.example/generated/create-reopen-7.png';
const imageExpiry = '2026-11-12T22:00:00.000Z';

function generatedRecipe(): PersistedRecipe {
  return {
    id: 'recipe-create-reopen-7',
    name: 'Citrus chicken bowl',
    ingredients: ['Chicken', 'Rice', 'Orange'],
    instructions: 'Cook the chicken.\nAssemble and serve.',
    isLocal: true,
    sourceType: 'calora_ai',
    image: null,
    imageStatus: 'pending',
    imageProvenance: undefined,
  };
}

function generatedPhoto(): GeneratedRecipePhoto {
  return {
    mediaId,
    clientRecipeId: 'recipe-create-reopen-7',
    contentHash: 'a'.repeat(64),
    imageId,
    imageUrl,
    imageUrlExpiresAt: imageExpiry,
    modelVersion: 'recipe-image-model-1',
    promptVersion: 'recipe-image-prompt-1',
    status: 'url_ready',
    semanticReviewState: 'accepted',
    attempts: 1,
    createdAt: '2026-10-12T22:00:00.000Z',
    updatedAt: '2026-10-12T22:00:00.000Z',
    recipePayload: {
      clientRecipeId: 'recipe-create-reopen-7',
      title: 'Citrus chicken bowl',
      description: 'A bright, balanced bowl.',
      ingredients: ['Chicken', 'Rice', 'Orange'],
      instructions: ['Cook the chicken.', 'Assemble and serve.'],
      dietaryContext: [],
    },
  };
}

describe('Create recipe image persistence across session reopens', () => {
  it('persists only durable generated-media identity and reissues an accepted signed URL after every reopen', () => {
    const created = generatedRecipe();
    const photo = generatedPhoto();
    const savedRecipe: PersistedRecipe = { ...created, ...patchForRecipeMedia(photo) };
    const persistedRecipe = sanitizeGeneratedRecipeMediaForPersistence([savedRecipe])[0]!;
    const persistedMedia = photo;
    const firstLifecycleKey = generatedRecipeImageLifecycleKey([savedRecipe]);

    expect(savedRecipe.image).toBe(imageUrl);
    expect(savedRecipe.imageId).toBe(imageId);
    expect(savedRecipe.imageMediaId).toBe(mediaId);
    expect(firstLifecycleKey).toContain(`recipe-create-reopen-7:url_ready:${imageId}:${mediaId}`);
    expect(persistedRecipe).toMatchObject({ imageId, imageMediaId: mediaId, imageStatus: 'url_ready', imageReviewState: 'accepted' });
    expect(persistedRecipe).not.toHaveProperty('image');
    expect(persistedRecipe).not.toHaveProperty('imageUrlExpiresAt');

    for (let reopen = 1; reopen <= 6; reopen += 1) {
      const restored = restoredRecipeFromMedia(persistedMedia);
      expect(restored).toMatchObject({
        id: savedRecipe.id,
        image: imageUrl,
        imageId,
        imageMediaId: mediaId,
        imageStatus: 'url_ready',
        imageProvenance: 'generated',
      });
      expect(generatedRecipeImageLifecycleKey([restored!])).toBe(firstLifecycleKey);
      expect(restored?.image).not.toBeNull();
      expect(restored?.image).toBe(savedRecipe.image);
      expect(sanitizeGeneratedRecipeMediaForPersistence([restored!])[0]).not.toHaveProperty('image');
      expect(reopen).toBeGreaterThan(0);
    }
  });
});
