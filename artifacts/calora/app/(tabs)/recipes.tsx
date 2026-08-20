import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ActivityIndicator, AppState, Keyboard, Linking, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, getGetPremiumRecipeQueryKey, getListPremiumRecipesQueryKey, getRecipe, useGetPremiumRecipe, useGetRecipe, useListPremiumRecipes, useListRecipes, type PremiumRecipe, type Recipe } from '@workspace/api-client-react';
import { CaloraRecipe, useCalora } from '@/context/CaloraContext';
import { BRAND, URLS } from '@/lib/brand';
import { parseRecipeInstructionSteps } from '@/lib/recipe-instructions';
import { formatCalories, formatGrams, formatQuantity, formatWhole } from '@/lib/formatters';
import { AppHeader } from '@/components/AppChrome';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { applySlotReplace, getPlannerWeekStart, plannerDate, plannerMealTypes } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { SwipeableTabList } from '@/components/SwipeableTabList';
import { dateKey } from '@/lib/dates';
import { recipeNutritionLabel, recipeProvenance, recipeSourceLabel } from '@/lib/recipeModel';
import { requestGeneratedRecipe, requestRecipeConcepts } from '@/lib/recipeGeneration';
import { requestGuestRecipeConcepts } from '@/lib/recipeGeneration';
import { useAuth } from '@/context/AuthContext';
import { premiumRecipeDetailQueryKey, premiumRecipeListQueryKey } from '@/lib/premiumRecipeQueryKeys';
import { hasCurrentPremiumAccess } from '@/lib/premiumRecipeAccess';

const categories = ['For you', 'Breakfast', 'Lunch', 'Dinner', 'Supper', 'Vegetarian', 'Chicken', 'Seafood', 'Dessert', 'Quick'];
const RECIPE_PAGE_SIZE = 18;
const RECIPE_SECTIONS = ['discover', 'premium', 'create'] as const;

function recipeKey(recipe: Recipe | CaloraRecipe) {
  return recipe.id;
}

function isLocalRecipe(recipe: Recipe | CaloraRecipe): recipe is CaloraRecipe {
  return 'isLocal' in recipe && recipe.isLocal === true;
}

function RecipeImage({ recipe, height = 160 }: { recipe: Recipe | CaloraRecipe; height?: number }) {
  return recipe.image ? (
    <Image source={{ uri: recipe.image }} contentFit="cover" transition={180} cachePolicy="memory-disk" style={[styles.recipeImage, { height }]} />
  ) : (
    <View style={[styles.recipeImage, styles.imageFallback, { height }]}>
      <Image source={require('../../assets/images/calora-recipes-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={['rgba(18,34,24,0.18)', 'rgba(18,34,24,0.82)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.imageFallbackCopy}>
        <Feather name="book-open" size={22} color="#d4eadc" />
        <Text style={styles.imageFallbackText}>{BRAND.name} recipe</Text>
      </View>
    </View>
  );
}

function RecipeMeta({ recipe, colors }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors'] }) {
  const estimated = recipeProvenance(recipe).nutritionConfidence === 'estimated';
  // Non-local recipes always have AI-estimated nutrition — prefix with ~ so
  // the user knows it is approximate. Local recipes have user-entered values.
  const nutrition = recipe.calories
    ? `${estimated ? '~' : ''}${formatCalories(recipe.calories)}`
    : recipeNutritionLabel(recipe);
  return (
    <View style={styles.recipeMeta}>
      <Text style={[styles.recipeKcal, { color: recipe.calories ? colors.foreground : colors.warning }]}>{nutrition}</Text>
      {recipe.proteinG ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{estimated ? '~' : ''}{formatGrams(recipe.proteinG)} P</Text> : null}
      {recipe.prepMinutes ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{recipe.prepMinutes} min</Text> : null}
    </View>
  );
}

function RecipeCard({ recipe, colors, saved, onPress, onSave, imageHeight = 160, remainingCalories }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors']; saved: boolean; onPress: () => void; onSave: () => void; imageHeight?: number; remainingCalories?: number }) {
  const local = isLocalRecipe(recipe);
  const provenance = recipeProvenance(recipe);
  const fitsGoal = remainingCalories !== undefined && remainingCalories > 0 && recipe.calories != null && recipe.calories > 0 && recipe.calories <= remainingCalories;
  return (
    <View style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${recipe.name}`}
          onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
        >
          <RecipeImage recipe={recipe} height={imageHeight} />
          {fitsGoal && <View style={[styles.fitsBadge, { backgroundColor: colors.primary }]}><Feather name="check-circle" size={8} color={colors.primaryForeground} /><Text style={[styles.fitsBadgeText, { color: colors.primaryForeground }]}>FITS YOUR GOAL</Text></View>}
           {local && <View style={[styles.localBadge, { backgroundColor: colors.primary }]}><Text style={[styles.localBadgeText, { color: colors.primaryForeground }]}>{provenance.sourceType === 'calora_ai' ? 'CALORA AI' : 'MY RECIPE'}</Text></View>}
          <View style={styles.cardContent}>
            <Text numberOfLines={2} style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
            <RecipeMeta recipe={recipe} colors={colors} />
            <View style={styles.cardFooter}>
               <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{recipeSourceLabel(recipe)}</Text>
              <Feather name="arrow-up-right" size={13} color={colors.mutedForeground} />
            </View>
          </View>
        </Pressable>
        <Pressable accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${recipe.name}`} onPress={onSave} style={[styles.saveButton, { backgroundColor: saved ? colors.primary : colors.card }]}>
          <Feather name="bookmark" size={16} color={saved ? colors.primaryForeground : colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

type RecipeSection = 'discover' | 'premium' | 'create';

function UpcomingRecipeSection({
  section,
  colors,
  onDiscover,
}: {
  section: Exclude<RecipeSection, 'discover'>;
  colors: ReturnType<typeof useCalora>['colors'];
  onDiscover: () => void;
}) {
  const premium = section === 'premium';
  const title = premium ? 'Premium recipes are on their way.' : 'Create with Calora is taking shape.';
  const body = premium
    ? 'This space will bring richer recipe sources into the same trusted Calora flow—without changing what you already use in Discover.'
    : 'Soon you’ll be able to turn your ingredients, goals, and meal plan into a few thoughtful recipe ideas.';
  return (
    <View style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.upcomingIcon, { backgroundColor: colors.accent }]}>
        <Feather name={premium ? 'award' : 'star'} size={20} color={colors.accentForeground} />
      </View>
      <Text style={[styles.upcomingEyebrow, { color: colors.primary }]}>{premium ? 'A RICHER RECIPE SOURCE' : 'PERSONALIZED COOKING'}</Text>
      <Text style={[styles.upcomingTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.upcomingBody, { color: colors.mutedForeground }]}>{body}</Text>
      <ScalePressable accessibilityLabel="Browse Discover recipes" onPress={onDiscover} scale={0.97} haptic="none" style={[styles.upcomingAction, { backgroundColor: colors.muted }]}>
        <Feather name="compass" size={14} color={colors.foreground} />
        <Text style={[styles.upcomingActionText, { color: colors.foreground }]}>Browse Discover</Text>
      </ScalePressable>
    </View>
  );
}

type RecipeConcept = { title: string; summary: string; whyItFits: string; keyIngredients: string[]; estimatedMinutes: number | null };
function CreateConcepts({ colors, onOpenRecipe }: { colors: ReturnType<typeof useCalora>['colors']; onOpenRecipe: (recipe: CaloraRecipe) => void }) {
  const { shoppingItems, plannerMeals, logs, profile, saveRecipe } = useCalora();
  const { session } = useAuth();
  const [mode, setMode] = useState<'pantry' | 'goals' | 'tell' | 'surprise'>('pantry');
  const [request, setRequest] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [mealType, setMealType] = useState('Dinner');
  const [servings, setServings] = useState('2');
  const [minutes, setMinutes] = useState('30');
  const [concepts, setConcepts] = useState<RecipeConcept[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [finishingTitle, setFinishingTitle] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const finishingRef = useRef(false);
  const start = (next: typeof mode) => {
    setMode(next);
    if (next === 'pantry') setIngredients(session ? shoppingItems.filter((item) => !item.checked).slice(0, 8).map((item) => item.name).join(', ') : '');
    if (next === 'goals') setRequest(session ? `${profile?.diet ?? 'Balanced'} ${mealType.toLowerCase()} that supports my ${profile?.goal ?? 'wellness'} goal` : `A balanced ${mealType.toLowerCase()} idea`);
    if (next === 'surprise') setRequest(session ? `A fresh ${mealType.toLowerCase()} idea inspired by my plan: ${plannerMeals.slice(0, 2).map((meal) => meal.name).join(', ')}` : `A fresh ${mealType.toLowerCase()} idea`);
  };
  const generate = async () => {
    if (finishingRef.current) return;
    abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller;
    setStatus('loading'); setError(''); setConcepts([]);
    try {
      const contextIngredients = session
        ? (mode === 'pantry' ? ingredients : ingredients || logs.slice(0, 3).map((log) => log.name).join(', '))
        : ingredients;
      const payload = { ingredients: contextIngredients.split(',').map((item) => item.trim()).filter(Boolean), mealType, servings: Number(servings), maxMinutes: Number(minutes), preferences: session && profile ? [profile.diet, `${profile.goal} goal`] : [], request };
      const data = session
        ? await requestRecipeConcepts<{ concepts?: RecipeConcept[] }>(payload, controller.signal)
        : await requestGuestRecipeConcepts<{ concepts?: RecipeConcept[] }>(payload, controller.signal);
      setConcepts(data.concepts ?? []); setStatus('idle');
    } catch (cause) {
      if ((cause as Error).name === 'AbortError') {
        setStatus('idle');
        abortRef.current = null;
      } else {
        setStatus('error');
        setError((cause as Error).message);
      }
    }
  };
  const constraints = [{ label: 'Meal', value: mealType, setter: setMealType }, { label: 'Serves', value: servings, setter: setServings }, { label: 'Minutes', value: minutes, setter: setMinutes }];
  const finishConcept = async (concept: RecipeConcept) => {
    if (finishingRef.current) return;
    if (!session) {
      setError('Sign in to turn an idea into a full recipe and save it to your collection.');
      return;
    }
    finishingRef.current = true;
    setFinishingTitle(concept.title); setError('');
    try {
      const generated = await requestGeneratedRecipe<{ name: string; description: string; ingredients: string[]; instructions: string[]; prepMinutes: number | null; servings: number; allergens?: string[]; nutrition?: { calories?: number; proteinG?: number; carbsG?: number; fatG?: number } }>({ title: concept.title, summary: concept.summary, servings: Number(servings) });
      onOpenRecipe(saveRecipe({ name: generated.name, description: generated.description, ingredients: generated.ingredients, instructions: generated.instructions.join('\n'), tags: ['Calora AI', ...(generated.allergens ?? [])], prepMinutes: generated.prepMinutes, servings: generated.servings, calories: generated.nutrition?.calories, proteinG: generated.nutrition?.proteinG, carbsG: generated.nutrition?.carbsG, fatG: generated.nutrition?.fatG, source: 'Calora AI', sourceUrl: '', isLocal: true, sourceType: 'calora_ai', sourceProvider: 'Calora AI', nutritionConfidence: 'estimated', nutritionSource: 'AI estimate', createdAt: new Date().toISOString() }));
    } catch (cause) { setError((cause as Error).message); } finally { finishingRef.current = false; setFinishingTitle(null); }
  };
  return <View>
    <View style={[styles.createHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.createHeroIcon, { backgroundColor: colors.accent }]}><Feather name="star" size={20} color={colors.accentForeground} /></View>
      <View style={{ flex: 1 }}><Text style={[styles.createHeroTitle, { color: colors.foreground }]}>AI Recipe Creator</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>{session ? 'Add ingredients and choose preferences for ideas made around you.' : 'Add ingredients and preferences to generate a few recipe ideas—no account needed.'}</Text></View>
    </View>
    <Text style={[styles.sectionCaption, { color: colors.mutedForeground, marginBottom: 12 }]}>Choose a starting point, then tailor your meal.</Text>
    <View style={styles.createModeGrid}>{([['pantry', session ? 'Use my pantry' : 'Add my ingredients', 'shopping-bag'], ['goals', session ? 'Match my goals' : 'Choose a style', 'target'], ['tell', 'Tell Calora', 'message-circle'], ['surprise', 'Surprise me', 'shuffle']] as const).map(([key, label, icon]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: mode === key }} onPress={() => start(key)} style={[styles.createModeCard, { backgroundColor: mode === key ? colors.accent : colors.card, borderColor: mode === key ? colors.primary : colors.border }]}><Feather name={icon} size={17} color={colors.primary} /><Text style={[styles.createModeText, { color: colors.foreground }]}>{label}</Text></Pressable>)}</View>
    <View style={[styles.createSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Ingredients or request</Text>
      <TextInput value={mode === 'tell' ? request : ingredients} onChangeText={mode === 'tell' ? setRequest : setIngredients} placeholder={mode === 'tell' ? 'e.g. cozy vegetarian dinner with lentils' : 'e.g. lentils, spinach, lemon'} placeholderTextColor={colors.mutedForeground} multiline style={[styles.createInput, { color: colors.foreground, borderColor: colors.border }]} />
      <View style={styles.createConstraintRow}>{constraints.map((item) => <View key={item.label} style={{ flex: 1 }}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{item.label}</Text><TextInput value={item.value} onChangeText={item.setter} keyboardType={item.label === 'Meal' ? 'default' : 'number-pad'} style={[styles.createInput, { color: colors.foreground, borderColor: colors.border }]} /></View>)}</View>
      {!session && <Text style={[styles.guestBoundary, { color: colors.mutedForeground }]}>Guest ideas are generic. Sign in to use your pantry and turn an idea into a saved recipe.</Text>}
      <ScalePressable accessibilityLabel="Generate five recipe ideas" onPress={generate} disabled={status === 'loading' || Boolean(finishingTitle)} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name="star" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{status === 'loading' ? 'Generating ideas…' : 'Generate 5 ideas'}</Text></ScalePressable>
      {status === 'loading' && <Pressable onPress={() => abortRef.current?.abort()}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>}
      {status === 'error' && <View style={[styles.notice, { backgroundColor: colors.accent }]}><Text style={[styles.noticeText, { color: colors.foreground }]}>{error}</Text><Pressable onPress={generate}><Text style={[styles.shopActionText, { color: colors.primary }]}>Retry</Text></Pressable></View>}
    </View>
    {concepts.map((concept, index) => <Pressable key={`${concept.title}-${index}`} accessibilityLabel={`${session ? 'Open' : 'Preview'} ${concept.title}`} disabled={Boolean(finishingTitle)} onPress={() => finishConcept(concept)} style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.cardContent}><Text style={[styles.detailEyebrow, { color: colors.primary }]}>CONCEPT {index + 1}</Text><Text style={[styles.recipeName, { color: colors.foreground }]}>{concept.title}</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{concept.summary}</Text><Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{!session ? 'Sign in to turn this into a full saved recipe' : finishingTitle === concept.title ? 'Building your recipe…' : `${concept.whyItFits}${concept.estimatedMinutes ? ` · ~${concept.estimatedMinutes} min` : ''}`}</Text></View></Pressable>)}
  </View>;
}

function PremiumCatalogue({ colors, onOpen, onSave, savedPremiumRecipes, onLoadMoreRef }: { colors: ReturnType<typeof useCalora>['colors']; onOpen: (recipe: PremiumRecipe) => void; onSave: (recipe: PremiumRecipe) => void; savedPremiumRecipes: PremiumRecipe[]; onLoadMoreRef: React.MutableRefObject<(() => void) | null> }) {
  const { savedRecipeIds, toggleSavedRecipe } = useCalora();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [offset, setOffset] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [loadedRecipes, setLoadedRecipes] = useState<PremiumRecipe[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMountedFiltersRef = useRef(false);
  const premiumParams = { query: search || undefined, category: category || undefined, limit: RECIPE_PAGE_SIZE, offset };
  const userId = session?.user.id ?? null;
  const premiumQueryKey = premiumRecipeListQueryKey(userId, getListPremiumRecipesQueryKey(premiumParams));
  const query = useListPremiumRecipes(premiumParams, { query: { queryKey: premiumQueryKey, enabled: Boolean(userId), staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always', refetchInterval: 60_000 } });
  const accessDeniedStatus = query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403)
    ? query.error.status
    : null;
  const accessDenied = accessDeniedStatus !== null;
  // A cached response only describes a past entitlement. Never render it until
  // a request mounted for this screen has verified current server access.
  const currentAccess = hasCurrentPremiumAccess(query);
  const data = currentAccess ? query.data : undefined;
  useEffect(() => {
    if (!accessDenied) return;
    queryClient.removeQueries({ queryKey: premiumQueryKey, exact: true });
  }, [accessDenied, premiumQueryKey, queryClient]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void query.refetch();
    });
    return () => subscription.remove();
  }, [query.refetch]);
  useEffect(() => {
    if (!data?.recipes) return;
    setLoadedRecipes((current) => offset === 0 || loadedForUserId !== userId ? data.recipes : [...current, ...data.recipes.filter((recipe) => !current.some((item) => item.id === recipe.id))]);
    setLoadedForUserId(userId);
    loadingMoreRef.current = false;
  }, [data?.recipes, loadedForUserId, offset, userId]);
  useEffect(() => {
    onLoadMoreRef.current = () => {
      if (data?.nextOffset == null || query.isFetching || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setOffset(data.nextOffset);
    };
    return () => { onLoadMoreRef.current = null; };
  }, [data?.nextOffset, onLoadMoreRef, query.isFetching]);
  useEffect(() => {
    // React Query can restore Premium results from cache immediately when this
    // section remounts. Do not clear that restored list on the initial render;
    // only reset pagination after an actual search/filter change.
    if (!hasMountedFiltersRef.current) {
      hasMountedFiltersRef.current = true;
      return;
    }
    setOffset(0);
    setLoadedRecipes([]);
    loadingMoreRef.current = false;
  }, [search, category]);
  const hasLoadedRecipes = loadedForUserId === userId && loadedRecipes.length > 0;
  if (!session) return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="lock" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to browse Premium recipes</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Premium recipe sources are available to signed-in members only.</Text><Pressable accessibilityLabel="Sign in to access Premium recipes" onPress={() => router.push('/auth/sign-in')} style={[styles.emptyAction, { backgroundColor: colors.primary }]}><Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Sign in</Text></Pressable></View>;
  if (accessDenied) return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="award" size={22} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{accessDeniedStatus === 401 ? 'Sign in to browse Premium recipes' : 'Premium membership required'}</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{accessDeniedStatus === 401 ? 'Your session has ended. Sign in again to access Premium recipes.' : 'An active Calora Premium membership is required to browse these recipes.'}</Text></View>;
  // A new offset has its own React Query key. Do not replace an existing grid
  // with the initial loader/error state while that page is resolving: collapsing
  // the parent ScrollView content makes React Native clamp its scroll offset.
  if (query.isError && !accessDenied) return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={22} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Premium recipes are unavailable</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try again shortly. Discover remains available.</Text><Pressable onPress={() => query.refetch()} style={[styles.emptyAction, { backgroundColor: colors.primary }]}><Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Retry</Text></Pressable></View>;
  if (!currentAccess) return <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Checking Premium access…</Text></View>;
  if (data?.status === 'error' && !hasLoadedRecipes) return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={22} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Premium recipes are unavailable</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{data.message ?? 'Try again shortly. Discover remains available.'}</Text><Pressable onPress={() => query.refetch()} style={[styles.emptyAction, { backgroundColor: colors.primary }]}><Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Retry</Text></Pressable></View>;
   if (data?.status === 'restricted') return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="lock" size={22} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Premium recipes are not available</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{data.message ?? 'This recipe provider is not enabled for this account yet. Discover remains available.'}</Text></View>;
  if (data?.status === 'unavailable') return <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="link-2" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Premium source not connected</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{data.message}</Text></View>;
  const recipes = loadedRecipes;
  const savedRecipes = savedPremiumRecipes.filter((recipe) => savedRecipeIds.includes(recipe.id));
  return <><View style={styles.premiumToolbar}><View style={[styles.searchBox, { flex: 1, backgroundColor: colors.card, borderColor: colors.input }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search Premium recipes" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View><Pressable accessibilityLabel="Open Premium recipe filters" onPress={() => setFilterVisible(true)} style={[styles.filterButton, { backgroundColor: colors.muted }]}><Feather name="sliders" size={17} color={colors.foreground} /></Pressable></View><Text style={[styles.sectionCaption, { color: colors.mutedForeground, marginBottom: 12 }]}>{data?.provider} · provider-supplied recipe information</Text>{savedRecipes.length > 0 && <><View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved Premium recipes</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Your Premium shortlist, ready when you are.</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>{savedRecipes.map((recipe) => <View key={recipe.id} style={{ width: 220 }}><RecipeCard recipe={recipe} colors={colors} saved imageHeight={160} onPress={() => onOpen(recipe)} onSave={() => { toggleSavedRecipe(recipe.id); onSave(recipe); }} /></View>)}</ScrollView></>}{recipes.length === 0 ? <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Premium recipes found</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search or filter.</Text></View> : <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.recipeGrid}>{recipes.map((recipe) => <View key={recipe.id} style={styles.recipeGridCard}><RecipeCard recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} imageHeight={122} onPress={() => onOpen(recipe)} onSave={() => { toggleSavedRecipe(recipe.id); onSave(recipe); }} /></View>)}</Animated.View>}<Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}><View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}><View style={[styles.createSheet, { backgroundColor: colors.background }]}><Text style={[styles.detailTitle, { color: colors.foreground }]}>Premium filters</Text><Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Category</Text><TextInput value={category} onChangeText={setCategory} placeholder="e.g. Dinner" placeholderTextColor={colors.mutedForeground} style={[styles.createInput, { color: colors.foreground, borderColor: colors.border }]} /><Pressable onPress={() => setFilterVisible(false)} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Apply filters</Text></Pressable></View></View></Modal></>;
}

function ReviewComponent({ component, colors, onChange }: { component: FoodMemoryComponent; colors: ReturnType<typeof useCalora>['colors']; onChange: (c: FoodMemoryComponent) => void }) {
  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.reviewCardHeader}>
        <View style={[styles.reviewCardIcon, { backgroundColor: component.provenance === 'recipe_personal' ? colors.hero : colors.accent }]}>
          <Feather name={component.provenance === 'recipe_personal' ? 'book-open' : 'book'} size={15} color={component.provenance === 'recipe_personal' ? colors.heroMuted : colors.accentForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewCardName, { color: colors.foreground }]}>{component.name}</Text>
          <Text style={[styles.reviewCardSource, { color: colors.mutedForeground }]}>{component.sourceLabel} · {component.confidence}% confidence</Text>
        </View>
      </View>
      <View style={styles.reviewNutritionRow}>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{formatWhole(component.calories * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{formatGrams(component.proteinG * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{formatGrams(component.carbsG * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{formatGrams(component.fatG * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
      </View>
      <Text style={[styles.reviewFieldLabel, { color: colors.mutedForeground }]}>How much did you eat?</Text>
      <View style={styles.reviewFractionRow}>
        <Pressable accessibilityLabel="Decrease portion" onPress={() => onChange({ ...component, eatenFraction: Math.max(0.25, component.eatenFraction - 0.25) })} style={[styles.reviewFractionButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={14} color={colors.foreground} /></Pressable>
        <Text style={[styles.reviewFractionValue, { color: colors.foreground }]}>{Math.round(component.eatenFraction * 100)}%</Text>
        <Pressable accessibilityLabel="Increase portion" onPress={() => onChange({ ...component, eatenFraction: Math.min(1, component.eatenFraction + 0.25) })} style={[styles.reviewFractionButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={14} color={colors.foreground} /></Pressable>
      </View>
      {component.reviewQuestions.length > 0 && <Text style={[styles.reviewQuestion, { color: colors.warning }]}>{component.reviewQuestions[0]}</Text>}
    </View>
  );
}
// Scale a leading numeric quantity in an ingredient string by a multiplier.
// Handles integers and simple fractions (1/2, 1/4). Returns original on failure.
function scaleIngredient(ingredient: string, multiplier: number): string {
  if (multiplier === 1) return ingredient;
  const match = ingredient.match(/^(\d+(?:\/\d+)?)\s*/);
  if (!match) return ingredient;
  const raw = match[1];
  let qty: number;
  if (raw.includes('/')) {
    const [num, den] = raw.split('/');
    qty = parseInt(num, 10) / parseInt(den, 10);
  } else {
    qty = parseInt(raw, 10);
  }
  if (!isFinite(qty) || qty <= 0) return ingredient;
  const scaled = Math.round(qty * multiplier * 100) / 100;
  const formatted =
    scaled === 0.25 ? '¼' : scaled === 0.5 ? '½' : scaled === 0.75 ? '¾' :
    scaled === 1.25 ? '1¼' : scaled === 1.5 ? '1½' : scaled === 1.75 ? '1¾' :
    Number.isInteger(scaled) ? String(scaled) : formatQuantity(scaled, 1);
  return ingredient.replace(match[0], `${formatted} `).trimEnd();
}

function RecipeDetailModal({ recipe, onClose, onPlanned }: { recipe: Recipe | CaloraRecipe | null; onClose: () => void; onPlanned: (message: string) => void }) {
  const { colors, profile, savedRecipeIds, toggleSavedRecipe, createRecipeDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory, foodDrafts, plannerMeals, updatePlannerMeals, plannerViewedDay, recipeSlotTarget, setRecipeSlotTarget, setPendingUndoSwap, setPendingPlannerAck, addIngredientsToShopping } = useCalora();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const local = recipe ? isLocalRecipe(recipe) : false;
  const premium = recipe ? recipeProvenance(recipe).sourceType === 'premium' : false;
  const remoteRecipeId = recipe && !local && !premium ? recipe.id : '';
  const premiumSourceId = recipe && premium ? recipeProvenance(recipe).sourceId : '';
  const detailQuery = useGetRecipe(remoteRecipeId, {
    query: {
      queryKey: ['recipe', remoteRecipeId],
      enabled: Boolean(remoteRecipeId),
      staleTime: 1000 * 60 * 30,
      // When nutrition hasn't been estimated yet (server returns nutritionPending),
      // poll every 4 s so the strip fills in as soon as the background job lands.
      refetchInterval: (query) => {
        const data = query.state.data as (Recipe & { nutritionPending?: boolean }) | undefined;
        return data?.nutritionPending ? 4000 : false;
      },
    },
  });
  const premiumDetailKey = premiumRecipeDetailQueryKey(session?.user.id, getGetPremiumRecipeQueryKey(premiumSourceId));
  const premiumDetailQuery = useGetPremiumRecipe(premiumSourceId, { query: { queryKey: premiumDetailKey, enabled: Boolean(premiumSourceId && session?.user.id), staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always', refetchInterval: 60_000 } });
  const premiumDetailDenied = premiumDetailQuery.error instanceof ApiError && (premiumDetailQuery.error.status === 401 || premiumDetailQuery.error.status === 403);
  useEffect(() => {
    if (!premiumDetailDenied) return;
    queryClient.removeQueries({ queryKey: premiumDetailKey, exact: true });
    onClose();
  }, [onClose, premiumDetailDenied, premiumDetailKey, queryClient]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && premium) void premiumDetailQuery.refetch();
    });
    return () => subscription.remove();
  }, [premium, premiumDetailQuery.refetch]);
  const detail = premium
    ? hasCurrentPremiumAccess(premiumDetailQuery)
      ? premiumDetailQuery.data
      : null
    : detailQuery.data ?? recipe;

  // Existing review state (used for local recipes)
  const [reviewDraftId, setReviewDraftId] = useState<string | null>(null);
  const [planVisible, setPlanVisible] = useState(false);
  // Feature 1: serving count scales nutrition strip and ingredient quantities
  const [servingCount, setServingCount] = useState(1);
  // Feature 4: shopping list sheet
  const [shopVisible, setShopVisible] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  // Feature 6: smart diary sheet (remote recipes)
  const [diaryVisible, setDiaryVisible] = useState(false);
  const [diaryMealType, setDiaryMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Dinner');
  const [diaryServings, setDiaryServings] = useState(1);
  const [diaryLogged, setDiaryLogged] = useState(false);

  // Default to the slot the user came from (if browsing from an empty planner slot),
  // or else the day currently viewed in the Planner.
  const [planDay, setPlanDay] = useState(() => recipeSlotTarget?.day ?? plannerViewedDay ?? dateKey());
  const [planMealType, setPlanMealType] = useState<PlannerMeal['meal']>(() => recipeSlotTarget?.mealType ?? 'Dinner');
  const reviewDraft = reviewDraftId ? (foodDrafts.find((d) => d.id === reviewDraftId) ?? null) : null;

  if (!detail) return null;
  const canLog = Boolean(detail.calories && detail.calories > 0);
  // True when the server returned nutritionPending: the recipe is loaded but
  // AI estimation is running in the background — poll until it lands.
  const nutritionPending = !local && !premium && Boolean((detailQuery.data as (Recipe & { nutritionPending?: boolean }) | undefined)?.nutritionPending);
  // True when the server explicitly flagged that AI estimation failed for this recipe.
  const nutritionUnavailable = !local && Boolean((detailQuery.data as (Recipe & { nutritionUnavailable?: boolean }) | undefined)?.nutritionUnavailable);
  const premiumNutritionUnavailable = premium && recipeProvenance(detail).nutritionConfidence === 'unavailable';
  const isFetchingDetail = premium ? (premiumDetailQuery.isLoading || premiumDetailQuery.isFetching) : (detailQuery.isLoading || detailQuery.isFetching);
  const premiumFields = premium ? detail as PremiumRecipe : null;
  const provenance = recipeProvenance(detail);
  const hasThirdPartySource = provenance.sourceType === 'open' || provenance.sourceType === 'premium' || provenance.sourceType === 'imported';
  const sourceName = detail.source.trim() || provenance.sourceProvider;
  const sourceUrl = /^https?:\/\//i.test(detail.sourceUrl ?? '') ? detail.sourceUrl : null;

  // Nutrition scaled to current servingCount for display
  const approxPrefix = recipeProvenance(detail).nutritionConfidence === 'estimated' ? '~' : '';
  const scaledKcal = detail.calories ? Math.round(detail.calories * servingCount) : null;
  const scaledProtein = detail.proteinG ? Math.round(detail.proteinG * servingCount) : null;
  const scaledCarbs = detail.carbsG ? Math.round(detail.carbsG * servingCount) : null;
  const scaledFat = detail.fatG ? Math.round(detail.fatG * servingCount) : null;
  const servingLabel = servingCount === 0.5 ? '½' : servingCount === 1.5 ? '1½' : servingCount === 2.5 ? '2½' : servingCount === 3.5 ? '3½' : String(servingCount);

  // --- review flow (local recipes only) ---
  const openReview = () => {
    if (!canLog) return;
    const draft = createRecipeDraft(detail, dateKey(), 'Dinner');
    setReviewDraftId(draft.id);
  };
  const updateComponent = (component: FoodMemoryComponent) => {
    if (!reviewDraft) return;
    updateFoodMemoryDraft(reviewDraft.id, reviewDraft.components.map((item) => item.id === component.id ? component : item));
  };
  const acceptDraft = () => {
    if (!reviewDraft) return;
    acceptFoodMemory(reviewDraft.id);
    setReviewDraftId(null);
    onClose();
  };
  const dismissReview = () => {
    if (reviewDraft) rejectFoodMemory(reviewDraft.id);
    setReviewDraftId(null);
  };
  const handleClose = () => {
    if (reviewDraft) rejectFoodMemory(reviewDraft.id);
    setReviewDraftId(null);
    onClose();
  };

  // --- Feature 6: smart diary logging (remote recipes) ---
  const logToDiary = () => {
    if (!canLog || !detail) return;
    // Pre-scale the nutrition so eatenFraction=1.0 in the draft equals exactly what the user selected
    const scaled = {
      ...detail,
      calories: detail.calories ? detail.calories * diaryServings : null,
      proteinG: detail.proteinG ? detail.proteinG * diaryServings : null,
      carbsG: detail.carbsG ? detail.carbsG * diaryServings : null,
      fatG: detail.fatG ? detail.fatG * diaryServings : null,
    };
    const draft = createRecipeDraft(scaled, dateKey(), diaryMealType);
    // Pass the draft directly: createRecipeDraft calls setFoodDrafts which is
    // queued and not yet reflected in the foodDrafts closure that
    // acceptFoodMemory reads from. Passing draftOverride bypasses that lookup.
    acceptFoodMemory(draft.id, draft);
    setDiaryLogged(true);
    setTimeout(() => { setDiaryVisible(false); setDiaryLogged(false); onClose(); }, 900);
  };

  // --- Feature 4: shopping list ---
  const addToShoppingList = () => {
    const ingredients = detail.ingredients?.filter((_, i) => selectedIngredients.has(i)) ?? [];
    // Always close the sheet — even if the detail query is mid-refetch and
    // ingredients is temporarily empty. Dropping the early-return guard here
    // prevents the modal from getting stuck open when React Query refetches
    // on window-focus at the same moment the user taps Add.
    if (ingredients.length > 0) {
      addIngredientsToShopping(ingredients, detail.id);
    }
    setShopVisible(false);
  };

  // --- planner ---
  const openPlanPicker = () => {
    // Refresh defaults from context each time the picker opens so late context changes are reflected
    setPlanDay(recipeSlotTarget?.day ?? plannerViewedDay ?? dateKey());
    setPlanMealType(recipeSlotTarget?.mealType ?? 'Dinner');
    setPlanVisible(true);
  };
  const addToPlan = () => {
    if (!detail) return;
    const plannedMeal: PlannerMeal = {
      id: `recipe-plan-${Date.now()}-${detail.id}`,
      day: planDay,
      meal: planMealType,
      name: detail.name,
      image: detail.image ?? '',
      serving: '1 serving',
      calories: Number(detail.calories) || 0,
      proteinG: Number(detail.proteinG) || 0,
      carbsG: Number(detail.carbsG) || 0,
      fatG: Number(detail.fatG) || 0,
      ingredients: detail.ingredients ?? [],
      description: detail.description ?? 'A recipe added to your weekly plan.',
      prepMinutes: detail.prepMinutes ?? undefined,
    };
    // Capture any meal already in this slot so the Planner can offer an undo banner
    const displacedMeal = plannerMeals.find((m) => m.day === planDay && m.meal === planMealType) ?? null;
    updatePlannerMeals(applySlotReplace(plannerMeals, planDay, planMealType, plannedMeal));
    if (displacedMeal) {
      setPendingUndoSwap({ newMeal: plannedMeal, originalMeal: displacedMeal });
    } else {
      // Slot was empty — signal the Planner to show a plain save acknowledgment
      setPendingPlannerAck({ message: `${plannedMeal.name} added to your ${plannedMeal.meal.toLowerCase()} plan.`, mealId: plannedMeal.id });
    }
    setRecipeSlotTarget(null);
    setPlanVisible(false);
    onClose();
    onPlanned(`${detail.name} added to your ${planMealType.toLowerCase()} plan.`);
  };

  return (
    <>
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
          {reviewDraft ? (
            /* Local recipe review flow — full portion/fraction editor */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={[styles.detailEyebrow, { color: colors.primary }]}>RECIPE REVIEW</Text>
                  <Text style={[styles.detailTitle, { color: colors.foreground }]}>{reviewDraft.title}</Text>
                </View>
                <Pressable accessibilityLabel="Cancel review" onPress={dismissReview} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
              </View>
              <Text style={[styles.reviewSubtitle, { color: colors.mutedForeground }]}>Adjust your portion before it reaches your diary.</Text>
              {reviewDraft.assumptions.length > 0 && (
                <View style={[styles.assumptionCard, { backgroundColor: colors.accent }]}>
                  <Feather name="info" size={14} color={colors.accentForeground} />
                  <Text style={[styles.assumptionText, { color: colors.foreground }]}>{reviewDraft.assumptions.join(' · ')}</Text>
                </View>
              )}
              {reviewDraft.components.map((component) => (
                <ReviewComponent key={component.id} component={component} colors={colors} onChange={updateComponent} />
              ))}
              <View style={[styles.reviewTotalCard, { backgroundColor: colors.hero }]}>
                <View><Text style={[styles.reviewTotalLabel, { color: colors.heroMuted }]}>REVIEW TOTAL</Text><Text style={[styles.reviewTotalValue, { color: colors.onHero }]}>{Math.round(reviewDraft.nutrition.calories)} kcal</Text></View>
                <Text style={[styles.reviewTotalMacros, { color: colors.heroMuted }]}>P {Math.round(reviewDraft.nutrition.proteinG)}g · C {Math.round(reviewDraft.nutrition.carbsG)}g · F {Math.round(reviewDraft.nutrition.fatG)}g</Text>
              </View>
              <ScalePressable accessibilityLabel="Approve and add recipe to diary" onPress={acceptDraft} scale={0.96} haptic="light" style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
                <Feather name="check-circle" size={16} color={colors.primaryForeground} />
                <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Approve and add to diary</Text>
              </ScalePressable>
              <Pressable accessibilityLabel="Cancel recipe log" onPress={dismissReview} style={styles.sourceAction}>
                <Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Not this meal</Text>
              </Pressable>
            </ScrollView>
          ) : (
            /* Main recipe detail view */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.detailTop}>
                <Pressable accessibilityLabel="Close recipe details" onPress={handleClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel={`${savedRecipeIds.includes(detail.id) ? 'Remove' : 'Save'} recipe`} onPress={() => toggleSavedRecipe(detail.id)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="bookmark" size={17} color={savedRecipeIds.includes(detail.id) ? colors.primary : colors.foreground} /></Pressable>
              </View>
              <RecipeImage recipe={detail} height={210} />
              <View style={styles.detailCopy}>
                <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{local ? 'YOUR RECIPE' : `${detail.source.toUpperCase()} RECIPE`}</Text>
                <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
                <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>{detail.area ? `${detail.area} cuisine` : 'A recipe for your collection'}{detail.category ? ` · ${detail.category}` : ''}</Text>

                {/* Nutrition strip — values scale with servingCount */}
                <View style={[styles.nutritionStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {(isFetchingDetail && !detail.calories) || nutritionPending ? (
                    <View style={styles.nutritionLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.nutritionLoadingText, { color: colors.mutedForeground }]}>{nutritionPending ? 'Estimating nutrition…' : 'Estimating nutrition…'}</Text></View>
                  ) : nutritionUnavailable || premiumNutritionUnavailable ? (
                    <View style={styles.nutritionLoading}>
                      <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.nutritionLoadingText, { color: colors.mutedForeground }]}>Nutrition unavailable</Text>
                      {!premium && <Pressable accessibilityLabel="Retry nutrition estimate" onPress={() => detailQuery.refetch()} style={[styles.offlineRetryButton, { backgroundColor: colors.muted }]}><Text style={[styles.offlineRetryButtonText, { color: colors.foreground }]}>Retry</Text></Pressable>}
                    </View>
                  ) : (
                    <>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: scaledKcal ? colors.foreground : colors.mutedForeground }]}>{scaledKcal ? `${approxPrefix}${scaledKcal}` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{scaledProtein ? `${approxPrefix}${scaledProtein}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{scaledCarbs ? `${approxPrefix}${scaledCarbs}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{scaledFat ? `${approxPrefix}${scaledFat}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
                    </>
                  )}
                </View>

                {/* Feature 1: Serving stepper */}
                <View style={[styles.servingRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.servingLabel, { color: colors.mutedForeground }]}>Servings</Text>
                  <View style={styles.servingStepper}>
                    <Pressable accessibilityLabel="Decrease servings" onPress={() => setServingCount((c) => Math.max(0.5, Math.round((c - 0.5) * 10) / 10))} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="minus" size={14} color={colors.foreground} /></Pressable>
                    <Text style={[styles.stepperValue, { color: colors.foreground }]}>{servingLabel}</Text>
                    <Pressable accessibilityLabel="Increase servings" onPress={() => setServingCount((c) => Math.min(8, Math.round((c + 0.5) * 10) / 10))} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="plus" size={14} color={colors.foreground} /></Pressable>
                  </View>
                </View>

                {/* Feature 2: Recipe info chips (prep time, cuisine, category) */}
                {(detail.prepMinutes || (detail as CaloraRecipe).servings || detail.category || detail.area || premiumFields?.cookMinutes || premiumFields?.totalMinutes || premiumFields?.servings || premiumFields?.difficulty || premiumFields?.cuisine || premiumFields?.mealType) ? (
                  <View style={styles.infoChips}>
                    {detail.prepMinutes ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="clock" size={11} color={colors.mutedForeground} /><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{detail.prepMinutes} min prep</Text></View> : null}
                    {(detail as CaloraRecipe).servings ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="users" size={11} color={colors.mutedForeground} /><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{(detail as CaloraRecipe).servings} servings</Text></View> : null}
                    {premiumFields?.cookMinutes ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="clock" size={11} color={colors.mutedForeground} /><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.cookMinutes} min cook</Text></View> : null}
                    {premiumFields?.totalMinutes ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.totalMinutes} min total</Text></View> : null}
                    {premiumFields?.servings ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.servings} servings</Text></View> : null}
                    {premiumFields?.difficulty ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.difficulty}</Text></View> : null}
                    {premiumFields?.cuisine ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.cuisine}</Text></View> : null}
                    {premiumFields?.mealType ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{premiumFields.mealType}</Text></View> : null}
                    {detail.area ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="map-pin" size={11} color={colors.mutedForeground} /><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{detail.area}</Text></View> : null}
                    {detail.category ? <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{detail.category}</Text></View> : null}
                  </View>
                ) : null}

                {/* Notices */}
                {!local && canLog && recipeProvenance(detail).nutritionConfidence === 'estimated' && <View style={[styles.notice, { backgroundColor: colors.muted }]}><Feather name="cpu" size={14} color={colors.mutedForeground} /><Text style={[styles.noticeText, { color: colors.mutedForeground }]}>Estimated per serving · values may vary</Text></View>}
                {premium && recipeProvenance(detail).nutritionConfidence === 'verified' && <View style={[styles.notice, { backgroundColor: colors.muted }]}><Feather name="check-circle" size={14} color={colors.mutedForeground} /><Text style={[styles.noticeText, { color: colors.mutedForeground }]}>Nutrition supplied by {recipeProvenance(detail).nutritionSource}</Text></View>}
                {nutritionUnavailable && !isFetchingDetail && <View style={[styles.notice, { backgroundColor: colors.accent }]}><Feather name="alert-circle" size={14} color={colors.accentForeground} /><Text style={[styles.noticeText, { color: colors.foreground }]}>Nutrition estimate failed · tap Retry above or check back later</Text></View>}
                {!canLog && !nutritionUnavailable && !local && !detailQuery.isLoading && <View style={[styles.notice, { backgroundColor: colors.accent }]}><Feather name="info" size={16} color={colors.accentForeground} /><Text style={[styles.noticeText, { color: colors.foreground }]}>This open-source recipe does not include verified nutrition yet. You can save it, then add your own nutrition before logging.</Text></View>}
                {premiumFields && ((premiumFields.dietary?.length ?? 0) || (premiumFields.allergens?.length ?? 0) || (premiumFields.equipment?.length ?? 0) || premiumFields.fiberG || premiumFields.sodiumMg) ? <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.noticeText, { color: colors.foreground }]}>{premiumFields.dietary?.length ? `Dietary: ${premiumFields.dietary.join(', ')}. ` : ''}{premiumFields.allergens?.length ? `Allergens: ${premiumFields.allergens.join(', ')}. ` : ''}{premiumFields.equipment?.length ? `Equipment: ${premiumFields.equipment.join(', ')}. ` : ''}{premiumFields.fiberG ? `Fiber ${premiumFields.fiberG}g. ` : ''}{premiumFields.sodiumMg ? `Sodium ${premiumFields.sodiumMg}mg.` : ''}</Text></View> : null}

                {/* Feature 4: Ingredients with shopping list action */}
                {detail.ingredients?.length ? (
                  <>
                    <View style={styles.ingredientsHeader}>
                      <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Ingredients</Text>
                      <Pressable accessibilityLabel="Add ingredients to shopping list" onPress={() => { setSelectedIngredients(new Set(detail.ingredients?.map((_, i) => i) ?? [])); setShopVisible(true); }} style={styles.shopAction}>
                        <Feather name="shopping-cart" size={13} color={colors.primary} />
                        <Text style={[styles.shopActionText, { color: colors.primary }]}>Add to list</Text>
                      </Pressable>
                    </View>
                    {detail.ingredients.map((ingredient, idx) => (
                      <View key={idx} style={styles.ingredientRow}>
                        <View style={[styles.ingredientDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.ingredientText, { color: colors.foreground }]}>{servingCount !== 1 ? scaleIngredient(ingredient, servingCount) : ingredient}</Text>
                      </View>
                    ))}
                  </>
                ) : null}

                {/* Feature 3: Numbered cooking steps — shown immediately; skeleton while fetching */}
                {(detail.instructions || isFetchingDetail) ? (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Method</Text>
                    {isFetchingDetail && !detail.instructions ? (
                      <View style={styles.methodLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.methodLoadingText, { color: colors.mutedForeground }]}>Loading steps…</Text>
                      </View>
                    ) : detail.instructions ? (() => {
                      const steps = parseRecipeInstructionSteps(detail.instructions);
                      if (steps.length === 1) {
                        return <Text style={[styles.instructions, { color: colors.mutedForeground }]}>{steps[0]}</Text>;
                      }
                      return steps.map((step, si) => (
                        <View key={si} style={styles.stepRow}>
                          <Text style={[styles.stepNumber, { color: colors.primary }]}>{String(si + 1).padStart(2, '0')}</Text>
                          <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step}</Text>
                        </View>
                      ));
                    })() : null}
                  </>
                ) : null}

                {hasThirdPartySource && sourceName ? <View style={styles.sourceAttributionRow}>
                  <Text style={[styles.sourceAttributionText, { color: colors.mutedForeground }]}>Source: {sourceName}</Text>
                  {sourceUrl ? <><Text style={[styles.sourceAttributionText, { color: colors.mutedForeground }]}>·</Text><Pressable accessibilityRole="link" accessibilityLabel={`View original recipe on ${sourceName}`} onPress={() => Linking.openURL(sourceUrl)} style={styles.sourceAttributionLink}><Text style={[styles.sourceAttributionLinkText, { color: colors.primary }]}>View original</Text><Feather name="external-link" size={12} color={colors.primary} /></Pressable></> : null}
                </View> : null}
                <ScalePressable accessibilityLabel="Add recipe to plan" onPress={openPlanPicker} scale={0.98} haptic="none" style={[styles.secondaryAction, { borderColor: colors.primary }]}><Feather name="calendar" size={16} color={colors.primary} /><Text style={[styles.secondaryActionText, { color: colors.primary }]}>Add to weekly plan</Text></ScalePressable>

                {/* Feature 6: diary — remote uses smart sheet; local uses full review */}
                <ScalePressable
                  accessibilityLabel={canLog ? 'Add recipe to diary' : 'Save recipe for nutrition review'}
                  onPress={canLog ? (local ? openReview : () => setDiaryVisible(true)) : () => { toggleSavedRecipe(detail.id); onClose(); }}
                  scale={0.96} haptic="light"
                  style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                >
                  <Feather name={canLog ? 'plus-circle' : 'bookmark'} size={16} color={colors.primaryForeground} />
                  <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{canLog ? `Add to ${profile?.name ? 'today\'s diary' : 'diary'}` : 'Save for later'}</Text>
                </ScalePressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Plan picker sheet */}
      <Modal visible={planVisible} transparent animationType="slide" onRequestClose={() => setPlanVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.planSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.reviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailEyebrow, { color: colors.primary }]}>ADD TO PLAN</Text>
                <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
              </View>
              <Pressable accessibilityLabel="Close add to plan" onPress={() => setPlanVisible(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
            </View>
            <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>Choose where this recipe belongs. Replacing a slot keeps the rest of your week unchanged.</Text>
            <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planDayRow}>
              {Array.from({ length: 7 }, (_, index) => plannerDate(getPlannerWeekStart(), index)).map((day) => {
                const selectedDay = day === planDay;
                const date = new Date(`${day}T12:00:00`);
                return <Pressable key={day} accessibilityLabel={`Plan for ${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}`} onPress={() => setPlanDay(day)} style={[styles.planDayChip, { backgroundColor: selectedDay ? colors.primary : colors.card, borderColor: selectedDay ? colors.primary : colors.border }]}><Text style={[styles.planDayName, { color: selectedDay ? colors.primaryForeground : colors.mutedForeground }]}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</Text><Text style={[styles.planDayNumber, { color: selectedDay ? colors.primaryForeground : colors.foreground }]}>{date.getDate()}</Text></Pressable>;
              })}
            </ScrollView>
            <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>MEAL</Text>
            <View style={styles.planMealRow}>{plannerMealTypes.map((type) => <Pressable key={type} accessibilityLabel={`Plan as ${type}`} onPress={() => setPlanMealType(type)} style={[styles.planMealChip, { backgroundColor: planMealType === type ? colors.accent : colors.card, borderColor: planMealType === type ? colors.accent : colors.border }]}><Text style={[styles.planMealText, { color: planMealType === type ? colors.accentForeground : colors.foreground }]}>{type}</Text></Pressable>)}</View>
            <ScalePressable accessibilityLabel="Confirm add recipe to plan" onPress={addToPlan} scale={0.96} haptic="light" style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name="calendar" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Add to {planMealType.toLowerCase()} plan</Text></ScalePressable>
            <Pressable accessibilityLabel="Cancel add recipe to plan" onPress={() => setPlanVisible(false)} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Feature 6: Smart diary sheet — meal type + serving count + live macro preview */}
      <Modal visible={diaryVisible} transparent animationType="slide" onRequestClose={() => { if (!diaryLogged) setDiaryVisible(false); }}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.planSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.reviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailEyebrow, { color: colors.primary }]}>ADD TO DIARY</Text>
                <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={1}>{detail.name}</Text>
              </View>
              {!diaryLogged && <Pressable accessibilityLabel="Close diary sheet" onPress={() => setDiaryVisible(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>}
            </View>
            <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>MEAL</Text>
            <View style={styles.planMealRow}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((type) => (
                <Pressable key={type} accessibilityLabel={`Log as ${type}`} onPress={() => setDiaryMealType(type)} style={[styles.planMealChip, { backgroundColor: diaryMealType === type ? colors.accent : colors.card, borderColor: diaryMealType === type ? colors.accent : colors.border }]}>
                  <Text style={[styles.planMealText, { color: diaryMealType === type ? colors.accentForeground : colors.foreground }]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>SERVINGS</Text>
            <View style={styles.diaryServingRow}>
              <Pressable accessibilityLabel="Fewer servings" onPress={() => setDiaryServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="minus" size={14} color={colors.foreground} /></Pressable>
              <Text style={[styles.stepperValue, { color: colors.foreground, fontSize: 20, minWidth: 52 }]}>{diaryServings === 0.5 ? '½' : diaryServings === 1.5 ? '1½' : diaryServings === 2.5 ? '2½' : diaryServings === 3.5 ? '3½' : String(diaryServings)}</Text>
              <Pressable accessibilityLabel="More servings" onPress={() => setDiaryServings((s) => Math.min(4, Math.round((s + 0.5) * 10) / 10))} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="plus" size={14} color={colors.foreground} /></Pressable>
              <Text style={[styles.servingLabel, { color: colors.mutedForeground, marginLeft: 8 }]}>{diaryServings === 1 ? 'serving' : 'servings'}</Text>
            </View>
            <View style={[styles.reviewTotalCard, { backgroundColor: colors.hero, marginTop: 14 }]}>
              <View>
                <Text style={[styles.reviewTotalLabel, { color: colors.heroMuted }]}>YOU'RE LOGGING</Text>
                <Text style={[styles.reviewTotalValue, { color: colors.onHero }]}>{Math.round((detail.calories ?? 0) * diaryServings)} kcal</Text>
              </View>
              <Text style={[styles.reviewTotalMacros, { color: colors.heroMuted }]}>P {Math.round((detail.proteinG ?? 0) * diaryServings)}g{'\n'}C {Math.round((detail.carbsG ?? 0) * diaryServings)}g{'\n'}F {Math.round((detail.fatG ?? 0) * diaryServings)}g</Text>
            </View>
            <ScalePressable accessibilityLabel="Confirm diary entry" onPress={logToDiary} scale={0.96} haptic="light" style={[styles.primaryAction, { backgroundColor: diaryLogged ? colors.accent : colors.primary }]}>
              <Feather name={diaryLogged ? 'check-circle' : 'plus-circle'} size={16} color={diaryLogged ? colors.accentForeground : colors.primaryForeground} />
              <Text style={[styles.primaryActionText, { color: diaryLogged ? colors.accentForeground : colors.primaryForeground }]}>{diaryLogged ? 'Added to diary!' : `Add to ${diaryMealType.toLowerCase()}`}</Text>
            </ScalePressable>
            {!diaryLogged && <Pressable accessibilityLabel="Cancel diary entry" onPress={() => setDiaryVisible(false)} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>}
          </View>
        </View>
      </Modal>

    </Modal>
    {/* Feature 4: Shopping list sheet — rendered OUTSIDE the outer recipe modal
        to avoid React Native Web portal stacking issues. When nested inside the
        outer Modal, the outer modal's backdrop View creates a stacking context
        that intercepts all pointer events for the inner modal's buttons. */}
    <Modal visible={shopVisible} transparent animationType="none" onRequestClose={() => setShopVisible(false)}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <View style={[styles.planSheet, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailEyebrow, { color: colors.primary }]}>SHOPPING LIST</Text>
              <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={1}>{detail.name}</Text>
            </View>
            <Pressable accessibilityLabel="Close shopping list" onPress={() => setShopVisible(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
          </View>
          <Text style={[styles.reviewSubtitle, { color: colors.mutedForeground }]}>Select ingredients to add. Already-listed items won't be duplicated.</Text>
          {/* Use fixed height (not maxHeight) so RNW respects the constraint —
              maxHeight on ScrollView grows to full content on web, pushing
              Add/Cancel buttons past the planSheet's clipping boundary. */}
          <ScrollView style={{ height: 200, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            {detail.ingredients?.map((ingredient, idx) => (
              <Pressable key={idx}
                accessibilityLabel={`${selectedIngredients.has(idx) ? 'Deselect' : 'Select'} ${ingredient}`}
                onPress={() => setSelectedIngredients((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; })}
                style={[styles.shopIngredientRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.shopCheckbox, { backgroundColor: selectedIngredients.has(idx) ? colors.primary : colors.card, borderColor: selectedIngredients.has(idx) ? colors.primary : colors.border }]}>
                  {selectedIngredients.has(idx) && <Feather name="check" size={10} color={colors.primaryForeground} />}
                </View>
                <Text style={[styles.ingredientText, { color: colors.foreground, flex: 1 }]}>{ingredient}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityLabel={`Add ${selectedIngredients.size} ingredient${selectedIngredients.size !== 1 ? 's' : ''} to shopping list`}
            onPress={addToShoppingList}
            style={[styles.primaryAction, { backgroundColor: selectedIngredients.size > 0 ? colors.primary : colors.muted, opacity: selectedIngredients.size > 0 ? 1 : 0.5 }]}
          >
            <Feather name="shopping-cart" size={16} color={selectedIngredients.size > 0 ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.primaryActionText, { color: selectedIngredients.size > 0 ? colors.primaryForeground : colors.mutedForeground }]}>Add {selectedIngredients.size} ingredient{selectedIngredients.size !== 1 ? 's' : ''}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Cancel shopping list" onPress={() => setShopVisible(false)} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

function CreateRecipeModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { colors, saveRecipe } = useCalora();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [error, setError] = useState('');
  const create = () => {
    if (!name.trim()) {
      setError('Add a name for your recipe.');
      return;
    }
    if (!Number.isFinite(Number(calories)) || Number(calories) <= 0) {
      setError('Add calories greater than zero so this recipe can be logged.');
      return;
    }
    Keyboard.dismiss();
    saveRecipe({
      name: name.trim(),
      ingredients: ingredients.split('\n').map((item) => item.trim()).filter(Boolean),
      tags: ['My recipes'],
      source: `Created in ${BRAND.name}`,
      sourceUrl: URLS.main,
      calories: Number(calories),
      proteinG: Number(protein) || 0,
      carbsG: Number(carbs) || 0,
      fatG: Number(fat) || 0,
      category: 'Personal',
      area: null,
      image: null,
      instructions: null,
      description: null,
      prepMinutes: null,
    });
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setIngredients('');
    setError('');
    onClose();
    onCreated();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <KeyboardAwareScrollViewCompat
          style={[styles.createSheet, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.createFormContent}
          bottomOffset={24}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>Create your recipe</Text>
          <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>Your recipes stay separate from open-source content and can be edited later.</Text>
          <TextInput accessibilityLabel="Recipe name" returnKeyType="next" value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="Recipe name" placeholderTextColor={colors.mutedForeground} style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
          <View style={styles.numberGrid}>{[['Calories', calories, setCalories], ['Protein g', protein, setProtein], ['Carbs g', carbs, setCarbs], ['Fat g', fat, setFat]].map(([label, value, setter]) => <View key={label as string} style={{ flex: 1 }}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput accessibilityLabel={label as string} value={value as string} onChangeText={(text) => { (setter as (next: string) => void)(text); setError(''); }} keyboardType="decimal-pad" returnKeyType="next" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}</View>
          <TextInput accessibilityLabel="Recipe ingredients" value={ingredients} onChangeText={(value) => { setIngredients(value); setError(''); }} multiline placeholder="Ingredients, one per line" placeholderTextColor={colors.mutedForeground} style={[styles.ingredientsInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
          {error ? <View style={[styles.formError, { backgroundColor: colors.destructive + '18' }]}><Feather name="alert-circle" size={15} color={colors.destructive} /><Text style={[styles.formErrorText, { color: colors.destructive }]}>{error}</Text></View> : null}
          <ScalePressable accessibilityLabel="Save your recipe" onPress={create} scale={0.96} haptic="light" style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name="check" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Save recipe</Text></ScalePressable>
          <Pressable accessibilityLabel="Cancel recipe creation" onPress={onClose} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

export default function RecipesScreen() {
  const { colors, profile, logs, localRecipes, savedRecipeIds, toggleSavedRecipe, fontScale } = useCalora();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  // Pre-warm the detail query during the modal's slide-up animation (~350 ms).
  // On cache hits (staleTime 30 min) this is a no-op; on misses it means the
  // TheMealDB fetch resolves before the user finishes reading the recipe header.
  const handleCardPress = (recipe: Recipe | CaloraRecipe) => {
    if (!isLocalRecipe(recipe)) {
      void queryClient.prefetchQuery({
        queryKey: ['recipe', recipe.id],
        queryFn: () => getRecipe(recipe.id),
        staleTime: 1000 * 60 * 30,
      });
    }
    setSelected(recipe);
  };
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('For you');
  const [activeSection, setActiveSection] = useState<RecipeSection>('discover');
  const [selected, setSelected] = useState<Recipe | CaloraRecipe | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [planNoticeVisible, setPlanNoticeVisible] = useState(false);
  const planNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remoteOffset, setRemoteOffset] = useState(0);
  const [remoteRecipes, setRemoteRecipes] = useState<Recipe[]>([]);
  const [premiumSavedRecipes, setPremiumSavedRecipes] = useState<PremiumRecipe[]>([]);
  const [hasMoreRemote, setHasMoreRemote] = useState(true);
  const loadingMoreRef = useRef(false);
  const premiumLoadMoreRef = useRef<(() => void) | null>(null);
  const recipesScrollRef = useRef<ScrollView | null>(null);
  const discoverScrollYRef = useRef(0);
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  useEffect(() => {
    setSelected((current) => current && recipeProvenance(current).sourceType === 'premium' ? null : current);
  }, [user?.id]);
  const remainingCalories = Math.max((profile?.calorieTarget ?? 2000) - logs.filter((log) => log.date === dateKey()).reduce((sum, log) => sum + log.calories, 0), 0);
  const localMatches = useMemo(() => localRecipes.filter((recipe) => {
    const haystack = `${recipe.name} ${recipe.category ?? ''} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesCategory =
      category === 'For you' ||
      category === 'My recipes' ||
      (category === 'Quick'
        ? recipe.prepMinutes != null && recipe.prepMinutes <= 30
        : recipe.category === category);
    return matchesSearch && matchesCategory;
  }), [category, localRecipes, search]);
  const recipesQuery = useListRecipes({ query: search || undefined, category: category === 'For you' || category === 'My recipes' || category === 'Quick' ? undefined : category, limit: RECIPE_PAGE_SIZE, offset: remoteOffset }, { query: { queryKey: ['recipes', search, category, remoteOffset], staleTime: 1000 * 60 * 10, refetchInterval: (query) => (query.state.data as ({ warmupPending?: boolean } | undefined))?.warmupPending ? 15_000 : false } });
  useEffect(() => {
    setRemoteOffset(0);
    setRemoteRecipes([]);
    setHasMoreRemote(true);
    loadingMoreRef.current = false;
  }, [search, category]);
  useEffect(() => {
    const page = recipesQuery.data?.recipes;
    if (!page) return;
    setRemoteRecipes((current) => {
      if (remoteOffset === 0) return page;
      const existing = new Set(current.map((recipe) => recipe.id));
      return [...current, ...page.filter((recipe) => !existing.has(recipe.id))];
    });
    setHasMoreRemote(page.length === RECIPE_PAGE_SIZE);
    loadingMoreRef.current = false;
  }, [recipesQuery.data, remoteOffset]);
  useEffect(() => {
    if (!recipeId) return;
    const matchingRecipe = [...localRecipes, ...remoteRecipes].find((recipe) => recipe.id === recipeId);
    if (!matchingRecipe) return;
    setSelected(matchingRecipe);
    router.setParams({ recipeId: undefined });
  }, [localRecipes, recipeId, remoteRecipes]);
  const visibleRemote = category === 'My recipes' ? [] : category === 'Quick' ? remoteRecipes.filter((r) => r.prepMinutes != null && r.prepMinutes <= 30) : remoteRecipes;
  const savedRecipes = [...localRecipes, ...remoteRecipes].filter((recipe, index, list) => savedRecipeIds.includes(recipeKey(recipe)) && list.findIndex((item) => recipeKey(item) === recipeKey(recipe)) === index);
  const loadMoreRecipes = () => {
    if (activeSection !== 'discover' || category === 'My recipes' || !hasMoreRemote || recipesQuery.isFetching || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setRemoteOffset((current) => current + RECIPE_PAGE_SIZE);
  };
  const handleRecipeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (activeSection === 'premium') {
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 240) premiumLoadMoreRef.current?.();
      return;
    }
    if (activeSection !== 'discover') return;
    discoverScrollYRef.current = contentOffset.y;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 200) loadMoreRecipes();
  };
  const changeSection = (section: RecipeSection) => {
    if (section === activeSection) return;
    setActiveSection(section);
    requestAnimationFrame(() => recipesScrollRef.current?.scrollTo({ y: section === 'discover' ? discoverScrollYRef.current : 0, animated: false }));
  };
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Recipes" action={<Pressable accessibilityLabel="Create personalized recipe ideas" onPress={() => changeSection('create')}><Feather name="plus" size={21} color={colors.primary} /></Pressable>} />
      <SwipeableTabList
        items={RECIPE_SECTIONS}
        activeItem={activeSection}
        onChange={changeSection}
        accessibilityLabel="Recipe sections"
        testID="recipes-section-tabs"
        style={[styles.sectionTabs, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        {RECIPE_SECTIONS.map((section) => {
          const selectedSection = activeSection === section;
          return <ScalePressable key={section} accessibilityRole="tab" accessibilityState={{ selected: selectedSection }} accessibilityLabel={`${section[0].toUpperCase()}${section.slice(1)} recipes`} onPress={() => changeSection(section)} scale={0.98} haptic="none" style={[styles.sectionTab, selectedSection && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTabText, { color: selectedSection ? colors.foreground : colors.mutedForeground }]}>{section[0].toUpperCase()}{section.slice(1)}</Text>
          </ScalePressable>;
        })}
      </SwipeableTabList>
      <ScrollView ref={recipesScrollRef} contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false} onScroll={handleRecipeScroll} onMomentumScrollEnd={handleRecipeScroll} scrollEventThrottle={16} decelerationRate="normal">
        {activeSection === 'discover' ? <>
        <View style={styles.recipeHeader}>
          <Image source={require('../../assets/images/calora-recipes-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.72)', 'rgba(18,34,24,0.16)']}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.recipeHeaderContent}>
            <View style={styles.recipeHeaderTop}>
              <View style={styles.recipeHeaderBadge}>
                <Feather name="book-open" size={12} color="#d4eadc" />
                <Text style={styles.recipeHeaderBadgeText}>THE {BRAND.name.toUpperCase()} COOKBOOK</Text>
              </View>
            </View>
            <Text style={styles.recipeHeaderEyebrow}>GOOD FOOD, WITH CONTEXT</Text>
            <Text style={styles.recipeHeaderSubtitle}>Discover meals worth making, with enough context to trust them.</Text>
          </View>
        </View>
        <MotivationalQuote colors={colors} style={{ marginBottom: 14 }} />
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search recipes" value={search} onChangeText={setSearch} placeholder="Search recipes, ingredients, cuisines" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />{search ? <Pressable accessibilityLabel="Clear recipe search" onPress={() => setSearch('')}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.map((item) => <Pressable key={item} accessibilityLabel={`Recipe category ${item}`} onPress={() => setCategory(item)} style={[styles.categoryChip, { backgroundColor: category === item ? colors.primary : colors.card, borderColor: category === item ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}<Pressable accessibilityLabel="Recipe category My recipes" onPress={() => setCategory('My recipes')} style={[styles.categoryChip, { backgroundColor: category === 'My recipes' ? colors.primary : colors.card, borderColor: category === 'My recipes' ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === 'My recipes' ? colors.primaryForeground : colors.mutedForeground }]}>My recipes</Text></Pressable></ScrollView>

        {savedRecipes.length > 0 && <><View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved recipes</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Your shortlist, ready when you are.</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>{savedRecipes.slice(0, 6).map((recipe) => <View key={recipeKey(recipe)} style={{ width: 220 }}><RecipeCard recipe={recipe} colors={colors} saved remainingCalories={remainingCalories} onPress={() => handleCardPress(recipe)} onSave={() => toggleSavedRecipe(recipeKey(recipe))} /></View>)}</ScrollView></>}

        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{category === 'For you' ? 'Explore open recipes' : category === 'My recipes' ? 'Your recipes' : category}</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>{recipesQuery.isFetching && remoteRecipes.length > 0 ? 'Loading more recipes…' : category === 'Quick' ? `${visibleRemote.length + localMatches.length} quick meals from loaded recipes` : `${visibleRemote.length + localMatches.length} recipes to explore`}</Text></View><Feather name="book-open" size={18} color={colors.mutedForeground} /></View>
        {recipesQuery.isLoading && remoteRecipes.length === 0 ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Finding recipes from open sources…</Text></View> : recipesQuery.isError && remoteRecipes.length === 0 ? <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={20} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>The cookbook is offline</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your saved and personal recipes remain available. Try again when a connection is available.</Text></View> : <>{category === 'My recipes' && localMatches.length === 0 && <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="book-open" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No recipes yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Recipes you create will live here, separate from open-source content.</Text><Pressable accessibilityLabel="Create your first recipe" onPress={() => setShowCreate(true)} style={[styles.emptyAction, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Create your first recipe</Text></Pressable></View>}<Animated.View entering={FadeInDown.springify().damping(20).delay(80)} style={styles.recipeGrid}>{localMatches.map((recipe) => <View key={recipe.id} style={styles.recipeGridCard}><RecipeCard recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} imageHeight={122} remainingCalories={remainingCalories} onPress={() => handleCardPress(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} /></View>)}{visibleRemote.map((recipe) => <View key={recipe.id} style={styles.recipeGridCard}><RecipeCard recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} imageHeight={122} remainingCalories={remainingCalories} onPress={() => handleCardPress(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} /></View>)}</Animated.View>{recipesQuery.isError && remoteRecipes.length > 0 && <View style={[styles.offlineRetryRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={14} color={colors.warning} /><Text style={[styles.offlineRetryText, { color: colors.mutedForeground }]}>Connection lost — showing loaded recipes only.</Text><Pressable accessibilityLabel="Retry loading recipes" onPress={() => recipesQuery.refetch()} style={[styles.offlineRetryButton, { backgroundColor: colors.muted }]}><Text style={[styles.offlineRetryButtonText, { color: colors.foreground }]}>Retry</Text></Pressable></View>}{recipesQuery.isFetching && remoteRecipes.length > 0 && <View style={styles.loadMoreState}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Bringing in more recipes…</Text></View>}</>}
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>Open recipe discovery is provided by TheMealDB. Recipes remain attributed to their source; {BRAND.name}'s nutrition confidence is shown separately.</Text>
        </> : activeSection === 'premium' ? <PremiumCatalogue colors={colors} onOpen={(recipe) => setSelected(recipe)} onSave={(recipe) => setPremiumSavedRecipes((current) => current.some((item) => item.id === recipe.id) ? current : [...current, recipe])} savedPremiumRecipes={premiumSavedRecipes} onLoadMoreRef={premiumLoadMoreRef} /> : <CreateConcepts colors={colors} onOpenRecipe={setSelected} />}
      </ScrollView>
      <RecipeDetailModal
        recipe={selected}
        onClose={() => setSelected(null)}
        onPlanned={(message) => {
          setSaveMessage(message);
          setPlanNoticeVisible(true);
          if (planNoticeTimerRef.current) clearTimeout(planNoticeTimerRef.current);
          planNoticeTimerRef.current = setTimeout(() => {
            setSaveMessage(null);
            setPlanNoticeVisible(false);
            planNoticeTimerRef.current = null;
          }, 3800);
        }}
      />
      <LocalSaveNotice
        visible={planNoticeVisible}
        message={saveMessage ?? ''}
        colors={colors}
        actionLabel="View Plan"
        onAction={() => {
          if (planNoticeTimerRef.current) clearTimeout(planNoticeTimerRef.current);
          setSaveMessage(null);
          setPlanNoticeVisible(false);
          router.push('/(tabs)/planner');
        }}
      />
      <CreateRecipeModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setSearch('');
          setCategory('My recipes');
        }}
      />
    </View>
  );
}

function makeStyles(f: number) {
  return StyleSheet.create({
  page: { flex: 1 },
   sectionTabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, marginHorizontal: 20, marginTop: 7, padding: 3, gap: 2 },
   sectionTab: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
   sectionTabText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
   upcomingCard: { borderWidth: 1, borderRadius: 22, padding: 21, alignItems: 'center', marginTop: 13 },
   upcomingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
   upcomingEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1, textAlign: 'center' },
   upcomingTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 * f, letterSpacing: -0.4, textAlign: 'center', marginTop: 7 },
   upcomingBody: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18 * f, textAlign: 'center', marginTop: 9, maxWidth: 290 },
   upcomingAction: { minHeight: 42, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 19 },
   upcomingActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
   premiumToolbar: { flexDirection: 'row', gap: 9, marginTop: 4, marginBottom: 10 },
   filterButton: { width: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  recipeHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 17, backgroundColor: '#1b3022' },
   recipeHeaderContent: { minHeight: 190, padding: 19, justifyContent: 'center', alignItems: 'center' },
   recipeHeaderTop: { position: 'absolute', top: 16, left: 19, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  recipeHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  recipeHeaderBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
  recipeHeaderCreate: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(20,26,21,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  recipeHeaderCreateText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 10 * f },
   recipeHeaderEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.3, marginBottom: 6, textAlign: 'center' },
  recipeHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 29 * f, letterSpacing: -0.8 },
  recipeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 2 },
  coachHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  coachHeaderButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 0.1 },
   recipeHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 17, marginTop: 7, maxWidth: 290, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29 * f, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 * f, lineHeight: 19, marginTop: 7, maxWidth: 235 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, marginTop: 6 },
  createButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  searchBox: { height: 48, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  categoryRow: { gap: 8, paddingVertical: 14, paddingRight: 20 },
  categoryChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  categoryText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  fitCard: { borderRadius: 24, padding: 18, marginBottom: 25 },
  fitIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  fitEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.2, marginBottom: 6 },
  fitTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 * f, letterSpacing: -0.3 },
  fitBody: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 17, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, letterSpacing: -0.3 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 4 },
  horizontalCards: { gap: 11, paddingBottom: 25 },
  recipeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  recipeGridCard: { width: '48.35%' },
  recipeCard: { borderWidth: 1, borderRadius: 19, overflow: 'hidden', flex: 1 },
  recipeImage: { width: '100%', backgroundColor: '#1d4539' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackCopy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: '#9dd7bd', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, marginTop: 6 },
  saveButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  localBadge: { position: 'absolute', left: 10, bottom: 10, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  localBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 0.7 },
  cardContent: { padding: 10, flex: 1, justifyContent: 'space-between' },
  recipeName: { fontFamily: 'Inter_700Bold', fontSize: 12 * f, lineHeight: 16 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  recipeKcal: { fontFamily: 'Inter_700Bold', fontSize: 9 * f },
  recipeMetaText: { fontFamily: 'Inter_400Regular', fontSize: 9 * f },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.12)' },
  sourceText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 8 * f },
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  loadMoreState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f },
  emptyState: { borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 * f, marginTop: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  footerNote: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, lineHeight: 14, textAlign: 'center', marginTop: 22 },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  reviewSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, marginBottom: 14 },
  assumptionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 13, marginBottom: 12 },
  assumptionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 },
  reviewCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 11 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewCardIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reviewCardName: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  reviewCardSource: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 3 },
  reviewNutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(120,120,120,0.15)' },
  reviewNutritionValue: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  reviewNutritionLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 2 },
  reviewFieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, marginTop: 11, marginBottom: 6 },
  reviewFractionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewFractionButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reviewFractionValue: { width: 42, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  reviewQuestion: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, lineHeight: 15, marginTop: 9 },
  reviewTotalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 4 },
  reviewTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1 },
  reviewTotalValue: { fontFamily: 'Inter_700Bold', fontSize: 20 * f, marginTop: 3 },
  reviewTotalMacros: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, textAlign: 'right' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  detailSheet: { maxHeight: '94%', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
  planSheet: { maxHeight: '78%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginBottom: 12 },
  secondaryAction: { minHeight: 46, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryActionText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  planLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1, marginTop: 14, marginBottom: 7 },
  planDayRow: { gap: 8, paddingBottom: 2 },
  planDayChip: { width: 48, height: 58, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  planDayName: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f },
  planDayNumber: { fontFamily: 'Inter_700Bold', fontSize: 17 * f, marginTop: 3 },
  planMealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planMealChip: { minHeight: 35, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  planMealText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  detailTop: { position: 'absolute', zIndex: 2, top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { padding: 20 },
  detailEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 1.2, marginTop: 17 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 25 * f, letterSpacing: -0.6, marginTop: 6 },
  detailSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, marginTop: 6 },
  nutritionStrip: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 17 },
  nutritionValue: { fontFamily: 'Inter_700Bold', fontSize: 16 * f },
  nutritionLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 3 },
  notice: { flexDirection: 'row', gap: 9, borderRadius: 14, padding: 12, marginTop: 12 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 },
  detailSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 * f, marginTop: 23, marginBottom: 9 },
  ingredientRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  ingredientText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 17 },
  instructions: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 19 },
  sourceAttributionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 22, marginBottom: 2 },
  sourceAttributionText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16 },
  sourceAttributionLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, marginVertical: -4 },
  sourceAttributionLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, lineHeight: 16 },
  primaryAction: { minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, marginTop: 17 },
  primaryActionText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  sourceAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 13 },
  sourceActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  createSheet: { borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20, paddingBottom: 28 },
  createHero: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  createHeroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  createHeroTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f },
  guestBoundary: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16 * f, marginTop: 12 },
  createFormContent: { paddingBottom: 30 },
  formError: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 11, padding: 10, marginTop: 10 },
  formErrorText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 14 },
  numberGrid: { flexDirection: 'row', gap: 7, marginTop: 11 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginBottom: 5 },
  createModeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 },
  createModeCard: { width: '48%', minHeight: 80, borderRadius: 15, borderWidth: 1, padding: 13, justifyContent: 'space-between' },
  createModeText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f, marginTop: 9 },
  createConstraintRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  createInput: { height: 45, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  ingredientsInput: { height: 100, borderWidth: 1, borderRadius: 12, padding: 11, textAlignVertical: 'top', fontFamily: 'Inter_400Regular', fontSize: 12 * f, marginTop: 11 },
  fitsBadge: { position: 'absolute', left: 10, top: 10, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  fitsBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 0.5 },
  nutritionCell: { alignItems: 'center' },
  nutritionLoading: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  nutritionLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  emptyActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  offlineRetryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8 },
  offlineRetryText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 14 },
  offlineRetryButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  offlineRetryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  // Feature 1: serving stepper
  servingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  servingLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  servingStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperButton: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontFamily: 'Inter_700Bold', fontSize: 16 * f, textAlign: 'center', minWidth: 38 },
  // Feature 2: recipe info chips
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  infoChipText: { fontFamily: 'Inter_400Regular', fontSize: 10 * f },
  // Feature 3: numbered steps
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNumber: { fontFamily: 'Inter_700Bold', fontSize: 13 * f, width: 24, paddingTop: 1 },
  stepText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 19 },
  // Feature 4: shopping list
  ingredientsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 9 },
  shopAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shopActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  shopIngredientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  shopCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Feature 6: diary serving row
  diaryServingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 },
  // Method loading skeleton
  methodLoading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14 },
  methodLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  });
}
const styles = makeStyles(1.0);
