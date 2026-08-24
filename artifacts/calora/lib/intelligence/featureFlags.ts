export const intelligenceFeatureFlags = {
  'intelligence.foundation.enabled': true,
  'intelligence.facts.local_adapter': true,
  'intelligence.facts.server_adapter': false,
  // Approved, narrowly scoped delivery: Today may render one actionable,
  // current-day selector result after hydration. It never retains output and
  // excludes descriptive weight-baseline context reserved for Progress.
  'intelligence.insights.today': true,
  'intelligence.insights.post_log': true,
  // Approved, narrowly scoped delivery: the Progress tab may render one
  // current-account, local selector result after hydration. All other
  // delivery, network, Coach, feedback, and proactive paths remain disabled.
  'intelligence.insights.progress': true,
  // Phase 2A.3 is intentionally dark until its dedicated rollout approval.
  'intelligence.insights.progress_weight_trend': false,
  'intelligence.insights.progress_nutrition_coverage': false,
  'intelligence.insights.progress_macro_record_coverage': false,
  // The explicit consent surface is available before the dark server path.
  // Provider access remains independently deny-all until every server gate is
  // authorized for the reviewed pilot.
  'intelligence.coach.fact_context': true,
  'intelligence.evidence.display': false,
  'intelligence.observability': false,
  'intelligence.feedback': false,
  'intelligence.proactive': false,
} as const;

export type IntelligenceFeatureFlag = keyof typeof intelligenceFeatureFlags;

export function isIntelligenceFeatureEnabled(flag: IntelligenceFeatureFlag): boolean {
  return intelligenceFeatureFlags[flag];
}