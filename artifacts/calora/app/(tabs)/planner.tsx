import { useGeneratePlanner, type PlannerMeal } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';
import { buildShoppingItems, createStarterPlannerMeals, getPlannerWeekStart, plannerCatalog, plannerDate, plannerMealTypes } from '@/data/planner';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { router } from 'expo-router';

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatRange(weekStart: string) {
  const start = parseDate(weekStart);
  const end = parseDate(plannerDate(weekStart, 6));
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end)}`;
}

function shortMealType(type: PlannerMeal['meal']) {
  return type === 'Breakfast' ? 'B' : type === 'Lunch' ? 'L' : type === 'Dinner' ? 'D' : 'S';
}

function MealCard({
  meal,
  colors,
  onPress,
  onLog,
  onActions,
}: {
  meal: PlannerMeal;
  colors: ReturnType<typeof useCalora>['colors'];
  onPress: () => void;
  onLog: () => void;
  onActions: () => void;
}) {
  return (
    <View style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={meal.image ? { uri: meal.image } : require('../../assets/images/calora-plan-header.jpg')} contentFit="cover" transition={160} cachePolicy="memory-disk" style={styles.mealImage} />
      <View style={styles.mealCardBody}>
        <View style={styles.mealCardTop}>
          <View style={[styles.mealTypeBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.mealTypeBadgeText, { color: colors.accentForeground }]}>{shortMealType(meal.meal)}</Text>
          </View>
          <Pressable accessibilityLabel={`More actions for ${meal.name}`} onPress={onActions} hitSlop={8} style={styles.cardMoreButton}>
            <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Pressable accessibilityLabel={`Open planned ${meal.meal}: ${meal.name}`} onPress={onPress}>
          <Text numberOfLines={2} style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
        </Pressable>
        <View style={styles.macroLine}>
          <Text style={[styles.mealCalories, { color: colors.foreground }]}>{Math.round(meal.calories)} kcal</Text>
          <Text style={[styles.macroText, { color: colors.protein }]}>P {Math.round(meal.proteinG)}g</Text>
          <Text style={[styles.macroText, { color: colors.carbs }]}>C {Math.round(meal.carbsG)}g</Text>
          <Pressable accessibilityLabel={`Log ${meal.name} to diary`} onPress={onLog} style={[styles.logMealButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={13} color={colors.primaryForeground} />
            <Text style={[styles.logMealButtonText, { color: colors.primaryForeground }]}>Log</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SummaryBar({ meals, target, colors }: { meals: PlannerMeal[]; target: number; colors: ReturnType<typeof useCalora>['colors'] }) {
  const totals = meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.proteinG,
    carbs: sum.carbs + meal.carbsG,
    fat: sum.fat + meal.fatG,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const dailyCalories = meals.length ? totals.calories / 7 : 0;
  const goalProgress = Math.min(dailyCalories / target, 1);
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.hero }]}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={[styles.summaryEyebrow, { color: colors.heroMuted }]}>WEEKLY NUTRITION</Text>
          <Text style={[styles.summaryTitle, { color: colors.onHero }]}>{Math.round(dailyCalories).toLocaleString()} kcal <Text style={[styles.summaryTarget, { color: colors.heroMuted }]}>/ {target.toLocaleString()} daily</Text></Text>
        </View>
        <View style={[styles.goalRing, { borderColor: colors.primary }]}><Text style={[styles.goalRingText, { color: colors.onHero }]}>{Math.round(goalProgress * 100)}%</Text></View>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: 'rgba(157,215,189,0.18)' }]}><View style={[styles.goalFill, { width: `${goalProgress * 100}%`, backgroundColor: colors.primary }]} /></View>
      <View style={styles.summaryMacros}>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{Math.round(totals.protein / 7)}g</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>protein / day</Text></View>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{Math.round(totals.carbs / 7)}g</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>carbs / day</Text></View>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{Math.round(totals.fat / 7)}g</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>fat / day</Text></View>
      </View>
    </View>
  );
}

function SheetHeader({ eyebrow, title, onClose, colors }: { eyebrow?: string; title: string; onClose: () => void; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <View style={styles.sheetHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{eyebrow}</Text>}
        <Text style={[styles.detailTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <Pressable accessibilityLabel={`Close ${title}`} onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
        <Feather name="x" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export default function PlannerScreen() {
  const { colors, profile, plannerWeekStart, plannerMeals, shoppingItems, setPlannerMeals, updatePlannerMeals, movePlannerMeal, toggleShoppingItemByName, createPlannerDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory, foodDrafts, livingState } = useCalora();
  const insets = useSafeAreaInsets();
  const generatePlanner = useGeneratePlanner();
  const today = new Date().toISOString().slice(0, 10);
  const [viewWeekStart, setViewWeekStart] = useState(plannerWeekStart);
  const [selectedDay, setSelectedDay] = useState(() => {
    const persistedWeekDays = Array.from({ length: 7 }, (_, index) => plannerDate(plannerWeekStart, index));
    return persistedWeekDays.includes(today) ? today : plannerWeekStart;
  });
  const [detail, setDetail] = useState<PlannerMeal | null>(null);
  const [plannerReviewDraftId, setPlannerReviewDraftId] = useState<string | null>(null);
  const [shoppingVisible, setShoppingVisible] = useState(false);
  const [actionMeal, setActionMeal] = useState<PlannerMeal | null>(null);
  const [actionMode, setActionMode] = useState<'move' | 'copy' | null>(null);
  const [addingMealType, setAddingMealType] = useState<PlannerMeal['meal'] | null>(null);
  const [replaceMeal, setReplaceMeal] = useState<PlannerMeal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const plannerReviewDraft = plannerReviewDraftId ? (foodDrafts.find((d) => d.id === plannerReviewDraftId) ?? null) : null;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => plannerDate(viewWeekStart, index)), [viewWeekStart]);
  const selectedMeals = plannerMeals.filter((meal) => meal.day === selectedDay);
  const plannedWeek = plannerMeals.filter((meal) => weekDays.includes(meal.day));
  const visibleShoppingItems = useMemo(
    () => buildShoppingItems(plannedWeek, new Map(shoppingItems.map((item) => [item.name, item.checked]))),
    [plannedWeek, shoppingItems],
  );
  const uncheckedShopping = visibleShoppingItems.filter((item) => !item.checked).length;

  const acknowledge = (message: string) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(null), 2600);
  };

  const shiftWeek = (offset: number) => {
    const nextWeek = plannerDate(viewWeekStart, offset * 7);
    const currentDayIndex = weekDays.indexOf(selectedDay);
    setViewWeekStart(nextWeek);
    setSelectedDay(plannerDate(nextWeek, currentDayIndex >= 0 ? currentDayIndex : 0));
  };

  const goToToday = () => {
    const currentWeek = getPlannerWeekStart();
    setViewWeekStart(currentWeek);
    setSelectedDay(today);
  };

  const replaceMealInPlan = (nextMeal: PlannerMeal, target: PlannerMeal) => {
    const next = plannerMeals.map((meal) => meal.id === target.id ? { ...nextMeal, id: target.id, day: target.day } : meal);
    updatePlannerMeals(next);
    setReplaceMeal(null);
    setActionMeal(null);
    acknowledge(`${nextMeal.name} is on your ${dayFormatter.format(parseDate(target.day))} plan.`);
  };

  const addMealToPlan = (template: PlannerMeal, day: string, mealType: PlannerMeal['meal']) => {
    const next = [...plannerMeals.filter((meal) => !(meal.day === day && meal.meal === mealType)), { ...template, id: `planned-${Date.now()}-${template.id}`, day, meal: mealType }];
    updatePlannerMeals(next);
    setAddingMealType(null);
    acknowledge(`${template.name} added to your plan.`);
  };

  const removeMealFromPlan = (meal: PlannerMeal) => {
    updatePlannerMeals(plannerMeals.filter((item) => item.id !== meal.id));
    setActionMeal(null);
    acknowledge(`${meal.name} removed. Your plan stays flexible.`);
  };

  const moveOrCopyMeal = (day: string, copy: boolean) => {
    if (!actionMeal) return;
    movePlannerMeal(actionMeal.id, day, copy);
    setActionMeal(null);
    setActionMode(null);
    acknowledge(copy ? `${actionMeal.name} copied to ${dayFormatter.format(parseDate(day))}.` : `${actionMeal.name} moved to ${dayFormatter.format(parseDate(day))}.`);
  };

  const generate = async () => {
    setGenerating(true);
    setGenerationMessage(null);
    const plannerProfile = profile ?? {
      goal: 'maintain' as const,
      activity: 'moderate' as const,
      diet: 'Everything' as const,
      calorieTarget: 2000,
    };
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = generatePlanner.mutateAsync({
        data: {
          weekStart: viewWeekStart,
          profile: {
            goal: plannerProfile.goal,
            activity: plannerProfile.activity,
            diet: plannerProfile.diet,
            calorieTarget: plannerProfile.calorieTarget,
          },
        },
      });
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Planner request timed out')), 6500);
      });
      const result = await Promise.race([request, timeout]);
      const existing = plannerMeals.filter((meal) => weekDays.includes(meal.day));
      const existingSlots = new Set(existing.map((meal) => `${meal.day}-${meal.meal}`));
      const merged = [...plannerMeals, ...result.meals.filter((meal) => !existingSlots.has(`${meal.day}-${meal.meal}`))];
      setPlannerMeals(result.weekStart, merged);
      setViewWeekStart(result.weekStart);
      setSelectedDay(result.weekStart);
      setGenerationMessage(result.message);
      acknowledge('Your refreshed week is saved on this device.');
    } catch {
      const fallback = createStarterPlannerMeals(viewWeekStart);
      const existingSlots = new Set(plannerMeals.filter((meal) => weekDays.includes(meal.day)).map((meal) => `${meal.day}-${meal.meal}`));
      setPlannerMeals(viewWeekStart, [...plannerMeals, ...fallback.filter((meal) => !existingSlots.has(`${meal.day}-${meal.meal}`))]);
      setViewWeekStart(viewWeekStart);
      setSelectedDay(viewWeekStart);
      setGenerationMessage('Starter week ready offline. Customize anything that does not fit your day.');
      acknowledge('Your offline starter week is saved on this device.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setGenerating(false);
    }
  };

  const addToDiary = (meal: PlannerMeal) => {
    const draft = createPlannerDraft(meal);
    setDetail(meal);
    setPlannerReviewDraftId(draft.id);
  };

  const updatePlannerComponent = (component: FoodMemoryComponent) => {
    if (!plannerReviewDraft) return;
    updateFoodMemoryDraft(plannerReviewDraft.id, plannerReviewDraft.components.map((item) => item.id === component.id ? component : item));
  };

  const acceptPlannerDraft = () => {
    if (!plannerReviewDraft) return;
    acceptFoodMemory(plannerReviewDraft.id);
    setPlannerReviewDraftId(null);
    setDetail(null);
    acknowledge('Added to your diary and remembered locally.');
  };

  const dismissPlannerReview = () => {
    if (plannerReviewDraft) rejectFoodMemory(plannerReviewDraft.id);
    setPlannerReviewDraftId(null);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 106 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <Image source={require('../../assets/images/calora-plan-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(20,26,21,0.97)', 'rgba(20,26,21,0.72)', 'rgba(20,26,21,0.16)']}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="calendar" size={12} color="#d4eadc" />
              <Text style={styles.heroBadgeText}>PLAN WITH INTENT</Text>
            </View>
            <Text style={styles.heroEyebrow}>YOUR WEEK, MADE CALM</Text>
            <Text style={styles.heroTitle}>Weekly planner</Text>
            <Text style={styles.heroSubtitle}>A good plan leaves room for real life.</Text>
          </View>
          <Pressable accessibilityLabel="Open shopping list" onPress={() => setShoppingVisible(true)} style={styles.heroShoppingButton}><Feather name="shopping-bag" size={18} color="#ffffff" />{uncheckedShopping > 0 && <View style={[styles.shoppingCount, { backgroundColor: colors.primary }]}><Text style={[styles.shoppingCountText, { color: colors.primaryForeground }]}>{uncheckedShopping}</Text></View>}</Pressable>
        </View>
        <View style={[styles.nextStepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.nextStepIcon, { backgroundColor: colors.accent }]}>
            <Feather name={livingState.action.kind === 'add_water' ? 'droplet' : livingState.action.kind === 'view_progress' ? 'bar-chart-2' : 'compass'} size={17} color={colors.accentForeground} />
          </View>
          <View style={styles.nextStepCopy}>
            <Text style={[styles.nextStepEyebrow, { color: colors.primary }]}>A GOOD PLACE TO START</Text>
            <Text style={[styles.nextStepTitle, { color: colors.foreground }]}>{livingState.action.kind === 'open_planner' ? livingState.headline : 'Shape the week around real life.'}</Text>
            <Text style={[styles.nextStepBody, { color: colors.mutedForeground }]}>{livingState.action.kind === 'open_planner' ? livingState.message : 'Keep what helps, leave room for what changes.'}</Text>
          </View>
          <Pressable accessibilityLabel="Open what Calora remembers" onPress={() => router.push('/memory')} hitSlop={8} style={styles.nextStepLink}>
            <Feather name="arrow-up-right" size={17} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.weekHeader}>
          <Pressable accessibilityLabel="Previous week" onPress={() => shiftWeek(-1)} style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={18} color={colors.foreground} /></Pressable>
          <View style={styles.weekRangeCopy}>
            <Text style={[styles.weekRange, { color: colors.foreground }]}>{formatRange(viewWeekStart)}</Text>
            {viewWeekStart !== getPlannerWeekStart() && <Pressable accessibilityLabel="Return to this week" onPress={goToToday}><Text style={[styles.todayLink, { color: colors.primary }]}>Today</Text></Pressable>}
          </View>
          <Pressable accessibilityLabel="Next week" onPress={() => shiftWeek(1)} style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={18} color={colors.foreground} /></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRail}>
          {weekDays.map((day) => {
            const date = parseDate(day);
            const active = day === selectedDay;
            const isToday = day === today;
            return <Pressable key={day} accessibilityLabel={`Select ${dayFormatter.format(date)} ${date.getDate()}`} onPress={() => setSelectedDay(day)} style={[styles.dayPill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.dayName, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{dayFormatter.format(date)}</Text><Text style={[styles.dayNumber, { color: active ? colors.primaryForeground : colors.foreground }]}>{date.getDate()}</Text>{isToday && <View style={[styles.todayDot, { backgroundColor: active ? colors.primaryForeground : colors.primary }]} />}</Pressable>;
          })}
        </ScrollView>
         <Pressable accessibilityLabel="Generate my week" onPress={() => void generate()} disabled={generating} style={[styles.generateButton, { backgroundColor: colors.primary, opacity: generating ? 0.72 : 1 }]}>{generating ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="zap" size={17} color={colors.primaryForeground} />}<View style={styles.generateCopy}><Text style={[styles.generateText, { color: colors.primaryForeground }]}>{generating ? 'Building your week…' : 'Suggest meals for open spots'}</Text><Text style={[styles.generateHint, { color: colors.primaryForeground }]}>Your choices stay in place</Text></View><Feather name="arrow-up-right" size={16} color={colors.primaryForeground} /></Pressable>
        {generationMessage && <View accessibilityLiveRegion="polite" style={[styles.generationStatus, { backgroundColor: colors.accent }]}><Feather name="check-circle" size={16} color={colors.success} /><Text style={[styles.generationStatusText, { color: colors.foreground }]}>{generationMessage}</Text></View>}
         <View style={styles.dayHeading}><View><Text style={[styles.dayHeadingTitle, { color: colors.foreground }]}>{dayFormatter.format(parseDate(selectedDay))}'s meals</Text><Text style={[styles.dayHeadingCaption, { color: colors.mutedForeground }]}>Tap a meal to see it. Use Log or ··· to change the plan.</Text></View><Text style={[styles.dayTotal, { color: colors.primary }]}>{Math.round(selectedMeals.reduce((sum, meal) => sum + meal.calories, 0))} kcal</Text></View>
          <View style={styles.mealList}>{plannerMealTypes.map((type) => { const meal = selectedMeals.find((item) => item.meal === type); return meal ? <MealCard key={meal.id} meal={meal} colors={colors} onPress={() => setDetail(meal)} onLog={() => addToDiary(meal)} onActions={() => { setActionMeal(meal); setActionMode(null); }} /> : <Pressable key={type} accessibilityLabel={`Add ${type} to ${dayFormatter.format(parseDate(selectedDay))}`} onPress={() => setAddingMealType(type)} style={[styles.emptyMeal, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.emptySlotIcon, { backgroundColor: colors.accent }]}><Feather name="plus" size={17} color={colors.accentForeground} /></View><View style={styles.emptyMealCopy}><Text style={[styles.emptyMealLabel, { color: colors.foreground }]}>{type}</Text><Text style={[styles.emptyMealText, { color: colors.mutedForeground }]}>Choose something, or leave this open.</Text></View><Feather name="chevron-right" size={16} color={colors.mutedForeground} /></Pressable>; })}
        </View>
        <View style={[styles.tipCard, { backgroundColor: colors.accent }]}><Feather name="info" size={16} color={colors.accentForeground} /><Text style={[styles.tipText, { color: colors.foreground }]}>Planning is a suggestion, not a promise. Swap anything that does not fit your day.</Text></View>
         <SummaryBar meals={plannedWeek} target={profile?.calorieTarget ?? 2000} colors={colors} />
      </ScrollView>
       <LocalSaveNotice visible={saveMessage !== null} message={saveMessage ?? ''} colors={colors} />
      <Modal visible={detail !== null} transparent animationType="slide" onRequestClose={() => { dismissPlannerReview(); setDetail(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            {detail && plannerReviewDraft ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
                <View style={styles.reviewTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailEyebrow, { color: colors.primary }]}>PLANNER REVIEW · {dateFormatter.format(parseDate(detail.day))}</Text>
                    <Text style={[styles.detailTitle, { color: colors.foreground }]}>{plannerReviewDraft.title}</Text>
                  </View>
                  <Pressable accessibilityLabel="Cancel planner review" onPress={dismissPlannerReview} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.reviewSubtitle, { color: colors.mutedForeground }]}>Adjust your portion before it reaches your diary.</Text>
                {plannerReviewDraft.assumptions.length > 0 && (
                  <View style={[styles.assumptionCard, { backgroundColor: colors.accent }]}>
                    <Feather name="info" size={14} color={colors.accentForeground} />
                    <Text style={[styles.assumptionText, { color: colors.foreground }]}>{plannerReviewDraft.assumptions.join(' · ')}</Text>
                  </View>
                )}
                {plannerReviewDraft.components.map((component) => (
                  <View key={component.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.reviewCardHeader}>
                      <View style={[styles.reviewCardIcon, { backgroundColor: colors.hero }]}>
                        <Feather name="calendar" size={15} color={colors.heroMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewCardName, { color: colors.foreground }]}>{component.name}</Text>
                        <Text style={[styles.reviewCardSource, { color: colors.mutedForeground }]}>{component.sourceLabel} · {component.confidence}% confidence</Text>
                      </View>
                    </View>
                    <View style={styles.reviewNutritionRow}>
                      <View><Text style={[styles.reviewNutritionValue, { color: colors.foreground }]}>{Math.round(component.calories * component.eatenFraction)}</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
                      <View><Text style={[styles.reviewNutritionValue, { color: colors.protein }]}>{Math.round(component.proteinG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
                      <View><Text style={[styles.reviewNutritionValue, { color: colors.carbs }]}>{Math.round(component.carbsG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
                      <View><Text style={[styles.reviewNutritionValue, { color: colors.fat }]}>{Math.round(component.fatG * component.eatenFraction)}g</Text><Text style={[styles.reviewNutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
                    </View>
                    <Text style={[styles.reviewFieldLabel, { color: colors.mutedForeground }]}>How much did you eat?</Text>
                    <View style={styles.reviewFractionRow}>
                      <Pressable accessibilityLabel="Decrease portion" onPress={() => updatePlannerComponent({ ...component, eatenFraction: Math.max(0.25, component.eatenFraction - 0.25) })} style={[styles.reviewFractionButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={14} color={colors.foreground} /></Pressable>
                      <Text style={[styles.reviewFractionValue, { color: colors.foreground }]}>{Math.round(component.eatenFraction * 100)}%</Text>
                      <Pressable accessibilityLabel="Increase portion" onPress={() => updatePlannerComponent({ ...component, eatenFraction: Math.min(1, component.eatenFraction + 0.25) })} style={[styles.reviewFractionButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={14} color={colors.foreground} /></Pressable>
                    </View>
                    {component.reviewQuestions.length > 0 && <Text style={[styles.reviewQuestion, { color: colors.warning }]}>{component.reviewQuestions[0]}</Text>}
                  </View>
                ))}
                <View style={[styles.reviewTotalCard, { backgroundColor: colors.hero }]}>
                  <View><Text style={[styles.reviewTotalLabel, { color: colors.heroMuted }]}>REVIEW TOTAL</Text><Text style={[styles.reviewTotalValue, { color: colors.onHero }]}>{Math.round(plannerReviewDraft.nutrition.calories)} kcal</Text></View>
                  <Text style={[styles.reviewTotalMacros, { color: colors.heroMuted }]}>P {Math.round(plannerReviewDraft.nutrition.proteinG)}g · C {Math.round(plannerReviewDraft.nutrition.carbsG)}g · F {Math.round(plannerReviewDraft.nutrition.fatG)}g</Text>
                </View>
                <Pressable accessibilityLabel="Approve and add planned meal to diary" onPress={acceptPlannerDraft} style={[styles.addDiaryButton, { backgroundColor: colors.primary }]}>
                  <Feather name="check-circle" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.addDiaryText, { color: colors.primaryForeground }]}>Approve and add to diary</Text>
                </Pressable>
                <Pressable accessibilityLabel="Cancel planned meal log" onPress={dismissPlannerReview} style={styles.dismissButton}>
                  <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Not this meal</Text>
                </Pressable>
              </ScrollView>
            ) : (
              detail && (
                <>
                  <Image source={detail.image ? { uri: detail.image } : require('../../assets/images/calora-plan-header.jpg')} contentFit="cover" style={styles.detailImage} />
                  <View style={styles.detailBody}>
                    <View style={styles.detailTitleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{detail.meal.toUpperCase()} · {dateFormatter.format(parseDate(detail.day))}</Text>
                        <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
                      </View>
                      <Pressable accessibilityLabel="Close meal detail" onPress={() => setDetail(null)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
                    </View>
                    <Text style={[styles.detailDescription, { color: colors.mutedForeground }]}>{detail.description}</Text>
                    <View style={styles.detailStats}>
                      <Text style={[styles.detailStat, { color: colors.foreground }]}>{Math.round(detail.calories)} kcal</Text>
                      <Text style={[styles.detailStat, { color: colors.protein }]}>P {Math.round(detail.proteinG)}g</Text>
                      <Text style={[styles.detailStat, { color: colors.carbs }]}>C {Math.round(detail.carbsG)}g</Text>
                      <Text style={[styles.detailStat, { color: colors.fat }]}>F {Math.round(detail.fatG)}g</Text>
                    </View>
                    <Text style={[styles.ingredientsLabel, { color: colors.foreground }]}>Ingredients</Text>
                    <Text style={[styles.ingredientsText, { color: colors.mutedForeground }]}>{detail.ingredients.join(' · ')}</Text>
                    <Pressable accessibilityLabel={`Add ${detail.name} to diary`} onPress={() => addToDiary(detail)} style={[styles.addDiaryButton, { backgroundColor: colors.primary }]}>
                      <Feather name="plus" size={16} color={colors.primaryForeground} />
                      <Text style={[styles.addDiaryText, { color: colors.primaryForeground }]}>Add to diary</Text>
                    </Pressable>
                  </View>
                </>
              )
            )}
          </View>
        </View>
      </Modal>
       <Modal visible={shoppingVisible} transparent animationType="slide" onRequestClose={() => setShoppingVisible(false)}>
         <View style={styles.modalBackdrop}><View style={[styles.shoppingSheet, { backgroundColor: colors.background }]}><View style={styles.sheetHandle} /><View style={styles.shoppingHeader}><View><Text style={[styles.detailEyebrow, { color: colors.primary }]}>THIS WEEK</Text><Text style={[styles.detailTitle, { color: colors.foreground }]}>Shopping list</Text></View><Pressable accessibilityLabel="Close shopping list" onPress={() => setShoppingVisible(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable></View><Text style={[styles.shoppingSubtitle, { color: colors.mutedForeground }]}>Ingredients from the week you are viewing.</Text><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>{visibleShoppingItems.map((item) => <Pressable key={item.id} accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`} onPress={() => toggleShoppingItemByName(item.name)} style={[styles.shoppingRow, { borderBottomColor: colors.border }]}><View style={[styles.checkbox, { borderColor: item.checked ? colors.success : colors.input, backgroundColor: item.checked ? colors.success : 'transparent' }]}>{item.checked && <Feather name="check" size={13} color={colors.primaryForeground} />}</View><Text style={[styles.shoppingName, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text><Text style={[styles.shoppingQuantity, { color: colors.mutedForeground }]}>{item.quantity}×</Text></Pressable>)}</ScrollView></View></View>
      </Modal>
       <Modal visible={actionMeal !== null} transparent animationType="slide" onRequestClose={() => { setActionMeal(null); setActionMode(null); }}>
         <View style={styles.modalBackdrop}>
           <View style={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             {actionMeal && !actionMode && (
               <>
                 <SheetHeader eyebrow={`${actionMeal.meal.toUpperCase()} · ${dateFormatter.format(parseDate(actionMeal.day))}`} title={actionMeal.name} onClose={() => setActionMeal(null)} colors={colors} />
                 <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Make a change without losing your place in the week.</Text>
                 <View style={styles.actionGrid}>
                   <Pressable accessibilityLabel={`Log ${actionMeal.name}`} onPress={() => { setActionMeal(null); addToDiary(actionMeal); }} style={[styles.actionTile, { backgroundColor: colors.primary }]}>
                     <Feather name="check-circle" size={18} color={colors.primaryForeground} />
                     <Text style={[styles.actionTileTitle, { color: colors.primaryForeground }]}>Log to diary</Text>
                     <Text style={[styles.actionTileBody, { color: colors.primaryForeground }]}>Review the portion first</Text>
                   </Pressable>
                   <Pressable accessibilityLabel={`Move ${actionMeal.name}`} onPress={() => setActionMode('move')} style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="corner-up-right" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Move</Text>
                     <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Keep one planned meal</Text>
                   </Pressable>
                   <Pressable accessibilityLabel={`Copy ${actionMeal.name}`} onPress={() => setActionMode('copy')} style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="copy" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Copy</Text>
                     <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Use it another day</Text>
                   </Pressable>
                   <Pressable accessibilityLabel={`Replace ${actionMeal.name}`} onPress={() => { setReplaceMeal(actionMeal); setActionMeal(null); }} style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="refresh-cw" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Replace</Text>
                     <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Find a better fit</Text>
                   </Pressable>
                 </View>
                 <Pressable accessibilityLabel={`Remove ${actionMeal.name} from plan`} onPress={() => removeMealFromPlan(actionMeal)} style={styles.removeAction}>
                   <Feather name="minus-circle" size={15} color={colors.mutedForeground} />
                   <Text style={[styles.removeActionText, { color: colors.mutedForeground }]}>Remove from this plan</Text>
                 </Pressable>
               </>
             )}
             {actionMeal && actionMode && (
               <>
                 <SheetHeader eyebrow={actionMode === 'copy' ? 'COPY TO' : 'MOVE TO'} title={actionMeal.name} onClose={() => { setActionMeal(null); setActionMode(null); }} colors={colors} />
                 <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Choose a day. Your current meal stays in view until you choose.</Text>
                 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dayChoiceList}>
                   {weekDays.map((day) => {
                     const isCurrent = day === actionMeal.day;
                     return <Pressable key={day} accessibilityLabel={`${actionMode === 'copy' ? 'Copy' : 'Move'} to ${dayFormatter.format(parseDate(day))}`} disabled={actionMode === 'move' && isCurrent} onPress={() => moveOrCopyMeal(day, actionMode === 'copy')} style={[styles.dayChoice, { backgroundColor: colors.card, borderColor: colors.border, opacity: actionMode === 'move' && isCurrent ? 0.45 : 1 }]}><View style={[styles.dayChoiceIcon, { backgroundColor: isCurrent ? colors.accent : colors.muted }]}><Feather name={isCurrent ? 'check' : 'calendar'} size={15} color={isCurrent ? colors.accentForeground : colors.foreground} /></View><View style={styles.dayChoiceCopy}><Text style={[styles.dayChoiceName, { color: colors.foreground }]}>{dayFormatter.format(parseDate(day))}</Text><Text style={[styles.dayChoiceDate, { color: colors.mutedForeground }]}>{dateFormatter.format(parseDate(day))}{isCurrent ? ' · current day' : ''}</Text></View><Feather name="chevron-right" size={16} color={colors.mutedForeground} /></Pressable>;
                   })}
                 </ScrollView>
               </>
             )}
           </View>
         </View>
       </Modal>
       <Modal visible={addingMealType !== null} transparent animationType="slide" onRequestClose={() => setAddingMealType(null)}>
         <View style={styles.modalBackdrop}>
           <View style={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             <SheetHeader eyebrow={`${dayFormatter.format(parseDate(selectedDay)).toUpperCase()} · ${addingMealType ?? ''}`} title="Add something that fits" onClose={() => setAddingMealType(null)} colors={colors} />
             <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>A few good starting points. You can replace this anytime.</Text>
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catalogList}>
               {plannerCatalog.filter((meal) => meal.meal === addingMealType).map((meal) => <Pressable key={meal.id} accessibilityLabel={`Add ${meal.name} to plan`} onPress={() => addMealToPlan(meal, selectedDay, addingMealType!)} style={[styles.catalogRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={{ uri: meal.image }} contentFit="cover" style={styles.catalogImage} /><View style={styles.catalogCopy}><Text style={[styles.catalogName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.catalogMeta, { color: colors.mutedForeground }]}>{meal.calories} kcal · {meal.prepMinutes ?? 0} min prep</Text></View><Feather name="plus-circle" size={19} color={colors.primary} /></Pressable>)}
             </ScrollView>
             <Pressable accessibilityLabel={`Leave ${addingMealType} open`} onPress={() => { setAddingMealType(null); acknowledge(`${addingMealType} left open for real life.`); }} style={styles.leaveOpenButton}><Text style={[styles.leaveOpenText, { color: colors.mutedForeground }]}>Leave this slot open</Text></Pressable>
           </View>
         </View>
       </Modal>
       <Modal visible={replaceMeal !== null} transparent animationType="slide" onRequestClose={() => setReplaceMeal(null)}>
         <View style={styles.modalBackdrop}>
           <View style={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             <SheetHeader eyebrow="REPLACE MEAL" title={replaceMeal?.name ?? ''} onClose={() => setReplaceMeal(null)} colors={colors} />
             <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Choose a new {replaceMeal?.meal.toLowerCase()} for {dateFormatter.format(parseDate(replaceMeal?.day ?? selectedDay))}.</Text>
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catalogList}>
               {plannerCatalog.filter((meal) => meal.meal === replaceMeal?.meal && meal.id !== replaceMeal?.id).map((meal) => <Pressable key={meal.id} accessibilityLabel={`Replace with ${meal.name}`} onPress={() => replaceMeal && replaceMealInPlan(meal, replaceMeal)} style={[styles.catalogRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={{ uri: meal.image }} contentFit="cover" style={styles.catalogImage} /><View style={styles.catalogCopy}><Text style={[styles.catalogName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.catalogMeta, { color: colors.mutedForeground }]}>{meal.calories} kcal · {meal.prepMinutes ?? 0} min prep</Text></View><Feather name="arrow-right" size={18} color={colors.primary} /></Pressable>)}
             </ScrollView>
           </View>
         </View>
       </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  heroHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 15, backgroundColor: '#141a15', position: 'relative' },
  heroContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  heroBadge: { position: 'absolute', top: 17, left: 19, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  heroBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  heroEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7 },
  heroSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 7, maxWidth: 250 },
  heroShoppingButton: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,26,21,0.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 6 },
  shoppingButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shoppingCount: { position: 'absolute', right: -4, top: -5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shoppingCountText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  weekArrow: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  weekRange: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  dayRail: { gap: 8, paddingBottom: 13 },
  dayPill: { width: 47, height: 66, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayName: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  dayNumber: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 3 },
  todayDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 7 },
  summaryCard: { borderRadius: 21, padding: 16, marginBottom: 12 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 4 },
  summaryTarget: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  goalRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  goalRingText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  goalTrack: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 3 },
  summaryMacros: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  summaryMacroValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  summaryMacroLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  generateButton: { minHeight: 48, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  generateText: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 12 },
  generationStatus: { minHeight: 42, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -7, marginBottom: 13 },
  generationStatusText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15 },
  dayHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  dayHeadingTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  dayHeadingCaption: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  dayTotal: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  mealList: { gap: 10 },
  mealCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', minHeight: 114 },
  mealImage: { width: 116, minHeight: 114 },
  mealCardBody: { flex: 1, padding: 12 },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMoreButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: -5, marginTop: -4 },
  mealTypeBadge: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealTypeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  mealCalories: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  mealName: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 18, marginTop: 8 },
  macroLine: { flexDirection: 'row', gap: 8, marginTop: 8 },
  macroText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  logMealButton: { marginLeft: 'auto', minHeight: 26, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 3 },
  logMealButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  emptyMeal: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyMealImage: { width: 48, height: 46, borderRadius: 10, opacity: 0.8 },
  emptySlotIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyMealCopy: { flex: 1 },
  emptyMealLabel: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  emptyMealText: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  tipCard: { marginTop: 14, padding: 13, borderRadius: 15, flexDirection: 'row', gap: 9 },
  tipText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  nextStepCard: { borderRadius: 18, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  nextStepIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextStepCopy: { flex: 1 },
  nextStepEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.1 },
  nextStepTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 4 },
  nextStepBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 3 },
  nextStepLink: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  weekRangeCopy: { alignItems: 'center', gap: 3 },
  todayLink: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  generateCopy: { flex: 1 },
  generateHint: { fontFamily: 'Inter_400Regular', fontSize: 9, opacity: 0.82, marginTop: 2 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  detailSheet: { maxHeight: '88%', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
  actionSheet: { maxHeight: '86%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  sheetSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: { width: '48%', minHeight: 104, borderRadius: 16, borderWidth: 1, padding: 13 },
  actionTileTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, marginTop: 13 },
  actionTileBody: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13, marginTop: 4 },
  removeAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 9 },
  removeActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  dayChoiceList: { gap: 8, paddingBottom: 12 },
  dayChoice: { minHeight: 59, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayChoiceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayChoiceCopy: { flex: 1 },
  dayChoiceName: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  dayChoiceDate: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  catalogList: { gap: 8, paddingBottom: 8 },
  catalogRow: { minHeight: 65, borderWidth: 1, borderRadius: 15, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catalogImage: { width: 49, height: 49, borderRadius: 11 },
  catalogCopy: { flex: 1 },
  catalogName: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  catalogMeta: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  leaveOpenButton: { alignItems: 'center', paddingVertical: 12 },
  leaveOpenText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  detailImage: { height: 220, width: '100%' },
  detailBody: { padding: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginVertical: 11 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5, marginTop: 5 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailDescription: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 12 },
  detailStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(120,120,120,0.16)', paddingVertical: 14, marginTop: 16 },
  detailStat: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  ingredientsLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 17 },
  ingredientsText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 6 },
  addDiaryButton: { minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 19 },
  addDiaryText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  reviewSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 14 },
  assumptionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 13, marginBottom: 12 },
  assumptionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  reviewCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 11 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewCardIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reviewCardName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  reviewCardSource: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 3 },
  reviewNutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(120,120,120,0.15)' },
  reviewNutritionValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  reviewNutritionLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  reviewFieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 11, marginBottom: 6 },
  reviewFractionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewFractionButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reviewFractionValue: { width: 42, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 12 },
  reviewQuestion: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 15, marginTop: 9 },
  reviewTotalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 4 },
  reviewTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  reviewTotalValue: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 3 },
  reviewTotalMacros: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'right' },
  dismissButton: { alignItems: 'center', paddingVertical: 13 },
  dismissText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  shoppingSheet: { maxHeight: '80%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
  shoppingHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  shoppingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 8, marginBottom: 12 },
  shoppingRow: { minHeight: 46, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shoppingName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  shoppingQuantity: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
