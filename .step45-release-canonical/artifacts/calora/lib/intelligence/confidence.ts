import type { IntelligenceEvidence, InsightConfidence, MissingDataKind } from './types';
import { measureIntelligenceOperation } from './observability';

/**
 * Confidence is intentionally categorical and explainable:
 * - insufficient: no logged food evidence, missing target, or unknown sources;
 * - low: estimated inputs are the majority;
 * - medium: at least one non-estimated source, but mixed/partial evidence;
 * - high: all entries are strong evidence or explicit user corrections.
 */
export function confidenceForEvidence(
  evidence: readonly IntelligenceEvidence[],
  missingData: readonly MissingDataKind[],
): InsightConfidence {
  return measureIntelligenceOperation('confidence_computation', () => {
    const total = evidence.reduce((sum, item) => sum + item.count, 0);
    if (
      total === 0
      || missingData.includes('missing_target')
      || missingData.includes('unknown_provenance')
      || evidence.some((item) => item.quality === 'unknown')
    ) {
      return 'insufficient';
    }
    const estimated = evidence
      .filter((item) => item.quality === 'estimated')
      .reduce((sum, item) => sum + item.count, 0);
    if (estimated / total > 0.5) return 'low';
    const allStrong = evidence.every((item) => item.quality === 'strong');
    return allStrong ? 'high' : 'medium';
  }).value;
}