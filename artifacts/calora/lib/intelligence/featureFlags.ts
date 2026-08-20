export const intelligenceFeatureFlags = {
  'intelligence.foundation.enabled': true,
  'intelligence.facts.local_adapter': true,
  'intelligence.facts.server_adapter': false,
  'intelligence.insights.today': false,
  'intelligence.insights.post_log': false,
  'intelligence.insights.progress': false,
  'intelligence.coach.fact_context': false,
  'intelligence.evidence.display': false,
  'intelligence.observability': false,
  'intelligence.feedback': false,
  'intelligence.proactive': false,
} as const;

export type IntelligenceFeatureFlag = keyof typeof intelligenceFeatureFlags;

export function isIntelligenceFeatureEnabled(flag: IntelligenceFeatureFlag): boolean {
  return intelligenceFeatureFlags[flag];
}