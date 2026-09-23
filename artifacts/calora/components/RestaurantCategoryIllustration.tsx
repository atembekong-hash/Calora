import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL,
  type RestaurantFoodImageInput,
} from '@/lib/restaurantFoodImageSelection';
import { restaurantFoodIllustration } from '@/lib/restaurantFoodImages';

type RestaurantCategoryIllustrationProps = {
  food: RestaurantFoodImageInput;
  compact?: boolean;
};

/**
 * A deterministic, bundled visual for restaurant provider results. This never
 * renders a dish photo: provider APIs currently do not entitle exact menu
 * imagery, so the category and disclosure remain visible at every size.
 */
export function RestaurantCategoryIllustration({
  food,
  compact = false,
}: RestaurantCategoryIllustrationProps) {
  const illustration = restaurantFoodIllustration(food);

  return (
    <View
      accessibilityLabel={`${illustration.title} category illustration. ${RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL}`}
      accessibilityRole="image"
      style={[styles.container, compact && styles.compactContainer]}
    >
      <LinearGradient
        colors={illustration.gradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.canvas, compact && styles.compactCanvas]}
      >
        <View style={[styles.orbit, compact && styles.compactOrbit]} />
        <View style={[styles.iconDisc, { backgroundColor: illustration.iconBackground }, compact && styles.compactIconDisc]}>
          <Feather
            color={illustration.iconColor}
            name={illustration.icon}
            size={compact ? 24 : 34}
          />
        </View>
        <View style={[styles.categoryPill, compact && styles.compactCategoryPill]}>
          <Text numberOfLines={1} style={[styles.categoryText, compact && styles.compactCategoryText]}>
            {illustration.title}
          </Text>
        </View>
      </LinearGradient>
      <Text
        accessibilityLabel={RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL}
        style={[styles.disclosure, compact && styles.compactDisclosure]}
        testID="restaurant-representative-illustration-label"
      >
        {RESTAURANT_REPRESENTATIVE_ILLUSTRATION_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    gap: 6,
    width: '100%',
  },
  compactContainer: {
    flexBasis: 74,
    width: 74,
  },
  canvas: {
    alignItems: 'center',
    borderRadius: 20,
    height: 116,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactCanvas: {
    borderRadius: 16,
    height: 74,
  },
  orbit: {
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 72,
    borderWidth: 1,
    height: 128,
    position: 'absolute',
    right: -34,
    top: -53,
    width: 128,
  },
  compactOrbit: {
    borderRadius: 46,
    height: 82,
    right: -24,
    top: -34,
    width: 82,
  },
  iconDisc: {
    alignItems: 'center',
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  compactIconDisc: {
    borderRadius: 21,
    height: 42,
    width: 42,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.21)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 10,
    maxWidth: '72%',
    paddingHorizontal: 9,
    paddingVertical: 4,
    position: 'absolute',
  },
  compactCategoryPill: {
    bottom: 6,
    borderRadius: 7,
    maxWidth: '88%',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryText: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  compactCategoryText: {
    fontSize: 7,
  },
  disclosure: {
    color: '#667085',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
  },
  compactDisclosure: {
    fontSize: 8,
    lineHeight: 11,
  },
});
