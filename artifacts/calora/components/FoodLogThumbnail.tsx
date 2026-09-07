import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FoodLog } from '@/context/CaloraContext';
import { foodImageCategory, normalizeFoodImageUrl } from '@/lib/foodImageMetadata';
import { foodImageKeyForName } from '@/lib/mealImageIdentity';
import { foodImageSource } from '@/lib/mealImages';
import { restaurantFoodImageSourceForAssetKey } from '@/lib/restaurantFoodImages';
import { restaurantFoodImageAssetKey } from '@/lib/restaurantFoodImageSelection';

const FALLBACK_IMAGES: Record<ReturnType<typeof foodImageCategory>, ImageSource> = {
  breakfast: require('../assets/images/food-fallback-breakfast.jpg'),
  main: require('../assets/images/food-fallback-main.jpg'),
  snack: require('../assets/images/food-fallback-snack.jpg'),
  drink: require('../assets/images/food-fallback-drink.jpg'),
};

export function FoodLogThumbnail({
  log,
  size = 48,
  borderRadius = 14,
}: {
  log: Pick<FoodLog, 'id' | 'name' | 'meal' | 'source' | 'imageUrl' | 'imageSource' | 'imageAssetKey'>;
  size?: number;
  borderRadius?: number;
}) {
  const remoteUrl = normalizeFoodImageUrl(log.imageUrl);
  const canonicalImageKey = foodImageKeyForName(log.name);
  const restaurantAssetKey = log.imageAssetKey?.startsWith('restaurant:')
    ? log.imageAssetKey
    : log.source === 'Restaurant verified'
      ? restaurantFoodImageAssetKey({ name: log.name })
      : undefined;
  const resolvedImageKey = canonicalImageKey ?? log.imageAssetKey;
  const restaurantImage = restaurantFoodImageSourceForAssetKey(restaurantAssetKey);
  const localImage = restaurantImage ?? foodImageSource(resolvedImageKey);
  // A valid item-specific remote image outranks any bundled canonical or
  // restaurant-category asset. Planner-curated local identity is the one
  // intentional exception because its local mapping is authoritative.
  const preferRemote = Boolean(remoteUrl && log.imageSource !== 'planner');
  const fallback = FALLBACK_IMAGES[foodImageCategory(log)];
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [resolvedImageKey, remoteUrl]);

  const source = useMemo<ImageSource>(
    () => (preferRemote && remoteUrl && !remoteFailed)
      ? { uri: remoteUrl }
      : localImage ?? (remoteUrl && !remoteFailed ? { uri: remoteUrl } : fallback),
    [fallback, localImage, preferRemote, remoteFailed, remoteUrl],
  );

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius }]}>
      <Image
          accessibilityLabel={restaurantImage ? `Representative image for ${log.name}; exact menu photography unavailable` : `${log.name} food image`}
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setRemoteFailed(true)}
        placeholder={fallback}
        recyclingKey={`${log.id}:${restaurantAssetKey ?? resolvedImageKey ?? remoteUrl ?? 'fallback'}`}
        source={source}
        style={StyleSheet.absoluteFill}
        transition={120}
      />
      {restaurantImage && !(preferRemote && remoteUrl && !remoteFailed) ? (
        <View style={styles.representativeBadge}>
          <Text style={styles.representativeBadgeText}>REP</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#e7ece5',
    overflow: 'hidden',
  },
  representativeBadge: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(16, 67, 55, 0.88)',
  },
  representativeBadgeText: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    letterSpacing: 0.35,
    textAlign: 'center',
  },
});