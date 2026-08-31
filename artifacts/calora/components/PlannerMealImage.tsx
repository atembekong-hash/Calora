import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import type { PlannerMeal } from '@workspace/api-client-react';
import { plannerImageSource } from '@/lib/mealImages';
import { plannerImageKeyForMealId, type PlannerImageKey } from '@/lib/mealImageIdentity';

export type PlannerMealImageState = 'loading' | 'loaded' | 'fallback' | 'swapped';

const PLANNER_IMAGE_FALLBACK = require('../assets/images/calora-plan-header.jpg');
const PLANNER_MEAL_FALLBACKS: Record<PlannerMeal['meal'], ImageSource> = {
  Breakfast: require('../assets/images/food-fallback-breakfast.jpg'),
  Lunch: require('../assets/images/food-fallback-main.jpg'),
  Dinner: require('../assets/images/food-fallback-main.jpg'),
  Snack: require('../assets/images/food-fallback-snack.jpg'),
};

function stateLabel(state: PlannerMealImageState, expectedImageKey?: PlannerImageKey, actualImageKey?: string | null) {
  if (state === 'loaded') return 'Bundled image ready';
  if (state === 'fallback') return 'Fallback image active';
  if (state === 'swapped') {
    return `Swapped image detected · expected ${expectedImageKey ?? 'none'} · received ${actualImageKey ?? 'none'} · fallback image active`;
  }
  return 'Checking bundled image…';
}

export function PlannerMealImage({
  meal,
  style,
  auditId,
  expectedImageKey,
}: {
  meal: Pick<PlannerMeal, 'id' | 'name' | 'meal' | 'image' | 'imageAssetKey'>;
  style: StyleProp<ImageStyle>;
  auditId?: string;
  expectedImageKey?: PlannerImageKey;
}) {
  const resolvedImageKey = meal.imageAssetKey ?? plannerImageKeyForMealId(meal.id, meal.name);
  const source = plannerImageSource(resolvedImageKey, meal.image);
  const fallbackSource = PLANNER_MEAL_FALLBACKS[meal.meal] ?? PLANNER_IMAGE_FALLBACK;
  const identitySwapped = Boolean(expectedImageKey && resolvedImageKey !== expectedImageKey);
  const failedRef = useRef(!source);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'fallback'>(source ? 'loading' : 'fallback');
  const state: PlannerMealImageState = identitySwapped ? 'swapped' : loadState;
  const resolvedSource = useMemo(
    () => (state === 'swapped' || state === 'fallback' || !source ? fallbackSource : source),
    [fallbackSource, source, state],
  );
  const status = stateLabel(state, expectedImageKey, resolvedImageKey);
  const imageLabel = `${meal.name} meal image · ${status}`;

  useEffect(() => {
    failedRef.current = !source;
    setLoadState(source ? 'loading' : 'fallback');
  }, [meal.id, meal.image, resolvedImageKey, source]);

  const image = (
    <Image
      accessibilityLabel={imageLabel}
      cachePolicy="memory-disk"
      contentFit="cover"
      onError={() => {
        failedRef.current = true;
        setLoadState('fallback');
      }}
      onLoad={() => {
        if (!failedRef.current) setLoadState('loaded');
      }}
      placeholder={PLANNER_IMAGE_FALLBACK}
       recyclingKey={`${meal.id}:${resolvedImageKey ?? meal.image ?? `fallback-${meal.meal.toLowerCase()}`}`}
      source={resolvedSource}
      style={style}
      testID={auditId ? `${auditId}-image` : undefined}
      transition={160}
    />
  );

  if (!auditId) return image;

  return (
    <View style={styles.auditFrame}>
      {image}
      <View
        accessibilityLabel={`${meal.meal}: ${meal.name} · ${status}`}
        style={styles.auditStatus}
        testID={`${auditId}-status`}
      >
        <Text style={styles.auditStatusText}>{`${meal.meal}: ${meal.name} · ${status}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  auditFrame: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  auditStatus: {
    backgroundColor: '#17231f',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  auditStatusText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
  },
});