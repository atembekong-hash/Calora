import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PlannerMealImage } from '@/components/PlannerMealImage';
import { getMealImageAuditCases, findDuplicateImageAssignments } from '@/lib/mealImageAudit';
import { plannerCatalog } from '@/data/planner';
import { verifiedFoods } from '@/data/foods';

const QA_MISSING_IMAGE_KEY = 'qa-missing-planner-image';

export default function MealImagePreviewScreen() {
  const insets = useSafeAreaInsets();
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  const isFallbackScenario = scenario === 'fallback';
  const plannerDuplicates = findDuplicateImageAssignments(
    plannerCatalog.map((meal) => ({
      identity: meal.name,
      imageUrl: meal.image,
      imageAssetKey: meal.imageAssetKey,
      source: 'planner',
    })),
  );
  const foodDuplicates = findDuplicateImageAssignments(
    verifiedFoods.map((food) => ({
      identity: food.name,
      imageUrl: food.imageUrl,
      imageAssetKey: food.imageAssetKey,
      source: 'verified-food',
    })),
  );
  const duplicateCount = plannerDuplicates.length + foodDuplicates.length;
  const auditCases = getMealImageAuditCases().map((auditCase) => {
    if (!isFallbackScenario) return auditCase;

    if (auditCase.meal.meal === 'Breakfast') {
      return {
        ...auditCase,
        // Deliberately use an unknown key and empty remote URL. This must
        // exercise the component's unavailable-image fallback state.
        expectedImageKey: undefined,
        meal: { ...auditCase.meal, image: '', imageAssetKey: QA_MISSING_IMAGE_KEY },
      };
    }

    if (auditCase.meal.meal === 'Lunch') {
      return {
        ...auditCase,
        // A valid but wrong bundled key must be rejected as an identity swap.
        meal: { ...auditCase.meal, imageAssetKey: 'berry-oats' },
      };
    }

    return auditCase;
  });

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      testID="meal-image-preview"
    >
      <Text style={styles.eyebrow}>NATIVE QA PREVIEW</Text>
      <Text style={styles.title}>Meal image rendering</Text>
      <Text style={styles.description}>
        {isFallbackScenario
          ? 'QA fixture for unavailable and mismatched images. Fallback states must remain visible and accessible.'
          : 'Representative planner cards for iOS and Android. Each card must report a bundled image ready state.'}
      </Text>
      <View style={styles.auditSummary} testID="meal-image-audit-summary">
        <Text style={styles.auditSummaryTitle}>Catalog identity audit</Text>
        <Text style={styles.auditSummaryBody}>
          {duplicateCount === 0
            ? 'No cross-name bundled or normalized URL duplicates detected.'
            : `${duplicateCount} duplicate image assignment${duplicateCount === 1 ? '' : 's'} detected. Review the affected catalog entries.`}
        </Text>
      </View>

      <View style={styles.cardList}>
        {auditCases.map(({ auditId, meal, expectedImageKey }) => (
          <View key={auditId} style={styles.card} testID={`${auditId}-card`}>
            <PlannerMealImage
              auditId={auditId}
              expectedImageKey={expectedImageKey}
              meal={meal}
              style={styles.image}
            />
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        A fallback or swapped state includes the meal identity and expected/received asset keys for diagnosis.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#f7f8f4',
    paddingHorizontal: 20,
  },
  eyebrow: {
    color: '#4caf7d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#17231f',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 7,
  },
  description: {
    color: '#617068',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  cardList: {
    gap: 14,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe6df',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  auditSummary: {
    backgroundColor: '#e7f3ec',
    borderColor: '#b8dbc6',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 13,
  },
  auditSummaryTitle: {
    color: '#1d5a3b',
    fontSize: 12,
    fontWeight: '700',
  },
  auditSummaryBody: {
    color: '#47705a',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  image: {
    height: 150,
    width: '100%',
  },
  footer: {
    color: '#617068',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
  },
});