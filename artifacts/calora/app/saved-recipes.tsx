import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getGetPremiumRecipeQueryKey, getPremiumRecipe, getRecipe, type PremiumRecipe, type Recipe } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppChrome';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { RecipeCard, RecipeDetailModal } from '@/app/(tabs)/recipes';
import { ScalePressable } from '@/components/ScalePressable';
import { useCalora, type CaloraRecipe } from '@/context/CaloraContext';
import { useAuth } from '@/context/AuthContext';
import { requestGeneratedRecipePhoto } from '@/lib/recipeGeneration';
import { premiumRecipeDetailQueryKey } from '@/lib/premiumRecipeQueryKeys';
import { isPremiumRecipeId } from '@/lib/premiumSavedRecipes';
import { recipeProvenance } from '@/lib/recipeModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SavedRecipe = Recipe | CaloraRecipe | PremiumRecipe;
type SavedSource = 'discover' | 'plus' | 'create';
type SavedFilter = 'all' | SavedSource;

const SOURCE_META: Record<SavedSource, {
  label: string;
  eyebrow: string;
  description: string;
  icon: 'compass' | 'award' | 'edit-3';
}> = {
  discover: {
    label: 'Discover',
    eyebrow: 'OPEN RECIPE COLLECTION',
    description: 'Open recipes to explore, save, and revisit.',
    icon: 'compass',
  },
  plus: {
    label: 'Plus',
    eyebrow: 'CURATED PREMIUM',
    description: 'Your premium shortlist, ready for the next meal.',
    icon: 'award',
  },
  create: {
    label: 'Create',
    eyebrow: 'YOUR KITCHEN',
    description: 'Recipes you made or built with Calora.',
    icon: 'edit-3',
  },
};

const SOURCE_ORDER: SavedSource[] = ['discover', 'plus', 'create'];

function isLocalRecipe(recipe: SavedRecipe | null): recipe is CaloraRecipe {
  return Boolean(recipe && 'isLocal' in recipe && recipe.isLocal === true);
}

function sourceForRecipe(recipe: SavedRecipe): SavedSource {
  const sourceType = recipeProvenance(recipe).sourceType;
  if (sourceType === 'premium') return 'plus';
  if (sourceType === 'calora_ai' || sourceType === 'user_created') return 'create';
  return 'discover';
}

function sourceForId(id: string, localIds: Set<string>): SavedSource {
  if (isPremiumRecipeId(id)) return 'plus';
  if (localIds.has(id)) return 'create';
  return 'discover';
}

function SourceSection({
  source,
  recipes,
  count,
  colors,
  savedRecipeIds,
  onOpen,
  onSave,
  loading,
  failed,
  signedIn,
  onSignIn,
}: {
  source: SavedSource;
  recipes: SavedRecipe[];
  count: number;
  colors: ReturnType<typeof useCalora>['colors'];
  savedRecipeIds: string[];
  onOpen: (recipe: SavedRecipe) => void;
  onSave: (recipeId: string) => void;
  loading: boolean;
  failed: boolean;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const meta = SOURCE_META[source];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
          <Feather name={meta.icon} size={15} color={colors.primary} />
        </View>
        <View style={styles.sectionHeaderCopy}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{meta.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{meta.label}</Text>
          <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>{meta.description}</Text>
        </View>
        <View style={[styles.sectionCount, { backgroundColor: colors.muted }]}>
          <Text style={[styles.sectionCountValue, { color: colors.foreground }]}>{count}</Text>
          <Text style={[styles.sectionCountLabel, { color: colors.mutedForeground }]}>saved</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Restoring your {meta.label.toLowerCase()} recipes…</Text>
        </View>
      ) : recipes.length > 0 ? (
        <View style={styles.recipeGrid}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.gridCard}>
              <RecipeCard
                recipe={recipe}
                colors={colors}
                saved={savedRecipeIds.includes(recipe.id)}
                imageHeight={118}
                onPress={() => onOpen(recipe)}
                onSave={() => onSave(recipe.id)}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={source === 'plus' && !signedIn ? 'lock' : failed ? 'wifi-off' : 'bookmark'} size={18} color={failed ? colors.warning : colors.primary} />
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {source === 'plus' && !signedIn ? 'Sign in to restore Plus recipes' : failed ? 'This source is temporarily unavailable' : `No saved ${meta.label.toLowerCase()} recipes yet`}
            </Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {source === 'plus' && !signedIn ? 'Your saved Plus recipes are kept safe and will return after sign-in.' : failed ? 'Your saved recipes stay on this device while we wait for the source to return.' : `Save a recipe from ${meta.label} and it will appear here.`}
            </Text>
            {source === 'plus' && !signedIn ? (
              <ScalePressable accessibilityLabel="Sign in to restore Plus recipes" onPress={onSignIn} scale={0.97} haptic="none" style={[styles.statusAction, { backgroundColor: colors.primary }]}>
                <Text style={[styles.statusActionText, { color: colors.primaryForeground }]}>Sign in</Text>
              </ScalePressable>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

export default function SavedRecipesScreen() {
  const { colors, localRecipes, savedRecipeIds, toggleSavedRecipe, updateRecipe } = useCalora();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<SavedFilter>('all');
  const [selected, setSelected] = useState<SavedRecipe | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localIds = useMemo(() => new Set(localRecipes.map((recipe) => recipe.id)), [localRecipes]);
  const savedLocalRecipes = useMemo(() => localRecipes.filter((recipe) => savedRecipeIds.includes(recipe.id)), [localRecipes, savedRecipeIds]);
  const remoteSavedIds = useMemo(() => savedRecipeIds.filter((id) => !localIds.has(id)), [localIds, savedRecipeIds]);
  const discoverIds = useMemo(() => remoteSavedIds.filter((id) => !isPremiumRecipeId(id)), [remoteSavedIds]);
  const premiumIds = useMemo(() => remoteSavedIds.filter(isPremiumRecipeId), [remoteSavedIds]);

  const discoverQueries = useQueries({
    queries: discoverIds.map((id) => ({
      queryKey: ['recipe', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => getRecipe(id, { signal }),
      staleTime: 1000 * 60 * 30,
      retry: 1,
    })),
  });
  const premiumQueries = useQueries({
    queries: premiumIds.map((id) => ({
      queryKey: premiumRecipeDetailQueryKey(user?.id, getGetPremiumRecipeQueryKey(id)),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPremiumRecipe(id, { signal }),
      enabled: Boolean(user?.id),
      staleTime: 1000 * 60 * 10,
      retry: false,
    })),
  });

  const discoverRecipes = useMemo(() => discoverQueries.flatMap((query) => query.data ? [query.data] : []), [discoverQueries]);
  const premiumRecipes = useMemo(() => premiumQueries.flatMap((query) => query.data ? [query.data] : []), [premiumQueries]);
  const savedRecipes = useMemo(() => {
    const byId = new Map<string, SavedRecipe>();
    savedLocalRecipes.forEach((recipe) => byId.set(recipe.id, recipe));
    discoverRecipes.forEach((recipe) => byId.set(recipe.id, recipe));
    premiumRecipes.forEach((recipe) => byId.set(recipe.id, recipe));
    return savedRecipeIds.flatMap((id) => {
      const recipe = byId.get(id);
      return recipe ? [recipe] : [];
    });
  }, [discoverRecipes, premiumRecipes, savedLocalRecipes, savedRecipeIds]);
  const groupedRecipes = useMemo(() => ({
    discover: savedRecipes.filter((recipe) => sourceForRecipe(recipe) === 'discover'),
    plus: savedRecipes.filter((recipe) => sourceForRecipe(recipe) === 'plus'),
    create: savedRecipes.filter((recipe) => sourceForRecipe(recipe) === 'create'),
  }), [savedRecipes]);
  const sourceCounts = useMemo(() => savedRecipeIds.reduce<Record<SavedSource, number>>((counts, id) => {
    const source = sourceForId(id, localIds);
    counts[source] += 1;
    return counts;
  }, { discover: 0, plus: 0, create: 0 }), [localIds, savedRecipeIds]);
  const loadingSources = {
    discover: discoverQueries.some((query) => query.isLoading),
    plus: premiumQueries.some((query) => query.isLoading),
    create: false,
  };
  const failedSources = {
    discover: discoverQueries.some((query) => query.isError),
    plus: premiumQueries.some((query) => query.isError),
    create: false,
  };
  const visibleSources = SOURCE_ORDER.filter((source) => activeFilter === 'all' ? sourceCounts[source] > 0 : activeFilter === source);
  const loadedMissingCount = savedRecipeIds.length - savedRecipes.length;
  const hasUnavailablePremium = sourceCounts.plus > 0 && !user;

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const acknowledgePlan = (message: string) => {
    setPlanNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setPlanNotice(null);
      noticeTimerRef.current = null;
    }, 3800);
  };

  const retryPhoto = async (recipe: CaloraRecipe) => {
    if (recipeProvenance(recipe).sourceType !== 'calora_ai' || recipe.imageStatus === 'pending') return;
    updateRecipe(recipe.id, { imageStatus: 'pending' });
    try {
      const photo = await requestGeneratedRecipePhoto({ title: recipe.name, description: recipe.description ?? '' });
      updateRecipe(recipe.id, { image: photo.imageUrl, imageId: photo.imageId, imageUrlExpiresAt: photo.imageUrlExpiresAt, imageStatus: 'ready' });
    } catch {
      updateRecipe(recipe.id, { imageStatus: 'failed' });
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Saved recipes" back />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
      >
        <LinearGradient colors={[colors.hero, colors.heroMuted]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}>
              <Feather name="bookmark" size={19} color={colors.primary} />
            </View>
            <View style={[styles.heroCount, { borderColor: colors.heroMuted }]}>
              <Text style={[styles.heroCountValue, { color: colors.onHero }]}>{savedRecipeIds.length}</Text>
              <Text style={[styles.heroCountLabel, { color: colors.heroMuted }]}>saved</Text>
            </View>
          </View>
          <Text style={[styles.heroEyebrow, { color: colors.onHero }]}>YOUR RECIPE SHELF</Text>
          <Text style={[styles.heroTitle, { color: colors.onHero }]}>Worth making again.</Text>
          <Text style={[styles.heroBody, { color: colors.onHero }]}>One calm place for recipes you discovered, unlocked, or created yourself.</Text>
        </LinearGradient>

        <View style={styles.filterRow}>
          <SavedFilterChip label="All saved" count={savedRecipeIds.length} active={activeFilter === 'all'} icon="bookmark" colors={colors} onPress={() => setActiveFilter('all')} />
          {SOURCE_ORDER.map((source) => (
            <SavedFilterChip key={source} label={SOURCE_META[source].label} count={sourceCounts[source]} active={activeFilter === source} icon={SOURCE_META[source].icon} colors={colors} onPress={() => setActiveFilter(source)} />
          ))}
        </View>

        {hasUnavailablePremium ? (
          <View style={[styles.accessNotice, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Feather name="lock" size={15} color={colors.primary} />
            <Text style={[styles.accessNoticeText, { color: colors.foreground }]}>Your saved Plus recipes are protected. Sign in to restore them here.</Text>
            <Pressable accessibilityLabel="Sign in to restore saved Plus recipes" onPress={() => router.push('/auth/sign-in')} hitSlop={6}>
              <Text style={[styles.accessNoticeAction, { color: colors.primary }]}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}

        {savedRecipeIds.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
              <Feather name="bookmark" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Build your recipe shelf</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Save something from Discover, Plus, or Create and it will live here with its source clearly marked.</Text>
            <ScalePressable accessibilityLabel="Explore recipes" onPress={() => router.replace('/(tabs)/recipes')} scale={0.97} haptic="none" style={[styles.emptyAction, { backgroundColor: colors.primary }]}>
              <Feather name="compass" size={15} color={colors.primaryForeground} />
              <Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Explore recipes</Text>
            </ScalePressable>
          </View>
        ) : (
          <>
            {loadedMissingCount > 0 && !loadingSources.discover && !loadingSources.plus ? (
              <View style={[styles.syncNotice, { backgroundColor: colors.muted }]}>
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text style={[styles.syncNoticeText, { color: colors.mutedForeground }]}>Some saved recipes are waiting for their source to reconnect.</Text>
              </View>
            ) : null}
            {visibleSources.map((source) => (
              <SourceSection
                key={source}
                source={source}
                recipes={groupedRecipes[source]}
                count={sourceCounts[source]}
                colors={colors}
                savedRecipeIds={savedRecipeIds}
                onOpen={setSelected}
                onSave={toggleSavedRecipe}
                loading={loadingSources[source]}
                failed={failedSources[source]}
                signedIn={Boolean(user)}
                onSignIn={() => router.push('/auth/sign-in')}
              />
            ))}
            {activeFilter !== 'all' && sourceCounts[activeFilter] === 0 ? (
              <View style={[styles.filterEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="bookmark" size={19} color={colors.primary} />
                <Text style={[styles.filterEmptyTitle, { color: colors.foreground }]}>Nothing saved from {SOURCE_META[activeFilter].label} yet</Text>
                <Text style={[styles.filterEmptyText, { color: colors.mutedForeground }]}>Save a recipe from this source and it will be organized here automatically.</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <RecipeDetailModal
        recipe={isLocalRecipe(selected) ? localRecipes.find((recipe) => recipe.id === selected.id) ?? selected : selected}
        onClose={() => setSelected(null)}
        onRetryPhoto={retryPhoto}
        onPlanned={acknowledgePlan}
      />
      <LocalSaveNotice
        visible={Boolean(planNotice)}
        message={planNotice ?? ''}
        colors={colors}
        actionLabel="View Plan"
        onAction={() => {
          if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
          setPlanNotice(null);
          router.push('/(tabs)/planner');
        }}
      />
    </View>
  );
}

function SavedFilterChip({
  label,
  count,
  active,
  icon,
  colors,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  icon: 'bookmark' | 'compass' | 'award' | 'edit-3';
  colors: ReturnType<typeof useCalora>['colors'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} saved`}
      onPress={onPress}
      style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
    >
      <Feather name={icon} size={13} color={active ? colors.primaryForeground : colors.mutedForeground} />
      <Text style={[styles.filterChipText, { color: active ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
      <Text style={[styles.filterChipCount, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingTop: 14, paddingHorizontal: 20 },
  hero: { minHeight: 176, borderRadius: 25, padding: 19, marginBottom: 15, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroCount: { minWidth: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  heroCountValue: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 21 },
  heroCountLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 0.7, textTransform: 'uppercase' },
  heroEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.25, marginTop: 20 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.7, marginTop: 5 },
  heroBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, maxWidth: 300, marginTop: 7 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 19 },
  filterChip: { minHeight: 36, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  filterChipCount: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  accessNotice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  accessNoticeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15 },
  accessNoticeAction: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  syncNotice: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 17 },
  syncNoticeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, gap: 9 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderCopy: { flex: 1 },
  sectionEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.05 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3, marginTop: 2 },
  sectionDescription: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 2 },
  sectionCount: { minWidth: 45, borderRadius: 11, paddingHorizontal: 7, paddingVertical: 5, alignItems: 'center' },
  sectionCountValue: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 15 },
  sectionCountLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  recipeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  gridCard: { width: '48.5%' },
  statusCard: { minHeight: 80, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusCopy: { flex: 1 },
  statusTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 16 },
  statusText: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  statusAction: { alignSelf: 'flex-start', minHeight: 32, borderRadius: 9, paddingHorizontal: 11, justifyContent: 'center', marginTop: 8 },
  statusActionText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  emptyState: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 3 },
  emptyIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, textAlign: 'center', letterSpacing: -0.3 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  emptyAction: { minHeight: 42, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17 },
  emptyActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  filterEmpty: { minHeight: 130, borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', justifyContent: 'center' },
  filterEmptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, textAlign: 'center', marginTop: 9 },
  filterEmptyText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5, maxWidth: 280 },
});
