import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FoodLog } from '@/context/CaloraContext';
import { foodImageCategory, normalizeFoodImageUrl } from '@/lib/foodImageMetadata';
import { foodImageKeyForName } from '@/lib/mealImageIdentity';
import { foodImageSource } from '@/lib/mealImages';
import { restaurantFoodImageSourceForAssetKey } from '@/lib/restaurantFoodImages';

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
  log: Pick<FoodLog, 'id' | 'name' | 'meal' | 'imageUrl' | 'imageAssetKey'>;
  size?: number;
  borderRadius?: number;
}) {
  const remoteUrl = normalizeFoodImageUrl(log.imageUrl);
  const canonicalImageKey = foodImageKeyForName(log.name);
  const resolvedImageKey = canonicalImageKey ?? log.imageAssetKey;
  const restaurantImage = restaurantFoodImageSourceForAssetKey(log.imageAssetKey);
  const localImage = restaurantImage ?? foodImageSource(resolvedImageKey);
  const fallback = FALLBACK_IMAGES[foodImageCategory(log)];
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [resolvedImageKey, remoteUrl]);

  const source = useMemo<ImageSource>(
    () => localImage ?? (remoteUrl && !remoteFailed ? { uri: remoteUrl } : fallback),
    [fallback, localImage, remoteFailed, remoteUrl],
  );

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius }]}>
      <Image
          accessibilityLabel={restaurantImage ? `Representative image for ${log.name}` : `${log.name} food image`}
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setRemoteFailed(true)}
        placeholder={fallback}
        recyclingKey={`${log.id}:${resolvedImageKey ?? remoteUrl ?? 'fallback'}`}
        source={source}
        style={StyleSheet.absoluteFill}
        transition={120}
      />
      {restaurantImage ? (
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