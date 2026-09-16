import type { FoodLog } from '@/context/CaloraContext';
import type { EvidenceOrigin, EvidenceQuality, IntelligenceEvidence } from './types';
import { measureIntelligenceOperation } from './observability';

const QUALITY_BY_ORIGIN: Record<EvidenceOrigin, EvidenceQuality> = {
  verified: 'strong',
  provider: 'strong',
  barcode: 'strong',
  nutrition_label: 'strong',
  user_corrected: 'strong',
  manual: 'moderate',
  food_memory: 'moderate',
  recipe_estimate: 'estimated',
  ai_estimate: 'estimated',
  derived: 'moderate',
  unknown: 'unknown',
};

/**
 * User corrections take precedence over the original source because they are
 * the user's explicit, current statement. Provider and label evidence remain
 * distinct rather than being collapsed into a generic "verified" bucket.
 */
export function evidenceOriginForLog(log: FoodLog): EvidenceOrigin {
  switch (log.source as string) {
    case 'USDA verified':
    case 'Brand verified':
      return 'provider';
    case 'Barcode verified':
      return 'barcode';
    case 'Nutrition label':
      return 'nutrition_label';
    case 'Manual':
      return 'manual';
    case 'Recipe':
      return 'recipe_estimate';
    case 'Photo estimate':
      return 'ai_estimate';
    default:
      return 'unknown';
  }
}

export function evidenceQualityForOrigin(origin: EvidenceOrigin): EvidenceQuality {
  return QUALITY_BY_ORIGIN[origin];
}

export function collectEvidence(logs: readonly FoodLog[]): IntelligenceEvidence[] {
  return measureIntelligenceOperation('evidence_partitioning', () => {
    const byOrigin = new Map<EvidenceOrigin, IntelligenceEvidence>();
    for (const log of logs) {
      const origin = evidenceOriginForLog(log);
      const current = byOrigin.get(origin) ?? {
        origin,
        quality: evidenceQualityForOrigin(origin),
        count: 0,
        logIds: [],
      };
      current.count += 1;
      current.logIds.push(log.id);
      byOrigin.set(origin, current);
    }
    return [...byOrigin.values()].sort((left, right) => left.origin.localeCompare(right.origin));
  }).value;
}