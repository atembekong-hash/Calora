/**
 * Pure dispatcher for the living-state action button.
 *
 * Extracted from HomeScreen so the routing / modal-open logic can be unit-tested
 * without mounting the full component tree.  HomeScreen calls this with its own
 * `openAdd`, `addWater`, and `navigate` callbacks.
 */
import type { LivingAction } from '@/lib/livingState';

export type LivingActionEffect =
  | { kind: 'open_add_food' }
  | { kind: 'add_water'; ounces: number }
  | { kind: 'navigate'; route: string }

/**
 * Maps a `LivingAction` kind to a concrete side-effect descriptor.
 * Callers are responsible for executing the effect; this function is pure.
 */
export function resolveLivingActionEffect(action: LivingAction): LivingActionEffect {
  switch (action) {
    case 'log_meal':
      return { kind: 'open_add_food' };
    case 'add_water':
      return { kind: 'add_water', ounces: 8 };
    case 'view_progress':
      return { kind: 'navigate', route: '/(tabs)/insights' };
    case 'open_planner':
      return { kind: 'navigate', route: '/(tabs)/planner' };
  }
}
