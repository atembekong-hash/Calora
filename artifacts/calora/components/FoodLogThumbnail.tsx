import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { FoodLog } from '@/context/CaloraContext';
import { resolveFoodImage, type FoodImageResolution } from '@/lib/foodImageMetadata';
import { foodImageSource } from '@/lib/mealImages';

const FALLBACK_IMAGES: Record<FoodImageResolution['category'], ImageSource> = {
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
  log: Pick<FoodLog, 'id' | 'name' | 'meal' | 'source' | 'imageUrl' | 'imageSource' | 'imageAssetKey' | 'imageEvidence'>;
  size?: number;
  borderRadius?: number;
}) {
  const resolution = useMemo(() => resolveFoodImage(log), [
    log.id,
    log.name,
    log.meal,
    log.source,
    log.imageUrl,
    log.imageSource,
    log.imageAssetKey,
    log.imageEvidence,
  ]);
  const fallback = FALLBACK_IMAGES[resolution.category];
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [resolution.recyclingKey]);

  const source = useMemo<ImageSource | undefined>(() => {
    if (remoteFailed) return undefined;
    if (resolution.state === 'exact' || resolution.state === 'generated' || resolution.state === 'unverified') {
      return { uri: resolution.imageUrl };
    }
    if (resolution.state === 'canonical') return foodImageSource(resolution.imageAssetKey) ?? fallback;
    return fallback;
  }, [fallback, remoteFailed, resolution]);

  const visibleDisclosure = remoteFailed
    ? undefined
    : resolution.state === 'representative' || resolution.state === 'unverified'
      ? resolution.visibleDisclosure
      : undefined;
  const accessibilityLabel = remoteFailed
    ? `${log.name}, representative Calora ${resolution.category} meal illustration`
    : resolution.accessibilityLabel;

  // Hooks run before this branch so a recycled row can safely change between a
  // no-photo restaurant entry and any image-backed state without retaining a
  // stale error. A verified remote image has already won in resolveFoodImage.
  if (resolution.state === 'no-image' || resolution.state === 'representative') {
    const representative = resolution.state === 'representative';
    return (
      <View style={[styles.frame, { width: size, height: size, borderRadius }]}>
        <View
          accessible
          accessibilityLabel={resolution.accessibilityLabel}
          style={styles.restaurantMarker}
        >
          <Feather name={representative ? 'image' : 'map-pin'} size={Math.max(14, Math.round(size * 0.38))} color="#426052" />
          <Text style={representative ? styles.representativeText : styles.noPhotoText}>
            {representative ? 'Representative' : 'No photo'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius }]}>
      <Image
        accessibilityLabel={accessibilityLabel}
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setRemoteFailed(true)}
        placeholder={fallback}
        recyclingKey={`${resolution.recyclingKey}:${remoteFailed ? 'failed' : 'active'}`}
        source={source ?? fallback}
        style={StyleSheet.absoluteFill}
        transition={120}
      />
      {visibleDisclosure && (
        <View accessible accessibilityLabel={`${log.name}: ${visibleDisclosure.toLowerCase()}`} style={styles.disclosure}>
          <Feather name={visibleDisclosure === 'Representative image' ? 'info' : 'image'} size={10} color="#ffffff" />
          <Text style={styles.disclosureText}>{visibleDisclosure}</Text>
        </View>
      )}
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
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  noPhotoText: {
    color: '#426052',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    marginTop: 2,
  },
  representativeText: {
    color: '#426052',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 6.5,
    marginTop: 2,
  },
  disclosure: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 45, 34, 0.82)',
    borderRadius: 5,
    bottom: 3,
    flexDirection: 'row',
    gap: 3,
    left: 3,
    maxWidth: '92%',
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
  },
  disclosureText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    lineHeight: 10,
  },
});
