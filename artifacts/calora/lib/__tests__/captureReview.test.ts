/**
 * Capture review state-machine tests.
 *
 * These tests exercise the PRODUCTION pure functions exported from
 * captureReviewTransitions.ts, which are the same functions CaloraContext
 * calls. A regression in buildAcceptResult, buildRejectDraft, updateRepeatPatterns,
 * foodSourceForMemory, or deriveThemeMode will be caught here.
 *
 * Covered scenarios:
 *  - Review approval: correct log + memory produced, all fields linked/populated
 *  - Review rejection: draft updated, no log emitted
 *  - Partial consumption: eatenFraction < 1 flows into the accepted log
 *  - Dark-mode: deriveThemeMode correctly maps all preference/system combinations
 *  - Accessibility: key labels present in the scan-screen source
 *  - No silent diary insertion: rejection path cannot produce a log
 *  - Repeat-pattern tracking: first-accept creates, second-accept increments
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Production functions under test
import {
  buildAcceptResult,
  buildRejectDraft,
  updateRepeatPatterns,
  foodSourceForMemory,
  deriveThemeMode,
  type FoodLog,
} from '../captureReviewTransitions';

// Pure helpers used to build test fixtures (also tested in foodMemory.test.ts)
import {
  FOOD_MEMORY_SCHEMA_VERSION,
  nutritionForComponents,
  confidenceForComponents,
  updateDraftComponents,
  captureAnalysisToDraft,
} from '../foodMemory';
import type {
  FoodMemoryDraft,
  FoodMemoryComponent,
  AcceptedFoodMemory,
  RepeatPattern,
} from '../foodMemory';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = '2026-08-06T09:00:00.000Z';
const LATER = '2026-08-06T12:00:00.000Z';
let _seq = 0;
function nextId(prefix = 'id') {
  return `${prefix}-${++_seq}`;
}

function makeComponent(overrides: Partial<FoodMemoryComponent> = {}): FoodMemoryComponent {
  return {
    id: nextId('comp'),
    name: 'Chicken breast',
    serving: '100 g',
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    included: true,
    eatenFraction: 1,
    provenance: 'verified_provider',
    sourceLabel: 'USDA',
    confidence: 88,
    confidenceDimensions: { identity: 88, portion: 88, nutritionSource: 88, preparation: 88 },
    assumptions: [],
    reviewQuestions: [],
    ...overrides,
  };
}

function makeDraft(overrides: Partial<FoodMemoryDraft> = {}): FoodMemoryDraft {
  const components = overrides.components ?? [makeComponent()];
  const nutrition = nutritionForComponents(components, NOW);
  return {
    id: nextId('draft'),
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType: 'text',
    status: 'draft',
    title: 'Test Meal',
    date: '2026-08-06',
    meal: 'Lunch',
    components,
    nutrition,
    originalNutrition: { ...nutrition },
    provenance: 'photo_estimate',
    sourceLabel: 'AI',
    confidence: 88,
    confidenceDimensions: { identity: 88, portion: 88, nutritionSource: 88, preparation: 88 },
    assumptions: [],
    reviewQuestions: [],
    imageRetention: 'not_collected',
    createdAt: NOW,
    updatedAt: NOW,
    correctionIds: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// foodSourceForMemory
// ---------------------------------------------------------------------------

describe('foodSourceForMemory', () => {
  it('verified_barcode → Barcode verified', () => {
    expect(foodSourceForMemory('verified_barcode')).toBe('Barcode verified');
  });
  it('verified_provider → USDA verified', () => {
    expect(foodSourceForMemory('verified_provider')).toBe('USDA verified');
  });
  it('verified_label → USDA verified', () => {
    expect(foodSourceForMemory('verified_label')).toBe('USDA verified');
  });
  it('recipe_imported → Recipe', () => {
    expect(foodSourceForMemory('recipe_imported')).toBe('Recipe');
  });
  it('recipe_personal → Recipe', () => {
    expect(foodSourceForMemory('recipe_personal')).toBe('Recipe');
  });
  it('manual → Manual', () => {
    expect(foodSourceForMemory('manual')).toBe('Manual');
  });
  it('photo_estimate → Photo estimate', () => {
    expect(foodSourceForMemory('photo_estimate')).toBe('Photo estimate');
  });
  it('planner_estimate → Photo estimate (fallback)', () => {
    expect(foodSourceForMemory('planner_estimate')).toBe('Photo estimate');
  });
});

// ---------------------------------------------------------------------------
// buildAcceptResult — review approval
// ---------------------------------------------------------------------------

describe('buildAcceptResult — review approval', () => {
  it('produces a FoodLog with correct name, date, meal', () => {
    const draft = makeDraft({ title: 'Eggs on Toast', date: '2026-08-06', meal: 'Breakfast' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.name).toBe('Eggs on Toast');
    expect(log.date).toBe('2026-08-06');
    expect(log.meal).toBe('Breakfast');
  });

  it('carries durable image metadata into the accepted diary log', () => {
    const draft = makeDraft({
      imageUrl: 'https://images.openfoodfacts.org/eggs.jpg',
      imageSource: 'provider',
    });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.imageUrl).toBe('https://images.openfoodfacts.org/eggs.jpg');
    expect(log.imageSource).toBe('provider');
  });

  it('drops temporary image data before producing a persisted diary log', () => {
    const draft = makeDraft({
      imageUrl: 'data:image/jpeg;base64,temporary',
      imageSource: 'provider',
    });
    const { log, memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.imageUrl).toBeUndefined();
    expect(log.imageSource).toBeUndefined();
    expect(memory.imageUrl).toBeUndefined();
  });

  it('calories/macros on the log match the draft nutrition', () => {
    const component = makeComponent({ calories: 300, proteinG: 25, carbsG: 20, fatG: 8, eatenFraction: 1, included: true });
    const draft = makeDraft({ components: [component] });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.calories).toBeCloseTo(300);
    expect(log.protein).toBeCloseTo(25);
    expect(log.carbs).toBeCloseTo(20);
    expect(log.fat).toBeCloseTo(8);
  });

  it('log.memoryId links back to the draft.id', () => {
    const draft = makeDraft();
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.memoryId).toBe(draft.id);
  });

  it('memory.diaryLogId links forward to log.id', () => {
    const draft = makeDraft();
    const logId = nextId('log');
    const { log, memory } = buildAcceptResult(draft, logId, LATER);
    expect(memory.diaryLogId).toBe(logId);
    expect(memory.diaryLogId).toBe(log.id);
  });

  it('preserves planner provenance on the accepted diary entry', () => {
    const draft = makeDraft({ plannerMealId: 'planned-meal-1' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.plannerMealId).toBe('planned-meal-1');
  });

  it.each(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const)('preserves local image identity for %s diary acceptance', (meal) => {
    const draft = makeDraft({ meal, plannerMealId: `planned-${meal}`, imageAssetKey: 'berry-oats' });
    const { log, memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.imageAssetKey).toBe('berry-oats');
    expect(memory.imageAssetKey).toBe('berry-oats');
  });

  it('memory.status is "accepted"', () => {
    const draft = makeDraft();
    const { memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(memory.status).toBe('accepted');
  });

  it('memory.acceptedAt equals the supplied acceptedAt', () => {
    const draft = makeDraft();
    const { memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(memory.acceptedAt).toBe(LATER);
  });

  it('log.nutritionSnapshot.capturedAt equals acceptedAt', () => {
    const draft = makeDraft();
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.nutritionSnapshot?.capturedAt).toBe(LATER);
  });

  it('log.notes contains sourceLabel and "Review approved"', () => {
    const draft = makeDraft({ sourceLabel: 'Open Food Facts' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.notes).toContain('Open Food Facts');
    expect(log.notes).toContain('Review approved');
  });

  it('log.serving joins included component servings', () => {
    const draft = makeDraft({
      components: [
        makeComponent({ serving: '150 g', included: true }),
        makeComponent({ serving: '80 g', included: true }),
      ],
    });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.serving).toBe('150 g + 80 g');
  });

  it('excluded components are omitted from serving string', () => {
    const draft = makeDraft({
      components: [
        makeComponent({ serving: '100 g', included: true }),
        makeComponent({ serving: '50 g', included: false }),
      ],
    });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.serving).toBe('100 g');
  });

  it('log.serving defaults to "1 serving" when all components are excluded', () => {
    const draft = makeDraft({
      components: [makeComponent({ included: false })],
    });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.serving).toBe('1 serving');
  });

  it('maps verified_barcode provenance to "Barcode verified" on the log', () => {
    const draft = makeDraft({ provenance: 'verified_barcode' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.source).toBe('Barcode verified');
  });

  it('maps verified_provider provenance to "USDA verified" on the log', () => {
    const draft = makeDraft({ provenance: 'verified_provider' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.source).toBe('USDA verified');
  });

  it('maps photo_estimate to "Photo estimate" on the log', () => {
    const draft = makeDraft({ provenance: 'photo_estimate' });
    const { log } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(log.source).toBe('Photo estimate');
  });

  it('memory preserves all draft fields except status, nutrition, updatedAt, acceptedAt, diaryLogId', () => {
    const draft = makeDraft({ title: 'Special Meal', inputType: 'recipe', confidence: 75 });
    const { memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(memory.title).toBe('Special Meal');
    expect(memory.inputType).toBe('recipe');
    expect(memory.confidence).toBe(75);
    expect(memory.schemaVersion).toBe(FOOD_MEMORY_SCHEMA_VERSION);
  });

  it('originalNutrition is NOT updated by accept (immutable history)', () => {
    const component = makeComponent({ calories: 400 });
    const draft = makeDraft({ components: [component] });
    const { memory } = buildAcceptResult(draft, nextId('log'), LATER);
    expect(memory.originalNutrition.calories).toBeCloseTo(400);
    expect(memory.originalNutrition).toEqual(draft.originalNutrition);
  });

  it('two calls with different logIds produce unique log ids', () => {
    const draft = makeDraft();
    const id1 = nextId('log');
    const id2 = nextId('log');
    const { log: log1 } = buildAcceptResult(draft, id1, LATER);
    const { log: log2 } = buildAcceptResult(draft, id2, LATER);
    expect(log1.id).not.toBe(log2.id);
  });
});

// ---------------------------------------------------------------------------
// buildRejectDraft — review rejection (no diary insertion)
// ---------------------------------------------------------------------------

describe('buildRejectDraft — review rejection', () => {
  it('returned draft has status="rejected"', () => {
    const draft = makeDraft();
    const rejected = buildRejectDraft(draft, LATER);
    expect(rejected.status).toBe('rejected');
  });

  it('updatedAt is set to the supplied timestamp', () => {
    const draft = makeDraft();
    const rejected = buildRejectDraft(draft, LATER);
    expect(rejected.updatedAt).toBe(LATER);
  });

  it('buildRejectDraft returns a draft object, not a FoodLog — no calories/protein keys', () => {
    const draft = makeDraft();
    const result = buildRejectDraft(draft, LATER);
    // FoodLog keys must not be present on a rejected draft
    expect(result).not.toHaveProperty('calories');
    expect(result).not.toHaveProperty('protein');
    expect(result).not.toHaveProperty('diaryLogId');
  });

  it('rejected draft preserves all nutrition values unchanged', () => {
    const draft = makeDraft();
    const rejected = buildRejectDraft(draft, LATER);
    expect(rejected.nutrition).toEqual(draft.nutrition);
    expect(rejected.originalNutrition).toEqual(draft.originalNutrition);
  });

  it('a draft with status="rejected" cannot be used to start a new accept (status guard)', () => {
    const draft = makeDraft();
    const rejected = buildRejectDraft(draft, LATER);
    // CaloraContext guards acceptFoodMemory behind status === 'draft'
    const canAccept = rejected.status === 'draft';
    expect(canAccept).toBe(false);
  });

  it('calling buildRejectDraft twice is idempotent in status', () => {
    const draft = makeDraft();
    const first = buildRejectDraft(draft, LATER);
    const second = buildRejectDraft(first, LATER);
    expect(second.status).toBe('rejected');
  });

  it('rejected draft preserves title, components, provenance', () => {
    const draft = makeDraft({ title: 'Banana Split', provenance: 'verified_barcode' });
    const rejected = buildRejectDraft(draft, LATER);
    expect(rejected.title).toBe('Banana Split');
    expect(rejected.provenance).toBe('verified_barcode');
    expect(rejected.components).toEqual(draft.components);
  });
});

// ---------------------------------------------------------------------------
// Partial consumption — eatenFraction flows through to the accepted log
// ---------------------------------------------------------------------------

describe('partial consumption', () => {
  it('50% eatenFraction halves the accepted log calories', () => {
    const component = makeComponent({ calories: 400, eatenFraction: 0.5, included: true });
    const draft = makeDraft({ components: [component] });
    // updateDraftComponents is called by the context before accepting;
    // reproduce that same call here to test the full production chain.
    const updated = updateDraftComponents(draft, draft.components, NOW);
    const { log } = buildAcceptResult(updated, nextId('log'), LATER);
    expect(log.calories).toBeCloseTo(200);
    expect(log.nutritionSnapshot?.calories).toBeCloseTo(200);
  });

  it('25% eatenFraction reduces all macros proportionally', () => {
    const component = makeComponent({
      calories: 400, proteinG: 40, carbsG: 60, fatG: 10,
      eatenFraction: 0.25, included: true,
    });
    const nutrition = nutritionForComponents([component]);
    expect(nutrition.calories).toBeCloseTo(100);
    expect(nutrition.proteinG).toBeCloseTo(10);
    expect(nutrition.carbsG).toBeCloseTo(15);
    expect(nutrition.fatG).toBeCloseTo(2.5);
  });

  it('75% eatenFraction correctly reduces the review total', () => {
    const component = makeComponent({ calories: 200, eatenFraction: 0.75, included: true });
    const nutrition = nutritionForComponents([component]);
    expect(nutrition.calories).toBeCloseTo(150);
  });

  it('updateDraftComponents → buildAcceptResult: full chain with partial eating', () => {
    const original = makeComponent({ calories: 600, eatenFraction: 1, included: true });
    const draft = makeDraft({ components: [original] });
    const partialComponents = [{ ...original, eatenFraction: 0.5 }];
    const updated = updateDraftComponents(draft, partialComponents, NOW);
    const { log } = buildAcceptResult(updated, nextId('log'), LATER);
    expect(log.calories).toBeCloseTo(300);
  });

  it('excluded component contributes zero calories to the accepted log', () => {
    const components = [
      makeComponent({ calories: 300, included: true, eatenFraction: 1 }),
      makeComponent({ calories: 200, included: false, eatenFraction: 1 }),
    ];
    const draft = makeDraft({ components });
    const updated = updateDraftComponents(draft, components, NOW);
    const { log } = buildAcceptResult(updated, nextId('log'), LATER);
    expect(log.calories).toBeCloseTo(300);
  });
});

// ---------------------------------------------------------------------------
// updateRepeatPatterns — repeat-pattern tracking
// ---------------------------------------------------------------------------

describe('updateRepeatPatterns', () => {
  it('first acceptance of a unique meal creates a new repeat pattern with useCount=1', () => {
    const draft = makeDraft({ title: 'Grilled Chicken' });
    const { log, memory } = buildAcceptResult(draft, nextId('log'), LATER);
    const patterns = updateRepeatPatterns([], memory, log, nextId('repeat'), LATER);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].title).toBe('Grilled Chicken');
    expect(patterns[0].useCount).toBe(1);
    expect(patterns[0].rejectedCount).toBe(0);
  });

  it('second acceptance of the same meal increments useCount', () => {
    const draft = makeDraft({ title: 'Grilled Chicken' });
    const { log: l1, memory: m1 } = buildAcceptResult(draft, nextId('log'), LATER);
    let patterns = updateRepeatPatterns([], m1, l1, nextId('repeat'), LATER);

    const { log: l2, memory: m2 } = buildAcceptResult(draft, nextId('log'), LATER);
    patterns = updateRepeatPatterns(patterns, m2, l2, nextId('repeat'), LATER);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].useCount).toBe(2);
  });

  it('second acceptance updates lastAcceptedAt and sourceMemoryId', () => {
    const draft = makeDraft({ title: 'Oatmeal' });
    const { log: l1, memory: m1 } = buildAcceptResult(draft, nextId('log'), NOW);
    let patterns = updateRepeatPatterns([], m1, l1, nextId('repeat'), NOW);

    const draft2 = { ...draft, id: nextId('draft') };
    const { log: l2, memory: m2 } = buildAcceptResult(draft2, nextId('log'), LATER);
    patterns = updateRepeatPatterns(patterns, m2, l2, nextId('repeat'), LATER);

    expect(patterns[0].lastAcceptedAt).toBe(LATER);
    expect(patterns[0].sourceMemoryId).toBe(m2.id);
  });

  it('two meals with different components produce separate patterns', () => {
    const d1 = makeDraft({ title: 'Oatmeal', components: [makeComponent({ name: 'Oatmeal' })] });
    const d2 = makeDraft({ title: 'Eggs', components: [makeComponent({ name: 'Scrambled eggs' })] });

    const { log: l1, memory: m1 } = buildAcceptResult(d1, nextId('log'), LATER);
    let patterns = updateRepeatPatterns([], m1, l1, nextId('repeat'), LATER);

    const { log: l2, memory: m2 } = buildAcceptResult(d2, nextId('log'), LATER);
    patterns = updateRepeatPatterns(patterns, m2, l2, nextId('repeat'), LATER);

    expect(patterns).toHaveLength(2);
  });

  it('new pattern stores component names from included components only', () => {
    const components = [
      makeComponent({ name: 'Rice', included: true }),
      makeComponent({ name: 'Sauce', included: false }),
    ];
    const draft = makeDraft({ title: 'Rice Bowl', components });
    const { log, memory } = buildAcceptResult(draft, nextId('log'), LATER);
    const patterns = updateRepeatPatterns([], memory, log, nextId('repeat'), LATER);
    expect(patterns[0].componentNames).toContain('Rice');
    expect(patterns[0].componentNames).not.toContain('Sauce');
  });

  it('does not mutate the original patterns array', () => {
    const original: RepeatPattern[] = [];
    const draft = makeDraft();
    const { log, memory } = buildAcceptResult(draft, nextId('log'), LATER);
    updateRepeatPatterns(original, memory, log, nextId('repeat'), LATER);
    expect(original).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// deriveThemeMode — dark-mode derivation
// ---------------------------------------------------------------------------

describe('deriveThemeMode', () => {
  it('"dark" preference returns dark regardless of system', () => {
    expect(deriveThemeMode('dark', 'light')).toBe('dark');
    expect(deriveThemeMode('dark', 'dark')).toBe('dark');
  });

  it('"light" preference returns light regardless of system', () => {
    expect(deriveThemeMode('light', 'dark')).toBe('light');
    expect(deriveThemeMode('light', 'light')).toBe('light');
  });

  it('"system" defers to the OS scheme', () => {
    expect(deriveThemeMode('system', 'dark')).toBe('dark');
    expect(deriveThemeMode('system', 'light')).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// No silent diary insertion
// ---------------------------------------------------------------------------

describe('no silent diary insertion', () => {
  it('captureAnalysisToDraft creates a draft with status="draft", not a log', () => {
    const analysis = {
      sessionId: 'sess-1',
      mode: 'text' as const,
      status: 'review' as const,
      title: 'Oatmeal',
      reviewMessage: 'Review before adding.',
      provider: 'AI',
      candidates: [
        {
          id: 'c1', name: 'Oatmeal', brand: null, serving: '1 cup',
          calories: 150, proteinG: 5, carbsG: 27, fatG: 2.5,
          confidence: 78, provenance: 'Text estimate', sourceLabel: 'AI', editable: true,
        },
      ],
      assumptions: [],
      reviewQuestions: [],
    };
    const draft = captureAnalysisToDraft(analysis, '2026-08-06', 'Breakfast', NOW);
    expect(draft.status).toBe('draft');
    // FoodLog-specific keys must not be present
    expect(draft).not.toHaveProperty('protein');
    expect(draft).not.toHaveProperty('diaryLogId');
  });

  it('buildRejectDraft produces no log — only a draft mutation', () => {
    const draft = makeDraft();
    const result = buildRejectDraft(draft, LATER);
    // Confirm the result is a FoodMemoryDraft (has draft.status) and not a log
    expect(result.status).toBe('rejected');
    expect(result).not.toHaveProperty('protein');
  });

  it('a rejected draft (status !== "draft") is excluded from the accept guard', () => {
    const draft = makeDraft();
    const rejected = buildRejectDraft(draft, LATER);
    // The CaloraContext guard: find draft where status === 'draft'
    const searchable = [rejected];
    const found = searchable.find((d) => d.id === rejected.id && d.status === 'draft');
    expect(found).toBeUndefined();
  });

  it('only included components affect accepted log calories (multi-component)', () => {
    const components = [
      makeComponent({ calories: 300, included: true, eatenFraction: 1 }),
      makeComponent({ calories: 200, included: false, eatenFraction: 1 }),
    ];
    const draft = makeDraft({ components });
    const updated = updateDraftComponents(draft, components, NOW);
    const { log } = buildAcceptResult(updated, nextId('log'), LATER);
    expect(log.calories).toBeCloseTo(300);
  });
});

// ---------------------------------------------------------------------------
// Accessibility labels — static source invariants
// ---------------------------------------------------------------------------

describe('accessibility labels — static invariants', () => {
  const SCAN_SOURCE_PATH = resolve(__dirname, '../../app/(tabs)/scan.tsx');
  let scanSource = '';

  beforeAll(() => {
    scanSource = readFileSync(SCAN_SOURCE_PATH, 'utf8');
  });

  it('"Approve and add meal to diary" label is present in scan screen', () => {
    expect(scanSource).toContain('Approve and add meal to diary');
  });

  it('"Discard food review" label is present in scan screen', () => {
    expect(scanSource).toContain('Discard food review');
  });

  it('"Decrease" portion label is present in scan screen', () => {
    expect(scanSource).toContain('Decrease');
  });

  it('"Increase" portion label is present in scan screen', () => {
    expect(scanSource).toContain('Increase');
  });

  it('"Serving for" serving-input label is present in scan screen', () => {
    expect(scanSource).toContain('Serving for');
  });

  it('"Remove from meal" and "Include in meal" toggle labels are present', () => {
    expect(scanSource).toContain('Remove from meal');
    expect(scanSource).toContain('Include in meal');
  });

  it('approve and reject labels are on Pressable elements (accessibilityLabel prop)', () => {
    expect(scanSource).toMatch(/accessibilityLabel="Approve and add meal to diary"/);
    expect(scanSource).toMatch(/accessibilityLabel="Discard food review"/);
  });

  it('switches the camera to video before recording Voice and restores picture capture', () => {
    expect(scanSource).toContain("const [cameraMode, setCameraMode] = useState<CameraMode>('picture')");
    expect(scanSource).toContain('mode={cameraMode}');
    expect(scanSource).toMatch(/setCameraMode\('video'\);\s+setVoiceRecording\(true\)/);
    expect(scanSource).toMatch(/finally \{[\s\S]*setVoiceRecording\(false\);[\s\S]*setCameraMode\('picture'\)/);
  });

  it('pauses barcode scanning while the camera is recording video', () => {
    expect(scanSource).toContain("cameraMode === 'video' || mode === 'food' || mode === 'label' ? undefined : onBarcodeScanned");
  });

  it('recovers cleanly when native photo capture throws', () => {
    expect(scanSource).toMatch(/try \{\s*const photo = await cameraRef\.current\.takePictureAsync/);
    expect(scanSource).toMatch(/catch \(error\) \{[\s\S]*setHasScanned\(false\);[\s\S]*Photo unavailable/);
  });

  it('recovers cleanly when the image library fails and preserves explicit capture intent', () => {
    expect(scanSource).toMatch(/const choosePhoto = async \(requestedMode\?: 'receipt' \| 'food' \| 'nutrition_label'\)/);
    expect(scanSource).toMatch(/catch \(error\) \{[\s\S]*setHasScanned\(false\);[\s\S]*could not open that image/);
    expect(scanSource).toContain("void choosePhoto('receipt')");
  });
});
