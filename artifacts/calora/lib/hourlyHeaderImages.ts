import { AppState, type ImageSourcePropType } from 'react-native';
import { useEffect, useState } from 'react';

const HOUR_IN_MS = 60 * 60 * 1000;

export type HeaderImageSurface = 'home' | 'recipes' | 'insights';

export const HOURLY_HEADER_IMAGE_POOLS: Record<HeaderImageSurface, readonly ImageSourcePropType[]> = {
  home: [
    require('../assets/images/calora-profile-header.jpg'),
    require('../assets/images/calora-insights-header.jpg'),
    require('../assets/images/calora-home-header.jpg'),
  ],
  recipes: [
    require('../assets/images/calora-recipes-header.jpg'),
    require('../assets/images/calora-plan-header.jpg'),
    require('../assets/images/calora-home-header.jpg'),
  ],
  insights: [
    require('../assets/images/calora-insights-header.jpg'),
    require('../assets/images/calora-profile-header.jpg'),
    require('../assets/images/calora-recipes-header.jpg'),
  ],
};

export function getHourlyHeaderSlot(now = Date.now()): number {
  return Math.floor(now / HOUR_IN_MS);
}

export function getHourlyHeaderIndex(hourSlot: number, imageCount: number): number {
  if (imageCount <= 0) return 0;
  return ((hourSlot % imageCount) + imageCount) % imageCount;
}

export function useHourlyHeaderImage(surface: HeaderImageSurface): { source: ImageSourcePropType; hourSlot: number } {
  const [hourSlot, setHourSlot] = useState(() => getHourlyHeaderSlot());
  const images = HOURLY_HEADER_IMAGE_POOLS[surface];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextRefresh = () => {
      const elapsedThisHour = Date.now() % HOUR_IN_MS;
      timer = setTimeout(() => {
        setHourSlot(getHourlyHeaderSlot());
        scheduleNextRefresh();
      }, HOUR_IN_MS - elapsedThisHour + 50);
    };

    const refreshWhenActive = (state: string) => {
      if (state === 'active') setHourSlot(getHourlyHeaderSlot());
    };

    scheduleNextRefresh();
    const appStateSubscription = AppState.addEventListener('change', refreshWhenActive);

    return () => {
      if (timer) clearTimeout(timer);
      appStateSubscription.remove();
    };
  }, []);

  const index = getHourlyHeaderIndex(hourSlot, images.length);
  return { source: images[index], hourSlot };
}