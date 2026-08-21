import { selectContextualInsight } from './insightSelector';
import type { ContextualInsight, IntelligenceFact } from './types';

/**
 * The only approved visible-delivery gate for the local selector.
 *
 * It retains nothing: callers receive a value for the current render or null.
 * In particular, hydration reset must pass `hydrated: false`, which clears any
 * previously rendered result before a different account can hydrate.
 */
export function selectVisibleLocalInsight(
  facts: readonly IntelligenceFact[],
  options: { hydrated: boolean; enabled: boolean },
): ContextualInsight | null {
  if (!options.hydrated || !options.enabled) return null;

  try {
    const insight = selectContextualInsight(facts);
    return insight.state === 'active' && insight.freshness === 'fresh' ? insight : null;
  } catch {
    // Intelligence is optional UI context. A malformed local snapshot must
    // never make the Progress screen unavailable or retry indefinitely.
    return null;
  }
}

/**
 * Today shares the canonical local selector with Progress, but has a narrower
 * surface policy: it is for actionable current-day context, not descriptive
 * weight-history context. This wrapper remains stateless and fail-closed.
 */
export function selectVisibleTodayInsight(
  facts: readonly IntelligenceFact[],
  options: { hydrated: boolean; enabled: boolean },
): ContextualInsight | null {
  const insight = selectVisibleLocalInsight(facts, options);
  return insight?.category === 'weight_baseline' ? null : insight;
}