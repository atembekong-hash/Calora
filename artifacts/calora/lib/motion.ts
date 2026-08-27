import { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { motion } from '@/constants/tokens';

export type EntranceMotionTier = 'component' | 'screen' | 'modal' | 'celebration';

/**
 * Shared bounded entrance choreography.
 *
 * Reanimated's system reduction makes every tier resolve immediately when the
 * device asks for reduced motion, so callers do not need parallel animations.
 */
export function enterMotion(tier: EntranceMotionTier, index = 0) {
  const spec = motion[tier];
  const boundedIndex = Math.max(0, Math.min(index, 6));

  return FadeInDown
    .duration(spec.duration)
    .delay(spec.stagger * boundedIndex)
    .reduceMotion(ReduceMotion.System);
}