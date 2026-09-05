import { Feather } from '@expo/vector-icons';
import {
  getGetRestaurantFoodQueryKey,
  getListRestaurantFoodsQueryKey,
  useGetRestaurantFood,
  useListRestaurantFoods,
  type RestaurantFood,
  type RestaurantFoodServing,
} from '@workspace/api-client-react';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { type MealType, useCalora } from '@/context/CaloraContext';
import { dateKey } from '@/lib/dates';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { restaurantFoodImageSource } from '@/lib/restaurantFoodImages';
import { restaurantFoodReviewState } from '@/lib/restaurantFoodReview';
import { CaloraFeatureIcon } from '@/components/CaloraFeatureIcon';
import { BottomSheet } from '@/components/BottomSheet';
import { Image } from 'expo-image';

const popularChains = ["McDonald's", 'Burger King', "Wendy's", 'Chipotle'];
const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function primaryServing(food: RestaurantFood): RestaurantFoodServing {
  return {
    servingId: food.servingId,
    description: food.serving ?? '1 serving',
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    fiberG: food.fiberG,
    sugarG: food.sugarG,
    sodiumMg: food.sodiumMg,
  };
}

export default function RestaurantsScreen() {
  const { colors, createFoodMemorySourceDraft } = useCalora();
  const { session, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const entryDate = typeof params.date === 'string' ? params.date : dateKey();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<RestaurantFood | null>(null);
  const [selectedServingIndex, setSelectedServingIndex] = useState(0);
  const [meal, setMeal] = useState<MealType>('Dinner');

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const canSearch = Boolean(session && searchQuery.length >= 2);
  const searchResult = useListRestaurantFoods(
    { query: searchQuery || 'restaurant', limit: 20, offset: 0 },
    { query: { queryKey: getListRestaurantFoodsQueryKey({ query: searchQuery || 'restaurant', limit: 20, offset: 0 }), enabled: canSearch, staleTime: 60_000, retry: false } },
  );
  const detailResult = useGetRestaurantFood(
    selectedFood?.sourceId ?? '',
    { query: { queryKey: getGetRestaurantFoodQueryKey(selectedFood?.sourceId ?? ''), enabled: Boolean(session && selectedFood), staleTime: 5 * 60_000, retry: false } },
  );
  const detail = detailResult.data ?? selectedFood;
  const servings = useMemo(
    () => detail ? (detail.servings.length > 0 ? detail.servings : [primaryServing(detail)]) : [],
    [detail],
  );
  const selectedServing = servings[selectedServingIndex] ?? servings[0] ?? null;
  const reviewState = restaurantFoodReviewState({
    detail: detailResult.data,
    serving: selectedServing,
    isFetching: detailResult.isFetching,
    isError: detailResult.isError,
  });

  useEffect(() => {
    setSelectedServingIndex(0);
  }, [selectedFood?.sourceId, detailResult.data?.sourceId]);

  const choosePopularChain = (chain: string) => {
    setQuery(chain);
    setSearchQuery(chain);
  };

  const beginReview = () => {
    const providerDetail = detailResult.data;
    if (reviewState !== 'ready' || !providerDetail || !selectedServing) return;
    const confidence = 94;
    const component: FoodMemoryComponent = {
      id: `fatsecret-${providerDetail.sourceId}-${selectedServing.servingId ?? selectedServingIndex}`,
      name: providerDetail.name,
      brand: providerDetail.brandName,
      serving: selectedServing.description,
      calories: selectedServing.calories ?? 0,
      proteinG: selectedServing.proteinG ?? 0,
      carbsG: selectedServing.carbsG ?? 0,
      fatG: selectedServing.fatG ?? 0,
      included: true,
      eatenFraction: 1,
      provenance: 'verified_provider',
      sourceLabel: providerDetail.nutritionSource,
      confidence,
      confidenceDimensions: {
        identity: 96,
        portion: 86,
        nutritionSource: 96,
        preparation: 88,
      },
      assumptions: [],
      reviewQuestions: ['Confirm this serving matches the item and portion you ate.'],
    };
    const draft = createFoodMemorySourceDraft({
      inputType: 'text',
      title: providerDetail.brandName ? `${providerDetail.brandName} ${providerDetail.name}` : providerDetail.name,
      date: entryDate,
      meal,
      components: [component],
      sourceLabel: providerDetail.nutritionSource,
      provenance: 'verified_provider',
      assumptions: ['Restaurant preparation and serving size can vary by location.'],
      reviewQuestions: component.reviewQuestions,
    });
    setSelectedFood(null);
    router.replace({
      pathname: '/(tabs)/scan',
      params: { date: entryDate, draftId: draft.id },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const statusMessage = searchResult.data?.status !== 'available'
    ? searchResult.data?.message
    : null;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back from restaurant search" onPress={handleBack} style={[styles.backButton, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-left" size={19} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Restaurants</Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={[styles.introCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.accent }]}>
            <CaloraFeatureIcon name="restaurant" size={31} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.onHero} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: colors.onHero }]}>Find a menu item</Text>
            <Text style={[styles.introBody, { color: colors.heroMuted }]}>Check serving nutrition, then review before adding it to your diary.</Text>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            accessibilityLabel="Search restaurants or menu items"
            placeholder="Try “McDonald's cheeseburger”"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="words"
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear restaurant search" onPress={() => { setQuery(''); setSearchQuery(''); }}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>POPULAR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chainRow}>
          {popularChains.map((chain) => (
            <Pressable
              key={chain}
              accessibilityLabel={`Search ${chain}`}
              onPress={() => choosePopularChain(chain)}
              style={[styles.chainChip, { backgroundColor: query === chain ? colors.accent : colors.card, borderColor: query === chain ? colors.accent : colors.border }]}
            >
              <Text style={[styles.chainText, { color: query === chain ? colors.accentForeground : colors.foreground }]}>{chain}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {authLoading ? (
          <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View>
        ) : !session ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.accent }]}><Feather name="lock" size={20} color={colors.accentForeground} /></View>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Sign in to search restaurants</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>Sign in to use provider search.</Text>
            <Pressable accessibilityLabel="Sign in for restaurant search" onPress={() => router.push('/auth/sign-in')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Sign in</Text>
            </Pressable>
          </View>
        ) : searchResult.isFetching ? (
          <View style={styles.centerState}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Searching…</Text></View>
        ) : searchResult.isError ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Search could not connect</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>Check your connection, then try again.</Text>
          </View>
        ) : statusMessage ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Restaurant nutrition unavailable</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>{statusMessage}</Text>
          </View>
        ) : searchQuery.length < 2 ? (
          <View style={styles.startState}>
            <Feather name="search" size={24} color={colors.mutedForeground} />
            <Text style={[styles.startText, { color: colors.mutedForeground }]}>Search a restaurant or menu item.</Text>
          </View>
        ) : searchResult.data?.foods.length === 0 ? (
          <View style={styles.startState}>
            <Feather name="inbox" size={24} color={colors.mutedForeground} />
            <Text style={[styles.startText, { color: colors.mutedForeground }]}>No items found. Try the restaurant and item name.</Text>
          </View>
        ) : (
          <View style={styles.results}>
            <View style={styles.resultsHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Matches</Text>
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>{searchResult.data?.foods.length ?? 0} items</Text>
            </View>
            {searchResult.data?.foods.map((food) => (
              <Pressable
                key={food.id}
                accessibilityLabel={`View ${food.name} from ${food.brandName ?? 'brand'}`}
                onPress={() => setSelectedFood(food)}
                style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Image
                  accessibilityLabel={`${food.name} food photo`}
                  contentFit="cover"
                  source={restaurantFoodImageSource(food)}
                  style={styles.resultImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultBrand, { color: colors.primary }]}>{food.brandName ?? 'Branded food'}</Text>
                  <Text style={[styles.resultName, { color: colors.foreground }]}>{food.name}</Text>
                  <Text style={[styles.resultServing, { color: colors.mutedForeground }]}>{food.serving ?? 'Open for serving details'}</Text>
                </View>
                <View style={styles.resultNutrition}>
                  <Text style={[styles.resultCalories, { color: colors.foreground }]}>{food.calories !== null ? Math.round(food.calories) : '—'}</Text>
                  <Text style={[styles.resultCaloriesLabel, { color: colors.mutedForeground }]}>kcal</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.attribution}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.attributionText, { color: colors.mutedForeground }]}>Nutrition data supplied by FatSecret. Results may not include a restaurant’s complete official menu.</Text>
        </View>
      </ScrollView>

      <BottomSheet visible={selectedFood !== null} onRequestClose={() => setSelectedFood(null)} sheetStyle={[styles.detailSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            {detail ? (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailBrand, { color: colors.primary }]}>{detail.brandName ?? 'BRANDED FOOD'}</Text>
                    <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
                  </View>
                  <Pressable accessibilityLabel="Close restaurant food details" onPress={() => setSelectedFood(null)} style={[styles.backButton, { backgroundColor: colors.muted }]}>
                    <Feather name="x" size={18} color={colors.foreground} />
                  </Pressable>
                </View>

                {detailResult.isFetching ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
                <View style={[styles.nutritionCard, { backgroundColor: colors.hero }]}>
                  <View><Text style={[styles.macroValueLarge, { color: colors.onHero }]}>{selectedServing?.calories !== null ? Math.round(selectedServing?.calories ?? 0) : '—'}</Text><Text style={[styles.macroLabel, { color: colors.heroMuted }]}>kcal</Text></View>
                  <View><Text style={[styles.macroValue, { color: colors.onHero }]}>{selectedServing?.proteinG !== null ? `${Math.round(selectedServing?.proteinG ?? 0)}g` : '—'}</Text><Text style={[styles.macroLabel, { color: colors.heroMuted }]}>protein</Text></View>
                  <View><Text style={[styles.macroValue, { color: colors.onHero }]}>{selectedServing?.carbsG !== null ? `${Math.round(selectedServing?.carbsG ?? 0)}g` : '—'}</Text><Text style={[styles.macroLabel, { color: colors.heroMuted }]}>carbs</Text></View>
                  <View><Text style={[styles.macroValue, { color: colors.onHero }]}>{selectedServing?.fatG !== null ? `${Math.round(selectedServing?.fatG ?? 0)}g` : '—'}</Text><Text style={[styles.macroLabel, { color: colors.heroMuted }]}>fat</Text></View>
                </View>

                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SERVING</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingRow}>
                  {servings.map((serving, index) => (
                    <Pressable
                      key={serving.servingId ?? `${serving.description}-${index}`}
                      accessibilityLabel={`Use serving ${serving.description}`}
                      onPress={() => setSelectedServingIndex(index)}
                      style={[styles.servingChip, { backgroundColor: selectedServingIndex === index ? colors.accent : colors.card, borderColor: selectedServingIndex === index ? colors.accent : colors.border }]}
                    >
                      <Text style={[styles.servingText, { color: selectedServingIndex === index ? colors.accentForeground : colors.foreground }]}>{serving.description}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MEAL</Text>
                <View style={styles.mealRow}>
                  {mealTypes.map((type) => (
                    <Pressable
                      key={type}
                      accessibilityLabel={`Log restaurant item as ${type}`}
                      onPress={() => setMeal(type)}
                      style={[styles.mealChip, { backgroundColor: meal === type ? colors.accent : colors.card, borderColor: meal === type ? colors.accent : colors.border }]}
                    >
                      <Text style={[styles.mealText, { color: meal === type ? colors.accentForeground : colors.foreground }]}>{type}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.providerNote, { backgroundColor: colors.muted }]}>
                  <Feather name={reviewState === 'ready' ? 'check-circle' : reviewState === 'loading' ? 'clock' : 'alert-circle'} size={15} color={colors.mutedForeground} />
                  <Text style={[styles.providerNoteText, { color: colors.mutedForeground }]}>
                    {reviewState === 'ready'
                      ? `Nutrition supplied by ${detailResult.data?.sourceProvider}. Review the portion before it counts.`
                      : reviewState === 'loading'
                        ? 'Checking serving details before review.'
                        : reviewState === 'error'
                          ? 'Serving details are unavailable right now. This item has not been added.'
                          : 'Nutrition is not available for this serving, so it cannot be logged yet.'}
                  </Text>
                </View>
                {reviewState === 'error' ? (
                  <Pressable accessibilityLabel="Retry restaurant serving details" onPress={() => void detailResult.refetch()} style={[styles.retryButton, { borderColor: colors.border }]}>
                    <Feather name="refresh-cw" size={14} color={colors.foreground} />
                    <Text style={[styles.retryButtonText, { color: colors.foreground }]}>Retry serving details</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel="Review restaurant item before logging"
                  disabled={reviewState !== 'ready'}
                  onPress={beginReview}
                  style={[styles.logButton, { backgroundColor: reviewState === 'ready' ? colors.primary : colors.muted }]}
                >
                  <Feather name="check-circle" size={17} color={reviewState === 'ready' ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[styles.logButtonText, { color: reviewState === 'ready' ? colors.primaryForeground : colors.mutedForeground }]}>Review for {meal.toLowerCase()}</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View>
            )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  backButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  content: { paddingHorizontal: 20 },
  introCard: { borderRadius: 22, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  introIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  introBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 4 },
  searchBox: { height: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, paddingVertical: 0 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1, marginTop: 18, marginBottom: 9 },
  chainRow: { gap: 8, paddingRight: 12 },
  chainChip: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  chainText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  centerState: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  stateCard: { borderWidth: 1, borderRadius: 20, padding: 18, alignItems: 'center', marginTop: 22 },
  stateIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'center' },
  stateBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5, maxWidth: 290 },
  primaryButton: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, marginTop: 14 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  startState: { alignItems: 'center', paddingVertical: 38, paddingHorizontal: 24, gap: 9 },
  startText: { fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  results: { marginTop: 22, gap: 10 },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  resultCount: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  resultCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  resultImage: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#e7ece5' },
  resultBrand: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' },
  resultName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 2 },
  resultServing: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  resultNutrition: { alignItems: 'flex-end' },
  resultCalories: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  resultCaloriesLabel: { fontFamily: 'Inter_500Medium', fontSize: 8 },
  attribution: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 22, paddingHorizontal: 6 },
  attributionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14 },
  detailSheet: { paddingHorizontal: 20, paddingTop: 10 },
  detailScroll: { flexShrink: 1, minHeight: 0 },
  detailScrollContent: { paddingBottom: 34 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#c7cec8', alignSelf: 'center', marginBottom: 17 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailBrand: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.5, marginTop: 5 },
  detailImage: { width: '100%', height: 178, borderRadius: 20, marginTop: 16, backgroundColor: '#e7ece5' },
  nutritionCard: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17 },
  macroValueLarge: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  macroValue: { fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'center' },
  macroLabel: { fontFamily: 'Inter_500Medium', fontSize: 8, marginTop: 2 },
  servingRow: { gap: 8, paddingRight: 12 },
  servingChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, maxWidth: 220 },
  servingText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: { flexGrow: 1, minWidth: '46%', borderWidth: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  mealText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  providerNote: { borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 18 },
  providerNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  retryButton: { minHeight: 42, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  retryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  logButton: { minHeight: 49, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  logButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});