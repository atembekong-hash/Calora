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

  const insight = selectContextualInsight(facts);
  return insight.state === 'active' && insight.freshness === 'fresh' ? insight : null;
}