import { Image } from 'expo-image';
import React, { useEffect, useState, type ReactNode } from 'react';
import { type StyleProp, type ImageStyle } from 'react-native';

export function ProfilePhoto({
  uri,
  size,
  fallback,
  accessibilityLabel,
  style,
}: {
  uri?: string | null;
  size: number;
  fallback: ReactNode;
  accessibilityLabel: string;
  style?: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) return <>{fallback}</>;

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      cachePolicy="memory-disk"
      contentFit="cover"
      onError={() => setFailed(true)}
      recyclingKey={`profile-photo:${uri}`}
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
    />
  );
}