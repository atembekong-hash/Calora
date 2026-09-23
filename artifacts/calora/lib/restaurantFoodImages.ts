import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  restaurantFoodImageKey,
  RESTAURANT_IMAGE_ASSET_PREFIX,
  type RestaurantFoodImageInput,
  type RestaurantFoodImageKey,
} from './restaurantFoodImageSelection';

type RestaurantIllustration = {
  title: string;
  icon: ComponentProps<typeof Feather>['name'];
  gradient: readonly [string, string];
  iconBackground: string;
  iconColor: string;
};

/**
 * Bundled category illustration metadata for restaurant results. These values
 * intentionally describe a broad category only; no provider image URL or dish
 * photo is used because the restaurant API does not expose entitled exact
 * images.
 */
const RESTAURANT_ILLUSTRATIONS: Record<RestaurantFoodImageKey, RestaurantIllustration> = {
  main: { title: 'Entrée', icon: 'coffee', gradient: ['#41655a', '#6d9881'], iconBackground: '#edf5ee', iconColor: '#315846' },
  drink: { title: 'Drink', icon: 'droplet', gradient: ['#347789', '#76adb0'], iconBackground: '#e9f7f6', iconColor: '#286b70' },
  snack: { title: 'Snack', icon: 'sun', gradient: ['#a46936', '#d8a15f'], iconBackground: '#fff4e2', iconColor: '#98592b' },
  breakfast: { title: 'Breakfast', icon: 'sunrise', gradient: ['#a76a35', '#d5a35e'], iconBackground: '#fff6e8', iconColor: '#935b2e' },
  bowl: { title: 'Bowl', icon: 'circle', gradient: ['#3d6a78', '#79a5a9'], iconBackground: '#e9f5f4', iconColor: '#2d6169' },
  chicken: { title: 'Poultry', icon: 'feather', gradient: ['#8b5d38', '#c28c58'], iconBackground: '#fff1e4', iconColor: '#7b4d2d' },
  wrap: { title: 'Sandwich', icon: 'layers', gradient: ['#6d7942', '#9ca966'], iconBackground: '#f4f7e8', iconColor: '#59663a' },
  salad: { title: 'Salad', icon: 'feather', gradient: ['#3f794f', '#78a96e'], iconBackground: '#eaf6e9', iconColor: '#326640' },
  soup: { title: 'Soup', icon: 'cloud', gradient: ['#a8533e', '#d98a64'], iconBackground: '#fff0ea', iconColor: '#934431' },
  tacos: { title: 'Tacos', icon: 'triangle', gradient: ['#a9672a', '#d5a34c'], iconBackground: '#fff5df', iconColor: '#93551e' },
  pasta: { title: 'Pasta', icon: 'rotate-cw', gradient: ['#8e5b5d', '#c48673'], iconBackground: '#fff0eb', iconColor: '#78474d' },
};

export function restaurantFoodIllustration(food: RestaurantFoodImageInput): RestaurantIllustration {
  return RESTAURANT_ILLUSTRATIONS[restaurantFoodImageKey(food)];
}

export function restaurantFoodIllustrationForAssetKey(
  assetKey: string | null | undefined,
): RestaurantIllustration | undefined {
  if (!assetKey?.startsWith(RESTAURANT_IMAGE_ASSET_PREFIX)) return undefined;
  const category = assetKey.slice(RESTAURANT_IMAGE_ASSET_PREFIX.length) as RestaurantFoodImageKey;
  return Object.prototype.hasOwnProperty.call(RESTAURANT_ILLUSTRATIONS, category)
    ? RESTAURANT_ILLUSTRATIONS[category]
    : undefined;
}
