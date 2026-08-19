import { describe, it, expect } from 'vitest';
import {
  FOOD_MEMORY_SCHEMA_VERSION,
  nutritionForComponents,
  confidenceForComponents,
  memorySignature,
  migrateFoodMemories,
  provenanceForCapture,
  captureAnalysisToDraft,
  updateDraftComponents,
  recipeToDraft,
  plannerMealToDraft,
  sourceComponentsToDraft,
} from '../foodMemory';
import type {
  FoodMemoryComponent,
  FoodMemoryDraft,
  AcceptedFoodMemory,
} from '../foodMemory';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(overrides: Partial<FoodMemoryComponent> = {}): FoodMemoryComponent {
  return {
    id: 'comp-1',
    name: 'Chicken breast',
    serving: '100 g',
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    included: true,
    eatenFraction: 1,
    provenance: 'verified_provider',
    sourceLabel: 'USDA FoodData Central',
    confidence: 88,
    confidenceDimensions: { identity: 88, portion: 88, nutritionSource: 88, preparation: 88 },
    assumptions: [],
    reviewQuestions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// nutritionForComponents
// ---------------------------------------------------------------------------

describe('nutritionForComponents', () => {
  it('sums calories and macros for included components', () => {
    const components = [
      makeComponent({ calories: 200, proteinG: 20, carbsG: 10, fatG: 5, included: true, eatenFraction: 1 }),
      makeComponent({ id: 'comp-2', calories: 100, proteinG: 5, carbsG: 30, fatG: 2, included: true, eatenFraction: 1 }),
    ];
    const result = nutritionForComponents(components, '2026-08-06T12:00:00.000Z');
    expect(result.calories).toBeCloseTo(300);
    expect(result.proteinG).toBeCloseTo(25);
    expect(result.carbsG).toBeCloseTo(40);
    expect(result.fatG).toBeCloseTo(7);
    expect(result.capturedAt).toBe('2026-08-06T12:00:00.000Z');
  });

  it('excludes components where included=false', () => {
    const components = [
      makeComponent({ calories: 200, included: true, eatenFraction: 1 }),
      makeComponent({ id: 'comp-2', calories: 300, included: false, eatenFraction: 1 }),
    ];
    const result = nutritionForComponents(components);
    expect(result.calories).toBeCloseTo(200);
  });

  it('applies eatenFraction as a multiplier', () => {
    const components = [
      makeComponent({ calories: 400, proteinG: 40, carbsG: 20, fatG: 8, included: true, eatenFraction: 0.5 }),
    ];
    const result = nutritionForComponents(components);
    expect(result.calories).toBeCloseTo(200);
    expect(result.proteinG).toBeCloseTo(20);
    expect(result.carbsG).toBeCloseTo(10);
    expect(result.fatG).toBeCloseTo(4);
  });

  it('clamps eatenFraction to [0, 1] — no negative calories', () => {
    const components = [
      makeComponent({ calories: 300, included: true, eatenFraction: -0.5 }),
    ];
    const result = nutritionForComponents(components);
    expect(result.calories).toBe(0);
  });

  it('clamps eatenFraction to [0, 1] — fraction above 1 is treated as 1', () => {
    const components = [
      makeComponent({ calories: 200, included: true, eatenFraction: 2 }),
    ];
    const result = nutritionForComponents(components);
    expect(result.calories).toBeCloseTo(200);
  });

  it('returns all zeros when components list is empty', () => {
    const result = nutritionForComponents([]);
    expect(result.calories).toBe(0);
    expect(result.proteinG).toBe(0);
    expect(result.carbsG).toBe(0);
    expect(result.fatG).toBe(0);
  });
});

describe('restaurant source drafts', () => {
  it('preserves the selected date, meal, serving, and verified provider source', () => {
    const component = makeComponent({
      id: 'fatsecret-123-456',
      name: 'Cheeseburger',
      brand: 'Example Burger',
      serving: '1 burger',
      calories: 320,
      proteinG: 17,
      carbsG: 31,
      fatG: 15,
      provenance: 'verified_provider',
      sourceLabel: 'FatSecret nutrition data',
      confidence: 94,
    });
    const draft = sourceComponentsToDraft({
      inputType: 'text',
      title: 'Example Burger Cheeseburger',
      date: '2026-08-18',
      meal: 'Lunch',
      components: [component],
      sourceLabel: 'FatSecret nutrition data',
      provenance: 'verified_provider',
      now: '2026-08-18T12:00:00.000Z',
    });

    expect(draft).toMatchObject({
      date: '2026-08-18',
      meal: 'Lunch',
      title: 'Example Burger Cheeseburger',
      sourceLabel: 'FatSecret nutrition data',
      provenance: 'verified_provider',
    });
    expect(draft.components[0]).toMatchObject({
      serving: '1 burger',
      brand: 'Example Burger',
      calories: 320,
    });
  });
});

// ---------------------------------------------------------------------------
// confidenceForComponents
// ---------------------------------------------------------------------------

describe('confidenceForComponents', () => {
  it('returns overall confidence as the minimum of the four dimensions', () => {
    const components = [
      makeComponent({
        included: true,
        confidenceDimensions: { identity: 90, portion: 60, nutritionSource: 80, preparation: 75 },
      }),
    ];
    const result = confidenceForComponents(components);
    expect(result.confidence).toBe(60); // min of 90, 60, 80, 75
  });

  it('averages each dimension across multiple included components', () => {
    const a = makeComponent({
      id: 'a',
      included: true,
      confidenceDimensions: { identity: 80, portion: 70, nutritionSource: 90, preparation: 60 },
    });
    const b = makeComponent({
      id: 'b',
      included: true,
      confidenceDimensions: { identity: 60, portion: 50, nutritionSource: 70, preparation: 80 },
    });
    const result = confidenceForComponents([a, b]);
    // averages: identity=(80+60)/2=70, portion=(70+50)/2=60, nutritionSource=(90+70)/2=80, preparation=(60+80)/2=70
    expect(result.dimensions.identity).toBe(70);
    expect(result.dimensions.portion).toBe(60);
    expect(result.dimensions.nutritionSource).toBe(80);
    expect(result.dimensions.preparation).toBe(70);
    // overall = min(70,60,80,70) = 60
    expect(result.confidence).toBe(60);
  });

  it('ignores excluded components', () => {
    const included = makeComponent({ id: 'inc', included: true, confidence: 90, confidenceDimensions: { identity: 90, portion: 90, nutritionSource: 90, preparation: 90 } });
    const excluded = makeComponent({ id: 'exc', included: false, confidence: 10, confidenceDimensions: { identity: 10, portion: 10, nutritionSource: 10, preparation: 10 } });
    const result = confidenceForComponents([included, excluded]);
    expect(result.confidence).toBe(90);
    expect(result.dimensions.identity).toBe(90);
  });

  it('returns zero confidence when all components are excluded', () => {
    const result = confidenceForComponents([makeComponent({ included: false })]);
    expect(result.confidence).toBe(0);
    expect(result.dimensions).toEqual({ identity: 0, portion: 0, nutritionSource: 0, preparation: 0 });
  });

  it('returns zero confidence for an empty list', () => {
    const result = confidenceForComponents([]);
    expect(result.confidence).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// memorySignature
// ---------------------------------------------------------------------------

describe('memorySignature', () => {
  it('produces a deterministic lowercase signature from title and component names', () => {
    const draft = {
      title: 'Chicken Salad',
      components: [
        makeComponent({ name: 'Chicken Breast', included: true }),
        makeComponent({ id: 'comp-2', name: 'Romaine Lettuce', included: true }),
      ],
    };
    const sig = memorySignature(draft);
    expect(sig).toBe('chicken salad|chicken breast|romaine lettuce');
  });

  it('sorts component names so order does not matter', () => {
    const a = {
      title: 'Lunch',
      components: [
        makeComponent({ name: 'Apple', included: true }),
        makeComponent({ id: 'comp-2', name: 'Banana', included: true }),
      ],
    };
    const b = {
      title: 'Lunch',
      components: [
        makeComponent({ name: 'Banana', included: true }),
        makeComponent({ id: 'comp-2', name: 'Apple', included: true }),
      ],
    };
    expect(memorySignature(a)).toBe(memorySignature(b));
  });

  it('excludes non-included components from the signature', () => {
    const withExcluded = {
      title: 'Snack',
      components: [
        makeComponent({ name: 'Yogurt', included: true }),
        makeComponent({ id: 'comp-2', name: 'Granola', included: false }),
      ],
    };
    const withoutExcluded = {
      title: 'Snack',
      components: [
        makeComponent({ name: 'Yogurt', included: true }),
      ],
    };
    expect(memorySignature(withExcluded)).toBe(memorySignature(withoutExcluded));
  });

  it('normalises extra whitespace in names', () => {
    const draft = { title: '  My  Meal ', components: [makeComponent({ name: '  Rice  Bowl ', included: true })] };
    const sig = memorySignature(draft);
    expect(sig).toBe('my meal|rice bowl');
  });
});

// ---------------------------------------------------------------------------
// provenanceForCapture
// ---------------------------------------------------------------------------

describe('provenanceForCapture', () => {
  it('maps "Barcode verified" to verified_barcode', () => {
    expect(provenanceForCapture('Barcode verified', 'barcode')).toBe('verified_barcode');
  });

  it('maps "USDA verified" to verified_provider', () => {
    expect(provenanceForCapture('USDA verified', 'text')).toBe('verified_provider');
  });

  it('maps "Brand verified" to verified_provider', () => {
    expect(provenanceForCapture('Brand verified', 'text')).toBe('verified_provider');
  });

  it('maps "Nutrition label" to verified_label', () => {
    expect(provenanceForCapture('Nutrition label', 'photo')).toBe('verified_label');
  });

  it('maps nutrition_label inputType to verified_label', () => {
    expect(provenanceForCapture('anything', 'nutrition_label')).toBe('verified_label');
  });

  it('maps recipe inputType to recipe_imported', () => {
    expect(provenanceForCapture('anything', 'recipe')).toBe('recipe_imported');
  });

  it('maps planner inputType to planner_estimate', () => {
    expect(provenanceForCapture('anything', 'planner')).toBe('planner_estimate');
  });

  it('maps manual inputType to manual', () => {
    expect(provenanceForCapture('anything', 'manual')).toBe('manual');
  });

  it('falls back to photo_estimate for unknown combinations', () => {
    expect(provenanceForCapture('Photo estimate', 'photo')).toBe('photo_estimate');
    expect(provenanceForCapture('Unknown source', 'text')).toBe('photo_estimate');
  });
});

// ---------------------------------------------------------------------------
// captureAnalysisToDraft
// ---------------------------------------------------------------------------

describe('captureAnalysisToDraft', () => {
  const NOW = '2026-08-06T09:00:00.000Z';

  const barcodeAnalysis = {
    sessionId: 'sess-abc',
    mode: 'barcode' as const,
    status: 'review' as const,
    title: 'Granola Bar',
    reviewMessage: 'Review before adding.',
    provider: 'Open Food Facts',
    candidates: [],
    components: [
      {
        componentId: 'off-1234567890',
        id: 'off-1234567890',
        name: 'Granola Bar',
        brand: 'Nature Valley',
        serving: '42 g',
        calories: 190,
        proteinG: 4,
        carbsG: 29,
        fatG: 7,
        confidence: 94,
        provenance: 'Barcode verified',
        sourceLabel: 'Open Food Facts',
        editable: true,
        included: true,
        eatenFraction: 1,
        preparation: null,
        confidenceDimensions: { identity: 94, portion: 85, nutritionSource: 94, preparation: 94 },
        assumptions: [],
        nutritionRange: { caloriesLow: 171, caloriesHigh: 209 },
        reviewQuestions: ['Is this the serving size you ate?'],
      },
    ],
    assumptions: [],
    reviewQuestions: ['Is this the serving size you ate?'],
    imageRetention: 'delete_after_analysis' as const,
  };

  it('creates a draft with the correct schema version', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Breakfast', NOW);
    expect(draft.schemaVersion).toBe(FOOD_MEMORY_SCHEMA_VERSION);
  });

  it('sets status to draft', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Breakfast', NOW);
    expect(draft.status).toBe('draft');
  });

  it('maps barcode mode to barcode inputType', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Lunch', NOW);
    expect(draft.inputType).toBe('barcode');
  });

  it('maps barcode provenance to verified_barcode', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Snack', NOW);
    expect(draft.provenance).toBe('verified_barcode');
    expect(draft.components[0].provenance).toBe('verified_barcode');
  });

  it('uses sessionId in the draft id', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Dinner', NOW);
    expect(draft.id).toBe('memory-draft-sess-abc');
  });

  it('calculates correct nutrition from components', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Snack', NOW);
    expect(draft.nutrition.calories).toBeCloseTo(190);
    expect(draft.nutrition.proteinG).toBeCloseTo(4);
    expect(draft.nutrition.carbsG).toBeCloseTo(29);
    expect(draft.nutrition.fatG).toBeCloseTo(7);
  });

  it('originalNutrition equals initial nutrition', () => {
    const draft = captureAnalysisToDraft(barcodeAnalysis, '2026-08-06', 'Snack', NOW);
    expect(draft.originalNutrition).toEqual(draft.nutrition);
  });

  it('falls back to candidates when components array is absent', () => {
    const candidateAnalysis = {
      ...barcodeAnalysis,
      components: undefined as any,
      candidates: [
        {
          id: 'cand-1',
          name: 'Oatmeal',
          brand: null,
          serving: '1 cup',
          calories: 150,
          proteinG: 5,
          carbsG: 27,
          fatG: 2.5,
          confidence: 80,
          provenance: 'Photo estimate',
          sourceLabel: 'Managed vision estimate',
          editable: true,
        },
      ],
    };
    const draft = captureAnalysisToDraft(candidateAnalysis, '2026-08-06', 'Breakfast', NOW);
    expect(draft.components).toHaveLength(1);
    expect(draft.components[0].name).toBe('Oatmeal');
  });

  it('sets imageRetention to not_collected for barcode (text) mode', () => {
    const textAnalysis = { ...barcodeAnalysis, mode: 'text' as const };
    const draft = captureAnalysisToDraft(textAnalysis, '2026-08-06', 'Lunch', NOW);
    expect(draft.imageRetention).toBe('not_collected');
  });

  it('sets imageRetention to delete_after_analysis for photo mode', () => {
    const photoAnalysis = { ...barcodeAnalysis, mode: 'food' as const };
    const draft = captureAnalysisToDraft(photoAnalysis, '2026-08-06', 'Lunch', NOW);
    expect(draft.imageRetention).toBe('delete_after_analysis');
  });
});

// ---------------------------------------------------------------------------
// updateDraftComponents
// ---------------------------------------------------------------------------

describe('updateDraftComponents', () => {
  const NOW = '2026-08-06T09:00:00.000Z';

  const baseDraft: FoodMemoryDraft = {
    id: 'draft-1',
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType: 'text',
    status: 'draft',
    title: 'Pasta',
    date: '2026-08-06',
    meal: 'Dinner',
    components: [makeComponent({ calories: 300 })],
    nutrition: { calories: 300, proteinG: 31, carbsG: 0, fatG: 3.6, capturedAt: NOW },
    originalNutrition: { calories: 300, proteinG: 31, carbsG: 0, fatG: 3.6, capturedAt: NOW },
    provenance: 'photo_estimate',
    sourceLabel: 'AI estimate',
    confidence: 88,
    confidenceDimensions: { identity: 88, portion: 88, nutritionSource: 88, preparation: 88 },
    assumptions: [],
    reviewQuestions: ['How much did you eat?'],
    imageRetention: 'not_collected',
    createdAt: NOW,
    updatedAt: NOW,
    correctionIds: [],
  };

  it('recalculates nutrition when components are replaced', () => {
    const newComponents = [makeComponent({ calories: 500, proteinG: 50, carbsG: 60, fatG: 10 })];
    const updated = updateDraftComponents(baseDraft, newComponents, NOW);
    expect(updated.nutrition.calories).toBeCloseTo(500);
    expect(updated.nutrition.proteinG).toBeCloseTo(50);
  });

  it('recalculates confidence from new components', () => {
    const newComponents = [makeComponent({ confidenceDimensions: { identity: 50, portion: 40, nutritionSource: 60, preparation: 55 } })];
    const updated = updateDraftComponents(baseDraft, newComponents, NOW);
    expect(updated.confidence).toBe(40); // min of 50,40,60,55
  });

  it('flattens reviewQuestions from new components (max 8)', () => {
    const newComponents = Array.from({ length: 3 }, (_, i) =>
      makeComponent({ id: `c${i}`, reviewQuestions: ['Q1?', 'Q2?', 'Q3?'] }),
    );
    const updated = updateDraftComponents(baseDraft, newComponents, NOW);
    expect(updated.reviewQuestions.length).toBeLessThanOrEqual(8);
  });

  it('does not modify originalNutrition', () => {
    const newComponents = [makeComponent({ calories: 9000 })];
    const updated = updateDraftComponents(baseDraft, newComponents, NOW);
    expect(updated.originalNutrition.calories).toBe(300);
  });

  it('sets updatedAt to the provided timestamp', () => {
    const LATER = '2026-08-06T15:00:00.000Z';
    const updated = updateDraftComponents(baseDraft, baseDraft.components, LATER);
    expect(updated.updatedAt).toBe(LATER);
  });
});

// ---------------------------------------------------------------------------
// migrateFoodMemories — legacy migration
// ---------------------------------------------------------------------------

describe('migrateFoodMemories', () => {
  const legacyLogs = [
    {
      id: 'log-a',
      name: 'Oatmeal',
      date: '2026-08-05',
      meal: 'Breakfast' as const,
      calories: 300,
      protein: 10,
      carbs: 55,
      fat: 5,
      source: 'USDA verified',
      confidence: 95,
      serving: '1 cup',
      time: '8:00 AM',
    },
    {
      id: 'log-b',
      name: 'Salad',
      date: '2026-08-05',
      meal: 'Lunch' as const,
      calories: 250,
      protein: 8,
      carbs: 30,
      fat: 12,
      source: 'Manual',
      confidence: 80,
      serving: '1 bowl',
      time: '12:30 PM',
    },
  ];

  it('converts legacy logs to accepted memories when no saved memories exist', () => {
    const result = migrateFoodMemories(undefined, legacyLogs);
    expect(result.foodMemories).toHaveLength(2);
    expect(result.foodMemories[0].status).toBe('accepted');
    expect(result.foodMemories[0].title).toBe('Oatmeal');
  });

  it('sets the diaryLogId to the original log id', () => {
    const result = migrateFoodMemories(undefined, legacyLogs);
    expect(result.foodMemories[0].diaryLogId).toBe('log-a');
    expect(result.foodMemories[1].diaryLogId).toBe('log-b');
  });

  it('preserves calorie and macro values from legacy logs', () => {
    const result = migrateFoodMemories(undefined, legacyLogs);
    const oatmeal = result.foodMemories[0];
    expect(oatmeal.nutrition.calories).toBeCloseTo(300);
    expect(oatmeal.nutrition.proteinG).toBeCloseTo(10);
    expect(oatmeal.nutrition.carbsG).toBeCloseTo(55);
    expect(oatmeal.nutrition.fatG).toBeCloseTo(5);
  });

  it('maps Manual source to manual provenance', () => {
    const result = migrateFoodMemories(undefined, legacyLogs);
    const salad = result.foodMemories[1];
    expect(salad.provenance).toBe('manual');
  });

  it('skips migration and returns existing memories when they are already present', () => {
    const existingMemory: AcceptedFoodMemory = {
      id: 'existing-mem',
      schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
      inputType: 'manual',
      status: 'accepted',
      title: 'Existing',
      date: '2026-08-05',
      meal: 'Dinner',
      components: [],
      nutrition: { calories: 100, proteinG: 5, carbsG: 10, fatG: 3, capturedAt: '2026-08-05T00:00:00Z' },
      originalNutrition: { calories: 100, proteinG: 5, carbsG: 10, fatG: 3, capturedAt: '2026-08-05T00:00:00Z' },
      provenance: 'manual',
      sourceLabel: 'Manual',
      confidence: 80,
      confidenceDimensions: { identity: 80, portion: 80, nutritionSource: 80, preparation: 80 },
      assumptions: [],
      reviewQuestions: [],
      imageRetention: 'not_collected',
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:00:00Z',
      acceptedAt: '2026-08-05T00:00:00Z',
      diaryLogId: 'log-existing',
      correctionIds: [],
    };
    const result = migrateFoodMemories({ foodMemories: [existingMemory] }, legacyLogs);
    expect(result.foodMemories).toHaveLength(1);
    expect(result.foodMemories[0].id).toBe('existing-mem');
  });

  it('returns empty arrays for foodDrafts, repeatPatterns, and memoryCorrections', () => {
    const result = migrateFoodMemories(undefined, legacyLogs);
    expect(result.foodDrafts).toEqual([]);
    expect(result.repeatPatterns).toEqual([]);
    expect(result.memoryCorrections).toEqual([]);
  });

  it('handles an empty log list gracefully', () => {
    const result = migrateFoodMemories(undefined, []);
    expect(result.foodMemories).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// recipeToDraft
// ---------------------------------------------------------------------------

describe('recipeToDraft', () => {
  const NOW = '2026-08-06T09:00:00.000Z';

  it('sets inputType to recipe and provenance to recipe_imported for non-local recipe', () => {
    const draft = recipeToDraft(
      { id: 'r1', name: 'Pasta Primavera', calories: 500, proteinG: 18, carbsG: 70, fatG: 14, source: 'TheMealDB', isLocal: false },
      '2026-08-06',
      'Dinner',
      NOW,
    );
    expect(draft.inputType).toBe('recipe');
    expect(draft.provenance).toBe('recipe_imported');
  });

  it('sets provenance to recipe_personal for local recipes', () => {
    const draft = recipeToDraft(
      { id: 'r2', name: 'My Chicken', calories: 400, proteinG: 35, carbsG: 20, fatG: 12, source: 'My Recipes', isLocal: true },
      '2026-08-06',
      'Lunch',
      NOW,
    );
    expect(draft.provenance).toBe('recipe_personal');
  });

  it('sets confidence to 92 for local recipes and 68 for imported', () => {
    const local = recipeToDraft(
      { id: 'r3', name: 'Home Stew', calories: 300, proteinG: 20, carbsG: 30, fatG: 8, source: 'My Recipes', isLocal: true },
      '2026-08-06',
      'Dinner',
      NOW,
    );
    const imported = recipeToDraft(
      { id: 'r4', name: 'Ramen', calories: 600, proteinG: 25, carbsG: 80, fatG: 20, source: 'TheMealDB', isLocal: false },
      '2026-08-06',
      'Dinner',
      NOW,
    );
    expect(local.confidence).toBe(92);
    expect(imported.confidence).toBe(68);
  });

  it('includes an open-source assumption for imported recipes', () => {
    const draft = recipeToDraft(
      { id: 'r5', name: 'Soup', calories: 200, proteinG: 10, carbsG: 25, fatG: 5, source: 'OpenMeals', isLocal: false },
      '2026-08-06',
      'Lunch',
      NOW,
    );
    expect(draft.assumptions.some((a) => a.includes('OpenMeals'))).toBe(true);
  });

  it('calculates correct nutrition from the recipe component', () => {
    const draft = recipeToDraft(
      { id: 'r6', name: 'Bowl', calories: 450, proteinG: 30, carbsG: 50, fatG: 15, source: 'Test', isLocal: true },
      '2026-08-06',
      'Dinner',
      NOW,
    );
    expect(draft.nutrition.calories).toBeCloseTo(450);
    expect(draft.nutrition.proteinG).toBeCloseTo(30);
  });

  it('falls back to zero for null nutrition values', () => {
    const draft = recipeToDraft(
      { id: 'r7', name: 'Mystery dish', calories: null, proteinG: null, carbsG: null, fatG: null, source: 'Unknown', isLocal: false },
      '2026-08-06',
      'Snack',
      NOW,
    );
    expect(draft.nutrition.calories).toBe(0);
    expect(draft.nutrition.proteinG).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sourceComponentsToDraft
// ---------------------------------------------------------------------------

describe('sourceComponentsToDraft', () => {
  const NOW = '2026-08-06T09:00:00.000Z';

  it('builds a draft from manual components', () => {
    const draft = sourceComponentsToDraft({
      inputType: 'manual',
      title: 'My Meal',
      date: '2026-08-06',
      meal: 'Lunch',
      components: [makeComponent({ calories: 300 })],
      sourceLabel: 'Manual entry',
      provenance: 'manual',
      now: NOW,
    });
    expect(draft.status).toBe('draft');
    expect(draft.inputType).toBe('manual');
    expect(draft.title).toBe('My Meal');
    expect(draft.nutrition.calories).toBeCloseTo(300);
  });

  it('sets imageRetention to not_collected', () => {
    const draft = sourceComponentsToDraft({
      inputType: 'text',
      title: 'Snack',
      date: '2026-08-06',
      meal: 'Snack',
      components: [makeComponent()],
      sourceLabel: 'AI',
      provenance: 'photo_estimate',
      now: NOW,
    });
    expect(draft.imageRetention).toBe('not_collected');
  });
});

// ---------------------------------------------------------------------------
// plannerMealToDraft
// ---------------------------------------------------------------------------

describe('plannerMealToDraft', () => {
  const NOW = '2026-08-06T09:00:00.000Z';

  it('creates a draft with planner inputType and planner_estimate provenance', () => {
    const draft = plannerMealToDraft(
      { id: 'pm-1', name: 'Grilled Salmon', calories: 350, proteinG: 40, carbsG: 10, fatG: 12, meal: 'Dinner', day: '2026-08-07' },
      NOW,
    );
    expect(draft.inputType).toBe('planner');
    expect(draft.provenance).toBe('planner_estimate');
  });

  it('sets confidence to 72', () => {
    const draft = plannerMealToDraft(
      { id: 'pm-2', name: 'Oatmeal', calories: 300, proteinG: 10, carbsG: 55, fatG: 5, meal: 'Breakfast', day: '2026-08-07' },
      NOW,
    );
    expect(draft.confidence).toBe(72);
  });

  it('includes a review question about portion', () => {
    const draft = plannerMealToDraft(
      { id: 'pm-3', name: 'Salad', calories: 200, proteinG: 5, carbsG: 20, fatG: 8, meal: 'Lunch', day: '2026-08-07' },
      NOW,
    );
    expect(draft.reviewQuestions.some((q) => /portion/i.test(q))).toBe(true);
  });

  it('calculates nutrition from the planner component', () => {
    const draft = plannerMealToDraft(
      { id: 'pm-4', name: 'Pizza', calories: 800, proteinG: 30, carbsG: 90, fatG: 30, meal: 'Dinner', day: '2026-08-06' },
      NOW,
    );
    expect(draft.nutrition.calories).toBeCloseTo(800);
    expect(draft.nutrition.proteinG).toBeCloseTo(30);
  });
});
