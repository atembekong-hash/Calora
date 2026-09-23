import { Feather } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import type { PlannerMeal } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { hasPlannerImageKey, plannerImageSource } from '@/lib/mealImages';
import { plannerImageKeyForMeal, type PlannerImageKey } from '@/lib/mealImageIdentity';
import { plannerImageRenderDecision, plannerStoredImageKeyMismatch } from '@/lib/plannerImageRendering';
import { useAuth } from '@/context/AuthContext';

export type PlannerMealImageState = 'loading' | 'loaded' | 'fallback' | 'swapped';

const PLANNER_IMAGE_FALLBACK = require('../assets/images/calora-plan-header.jpg');
const PLANNER_MEAL_FALLBACKS: Record<PlannerMeal['meal'], ImageSource> = {
  Breakfast: require('../assets/images/food-fallback-breakfast.jpg'),
  Lunch: require('../assets/images/food-fallback-main.jpg'),
  Dinner: require('../assets/images/food-fallback-main.jpg'),
  Snack: require('../assets/images/food-fallback-snack.jpg'),
};

function stateLabel(
  state: PlannerMealImageState,
  isCuratedImage: boolean,
  expectedImageKey?: PlannerImageKey,
  actualImageKey?: string | null,
) {
  if (state === 'loaded') return isCuratedImage ? 'Bundled image ready' : 'Meal image ready';
  if (state === 'fallback') return 'Fallback image active';
  if (state === 'swapped') {
    return `Swapped image detected · expected ${expectedImageKey ?? 'none'} · received ${actualImageKey ?? 'none'} · fallback image active`;
  }
  return isCuratedImage ? 'Checking bundled image…' : 'Checking meal image…';
}

export function PlannerMealImage({
  meal,
  style,
  auditId,
  testID,
  accessibilityContext,
  expectedImageKey,
}: {
  meal: Pick<PlannerMeal, 'id' | 'name' | 'meal' | 'image' | 'imageAssetKey' | 'recipeId' | 'recipeSource' | 'generatedMediaId' | 'generatedImageId' | 'generatedImageUrlExpiresAt' | 'generatedImageReviewState'>;
  style: StyleProp<ImageStyle>;
  auditId?: string;
  /** Stable production-safe target for real planner surfaces. */
  testID?: string;
  /** Identifies the Program/diet/canonical identity without changing imagery. */
  accessibilityContext?: string;
  expectedImageKey?: PlannerImageKey;
}) {
  const colors = useColors();
  const { user } = useAuth();
  const resolvedImageKey = plannerImageKeyForMeal(meal.id, meal.name);
  const renderDecision = plannerImageRenderDecision(meal, user?.id);
  const source = plannerImageSource(renderDecision.canonicalImageKey, renderDecision.remoteImageUrl);
  const isCuratedImage = hasPlannerImageKey(resolvedImageKey);
  const fallbackSource = PLANNER_MEAL_FALLBACKS[meal.meal] ?? PLANNER_IMAGE_FALLBACK;
  // A persisted key is diagnostic evidence only. The image source remains the
  // current visible-name canonical key (or source-evidenced recipe image).
  const receivedImageKey = meal.imageAssetKey ?? resolvedImageKey;
  const identitySwapped = plannerStoredImageKeyMismatch(meal)
    || Boolean(expectedImageKey && resolvedImageKey !== expectedImageKey);
  const failedRef = useRef(!source);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'fallback'>(source ? 'loading' : 'fallback');
  const state: PlannerMealImageState = identitySwapped ? 'swapped' : loadState;
  const resolvedSource = useMemo(
    () => (state === 'swapped' || state === 'fallback' || !source ? fallbackSource : source),
    [fallbackSource, source, state],
  );
  const status = stateLabel(state, isCuratedImage, expectedImageKey ?? resolvedImageKey, receivedImageKey);
  const imageLabel = `${accessibilityContext ? `${accessibilityContext} · ` : ''}${meal.name} meal image · canonical image ${resolvedImageKey ?? 'none'} · ${status}`;
  const isFallback = state === 'fallback' || state === 'swapped';
  const fallbackNotice = state === 'swapped' ? 'Image mismatch · fallback' : 'Fallback image';

  useEffect(() => {
    failedRef.current = !source;
    setLoadState(source ? 'loading' : 'fallback');
  }, [meal.id, meal.image, meal.imageAssetKey, resolvedImageKey]);

  const image = (
    <View
      accessible={Boolean(testID)}
      accessibilityLabel={testID ? imageLabel : undefined}
      style={[styles.imageSurface, style as StyleProp<ViewStyle>]}
      testID={testID ? `${testID}-state-${state}` : undefined}
    >
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
        placeholder={fallbackSource}
        recyclingKey={`${meal.id}:${resolvedImageKey ?? meal.image ?? `fallback-${meal.meal.toLowerCase()}`}`}
        source={resolvedSource}
        style={StyleSheet.absoluteFill}
        testID={auditId ? `${auditId}-image` : testID ? `${testID}-image` : undefined}
        transition={160}
      />
      {isFallback && (
        <View
          accessible
          accessibilityLabel={`${meal.name} meal image is using the fallback image. ${status}`}
          pointerEvents="none"
          style={[styles.fallbackNotice, { backgroundColor: colors.hero }]}
        >
          <Feather name="image" size={12} color={colors.onHero} />
          <Text numberOfLines={1} style={[styles.fallbackNoticeText, { color: colors.onHero }]}>
            {fallbackNotice}
          </Text>
        </View>
      )}
    </View>
  );

  if (!auditId) return image;

  return (
    <View style={[styles.auditFrame, { backgroundColor: colors.card }]}>
      {image}
      <View
        accessible
        accessibilityLabel={`${meal.meal}: ${meal.name} · ${status}`}
        style={[styles.auditStatus, { backgroundColor: colors.hero }]}
        testID={`${auditId}-status`}
      >
        <Text style={[styles.auditStatusText, { color: colors.onHero }]}>{`${meal.meal}: ${meal.name} · ${status}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageSurface: {
    overflow: 'hidden',
    position: 'relative',
  },
  auditFrame: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  auditStatus: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  auditStatusText: {
    fontSize: 12,
    lineHeight: 17,
  },
  fallbackNotice: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    left: 0,
    paddingHorizontal: 7,
    paddingVertical: 5,
    position: 'absolute',
    right: 0,
  },
  fallbackNoticeText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
});
