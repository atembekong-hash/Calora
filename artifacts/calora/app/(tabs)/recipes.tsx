import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ActivityIndicator, Keyboard, Linking, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetRecipe, useListRecipes, type Recipe } from '@workspace/api-client-react';
import { CaloraRecipe, useCalora } from '@/context/CaloraContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { applySlotReplace, getPlannerWeekStart, plannerDate, plannerMealTypes } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { dateKey } from '@/lib/dates';

const categories = ['For you', 'Breakfast', 'Vegetarian', 'Chicken', 'Seafood', 'Dessert', 'Quick'];
const RECIPE_PAGE_SIZE = 18;

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
        <Text style={styles.imageFallbackText}>Calora recipe</Text>
      </View>
    </View>
  );
}

function RecipeMeta({ recipe, colors }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors'] }) {
  const local = isLocalRecipe(recipe);
  // Non-local recipes always have AI-estimated nutrition — prefix with ~ so
  // the user knows it is approximate. Local recipes have user-entered values.
  const nutrition = recipe.calories
    ? `${local ? '' : '~'}${Math.round(recipe.calories)} kcal`
    : 'Nutrition review needed';
  return (
    <View style={styles.recipeMeta}>
      <Text style={[styles.recipeKcal, { color: recipe.calories ? colors.foreground : colors.warning }]}>{nutrition}</Text>
      {recipe.proteinG ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{Math.round(recipe.proteinG)}g P</Text> : null}
      {recipe.prepMinutes ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{recipe.prepMinutes} min</Text> : null}
    </View>
  );
}

function RecipeCard({ recipe, colors, saved, onPress, onSave, imageHeight = 160, remainingCalories }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors']; saved: boolean; onPress: () => void; onSave: () => void; imageHeight?: number; remainingCalories?: number }) {
  const local = isLocalRecipe(recipe);
  const fitsGoal = remainingCalories !== undefined && remainingCalories > 0 && recipe.calories != null && recipe.calories > 0 && recipe.calories <= remainingCalories;
  return (
    <ScalePressable accessibilityLabel={`Open ${recipe.name}`} onPress={onPress} scale={0.98} haptic="none" style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View>
        <RecipeImage recipe={recipe} height={imageHeight} />
        <Pressable accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${recipe.name}`} onPress={onSave} style={[styles.saveButton, { backgroundColor: saved ? colors.primary : colors.card }]}>
          <Feather name="bookmark" size={16} color={saved ? colors.primaryForeground : colors.foreground} />
        </Pressable>
        {fitsGoal && <View style={[styles.fitsBadge, { backgroundColor: colors.primary }]}><Feather name="check-circle" size={8} color={colors.primaryForeground} /><Text style={[styles.fitsBadgeText, { color: colors.primaryForeground }]}>FITS YOUR GOAL</Text></View>}
        {local && <View style={[styles.localBadge, { backgroundColor: colors.primary }]}><Text style={[styles.localBadgeText, { color: colors.primaryForeground }]}>MY RECIPE</Text></View>}
      </View>
      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
        <RecipeMeta recipe={recipe} colors={colors} />
        <View style={styles.cardFooter}>
          <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{local ? 'Created in Calora' : `Open source · ${recipe.source}`}</Text>
          <Feather name="arrow-up-right" size={13} color={colors.mutedForeground} />
        </View>
      </View>
    </ScalePressable>
  );
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
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{Math.round(component.calories * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{Math.round(component.proteinG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{Math.round(component.carbsG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
        <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{Math.round(component.fatG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
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
function RecipeDetailModal({ recipe, onClose, onPlanned }: { recipe: Recipe | CaloraRecipe | null; onClose: () => void; onPlanned: (message: string) => void }) {
  const { colors, profile, savedRecipeIds, toggleSavedRecipe, createRecipeDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory, foodDrafts, plannerMeals, updatePlannerMeals, plannerViewedDay, recipeSlotTarget, setRecipeSlotTarget, setPendingUndoSwap, setPendingPlannerAck } = useCalora();
  const local = recipe ? isLocalRecipe(recipe) : false;
  const remoteRecipeId = recipe && !local ? recipe.id : '';
  const detailQuery = useGetRecipe(remoteRecipeId, { query: { queryKey: ['recipe', remoteRecipeId], enabled: Boolean(remoteRecipeId), staleTime: 1000 * 60 * 30 } });
  const detail = detailQuery.data ?? recipe;
  const [reviewDraftId, setReviewDraftId] = useState<string | null>(null);
  const [planVisible, setPlanVisible] = useState(false);
  // Default to the slot the user came from (if browsing from an empty planner slot),
  // or else the day currently viewed in the Planner.
  const [planDay, setPlanDay] = useState(() => recipeSlotTarget?.day ?? plannerViewedDay ?? dateKey());
  const [planMealType, setPlanMealType] = useState<PlannerMeal['meal']>(() => recipeSlotTarget?.mealType ?? 'Dinner');
  const reviewDraft = reviewDraftId ? (foodDrafts.find((d) => d.id === reviewDraftId) ?? null) : null;

  if (!detail) return null;
  const canLog = Boolean(detail.calories && detail.calories > 0);

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
      // Slot was empty (e.g. user removed a meal then picked a recipe). Signal the Planner to
      // show a plain save acknowledgment and cancel any stale removal-undo when it regains focus.
      setPendingPlannerAck({ message: `${plannedMeal.name} added to your ${plannedMeal.meal.toLowerCase()} plan.`, mealId: plannedMeal.id });
    }
    // Clear slot context so re-opening won't re-apply stale targeting
    setRecipeSlotTarget(null);
    setPlanVisible(false);
    onClose();
    onPlanned(`${detail.name} added to your ${planMealType.toLowerCase()} plan.`);
  };

  return (
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
          {reviewDraft ? (
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
                <View style={[styles.nutritionStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {detailQuery.isLoading && !detail.calories ? (
                    <View style={styles.nutritionLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.nutritionLoadingText, { color: colors.mutedForeground }]}>Estimating nutrition…</Text></View>
                  ) : (
                    <>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: detail.calories ? colors.foreground : colors.mutedForeground }]}>{detail.calories ? `${!local ? '~' : ''}${Math.round(detail.calories)}` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{detail.proteinG ? `${!local ? '~' : ''}${Math.round(detail.proteinG)}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{detail.carbsG ? `${!local ? '~' : ''}${Math.round(detail.carbsG)}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
                      <View style={styles.nutritionCell}><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{detail.fatG ? `${!local ? '~' : ''}${Math.round(detail.fatG)}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
                    </>
                  )}
                </View>
                {!local && canLog && <View style={[styles.notice, { backgroundColor: colors.muted }]}><Feather name="cpu" size={14} color={colors.mutedForeground} /><Text style={[styles.noticeText, { color: colors.mutedForeground }]}>AI-estimated per serving · values may vary</Text></View>}
                {!canLog && !detailQuery.isLoading && <View style={[styles.notice, { backgroundColor: colors.accent }]}><Feather name="info" size={16} color={colors.accentForeground} /><Text style={[styles.noticeText, { color: colors.foreground }]}>This open-source recipe does not include verified nutrition yet. You can save it, then add your own nutrition before logging.</Text></View>}
                {detail.ingredients?.length ? <><Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Ingredients</Text>{detail.ingredients.map((ingredient) => <View key={ingredient} style={styles.ingredientRow}><View style={[styles.ingredientDot, { backgroundColor: colors.primary }]} /><Text style={[styles.ingredientText, { color: colors.foreground }]}>{ingredient}</Text></View>)}</> : null}
                {detail.instructions ? <><Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Method</Text><Text style={[styles.instructions, { color: colors.mutedForeground }]}>{detail.instructions}</Text></> : null}
                <Text style={[styles.attribution, { color: colors.mutedForeground }]}>Recipe source: {detail.source}. Calora does not claim third-party recipe content as its own.</Text>
                <ScalePressable accessibilityLabel="Add recipe to plan" onPress={openPlanPicker} scale={0.98} haptic="none" style={[styles.secondaryAction, { borderColor: colors.primary }]}><Feather name="calendar" size={16} color={colors.primary} /><Text style={[styles.secondaryActionText, { color: colors.primary }]}>Add to weekly plan</Text></ScalePressable>
                <ScalePressable accessibilityLabel={canLog ? 'Add recipe to diary' : 'Save recipe for nutrition review'} onPress={canLog ? openReview : () => { toggleSavedRecipe(detail.id); onClose(); }} scale={0.96} haptic="light" style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name={canLog ? 'plus-circle' : 'bookmark'} size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{canLog ? `Add to ${profile?.name ? 'today\'s diary' : 'diary'}` : 'Save for later'}</Text></ScalePressable>
                <Pressable accessibilityLabel="Open recipe source" onPress={() => Linking.openURL(detail.sourceUrl)} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.primary }]}>View source attribution</Text><Feather name="external-link" size={13} color={colors.primary} /></Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
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
    </Modal>
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
      source: 'Created in Calora',
      sourceUrl: 'https://calora.app/',
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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('For you');
  const [selected, setSelected] = useState<Recipe | CaloraRecipe | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [planNoticeVisible, setPlanNoticeVisible] = useState(false);
  const planNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remoteOffset, setRemoteOffset] = useState(0);
  const [remoteRecipes, setRemoteRecipes] = useState<Recipe[]>([]);
  const [hasMoreRemote, setHasMoreRemote] = useState(true);
  const loadingMoreRef = useRef(false);
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
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
  const recipesQuery = useListRecipes({ query: search || undefined, category: category === 'For you' || category === 'My recipes' || category === 'Quick' ? undefined : category, limit: RECIPE_PAGE_SIZE, offset: remoteOffset }, { query: { queryKey: ['recipes', search, category, remoteOffset], staleTime: 1000 * 60 * 10 } });
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
    if (category === 'My recipes' || !hasMoreRemote || recipesQuery.isFetching || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setRemoteOffset((current) => current + RECIPE_PAGE_SIZE);
  };
  const handleRecipeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 200) loadMoreRecipes();
  };
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false} onScroll={handleRecipeScroll} onMomentumScrollEnd={handleRecipeScroll} scrollEventThrottle={16} decelerationRate="normal">
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
                <Text style={styles.recipeHeaderBadgeText}>THE CALORA COOKBOOK</Text>
              </View>
              <Pressable accessibilityLabel="Create your own recipe" onPress={() => setShowCreate(true)} style={styles.recipeHeaderCreate}><Feather name="plus" size={15} color="#ffffff" /><Text style={styles.recipeHeaderCreateText}>Create</Text></Pressable>
            </View>
            <Text style={styles.recipeHeaderEyebrow}>GOOD FOOD, WITH CONTEXT</Text>
            <View style={styles.recipeTitleRow}>
              <Text style={styles.recipeHeaderTitle}>Recipes</Text>
              <Pressable
                accessibilityLabel="Open Calora Coach"
                onPress={() => router.push('/coach')}
                style={({ pressed }) => [styles.coachHeaderButton, { backgroundColor: 'rgba(212,234,220,0.18)', borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#08160f', opacity: pressed ? 0.8 : 1 }]}
              >
                <Feather name="zap" size={15} color="#ffffff" />
                <Text style={[styles.coachHeaderButtonText, { color: '#ffffff' }]}>Ask Calora</Text>
              </Pressable>
            </View>
            <Text style={styles.recipeHeaderSubtitle}>Discover meals worth making, with enough context to trust them.</Text>
          </View>
        </View>
        <MotivationalQuote colors={colors} style={{ marginBottom: 14 }} />
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search recipes" value={search} onChangeText={setSearch} placeholder="Search recipes, ingredients, cuisines" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />{search ? <Pressable accessibilityLabel="Clear recipe search" onPress={() => setSearch('')}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.map((item) => <Pressable key={item} accessibilityLabel={`Recipe category ${item}`} onPress={() => setCategory(item)} style={[styles.categoryChip, { backgroundColor: category === item ? colors.primary : colors.card, borderColor: category === item ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}<Pressable accessibilityLabel="Recipe category My recipes" onPress={() => setCategory('My recipes')} style={[styles.categoryChip, { backgroundColor: category === 'My recipes' ? colors.primary : colors.card, borderColor: category === 'My recipes' ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === 'My recipes' ? colors.primaryForeground : colors.mutedForeground }]}>My recipes</Text></Pressable></ScrollView>

        <View style={[styles.fitCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.fitIcon, { backgroundColor: 'rgba(157,215,189,0.15)' }]}><Feather name="target" size={18} color={colors.heroMuted} /></View>
          <Text style={[styles.fitEyebrow, { color: colors.heroMuted }]}>MADE FOR YOUR DAY</Text>
          <Text style={[styles.fitTitle, { color: colors.onHero }]}>{remainingCalories.toLocaleString()} kcal left to work with</Text>
          <Text style={[styles.fitBody, { color: colors.heroMuted }]}>Browse by mood and cuisine. When a recipe has nutrition data, Calora will show exactly how it fits your target.</Text>
        </View>

        {savedRecipes.length > 0 && <><View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved recipes</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Your shortlist, ready when you are.</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>{savedRecipes.slice(0, 6).map((recipe) => <View key={recipeKey(recipe)} style={{ width: 220 }}><RecipeCard recipe={recipe} colors={colors} saved remainingCalories={remainingCalories} onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipeKey(recipe))} /></View>)}</ScrollView></>}

        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{category === 'For you' ? 'Explore open recipes' : category === 'My recipes' ? 'Your recipes' : category}</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>{recipesQuery.isFetching && remoteRecipes.length > 0 ? 'Loading more recipes…' : category === 'Quick' ? `${visibleRemote.length + localMatches.length} quick meals from loaded recipes` : `${visibleRemote.length + localMatches.length} recipes to explore`}</Text></View><Feather name="book-open" size={18} color={colors.mutedForeground} /></View>
        {recipesQuery.isLoading && remoteRecipes.length === 0 ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Finding recipes from open sources…</Text></View> : recipesQuery.isError && remoteRecipes.length === 0 ? <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={20} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>The cookbook is offline</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your saved and personal recipes remain available. Try again when a connection is available.</Text></View> : <>{category === 'My recipes' && localMatches.length === 0 && <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="book-open" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No recipes yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Recipes you create will live here, separate from open-source content.</Text><Pressable accessibilityLabel="Create your first recipe" onPress={() => setShowCreate(true)} style={[styles.emptyAction, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.emptyActionText, { color: colors.primaryForeground }]}>Create your first recipe</Text></Pressable></View>}<Animated.View entering={FadeInDown.springify().damping(20).delay(80)} style={styles.recipeGrid}>{localMatches.map((recipe) => <View key={recipe.id} style={styles.recipeGridCard}><RecipeCard recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} imageHeight={122} remainingCalories={remainingCalories} onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} /></View>)}{visibleRemote.map((recipe) => <View key={recipe.id} style={styles.recipeGridCard}><RecipeCard recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} imageHeight={122} remainingCalories={remainingCalories} onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} /></View>)}</Animated.View>{recipesQuery.isError && remoteRecipes.length > 0 && <View style={[styles.offlineRetryRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={14} color={colors.warning} /><Text style={[styles.offlineRetryText, { color: colors.mutedForeground }]}>Connection lost — showing loaded recipes only.</Text><Pressable accessibilityLabel="Retry loading recipes" onPress={() => recipesQuery.refetch()} style={[styles.offlineRetryButton, { backgroundColor: colors.muted }]}><Text style={[styles.offlineRetryButtonText, { color: colors.foreground }]}>Retry</Text></Pressable></View>}{recipesQuery.isFetching && remoteRecipes.length > 0 && <View style={styles.loadMoreState}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Bringing in more recipes…</Text></View>}</>}
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>Open recipe discovery is provided by TheMealDB. Recipes remain attributed to their source; Calora’s nutrition confidence is shown separately.</Text>
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
  recipeHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 17, backgroundColor: '#1b3022' },
  recipeHeaderContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  recipeHeaderTop: { position: 'absolute', top: 16, left: 19, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipeHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  recipeHeaderBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
  recipeHeaderCreate: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(20,26,21,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  recipeHeaderCreateText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  recipeHeaderEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.3, marginBottom: 6 },
  recipeHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 29 * f, letterSpacing: -0.8 },
  recipeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 2 },
  coachHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  coachHeaderButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 0.1 },
  recipeHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 17, marginTop: 7, maxWidth: 290 },
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
  recipeCard: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  recipeImage: { width: '100%', backgroundColor: '#1d4539' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackCopy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: '#9dd7bd', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, marginTop: 6 },
  saveButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  localBadge: { position: 'absolute', left: 10, bottom: 10, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  localBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 0.7 },
  cardContent: { padding: 10 },
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
  attribution: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, lineHeight: 14, marginTop: 22 },
  primaryAction: { minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, marginTop: 17 },
  primaryActionText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  sourceAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 13 },
  sourceActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  createSheet: { borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20, paddingBottom: 28 },
  createFormContent: { paddingBottom: 30 },
  formError: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 11, padding: 10, marginTop: 10 },
  formErrorText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 14 },
  numberGrid: { flexDirection: 'row', gap: 7, marginTop: 11 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginBottom: 5 },
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
  });
}
const styles = makeStyles(1.0);
