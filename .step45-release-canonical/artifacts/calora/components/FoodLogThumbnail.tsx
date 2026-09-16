import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FoodLog } from '@/context/CaloraContext';
import { foodImageCategory, normalizeFoodImageUrl } from '@/lib/foodImageMetadata';
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
  log: Pick<FoodLog, 'id' | 'name' | 'meal' | 'imageUrl' | 'imageAssetKey'>;
  size?: number;
  borderRadius?: number;
}) {
  const remoteUrl = normalizeFoodImageUrl(log.imageUrl);
  const localImage = foodImageSource(log.imageAssetKey);
  const fallback = FALLBACK_IMAGES[foodImageCategory(log)];
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [log.imageAssetKey, remoteUrl]);

  const source = useMemo<ImageSource>(
    () => localImage ?? (remoteUrl && !remoteFailed ? { uri: remoteUrl } : fallback),
    [fallback, localImage, remoteFailed, remoteUrl],
  );

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius }]}>
      <Image
        accessibilityLabel={`${log.name} food image`}
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setRemoteFailed(true)}
        placeholder={fallback}
        recyclingKey={`${log.id}:${log.imageAssetKey ?? remoteUrl ?? 'fallback'}`}
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
});