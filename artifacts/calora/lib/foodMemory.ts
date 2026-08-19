import type { CaptureAnalysis, CaptureComponent } from '@workspace/api-client-react';
import {
  normalizeFoodImageMetadata,
  normalizeFoodImageUrl,
  type FoodImageSource,
} from '@/lib/foodImageMetadata';

export const FOOD_MEMORY_SCHEMA_VERSION = 1;

export type FoodMemoryInputType = 'barcode' | 'photo' | 'nutrition_label' | 'text' | 'voice' | 'receipt' | 'recipe' | 'saved_meal' | 'repeat' | 'manual' | 'planner';
export type FoodMemoryStatus = 'draft' | 'accepted' | 'rejected';
export type FoodMemoryProvenance = 'verified_barcode' | 'verified_label' | 'verified_provider' | 'photo_estimate' | 'personal_history' | 'recipe_imported' | 'recipe_personal' | 'manual' | 'planner_estimate';
export type ImageRetentionState = 'not_collected' | 'delete_after_analysis' | 'local_only' | 'retained_with_consent';

export type NutritionSnapshot = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  capturedAt: string;
};

export type ConfidenceDimensions = {
  identity: number;
  portion: number;
  nutritionSource: number;
  preparation: number;
};

export type FoodMemoryComponent = {
  id: string;
  name: string;
  brand?: string | null;
  serving: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparation?: string;
  included: boolean;
  eatenFraction: number;
  provenance: FoodMemoryProvenance;
  sourceLabel: string;
  confidence: number;
  confidenceDimensions: ConfidenceDimensions;
  assumptions: string[];
  reviewQuestions: string[];
  nutritionRange?: { caloriesLow: number; caloriesHigh: number };
  imageUrl?: string;
};

export type FoodMemoryDraft = {
  id: string;
  /**
   * Server-issued capture session id (UUID) when this draft came from an
   * authenticated capture analysis persisted server-side. Locally derived
   * drafts (manual, recipe, planner, anonymous captures) never carry one.
   * Referral qualification syncs only logs with this explicit provenance.
   */
  captureSessionId?: string;
  schemaVersion: number;
  inputType: FoodMemoryInputType;
  status: FoodMemoryStatus;
  title: string;
  date: string;
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  components: FoodMemoryComponent[];
  nutrition: NutritionSnapshot;
  originalNutrition: NutritionSnapshot;
  provenance: FoodMemoryProvenance;
  sourceLabel: string;
  confidence: number;
  confidenceDimensions: ConfidenceDimensions;
  assumptions: string[];
  reviewQuestions: string[];
  imageRetention: ImageRetentionState;
  createdAt: string;
  updatedAt: string;
  correctionIds: string[];
  plannerMealId?: string;
  sourceRecipeId?: string;
  imageUrl?: string;
  imageSource?: FoodImageSource;
};

export type AcceptedFoodMemory = FoodMemoryDraft & {
  status: 'accepted';
  acceptedAt: string;
  diaryLogId: string;
};

export type FoodMemoryCorrection = {
  id: string;
  memoryId: string;
  componentId?: string;
  kind: 'serving' | 'component_added' | 'component_removed' | 'component_replaced' | 'preparation' | 'eaten_fraction' | 'repeat_feedback';
  from: string;
  to: string;
  createdAt: string;
};

export type RepeatPattern = {
  id: string;
  signature: string;
  title: string;
  componentNames: string[];
  serving: string;
  useCount: number;
  rejectedCount: number;
  lastAcceptedAt: string;
  sourceMemoryId: string;
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

export function provenanceForCapture(value: string, inputType: FoodMemoryInputType): FoodMemoryProvenance {
  if (value === 'Barcode verified') return 'verified_barcode';
  if (value === 'USDA verified' || value === 'Brand verified') return 'verified_provider';
  if (value === 'Nutrition label') return 'verified_label';
  if (inputType === 'nutrition_label') return 'verified_label';
  if (inputType === 'recipe') return 'recipe_imported';
  if (inputType === 'planner') return 'planner_estimate';
  if (inputType === 'manual') return 'manual';
  return 'photo_estimate';
}

export function nutritionForComponents(components: FoodMemoryComponent[], capturedAt = new Date().toISOString()): NutritionSnapshot {
  const total = components.reduce((sum, component) => {
    const multiplier = component.included ? clamp(component.eatenFraction, 0, 1) : 0;
    return {
      calories: sum.calories + component.calories * multiplier,
      proteinG: sum.proteinG + component.proteinG * multiplier,
      carbsG: sum.carbsG + component.carbsG * multiplier,
      fatG: sum.fatG + component.fatG * multiplier,
    };
  }, { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  return { ...total, capturedAt };
}

export function confidenceForComponents(components: FoodMemoryComponent[]): { confidence: number; dimensions: ConfidenceDimensions } {
  const included = components.filter((component) => component.included);
  if (!included.length) return { confidence: 0, dimensions: { identity: 0, portion: 0, nutritionSource: 0, preparation: 0 } };
  const average = (key: keyof ConfidenceDimensions) => Math.round(included.reduce((sum, component) => sum + component.confidenceDimensions[key], 0) / included.length);
  const dimensions = {
    identity: average('identity'),
    portion: average('portion'),
    nutritionSource: average('nutritionSource'),
    preparation: average('preparation'),
  };
  return { confidence: Math.min(dimensions.identity, dimensions.portion, dimensions.nutritionSource, dimensions.preparation), dimensions };
}

function componentFromCapture(component: CaptureComponent, inputType: FoodMemoryInputType): FoodMemoryComponent {
  const provenance = provenanceForCapture(component.provenance, inputType);
  const dimensions = component.confidenceDimensions ?? {
    identity: component.confidence,
    portion: component.confidence,
    nutritionSource: component.confidence,
    preparation: component.confidence,
  };
  return {
    id: component.componentId || component.id,
    name: component.name,
    brand: component.brand,
    serving: component.serving,
    calories: component.calories,
    proteinG: component.proteinG,
    carbsG: component.carbsG,
    fatG: component.fatG,
    preparation: component.preparation ?? undefined,
    included: component.included,
    eatenFraction: clamp(component.eatenFraction, 0, 1),
    provenance,
    sourceLabel: component.sourceLabel,
    confidence: component.confidence,
    confidenceDimensions: dimensions,
    assumptions: component.assumptions ?? [],
    reviewQuestions: component.reviewQuestions ?? [],
    nutritionRange: component.nutritionRange,
    imageUrl: normalizeFoodImageUrl(component.imageUrl),
  };
}

function captureInputType(mode: string): FoodMemoryInputType {
  if (mode === 'barcode') return 'barcode';
  if (mode === 'nutrition_label') return 'nutrition_label';
  if (mode === 'text') return 'text';
  if (mode === 'voice') return 'voice';
  if (mode === 'receipt') return 'receipt';
  return 'photo';
}

function captureImageRetention(inputType: FoodMemoryInputType): ImageRetentionState {
  if (inputType === 'photo' || inputType === 'nutrition_label') return 'delete_after_analysis';
  return 'not_collected';
}

export function captureAnalysisToDraft(
  analysis: CaptureAnalysis,
  date: string,
  meal: FoodMemoryDraft['meal'],
  now = new Date().toISOString(),
): FoodMemoryDraft {
  const inputType = captureInputType(analysis.mode);
  const rawComponents = analysis.components?.length ? analysis.components : analysis.candidates.map((candidate) => ({
    ...candidate,
    componentId: candidate.id,
    included: true,
    eatenFraction: 1,
    confidenceDimensions: {
      identity: candidate.confidence,
      portion: candidate.confidence,
      nutritionSource: candidate.confidence,
      preparation: candidate.confidence,
    },
  }));
  const components = rawComponents.map((component) => componentFromCapture(component, inputType));
  const imageUrl = components.map((component) => component.imageUrl).find(Boolean);
  const nutrition = nutritionForComponents(components, now);
  const confidence = confidenceForComponents(components);
  const provenance = components[0]?.provenance ?? 'photo_estimate';
  // Only a server-issued session id (UUID) marks capture provenance; local
  // fallback/client session ids never qualify a referral.
  const captureSessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    analysis.sessionId,
  )
    ? analysis.sessionId
    : undefined;
  return {
    id: `memory-draft-${analysis.sessionId}`,
    captureSessionId,
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType,
    status: 'draft',
    title: analysis.title,
    date,
    meal,
    components,
    nutrition,
    originalNutrition: { ...nutrition },
    provenance,
    sourceLabel: analysis.provider,
    confidence: confidence.confidence,
    confidenceDimensions: confidence.dimensions,
    assumptions: analysis.assumptions ?? components.flatMap((component) => component.assumptions),
    reviewQuestions: analysis.reviewQuestions ?? components.flatMap((component) => component.reviewQuestions),
    imageRetention: captureImageRetention(inputType),
    createdAt: now,
    updatedAt: now,
    correctionIds: [],
    imageUrl,
    imageSource: imageUrl ? 'provider' : undefined,
  };
}

export function sourceComponentsToDraft(input: {
  inputType: FoodMemoryInputType;
  title: string;
  date: string;
  meal: FoodMemoryDraft['meal'];
  components: FoodMemoryComponent[];
  sourceLabel: string;
  provenance: FoodMemoryProvenance;
  assumptions?: string[];
  reviewQuestions?: string[];
  imageUrl?: string | null;
  imageSource?: FoodImageSource;
  now?: string;
}): FoodMemoryDraft {
  const now = input.now ?? new Date().toISOString();
  const components = input.components.map((component) => ({
    ...component,
    imageUrl: normalizeFoodImageUrl(component.imageUrl),
  }));
  const nutrition = nutritionForComponents(components, now);
  const confidence = confidenceForComponents(components);
  const directImage = normalizeFoodImageMetadata(input.imageUrl, input.imageSource);
  const imageUrl = directImage.imageUrl
    ?? components.map((component) => component.imageUrl).find(Boolean);
  return {
    id: `memory-draft-${input.inputType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType: input.inputType,
    status: 'draft',
    title: input.title,
    date: input.date,
    meal: input.meal,
    components,
    nutrition,
    originalNutrition: { ...nutrition },
    provenance: input.provenance,
    sourceLabel: input.sourceLabel,
    confidence: confidence.confidence,
    confidenceDimensions: confidence.dimensions,
    assumptions: input.assumptions ?? [],
    reviewQuestions: input.reviewQuestions ?? [],
    imageRetention: 'not_collected',
    createdAt: now,
    updatedAt: now,
    correctionIds: [],
    imageUrl,
    imageSource: imageUrl ? (directImage.imageSource ?? 'provider') : undefined,
  };
}

export function updateDraftComponents(draft: FoodMemoryDraft, components: FoodMemoryComponent[], now = new Date().toISOString()): FoodMemoryDraft {
  const normalizedComponents = components.map((component) => ({
    ...component,
    imageUrl: normalizeFoodImageUrl(component.imageUrl),
  }));
  const confidence = confidenceForComponents(normalizedComponents);
  const currentImage = normalizeFoodImageMetadata(draft.imageUrl, draft.imageSource);
  const imageUrl = currentImage.imageUrl
    ?? normalizedComponents.map((component) => component.imageUrl).find(Boolean);
  return {
    ...draft,
    components: normalizedComponents,
    nutrition: nutritionForComponents(normalizedComponents, now),
    confidence: confidence.confidence,
    confidenceDimensions: confidence.dimensions,
    reviewQuestions: normalizedComponents.flatMap((component) => component.reviewQuestions).slice(0, 8),
    imageUrl,
    imageSource: imageUrl ? (currentImage.imageSource ?? 'provider') : undefined,
    updatedAt: now,
  };
}

export function memorySignature(memory: Pick<FoodMemoryDraft, 'title' | 'components'>): string {
  const parts = memory.components.filter((component) => component.included).map((component) => component.name.trim().toLowerCase().replace(/\s+/g, ' ')).sort();
  return [memory.title.trim().toLowerCase().replace(/\s+/g, ' '), ...parts].join('|');
}

export function recipeToDraft(
  recipe: { id: string; name: string; calories?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; source: string; isLocal?: boolean; image?: string | null },
  date: string,
  meal: FoodMemoryDraft['meal'],
  now = new Date().toISOString(),
): FoodMemoryDraft {
  const inputType: FoodMemoryInputType = 'recipe';
  const provenance: FoodMemoryProvenance = recipe.isLocal ? 'recipe_personal' : 'recipe_imported';
  const confidence = recipe.isLocal ? 92 : 68;
  const imageUrl = normalizeFoodImageUrl(recipe.image);
  const component: FoodMemoryComponent = {
    id: `${recipe.id}-component`,
    name: recipe.name,
    serving: '1 recipe serving',
    calories: recipe.calories ?? 0,
    proteinG: recipe.proteinG ?? 0,
    carbsG: recipe.carbsG ?? 0,
    fatG: recipe.fatG ?? 0,
    included: true,
    eatenFraction: 1,
    provenance,
    sourceLabel: recipe.source,
    confidence,
    confidenceDimensions: { identity: confidence, portion: confidence, nutritionSource: confidence, preparation: confidence },
    assumptions: [],
    reviewQuestions: recipe.isLocal ? [] : ['Confirm the serving size matches your actual portion.'],
  };
  const nutrition = nutritionForComponents([component], now);
  return {
    id: `memory-draft-recipe-${recipe.id}`,
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType,
    status: 'draft',
    title: recipe.name,
    date,
    meal,
    components: [component],
    nutrition,
    originalNutrition: { ...nutrition },
    provenance,
    sourceLabel: recipe.source,
    confidence,
    confidenceDimensions: component.confidenceDimensions,
    assumptions: recipe.isLocal ? [] : [`Open-source recipe from ${recipe.source}. Nutrition may vary by preparation.`],
    reviewQuestions: component.reviewQuestions,
    imageRetention: 'not_collected',
    createdAt: now,
    updatedAt: now,
    correctionIds: [],
    sourceRecipeId: recipe.id,
    imageUrl,
    imageSource: imageUrl ? 'recipe' : undefined,
  };
}
export function migrateFoodMemories(saved: Partial<{
  foodDrafts: FoodMemoryDraft[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
  memoryCorrections: FoodMemoryCorrection[];
}> | undefined, logs: Array<{ id: string; name: string; date: string; meal: FoodMemoryDraft['meal']; calories: number; protein: number; carbs: number; fat: number; source: string; confidence: number; serving: string; time: string }>): {
  foodDrafts: FoodMemoryDraft[];
  foodMemories: AcceptedFoodMemory[];
  repeatPatterns: RepeatPattern[];
  memoryCorrections: FoodMemoryCorrection[];
} {
  if (saved?.foodMemories?.length) {
    return {
      foodDrafts: saved.foodDrafts ?? [],
      foodMemories: saved.foodMemories,
      repeatPatterns: saved.repeatPatterns ?? [],
      memoryCorrections: saved.memoryCorrections ?? [],
    };
  }
  const now = new Date().toISOString();
  const memories: AcceptedFoodMemory[] = logs.map((log) => {
    const component: FoodMemoryComponent = {
      id: `${log.id}-component`,
      name: log.name,
      serving: log.serving || '1 serving',
      calories: log.calories,
      proteinG: log.protein,
      carbsG: log.carbs,
      fatG: log.fat,
      included: true,
      eatenFraction: 1,
      provenance: provenanceForCapture(log.source, log.source === 'Manual' ? 'manual' : 'text'),
      sourceLabel: log.source,
      confidence: log.confidence,
      confidenceDimensions: { identity: log.confidence, portion: log.confidence, nutritionSource: log.confidence, preparation: log.confidence },
      assumptions: [],
      reviewQuestions: [],
    };
    const nutrition = nutritionForComponents([component], now);
    return {
      id: `memory-${log.id}`,
      schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
      inputType: (log.source === 'Recipe' ? 'recipe' : log.source === 'Manual' ? 'manual' : 'text') as FoodMemoryInputType,
      status: 'accepted' as const,
      title: log.name,
      date: log.date,
      meal: log.meal,
      components: [component],
      nutrition,
      originalNutrition: { ...nutrition },
      provenance: component.provenance,
      sourceLabel: log.source,
      confidence: log.confidence,
      confidenceDimensions: component.confidenceDimensions,
      assumptions: [],
      reviewQuestions: [],
      imageRetention: 'not_collected' as const,
      createdAt: now,
      updatedAt: now,
      acceptedAt: now,
      diaryLogId: log.id,
      correctionIds: [],
    };
  });
  return { foodDrafts: [], foodMemories: memories, repeatPatterns: [], memoryCorrections: [] };
}

export function plannerMealToDraft(
  meal: { id: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; meal: FoodMemoryDraft['meal']; day: string; image?: string | null },
  now = new Date().toISOString(),
): FoodMemoryDraft {
  const inputType: FoodMemoryInputType = 'planner';
  const provenance: FoodMemoryProvenance = 'planner_estimate';
  const confidence = 72;
  const imageUrl = normalizeFoodImageUrl(meal.image);
  const component: FoodMemoryComponent = {
    id: `${meal.id}-component`,
    name: meal.name,
    serving: '1 planned serving',
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
    included: true,
    eatenFraction: 1,
    provenance,
    sourceLabel: 'Weekly planner',
    confidence,
    confidenceDimensions: { identity: confidence, portion: confidence, nutritionSource: confidence, preparation: confidence },
    assumptions: ['Planned meal — actual portion may differ.'],
    reviewQuestions: ['Did you eat the full planned portion?'],
  };
  const nutrition = nutritionForComponents([component], now);
  return {
    id: `memory-draft-planner-${meal.id}`,
    schemaVersion: FOOD_MEMORY_SCHEMA_VERSION,
    inputType,
    status: 'draft',
    title: meal.name,
    date: meal.day,
    meal: meal.meal,
    components: [component],
    nutrition,
    originalNutrition: { ...nutrition },
    provenance,
    sourceLabel: 'Weekly planner',
    confidence,
    confidenceDimensions: component.confidenceDimensions,
    assumptions: [`Planned for ${meal.day}. Logged portion may differ from plan.`],
    reviewQuestions: ['Did you eat the full planned portion?'],
    imageRetention: 'not_collected',
    createdAt: now,
    updatedAt: now,
    correctionIds: [],
    plannerMealId: meal.id,
    imageUrl,
    imageSource: imageUrl ? 'planner' : undefined,
  };
}
