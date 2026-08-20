import type {
  ActivityLog,
  ActivityMinutesLog,
  CaloraRecipe,
  FoodLog,
  MoodLog,
  Profile,
  ShoppingItem,
  WeightEntry,
  WaterLog,
} from '@/context/CaloraContext';
import type { PlannerMeal } from '@workspace/api-client-react';

export const INTELLIGENCE_CALCULATION_VERSION = 'nutrition-facts-v1' as const;

export type EvidenceOrigin =
  | 'verified'
  | 'provider'
  | 'barcode'
  | 'nutrition_label'
  | 'manual'
  | 'user_corrected'
  | 'food_memory'
  | 'recipe_estimate'
  | 'ai_estimate'
  | 'derived'
  | 'unknown';

export type EvidenceQuality = 'strong' | 'moderate' | 'estimated' | 'unknown';
export type InsightConfidence = 'high' | 'medium' | 'low' | 'insufficient';
export type FreshnessState = 'fresh' | 'stale' | 'expired' | 'unknown';
export type MissingDataKind =
  | 'missing_profile'
  | 'missing_target'
  | 'missing_weight'
  | 'missing_macros'
  | 'unknown_provenance'
  | 'incomplete_day'
  | 'insufficient_history';

export type IntelligenceEvidence = {
  origin: EvidenceOrigin;
  quality: EvidenceQuality;
  count: number;
  logIds: string[];
};

export type SourceWatermark = {
  value: string;
  algorithm: 'fnv1a-v1';
  inputVersion: 1;
};

export type FactTimeWindow = {
  start: string;
  end: string;
  timezone: string;
  dayBoundary: 'local-calendar-day';
};

export type IntelligenceFactValue = number | string | boolean | Record<string, number | string | boolean | null>;

export type IntelligenceFact = {
  id: string;
  factType: string;
  value: IntelligenceFactValue;
  unit: string | null;
  timeWindow: FactTimeWindow;
  generatedAt: string;
  validFrom: string;
  validUntil: string | null;
  calculationVersion: typeof INTELLIGENCE_CALCULATION_VERSION;
  sourceWatermark: SourceWatermark;
  confidence: InsightConfidence;
  evidence: IntelligenceEvidence[];
  freshness: FreshnessState;
  missingData: MissingDataKind[];
};

export type InsightStatus = 'candidate' | 'active' | 'suppressed' | 'expired' | 'invalidated';

export type InsightCandidate = {
  type: string;
  priority: number;
  confidence: InsightConfidence;
  evidenceReferences: string[];
  factReferences: string[];
  validFrom: string;
  validUntil: string | null;
  recommendedSurface: 'today' | 'post_log' | 'progress' | 'planner' | 'recipes' | 'coach';
  status: InsightStatus;
};

export type InvalidationReason =
  | 'food_added'
  | 'food_updated'
  | 'food_deleted'
  | 'goal_changed'
  | 'target_changed'
  | 'weight_changed'
  | 'timezone_changed'
  | 'fact_relevant_preference_changed'
  | 'planner_changed'
  | 'source_refreshed'
  | 'day_boundary_changed';

export type IntelligenceFactFamily =
  | 'daily_nutrition'
  | 'meal_distribution'
  | 'logging_completeness'
  | 'weight_baselines'
  | 'planner';

export type InsightInvalidationEvent = {
  reason: InvalidationReason;
  occurredAt: string;
  previousWatermark?: SourceWatermark;
  nextWatermark?: SourceWatermark;
  affectedFactFamilies: IntelligenceFactFamily[];
  requiresRecomputation: boolean;
};

export type IntelligenceContext = {
  date: string;
  timezone: string;
  dayBoundary: 'local-calendar-day';
  foodLogs: readonly FoodLog[];
  profile: Profile | null;
  weights: readonly WeightEntry[];
  waterLogs: Readonly<WaterLog>;
  moodLogs: Readonly<MoodLog>;
  activityLogs: Readonly<ActivityLog>;
  activityMinutesLogs: Readonly<ActivityMinutesLog>;
  planner: readonly PlannerMeal[];
  shopping: readonly ShoppingItem[];
  recipes: readonly CaloraRecipe[];
  /** Current-day active energy only when the caller has a fresh Health snapshot. */
  activeEnergyKcal: number | null;
  sourceVersion: typeof INTELLIGENCE_CALCULATION_VERSION;
  missingData: MissingDataKind[];
};

export type IntelligenceObservabilityEvent = {
  kind: 'facts_generated' | 'facts_invalidated' | 'facts_failed';
  calculationVersion: typeof INTELLIGENCE_CALCULATION_VERSION;
  sourceWatermark?: string;
  durationMs?: number;
  invalidationReason?: InvalidationReason;
  confidenceCounts?: Partial<Record<InsightConfidence, number>>;
  evidenceCounts?: Partial<Record<EvidenceOrigin, number>>;
  missingData?: MissingDataKind[];
  featureFlags: Record<string, boolean>;
};

export type IntelligencePerformanceSample = {
  operation: 'context_adaptation' | 'evidence_partitioning' | 'confidence_computation' | 'watermark_generation' | 'fact_generation';
  durationMs: number;
};