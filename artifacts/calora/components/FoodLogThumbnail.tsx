import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { FoodLog } from '@/context/CaloraContext';
import { foodImageCategory, normalizeFoodImageUrl } from '@/lib/foodImageMetadata';
import { foodImageKeyForName } from '@/lib/mealImageIdentity';
import { foodImageSource } from '@/lib/mealImages';

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
  const isRestaurantItem = log.source === 'Restaurant verified'
    || log.imageSource === 'restaurant_representative'
    || log.imageAssetKey?.startsWith('restaurant:');

  if (isRestaurantItem) {
    return (
      <View
        accessibilityLabel={`${log.name} restaurant item`}
        style={[styles.restaurantMarker, { width: size, height: size, borderRadius }]}
      >
        <Feather name="map-pin" size={Math.max(14, Math.round(size * 0.38))} color="#426052" />
      </View>
    );
  }

  const remoteUrl = normalizeFoodImageUrl(log.imageUrl);
  const canonicalImageKey = foodImageKeyForName(log.name);
  const resolvedImageKey = canonicalImageKey ?? log.imageAssetKey;
  const localImage = foodImageSource(resolvedImageKey);
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
        accessibilityLabel={`${log.name} food image`}
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setRemoteFailed(true)}
        placeholder={fallback}
        recyclingKey={`${log.id}:${resolvedImageKey ?? remoteUrl ?? 'fallback'}`}
        source={source}
        style={StyleSheet.absoluteFill}
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#e7ece5',
    overflow: 'hidden',
  },
  restaurantMarker: {
    alignItems: 'center',
    backgroundColor: '#e7ece5',
    justifyContent: 'center',
  },
});