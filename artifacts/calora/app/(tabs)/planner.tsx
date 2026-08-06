import { useGeneratePlanner, type PlannerMeal } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';
import { createStarterPlannerMeals, getPlannerWeekStart, plannerDate, plannerMealTypes } from '@/data/planner';
import type { FoodMemoryComponent } from '@/lib/foodMemory';

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
  onLongPress,
}: {
  meal: PlannerMeal;
  colors: ReturnType<typeof useCalora>['colors'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Open planned ${meal.meal}: ${meal.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={420}
      style={({ pressed }) => [styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
    >
      <Image source={{ uri: meal.image }} contentFit="cover" transition={160} style={styles.mealImage} />
      <View style={styles.mealCardBody}>
        <View style={styles.mealCardTop}>
          <View style={[styles.mealTypeBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.mealTypeBadgeText, { color: colors.accentForeground }]}>{shortMealType(meal.meal)}</Text>
          </View>
          <Text style={[styles.mealCalories, { color: colors.foreground }]}>{Math.round(meal.calories)} kcal</Text>
        </View>
        <Text numberOfLines={2} style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
        <View style={styles.macroLine}>
          <Text style={[styles.macroText, { color: colors.protein }]}>P {Math.round(meal.proteinG)}g</Text>
          <Text style={[styles.macroText, { color: colors.carbs }]}>C {Math.round(meal.carbsG)}g</Text>
          <Text style={[styles.macroText, { color: colors.fat }]}>F {Math.round(meal.fatG)}g</Text>
        </View>
      </View>
    </Pressable>
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

export default function PlannerScreen() {
  const { colors, profile, plannerWeekStart, plannerMeals, shoppingItems, setPlannerMeals, movePlannerMeal, toggleShoppingItem, createPlannerDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory, foodDrafts } = useCalora();
  const insets = useSafeAreaInsets();
  const generatePlanner = useGeneratePlanner();
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [detail, setDetail] = useState<PlannerMeal | null>(null);
  const [plannerReviewDraftId, setPlannerReviewDraftId] = useState<string | null>(null);
  const [shoppingVisible, setShoppingVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const plannerReviewDraft = plannerReviewDraftId ? (foodDrafts.find((d) => d.id === plannerReviewDraftId) ?? null) : null;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => plannerDate(plannerWeekStart, index)), [plannerWeekStart]);
  const today = new Date().toISOString().slice(0, 10);
  const selectedMeals = plannerMeals.filter((meal) => meal.day === selectedDay);
  const plannedWeek = plannerMeals.filter((meal) => weekDays.includes(meal.day));
  const uncheckedShopping = shoppingItems.filter((item) => !item.checked).length;

  const shiftWeek = (offset: number) => {
    const nextWeek = plannerDate(plannerWeekStart, offset * 7);
    const shifted = plannerMeals.map((meal) => {
      const mealDate = parseDate(meal.day);
      const nextDate = new Date(mealDate);
      nextDate.setDate(nextDate.getDate() + offset * 7);
      return { ...meal, day: nextDate.toISOString().slice(0, 10) };
    });
    setPlannerMeals(nextWeek, shifted);
    setSelectedDay(plannerDate(nextWeek, new Date(`${selectedDay}T12:00:00`).getDay() === 0 ? 6 : new Date(`${selectedDay}T12:00:00`).getDay() - 1));
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
          weekStart: plannerWeekStart,
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
      setPlannerMeals(result.weekStart, result.meals);
      setSelectedDay(result.weekStart);
      setGenerationMessage(result.message);
    } catch {
      const fallback = createStarterPlannerMeals(plannerWeekStart);
      setPlannerMeals(plannerWeekStart, fallback);
      setSelectedDay(plannerWeekStart);
      setGenerationMessage('Starter week ready offline. Customize anything that does not fit your day.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setGenerating(false);
    }
  };

  const planActions = (meal: PlannerMeal) => {
    const otherDays = weekDays.filter((day) => day !== meal.day);
    Alert.alert(`Move ${meal.name}`, 'Long-press actions keep planning quick on a phone.', [
      { text: 'Cancel', style: 'cancel' },
      ...otherDays.slice(0, 3).map((day) => ({
        text: `Move to ${dayFormatter.format(parseDate(day))}`,
        onPress: () => movePlannerMeal(meal.id, day, false),
      })),
      ...otherDays.slice(0, 3).map((day) => ({
        text: `Copy to ${dayFormatter.format(parseDate(day))}`,
        onPress: () => movePlannerMeal(meal.id, day, true),
      })),
    ]);
  };

  const addToDiary = (meal: PlannerMeal) => {
    const draft = createPlannerDraft(meal);
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
        <View style={styles.weekHeader}><Pressable accessibilityLabel="Previous week" onPress={() => shiftWeek(-1)} style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={18} color={colors.foreground} /></Pressable><Text style={[styles.weekRange, { color: colors.foreground }]}>{formatRange(plannerWeekStart)}</Text><Pressable accessibilityLabel="Next week" onPress={() => shiftWeek(1)} style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={18} color={colors.foreground} /></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRail}>
          {weekDays.map((day) => {
            const date = parseDate(day);
            const active = day === selectedDay;
            const isToday = day === today;
            return <Pressable key={day} accessibilityLabel={`Select ${dayFormatter.format(date)} ${date.getDate()}`} onPress={() => setSelectedDay(day)} style={[styles.dayPill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.dayName, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{dayFormatter.format(date)}</Text><Text style={[styles.dayNumber, { color: active ? colors.primaryForeground : colors.foreground }]}>{date.getDate()}</Text>{isToday && <View style={[styles.todayDot, { backgroundColor: active ? colors.primaryForeground : colors.primary }]} />}</Pressable>;
          })}
        </ScrollView>
        <SummaryBar meals={plannedWeek} target={profile?.calorieTarget ?? 2000} colors={colors} />
        <Pressable accessibilityLabel="Generate my week" onPress={() => void generate()} disabled={generating} style={[styles.generateButton, { backgroundColor: colors.primary, opacity: generating ? 0.72 : 1 }]}>{generating ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="star" size={17} color={colors.primaryForeground} />}<Text style={[styles.generateText, { color: colors.primaryForeground }]}>{generating ? 'Building your week…' : 'Generate My Week'}</Text><Feather name="arrow-up-right" size={16} color={colors.primaryForeground} /></Pressable>
        {generationMessage && <View accessibilityLiveRegion="polite" style={[styles.generationStatus, { backgroundColor: colors.accent }]}><Feather name="check-circle" size={16} color={colors.success} /><Text style={[styles.generationStatusText, { color: colors.foreground }]}>{generationMessage}</Text></View>}
        <View style={styles.dayHeading}><View><Text style={[styles.dayHeadingTitle, { color: colors.foreground }]}>{dayFormatter.format(parseDate(selectedDay))}'s meals</Text><Text style={[styles.dayHeadingCaption, { color: colors.mutedForeground }]}>Long press a meal to move or copy it.</Text></View><Text style={[styles.dayTotal, { color: colors.primary }]}>{Math.round(selectedMeals.reduce((sum, meal) => sum + meal.calories, 0))} kcal</Text></View>
        <View style={styles.mealList}>{plannerMealTypes.map((type) => { const meal = selectedMeals.find((item) => item.meal === type); return meal ? <MealCard key={meal.id} meal={meal} colors={colors} onPress={() => setDetail(meal)} onLongPress={() => planActions(meal)} /> : <View key={type} style={[styles.emptyMeal, { borderColor: colors.border }]}><Text style={[styles.emptyMealLabel, { color: colors.mutedForeground }]}>{type}</Text><Text style={[styles.emptyMealText, { color: colors.mutedForeground }]}>Tap Generate My Week to fill this spot.</Text></View>; })}
        </View>
        <View style={[styles.tipCard, { backgroundColor: colors.accent }]}><Feather name="info" size={16} color={colors.accentForeground} /><Text style={[styles.tipText, { color: colors.foreground }]}>Planning is a suggestion, not a promise. Swap anything that does not fit your day.</Text></View>
      </ScrollView>
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
                  <Image source={{ uri: detail.image }} contentFit="cover" style={styles.detailImage} />
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
        <View style={styles.modalBackdrop}><View style={[styles.shoppingSheet, { backgroundColor: colors.background }]}><View style={styles.sheetHandle} /><View style={styles.shoppingHeader}><View><Text style={[styles.detailEyebrow, { color: colors.primary }]}>AUTO-GENERATED</Text><Text style={[styles.detailTitle, { color: colors.foreground }]}>Shopping list</Text></View><Pressable accessibilityLabel="Close shopping list" onPress={() => setShoppingVisible(false)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable></View><Text style={[styles.shoppingSubtitle, { color: colors.mutedForeground }]}>Ingredients from this week's planned meals.</Text><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>{shoppingItems.map((item) => <Pressable key={item.id} accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`} onPress={() => toggleShoppingItem(item.id)} style={[styles.shoppingRow, { borderBottomColor: colors.border }]}><View style={[styles.checkbox, { borderColor: item.checked ? colors.success : colors.input, backgroundColor: item.checked ? colors.success : 'transparent' }]}>{item.checked && <Feather name="check" size={13} color={colors.primaryForeground} />}</View><Text style={[styles.shoppingName, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text><Text style={[styles.shoppingQuantity, { color: colors.mutedForeground }]}>{item.quantity}×</Text></Pressable>)}</ScrollView></View></View>
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
  mealTypeBadge: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealTypeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  mealCalories: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  mealName: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 18, marginTop: 8 },
  macroLine: { flexDirection: 'row', gap: 8, marginTop: 8 },
  macroText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  emptyMeal: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', padding: 12, justifyContent: 'center' },
  emptyMealLabel: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  emptyMealText: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  tipCard: { marginTop: 14, padding: 13, borderRadius: 15, flexDirection: 'row', gap: 9 },
  tipText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  detailSheet: { maxHeight: '88%', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
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
