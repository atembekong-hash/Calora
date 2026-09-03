import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useCalora } from '@/context/CaloraContext';

const HOUR_MS = 60 * 60 * 1000;

const HOURLY_BACKGROUND_IMAGES: number[] = [
  require('../assets/images/calora-home-header.jpg'),
  require('../assets/images/calora-insights-header.jpg'),
  require('../assets/images/calora-plan-header.jpg'),
  require('../assets/images/calora-profile-header.jpg'),
  require('../assets/images/calora-recipes-header.jpg'),
];

export function getHourlyBackgroundIndex(timestamp = Date.now()): number {
  return Math.floor(timestamp / HOUR_MS) % HOURLY_BACKGROUND_IMAGES.length;
}

type HourlyBackgroundContextValue = {
  source: ImageSourcePropType;
  hourIndex: number;
};

const HourlyBackgroundContext = createContext<HourlyBackgroundContextValue | null>(null);

export function HourlyBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [hourIndex, setHourIndex] = useState(() => getHourlyBackgroundIndex());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextHour = () => {
      const delay = HOUR_MS - (Date.now() % HOUR_MS) + 50;
      timeout = setTimeout(() => {
        setHourIndex(getHourlyBackgroundIndex());
        scheduleNextHour();
      }, delay);
    };

    scheduleNextHour();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const value = useMemo(
    () => ({ source: HOURLY_BACKGROUND_IMAGES[hourIndex], hourIndex }),
    [hourIndex],
  );

  return <HourlyBackgroundContext.Provider value={value}>{children}</HourlyBackgroundContext.Provider>;
}

export function useHourlyBackground(): HourlyBackgroundContextValue {
  const value = useContext(HourlyBackgroundContext);
  if (!value) throw new Error('useHourlyBackground must be used inside HourlyBackgroundProvider');
  return value;
}

export function HourlyBackground() {
  const { source } = useHourlyBackground();
  const { colors } = useCalora();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={source} contentFit="cover" style={[StyleSheet.absoluteFill, styles.image]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, styles.tint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { opacity: 0.28 },
  tint: { opacity: 0.78 },
});