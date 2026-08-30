import { useGeneratePlanner, type PlannerMeal } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { Surface } from '@/components/Surface';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import { formatCalories, formatGrams, formatWhole } from '@/lib/formatters';
import { consumePlannerAck, consumeUndoSwap } from '@/lib/plannerAck';
import { applyIdentityReplace, applySlotReplace, buildShoppingItems, createStarterPlannerMeals, getPlannerWeekStart, isProgramGeneratedMeal, mergeGeneratedWeek, plannerCatalog, plannerDate, plannerMealTypes } from '@/data/planner';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { PLAN_TYPES, clearProgramApplication, findPlanType, isStarterFallbackProvider, planTypeForGeneration, programAppliedToWeek, recordGenerationOutcome, resolveGenerationRecording, selectPrimaryProgram, type PlanType, type PlanTypeId } from '@/lib/planType';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { BottomSheet } from '@/components/BottomSheet';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppHeader } from '@/components/AppChrome';
import { CaloraFeatureIcon } from '@/components/CaloraFeatureIcon';
import { SwipeGestureExclusion, SwipeableSectionPager, SwipeableTabList } from '@/components/SwipeableTabList';
import { router, useFocusEffect } from 'expo-router';
import { dateKey } from '@/lib/dates';

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const PLANNER_WORKSPACES = ['today', 'week', 'shopping'] as const;

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatRange(weekStart: string) {
  const start = parseDate(weekStart);
  const end = parseDate(plannerDate(weekStart, 6));
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end)}`;
}

function formatShoppingDays(days: string[] | undefined): string {
  if (!days || days.length === 0) return '';
  return days.map((d) => dayFormatter.format(parseDate(d))).join(' · ');
}

function MealCard({
  meal,
  colors,
  onPress,
  onLog,
  onActions,
  editMode,
  onEdit,
  isLogged,
}: {
  meal: PlannerMeal;
  colors: ReturnType<typeof useCalora>['colors'];
  onPress: () => void;
  onLog: () => void;
  onActions: () => void;
  editMode: boolean;
  onEdit: () => void;
  isLogged: boolean;
}) {
  return (
    <Surface tier="flat" radius="lg" style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
{/*@ts-ignore*/}
      <Image
        source={[
          ...(meal.image ? [{ uri: meal.image }] : []),
          require('../../assets/images/calora-plan-header.jpg'),
        ]}
        contentFit="cover"
        transition={160}
        cachePolicy="memory-disk"
        style={styles.mealImage}
      />
      <View style={styles.mealCardBody}>
        <View style={styles.mealCardTop}>
          <View style={[styles.mealTypeBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.mealTypeBadgeText, { color: colors.accentForeground }]}>{meal.meal}</Text>
          </View>
          <ScalePressable accessibilityLabel={`More actions for ${meal.name}`} onPress={onActions} hitSlop={8} scale={0.98} haptic="none" style={styles.cardMoreButton}>
            <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
          </ScalePressable>
        </View>
        <Pressable accessibilityLabel={`Open planned ${meal.meal}: ${meal.name}`} onPress={onPress}>
          <Text numberOfLines={2} style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
        </Pressable>
        <View style={styles.mealMetaRow}>
          <Text style={[styles.mealPrep, { color: colors.mutedForeground }]}>{meal.prepMinutes ? `${meal.prepMinutes} min prep` : meal.serving}</Text>
          {isLogged && <View style={[styles.loggedPill, { backgroundColor: colors.accent }]}><Feather name="check" size={11} color={colors.accentForeground} /><Text style={[styles.loggedPillText, { color: colors.accentForeground }]}>Logged</Text></View>}
        </View>
        <View style={styles.macroLine}>
          <Text style={[styles.mealCalories, { color: colors.foreground }]}>{formatCalories(meal.calories)}</Text>
          <Text style={[styles.macroText, { color: colors.protein }]}>P {formatGrams(meal.proteinG)}</Text>
          <Text style={[styles.macroText, { color: colors.carbs }]}>C {formatGrams(meal.carbsG)}</Text>
          <ScalePressable accessibilityLabel={isLogged ? `${meal.name} is already logged` : `Log ${meal.name} to diary`} accessibilityState={{ disabled: isLogged }} disabled={isLogged} onPress={onLog} scale={0.96} haptic="light" style={[styles.logMealButton, { backgroundColor: isLogged ? colors.muted : colors.primary }]}>
            <Feather name={isLogged ? 'check' : 'plus'} size={13} color={isLogged ? colors.foreground : colors.primaryForeground} />
            <Text style={[styles.logMealButtonText, { color: isLogged ? colors.foreground : colors.primaryForeground }]}>{isLogged ? 'Logged' : 'Log'}</Text>
          </ScalePressable>
            {editMode && <Pressable accessibilityLabel={`Edit ${meal.name}`} onPress={onEdit} style={[styles.editMealButton, { borderColor: colors.primary }]}><Feather name="edit-2" size={12} color={colors.primary} /><Text style={[styles.editMealButtonText, { color: colors.primary }]}>Edit</Text></Pressable>}
        </View>
      </View>
    </Surface>
  );
}

function PlannerFocusCard({
  meal,
  selectedMeals,
  target,
  colors,
  onPrimary,
  allLogged,
}: {
  meal: PlannerMeal | undefined;
  selectedMeals: PlannerMeal[];
  target: number;
  colors: ReturnType<typeof useCalora>['colors'];
  onPrimary: () => void;
  allLogged: boolean;
}) {
  const plannedCalories = selectedMeals.reduce((sum, item) => sum + item.calories, 0);
  const remainingSlots = Math.max(4 - selectedMeals.length, 0);
  const copy = allLogged
    ? 'Today logged'
    : meal
    ? `Up next · ${meal.meal.toLowerCase()}`
    : remainingSlots === 4
      ? 'Add meals'
      : `${remainingSlots} open`;
  return (
    <Surface tier="raised" radius="xl" style={[styles.focusCard, { backgroundColor: colors.hero }]}>
{/*@ts-ignore*/}
      <View style={styles.focusTop}>
        <View style={styles.focusCopy}>
          <Text style={[styles.focusEyebrow, { color: colors.heroMuted }]}>{copy.toUpperCase()}</Text>
          <Text numberOfLines={2} style={[styles.focusTitle, { color: colors.onHero }]}>{allLogged ? 'Planned meals logged.' : meal?.name ?? 'Plan today.'}</Text>
          <Text style={[styles.focusMeta, { color: colors.heroMuted }]}>{formatWhole(plannedCalories)} / {formatWhole(target)} kcal · {selectedMeals.length}/4</Text>
        </View>
        <View style={[styles.focusRing, { borderColor: colors.primary }]}><Text style={[styles.focusRingText, { color: colors.onHero }]}>{selectedMeals.length}/4</Text></View>
      </View>
      <View style={[styles.focusTrack, { backgroundColor: colors.border }]}><View style={[styles.focusFill, { backgroundColor: colors.primary, width: `${Math.min(selectedMeals.length / 4, 1) * 100}%` }]} /></View>
      <View style={styles.focusActions}>
        <ScalePressable accessibilityLabel={allLogged ? 'View today in your diary' : meal ? `Log ${meal.name} to diary` : 'Add a meal to today'} onPress={onPrimary} scale={0.97} haptic="light" style={[styles.focusPrimary, { backgroundColor: colors.primary }]}>
          <Feather name={allLogged || meal ? 'check-circle' : 'plus'} size={15} color={colors.primaryForeground} />
          <Text style={[styles.focusPrimaryText, { color: colors.primaryForeground }]}>{allLogged ? 'View today' : meal ? 'Log next meal' : 'Add a meal'}</Text>
        </ScalePressable>
      </View>
    </Surface>
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
    <Surface tier="flat" radius="xl" style={[styles.summaryCard, { backgroundColor: colors.hero }]}>
{/*@ts-ignore*/}
      <View style={styles.summaryTop}>
        <View>
          <Text style={[styles.summaryEyebrow, { color: colors.heroMuted }]}>WEEKLY NUTRITION</Text>
           <Text style={[styles.summaryTitle, { color: colors.onHero }]}>{formatWhole(dailyCalories)} kcal <Text style={[styles.summaryTarget, { color: colors.heroMuted }]}>/ {formatWhole(target)} daily</Text></Text>
        </View>
        <View style={[styles.goalRing, { borderColor: colors.primary }]}><Text style={[styles.goalRingText, { color: colors.onHero }]}>{Math.round(goalProgress * 100)}%</Text></View>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: 'rgba(157,215,189,0.18)' }]}><View style={[styles.goalFill, { width: `${goalProgress * 100}%`, backgroundColor: colors.primary }]} /></View>
      <View style={styles.summaryMacros}>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{formatGrams(totals.protein / 7)}</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>protein / day</Text></View>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{formatGrams(totals.carbs / 7)}</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>carbs / day</Text></View>
        <View><Text style={[styles.summaryMacroValue, { color: colors.onHero }]}>{formatGrams(totals.fat / 7)}</Text><Text style={[styles.summaryMacroLabel, { color: colors.heroMuted }]}>fat / day</Text></View>
      </View>
    </Surface>
  );
}

function SheetHeader({ eyebrow, title, onClose, colors }: { eyebrow?: string; title: string; onClose: () => void; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <View style={styles.sheetHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{eyebrow}</Text>}
        <Text style={[styles.detailTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <ScalePressable accessibilityLabel={`Close ${title}`} onPress={onClose} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
        <Feather name="x" size={18} color={colors.foreground} />
      </ScalePressable>
    </View>
  );
}

export default function PlannerScreen() {
  const { colors, profile, logs, updateLog, plannerWeekStart, plannerMeals, plannerPreferences, setPlannerPreferences, updatePlannerPreferences, shoppingItems, setPlannerMeals, updatePlannerMeals, movePlannerMeal, toggleShoppingItemByName, createPlannerDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory, foodDrafts, setPlannerViewedDay, setRecipeSlotTarget, pendingUndoSwap, setPendingUndoSwap, pendingPlannerAck, setPendingPlannerAck, fontScale } = useCalora();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const generatePlanner = useGeneratePlanner();
  const today = dateKey();
  const [viewWeekStart, setViewWeekStart] = useState(plannerWeekStart);
  const [workspace, setWorkspace] = useState<'today' | 'week' | 'shopping'>('today');
  const [selectedDay, setSelectedDay] = useState(() => {
    const persistedWeekDays = Array.from({ length: 7 }, (_, index) => plannerDate(plannerWeekStart, index));
    return persistedWeekDays.includes(today) ? today : plannerWeekStart;
  });
  const [detail, setDetail] = useState<PlannerMeal | null>(null);
  const [plannerReviewDraftId, setPlannerReviewDraftId] = useState<string | null>(null);
  const [shoppingVisible, setShoppingVisible] = useState(false);
  const [shoppingDayFilter, setShoppingDayFilter] = useState<string | null>(null);
  const [actionMeal, setActionMeal] = useState<PlannerMeal | null>(null);
  const [actionMode, setActionMode] = useState<'move' | 'copy' | null>(null);
  const [addingMealType, setAddingMealType] = useState<PlannerMeal['meal'] | null>(null);
  const [replaceMeal, setReplaceMeal] = useState<PlannerMeal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editMeal, setEditMeal] = useState<PlannerMeal | null>(null);
  const [editName, setEditName] = useState('');
  const [editServing, setEditServing] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [customMealType, setCustomMealType] = useState<PlannerMeal['meal'] | null>(null);
  const [customMealReplaceTarget, setCustomMealReplaceTarget] = useState<PlannerMeal | null>(null);
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('1 serving');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customIngredients, setCustomIngredients] = useState('');
  const [planTypeVisible, setPlanTypeVisible] = useState(false);
  const [programDetail, setProgramDetail] = useState<PlanType | null>(null);
  const [programRebuildConfirm, setProgramRebuildConfirm] = useState<PlanType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [weekOverviewVisible, setWeekOverviewVisible] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [undoMeal, setUndoMeal] = useState<PlannerMeal | null>(null);
  const [undoMoveMeal, setUndoMoveMeal] = useState<{ mealId: string; originalDay: string; mealName: string; displacedMeal?: PlannerMeal } | null>(null);
  const [undoSwapMeal, setUndoSwapMeal] = useState<{ newMeal: PlannerMeal; originalMeal: PlannerMeal } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plannerReviewDraft = plannerReviewDraftId ? (foodDrafts.find((d) => d.id === plannerReviewDraftId) ?? null) : null;

  // Keep context in sync with the day the user is viewing so recipe plan-picker can default to it
  useEffect(() => {
    setPlannerViewedDay(selectedDay);
  }, [selectedDay, setPlannerViewedDay]);

  // When the planner tab comes into focus, consume a plain save acknowledgment set by the recipes tab
  // when a recipe was added to an empty slot (no displaced meal, so no Undo action).
  // Guard: if the referenced meal is no longer in plannerMeals (e.g. cleared by clearAllData between
  // the time the ack was set and the Planner regaining focus), drop the ack silently.
  useFocusEffect(
    useCallback(() => {
      if (!pendingPlannerAck) return;
      // Always consume the ack exactly once, regardless of whether we display it.
      setPendingPlannerAck(null);
      const message = consumePlannerAck(pendingPlannerAck, plannerMeals);
      if (!message) return;
      // Cancel any stale removal-undo for the slot that was just filled (belt-and-suspenders:
      // the navigate-away cleanup already clears undoMeal, but this ensures correctness even
      // if focus is regained without a full blur/focus cycle).
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      setUndoMeal(null);
      setUndoMoveMeal(null);
      setUndoSwapMeal(null);
      acknowledge(message);
    }, [pendingPlannerAck, setPendingPlannerAck, plannerMeals]),
  );

  // When the planner tab comes into focus, consume any pending recipe-swap undo set by the recipes tab.
  // Guard: if either referenced meal (newMeal or originalMeal) is no longer in plannerMeals
  // (e.g. cleared by clearAllData between the time the swap was set and the Planner regaining
  // focus), drop the swap-undo silently — mirroring the consumePlannerAck guard above.
  useFocusEffect(
    useCallback(() => {
      if (!pendingUndoSwap) return;
      // Always consume exactly once, regardless of whether we display the banner.
      setPendingUndoSwap(null);
      const validSwap = consumeUndoSwap(pendingUndoSwap, plannerMeals);
      if (!validSwap) return;
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoMeal(null);
      setUndoMoveMeal(null);
      setUndoSwapMeal(validSwap);
      undoTimerRef.current = setTimeout(() => {
        setUndoSwapMeal(null);
        undoTimerRef.current = null;
      }, 6000);
      acknowledge(`${validSwap.newMeal.name} replaced your ${validSwap.originalMeal.meal.toLowerCase()}. Tap Undo to restore.`, 6000);
    }, [pendingUndoSwap, setPendingUndoSwap, plannerMeals]),
  );

  // When the user navigates away mid-countdown, cancel both timers and clear all
  // undo + notice state so neither the banner nor a stale Undo can persist on return.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
        }
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        setUndoMeal(null);
        setUndoMoveMeal(null);
        setUndoSwapMeal(null);
        setSaveMessage(null);
      };
    }, []),
  );

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => plannerDate(viewWeekStart, index)), [viewWeekStart]);
  // Program already applied to the week the user is looking at — distinct from the
  // Program merely selected for a future build (plannerPreferences.primary).
  const appliedProgramForViewedWeek = useMemo(() => programAppliedToWeek(plannerPreferences, viewWeekStart), [plannerPreferences, viewWeekStart]);
  const selectedMeals = plannerMeals.filter((meal) => meal.day === selectedDay);
  const plannedWeek = plannerMeals.filter((meal) => weekDays.includes(meal.day));
  const visibleShoppingItems = useMemo(
    () => buildShoppingItems(plannedWeek, new Map(shoppingItems.map((item) => [item.name, item.checked]))),
    [plannedWeek, shoppingItems],
  );
  const uncheckedShopping = visibleShoppingItems.filter((item) => !item.checked).length;
  const nextMeal = selectedMeals.find((meal) => !logs.some((log) => log.plannerMealId === meal.id));
  const allSelectedMealsLogged = selectedMeals.length > 0 && !nextMeal;
  const actionMealLogged = actionMeal ? logs.some((log) => log.plannerMealId === actionMeal.id) : false;
  const selectedMealLabel = dayFormatter.format(parseDate(selectedDay));

  // Days that have at least one shopping ingredient, in week order
  const shoppingDays = useMemo(
    () => weekDays.filter((day) => visibleShoppingItems.some((item) => item.days?.includes(day))),
    [weekDays, visibleShoppingItems],
  );

  // Items filtered by the active day pill (null = show all)
  const filteredShoppingItems = useMemo(
    () =>
      shoppingDayFilter
        ? visibleShoppingItems.filter((item) => item.days?.includes(shoppingDayFilter))
        : visibleShoppingItems,
    [visibleShoppingItems, shoppingDayFilter],
  );

  const acknowledge = (message: string, duration = 2600) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveMessage(message);
    saveTimerRef.current = setTimeout(() => {
      setSaveMessage(null);
      saveTimerRef.current = null;
    }, duration);
  };

  const shiftWeek = (offset: number) => {
    const nextWeek = plannerDate(viewWeekStart, offset * 7);
    const currentDayIndex = weekDays.indexOf(selectedDay);
    setViewWeekStart(nextWeek);
    setSelectedDay(plannerDate(nextWeek, currentDayIndex >= 0 ? currentDayIndex : 0));
    setWeekOverviewVisible(false);
  };

  const goToToday = () => {
    const currentWeek = getPlannerWeekStart();
    setViewWeekStart(currentWeek);
    setSelectedDay(today);
    setWeekOverviewVisible(false);
  };

  const openDayInToday = (day: string) => {
    setSelectedDay(day);
    setWorkspace('today');
  };

  const openPrimaryPlanAction = () => {
    if (nextMeal) {
      addToDiary(nextMeal);
      return;
    }
    if (allSelectedMealsLogged) {
      router.navigate('/(tabs)');
      return;
    }
    setAddingMealType('Breakfast');
  };

  const replaceMealInPlan = (nextMeal: PlannerMeal, target: PlannerMeal) => {
    const next = applyIdentityReplace(plannerMeals, nextMeal, target);
    updatePlannerMeals(next);
    setReplaceMeal(null);
    setActionMeal(null);
    const replacement = next.find((meal) => meal.id === target.id);
    if (replacement) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoMeal(null);
      setUndoMoveMeal(null);
      setUndoSwapMeal({ newMeal: replacement, originalMeal: target });
      undoTimerRef.current = setTimeout(() => {
        setUndoSwapMeal(null);
        undoTimerRef.current = null;
      }, 6000);
    }
    acknowledge(`${target.meal} replaced. Tap Undo to restore.`, 6000);
  };

  const addMealToPlan = (template: PlannerMeal, day: string, mealType: PlannerMeal['meal']) => {
    const next = [...plannerMeals.filter((meal) => !(meal.day === day && meal.meal === mealType)), { ...template, id: `planned-${Date.now()}-${template.id}`, day, meal: mealType }];
    updatePlannerMeals(next);
    setAddingMealType(null);
    // If a removal undo is pending for the same slot, the new meal definitively fills it —
    // cancel the undo timer so pressing Undo can no longer silently overwrite the new meal.
    if (undoMeal && undoMeal.day === day && undoMeal.meal === mealType) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
      setUndoMeal(null);
    }
    acknowledge(`${template.name} added.`);
  };

  const beginEditMeal = (meal: PlannerMeal) => {
    setEditMeal(meal);
    setEditName(meal.name);
    setEditServing(meal.serving);
    setEditCalories(String(Math.round(meal.calories)));
    setEditProtein(String(Math.round(meal.proteinG)));
    setEditCarbs(String(Math.round(meal.carbsG)));
    setEditFat(String(Math.round(meal.fatG)));
  };

  const saveEditedMeal = () => {
    if (!editMeal || !editName.trim()) return;
    // An edited program-generated meal becomes user-authored (edited- id) so an
    // explicit Program rebuild preserves it. Diary logs referencing the old id
    // are re-pointed so the "Logged" link survives the re-id.
    const nextId = isProgramGeneratedMeal(editMeal) ? `edited-${Date.now()}-${editMeal.id}` : editMeal.id;
    const next = plannerMeals.map((meal) => meal.id === editMeal.id ? {
      ...meal,
      id: nextId,
      name: editName.trim(),
      serving: editServing.trim() || '1 serving',
      calories: Math.max(0, Number(editCalories) || 0),
      proteinG: Math.max(0, Number(editProtein) || 0),
      carbsG: Math.max(0, Number(editCarbs) || 0),
      fatG: Math.max(0, Number(editFat) || 0),
    } : meal);
    if (nextId !== editMeal.id) {
      logs.filter((log) => log.plannerMealId === editMeal.id).forEach((log) => updateLog(log.id, { plannerMealId: nextId }));
    }
    updatePlannerMeals(next);
    setEditMeal(null);
    acknowledge(`${editName.trim()} saved.`);
  };

  const openCustomMeal = (mealType: PlannerMeal['meal'], replaceTarget?: PlannerMeal) => {
    setAddingMealType(null);
    setReplaceMeal(null);
    setCustomMealReplaceTarget(replaceTarget ?? null);
    setCustomMealType(mealType);
    setCustomName('');
    setCustomServing('1 serving');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomIngredients('');
  };

  const saveCustomMeal = () => {
    if (!customMealType || !customName.trim()) return;
    const targetDay = customMealReplaceTarget?.day ?? selectedDay;
    const custom: PlannerMeal = {
      id: `custom-${Date.now()}`,
      day: targetDay,
      meal: customMealType,
      name: customName.trim(),
      image: '',
      serving: customServing.trim() || '1 serving',
      calories: Math.max(0, Number(customCalories) || 0),
      proteinG: Math.max(0, Number(customProtein) || 0),
      carbsG: Math.max(0, Number(customCarbs) || 0),
      fatG: Math.max(0, Number(customFat) || 0),
      ingredients: customIngredients.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean),
      description: 'A custom meal added to your plan.',
    };
    if (customMealReplaceTarget) {
      // Replace path: swap the specific meal by id, then slot-deduplicate.
      updatePlannerMeals([...plannerMeals.filter((meal) => meal.id !== customMealReplaceTarget.id && !(meal.day === targetDay && meal.meal === customMealType)), custom]);
      setCustomMealReplaceTarget(null);
    } else {
      updatePlannerMeals([...plannerMeals.filter((meal) => !(meal.day === targetDay && meal.meal === customMealType)), custom]);
    }
    setCustomMealType(null);
    // Cancel a pending removal undo if the custom meal fills the same slot.
    if (undoMeal && undoMeal.day === targetDay && undoMeal.meal === customMealType) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
      setUndoMeal(null);
    }
    acknowledge(`${custom.name} added.`);
  };

  const removeMealFromPlan = (meal: PlannerMeal) => {
    updatePlannerMeals(plannerMeals.filter((item) => item.id !== meal.id));
    setActionMeal(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Clear any move-undo or swap-undo so only one undo affordance is active
    setUndoMoveMeal(null);
    setUndoSwapMeal(null);
    setUndoMeal(meal);
    undoTimerRef.current = setTimeout(() => {
      setUndoMeal(null);
      undoTimerRef.current = null;
    }, 6000);
    acknowledge(`${meal.name} removed.`, 6000);
  };

  const undoRemove = () => {
    if (!undoMeal) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    updatePlannerMeals([...plannerMeals.filter((meal) => !(meal.day === undoMeal.day && meal.meal === undoMeal.meal)), undoMeal]);
    acknowledge(`${undoMeal.name} restored.`);
    setUndoMeal(null);
  };

  const moveOrCopyMeal = (day: string, copy: boolean) => {
    if (!actionMeal) return;
    if (!copy) {
      // Capture original day before the move so user can undo
      const originalDay = actionMeal.day;
      const mealId = actionMeal.id;
      const mealName = actionMeal.name;
      // Capture any existing meal occupying the destination slot (same meal type)
      // so undo can restore it rather than orphaning it.
      const displacedMeal = plannerMeals.find(
        (m) => m.day === day && m.meal === actionMeal.meal && m.id !== actionMeal.id,
      );
      // Clear any remove-undo or swap-undo so only one undo affordance is active
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoMeal(null);
      setUndoSwapMeal(null);
      setUndoMoveMeal({ mealId, originalDay, mealName, displacedMeal });
      undoTimerRef.current = setTimeout(() => {
        setUndoMoveMeal(null);
        undoTimerRef.current = null;
      }, 6000);
    }
    movePlannerMeal(actionMeal.id, day, copy);
    setActionMeal(null);
    setActionMode(null);
    acknowledge(`${actionMeal.name} ${copy ? 'copied' : 'moved'} to ${dayFormatter.format(parseDate(day))}.`, copy ? 2600 : 6000);
  };

  const undoMove = () => {
    if (!undoMoveMeal) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const movedMeal = plannerMeals.find((m) => m.id === undoMoveMeal.mealId);
    if (movedMeal) {
      // Move the meal back to its original slot, clearing anything that may now
      // occupy that slot (safety deduplication).
      let next = plannerMeals.filter(
        (m) => m.id !== undoMoveMeal.mealId && !(m.day === undoMoveMeal.originalDay && m.meal === movedMeal.meal),
      );
      next = [...next, { ...movedMeal, day: undoMoveMeal.originalDay }];
      // Restore the displaced meal (if any) to the destination slot it was
      // bumped from, removing anything that may now be in that position.
      if (undoMoveMeal.displacedMeal) {
        const { displacedMeal } = undoMoveMeal;
        next = [
          ...next.filter((m) => !(m.day === movedMeal.day && m.meal === displacedMeal.meal)),
          displacedMeal,
        ];
      }
      updatePlannerMeals(next);
    } else {
      // Meal was removed during the undo window — nothing to restore.
    }
    acknowledge(`${undoMoveMeal.mealName} moved back.`);
    setUndoMoveMeal(null);
  };

  const undoSwap = () => {
    if (!undoSwapMeal) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Remove the new recipe from that slot and restore the original meal
    const { newMeal, originalMeal } = undoSwapMeal;
    const next = [
      ...plannerMeals.filter((m) => !(m.day === newMeal.day && m.meal === newMeal.meal)),
      originalMeal,
    ];
    updatePlannerMeals(next);
    acknowledge(`${originalMeal.name} restored.`);
    setUndoSwapMeal(null);
  };

  const generate = async (confirmedProgram?: PlanTypeId) => {
    setGenerating(true);
    setGenerationMessage(null);
    // Cancel any pending undo timer before replacing the whole week so stale
    // undo state cannot silently overwrite meals in the freshly generated plan.
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoMeal(null);
    setUndoMoveMeal(null);
    setUndoSwapMeal(null);
    const plannerProfile = profile ?? {
      goal: 'maintain' as const,
      activity: 'moderate' as const,
      diet: 'Everything' as const,
      calorieTarget: 2000,
    };
    const programId = planTypeForGeneration(confirmedProgram, plannerPreferences);
    // A confirmed rebuild switches the primary Program via a functional update
    // that preserves secondary modifiers and the per-week history. Every
    // preference write in this generation is a latest-state update, so a
    // Program the user selects while the request is in flight is never
    // clobbered by a stale snapshot; programId is captured only for the API
    // request and the historical record.
    if (confirmedProgram) updatePlannerPreferences((prev) => selectPrimaryProgram(prev, confirmedProgram));
    // Meals already logged to the diary must survive any rebuild.
    const loggedMealIds = new Set(logs.map((log) => log.plannerMealId).filter((id): id is string => Boolean(id)));
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
          planType: programId,
        },
      });
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Planner request timed out')), 6500);
      });
      const result = await Promise.race([request, timeout]);
      // Explicit rebuild replaces program-generated meals but preserves user-authored,
      // edited, and already-logged meals; ordinary builds only fill empty slots.
      const merged = mergeGeneratedWeek(plannerMeals, result.meals, weekDays, {
        mode: confirmedProgram ? 'rebuild' : 'fill',
        protectedIds: loggedMealIds,
      });
      setPlannerMeals(result.weekStart, merged.meals);
      // The API returns starter meals as a 200 when its AI provider fails —
      // those meals were not shaped by the requested Program, so they must
      // not be recorded as a Program application.
      const recording = resolveGenerationRecording({
        programId,
        mode: confirmedProgram ? 'rebuild' : 'fill',
        changed: merged.insertedCount > 0 || merged.replacedCount > 0,
        fallback: isStarterFallbackProvider(result.provider),
      });
      if (recording === 'record' && programId) {
        // Rebuilds upsert the week's record; ordinary fills only establish
        // provenance for a week with no record — they never rewrite the
        // Program that originally shaped the week. Functional update: the
        // record merges into the LATEST preferences, so a Program the user
        // selected while this request was in flight is never clobbered —
        // programId is kept only for the historical record.
        updatePlannerPreferences((prev) => recordGenerationOutcome(prev, {
          weekStart: result.weekStart,
          programId,
          appliedAt: new Date().toISOString(),
          source: confirmedProgram ? 'refresh' : 'build',
        }, confirmedProgram ? 'rebuild' : 'fill'));
      } else if (recording === 'clear') {
        // A fallback rebuild materially replaced the week's meals: any prior
        // record is stale and the requested Program never shaped the week.
        updatePlannerPreferences((prev) => clearProgramApplication(prev, result.weekStart));
      }
      setViewWeekStart(result.weekStart);
      setSelectedDay(result.weekStart);
      setGenerationMessage(result.message);
      if (!confirmedProgram) setWeekOverviewVisible(true);
      acknowledge('Week saved.');
    } catch {
      const fallback = createStarterPlannerMeals(viewWeekStart);
      // An explicit rebuild keeps rebuild semantics even offline — starter meals
      // replace program-generated ones — so the recorded application stays accurate.
      const fallbackMerge = mergeGeneratedWeek(plannerMeals, fallback, weekDays, {
        mode: confirmedProgram ? 'rebuild' : 'fill',
        protectedIds: loggedMealIds,
      });
      setPlannerMeals(viewWeekStart, fallbackMerge.meals);
      const fallbackRecording = resolveGenerationRecording({
        programId,
        mode: confirmedProgram ? 'rebuild' : 'fill',
        changed: fallbackMerge.insertedCount > 0 || fallbackMerge.replacedCount > 0,
        fallback: true,
      });
      if (fallbackRecording === 'clear') {
        // The rebuild replaced program-generated meals with the offline starter
        // week: neither the old Program nor the new one shaped it, so the
        // week's record is cleared rather than recorded inaccurately. The
        // functional update keeps the primary switch and anything the user
        // selected while the request was pending.
        updatePlannerPreferences((prev) => clearProgramApplication(prev, viewWeekStart));
      }
      // Ordinary fill fallback: existing meals (and any existing record) are
      // untouched, and starter-filled slots establish no Program provenance.
      setViewWeekStart(viewWeekStart);
      setSelectedDay(viewWeekStart);
      setGenerationMessage('Starter week ready offline. Customize as needed.');
      if (!confirmedProgram) setWeekOverviewVisible(true);
      acknowledge('Starter week saved.');
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
    acknowledge('Added to diary.');
  };

  const dismissPlannerReview = () => {
    if (plannerReviewDraft) rejectFoodMemory(plannerReviewDraft.id);
    setPlannerReviewDraftId(null);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Plan"
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 14, paddingBottom: insets.bottom + 106 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.plannerIntro}>
          <View>
            <Text style={[styles.plannerEyebrow, { color: colors.primary }]}>YOUR PLAN</Text>
            <Text style={[styles.plannerTitle, { color: colors.foreground }]}>{workspace === 'today' ? 'Plan today.' : workspace === 'week' ? 'Plan your week.' : 'Shop your plan.'}</Text>
          </View>
          <Pressable accessibilityLabel={`Open what ${BRAND.name} remembers`} onPress={() => router.push('/memory')} hitSlop={8} style={[styles.memoryShortcut, { backgroundColor: colors.muted }]}>
            <Feather name="compass" size={17} color={colors.foreground} />
          </Pressable>
        </View>
        <SwipeableTabList
          items={PLANNER_WORKSPACES}
          activeItem={workspace}
          onChange={setWorkspace}
          accessibilityLabel="Plan workspaces"
          testID="planner-workspace-tabs"
          style={[styles.workspaceSwitch, { backgroundColor: colors.muted }]}
        >
          {PLANNER_WORKSPACES.map((item) => {
            const active = workspace === item;
            const label = item === 'today' ? 'Today' : item === 'week' ? 'Week' : 'Shopping';
            return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`Show ${label} workspace`} accessibilityState={{ selected: active }} onPress={() => setWorkspace(item)} style={[styles.workspaceTab, active && { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.workspaceTabText, { color: active ? colors.foreground : colors.mutedForeground }]}>{label}{item === 'shopping' && uncheckedShopping > 0 ? ` · ${uncheckedShopping}` : ''}</Text></Pressable>;
          })}
        </SwipeableTabList>

        <SwipeableSectionPager
          items={PLANNER_WORKSPACES}
          activeItem={workspace}
          onChange={setWorkspace}
          accessibilityLabel="Plan workspace content"
          testID="planner-workspace-content"
        >
        {workspace === 'today' && <>
          <PlannerFocusCard meal={nextMeal} allLogged={allSelectedMealsLogged} selectedMeals={selectedMeals} target={profile?.calorieTarget ?? 2000} colors={colors} onPrimary={openPrimaryPlanAction} />
          <Pressable accessibilityLabel="Choose another day from your week" onPress={() => setWorkspace('week')} style={[styles.todayDateLink, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View><Text style={[styles.todayDateLabel, { color: colors.foreground }]}>{selectedMealLabel}</Text><Text style={[styles.todayDateMeta, { color: colors.mutedForeground }]}>{selectedMeals.length === 4 ? 'Day planned' : `${4 - selectedMeals.length} open`}</Text></View><Feather name="calendar" size={17} color={colors.primary} />
          </Pressable>
          <Animated.View entering={FadeInDown.springify().damping(20).delay(60)} style={[styles.dayDivider, { borderBottomColor: colors.border }]}>
            <View><Text style={[styles.dayHeadingTitle, { color: colors.foreground }]}>Today’s meals</Text><Text style={[styles.daySubheading, { color: colors.mutedForeground }]}>Plan here. Log in your diary.</Text></View>
            <Text style={[styles.dayTotal, { color: colors.mutedForeground }]}>{formatCalories(selectedMeals.reduce((sum, meal) => sum + meal.calories, 0))}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.springify().damping(20).delay(120)} style={styles.mealList}>{plannerMealTypes.map((type) => { const meal = selectedMeals.find((item) => item.meal === type); return meal ? <MealCard key={meal.id} meal={meal} colors={colors} editMode={editMode} isLogged={logs.some((log) => log.plannerMealId === meal.id)} onPress={() => setDetail(meal)} onLog={() => addToDiary(meal)} onEdit={() => beginEditMeal(meal)} onActions={() => { setActionMeal(meal); setActionMode(null); }} /> : <Pressable key={type} accessibilityLabel={`Add ${type} to ${dayFormatter.format(parseDate(selectedDay))}`} onPress={() => setAddingMealType(type)} style={[styles.emptyMeal, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.emptySlotIcon, { backgroundColor: colors.accent }]}><Feather name="plus" size={15} color={colors.accentForeground} /></View><View style={styles.emptyMealCopy}><Text style={[styles.emptyMealLabel, { color: colors.foreground }]}>{type}</Text><Text style={[styles.emptyMealText, { color: colors.mutedForeground }]}>Add or leave open.</Text></View><Feather name="chevron-right" size={15} color={colors.mutedForeground} /></Pressable>; })}</Animated.View>
        </>}

        {workspace === 'week' && weekOverviewVisible ? <>
          <View style={styles.weekOverviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.programEyebrow, { color: colors.primary }]}>YOUR WEEK IS READY</Text>
              <Text style={[styles.weekOverviewTitle, { color: colors.foreground }]}>Meals for {formatRange(viewWeekStart)}</Text>
              <Text style={[styles.weekOverviewSubtitle, { color: colors.mutedForeground }]}>Review or edit meals.</Text>
            </View>
            <ScalePressable accessibilityLabel="Close weekly meal overview" onPress={() => setWeekOverviewVisible(false)} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </ScalePressable>
          </View>
          <View style={styles.weekOverviewList}>
            {weekDays.map((day) => {
              const mealsForDay = plannedWeek.filter((meal) => meal.day === day).sort((a, b) => plannerMealTypes.indexOf(a.meal) - plannerMealTypes.indexOf(b.meal));
              return (
                <View key={day} style={[styles.weekOverviewDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.weekOverviewDayHeading}>
                    <Text style={[styles.weekOverviewDayName, { color: colors.foreground }]}>{dayFormatter.format(parseDate(day))}</Text>
                    <Text style={[styles.weekOverviewDayDate, { color: colors.mutedForeground }]}>{dateFormatter.format(parseDate(day))}</Text>
                    <Text style={[styles.weekOverviewDayTotal, { color: colors.mutedForeground }]}>{formatCalories(mealsForDay.reduce((sum, meal) => sum + meal.calories, 0))}</Text>
                  </View>
                  {mealsForDay.map((meal) => {
                    const isLogged = logs.some((log) => log.plannerMealId === meal.id);
                    return (
                      <View key={meal.id} style={[styles.weekOverviewMeal, { borderTopColor: colors.border }]}>
                        <Pressable accessibilityLabel={`Open planned ${meal.meal}: ${meal.name}`} onPress={() => setDetail(meal)} style={styles.weekOverviewMealMain}>
                          <Text style={[styles.weekOverviewMealType, { color: colors.primary }]}>{meal.meal}</Text>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={[styles.weekOverviewMealName, { color: colors.foreground }]}>{meal.name}</Text>
                            <Text style={[styles.weekOverviewMealMeta, { color: colors.mutedForeground }]}>{formatCalories(meal.calories)} · {meal.prepMinutes ? `${meal.prepMinutes} min` : meal.serving}{isLogged ? ' · Logged' : ''}</Text>
                          </View>
                        </Pressable>
                        <ScalePressable accessibilityLabel={`More actions for ${meal.name}`} onPress={() => { setActionMeal(meal); setActionMode(null); }} scale={0.96} haptic="none" style={styles.weekOverviewMore}>
                          <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
                        </ScalePressable>
                      </View>
                    );
                  })}
                  {mealsForDay.length === 0 && <Text style={[styles.weekOverviewEmpty, { color: colors.mutedForeground }]}>No meals planned.</Text>}
                </View>
              );
            })}
          </View>
          <ScalePressable accessibilityLabel="Done reviewing weekly meals" onPress={() => setWeekOverviewVisible(false)} scale={0.97} haptic="light" style={[styles.weekOverviewDone, { backgroundColor: colors.primary }]}>
            <Text style={[styles.weekOverviewDoneText, { color: colors.primaryForeground }]}>Done reviewing</Text>
          </ScalePressable>
        </> : workspace === 'week' && <>
        <View style={styles.weekHeader}>
          <ScalePressable accessibilityLabel="Previous week" onPress={() => shiftWeek(-1)} scale={0.96} haptic="none" style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={18} color={colors.foreground} /></ScalePressable>
          <View style={styles.weekRangeCopy}>
            <Text style={[styles.weekRange, { color: colors.foreground }]}>{formatRange(viewWeekStart)}</Text>
            {viewWeekStart !== getPlannerWeekStart() && <Pressable accessibilityLabel="Return to this week" onPress={goToToday}><Text style={[styles.todayLink, { color: colors.primary }]}>Today</Text></Pressable>}
          </View>
           <View style={styles.weekHeaderActions}><ScalePressable accessibilityLabel="Next week" onPress={() => shiftWeek(1)} scale={0.96} haptic="none" style={[styles.weekArrow, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={18} color={colors.foreground} /></ScalePressable><ScalePressable accessibilityLabel={editMode ? 'Done editing plan' : 'Edit plan'} onPress={() => setEditMode((value) => !value)} scale={0.96} haptic="none" style={[styles.editModeButton, { backgroundColor: editMode ? colors.primary : colors.muted }]}><Feather name={editMode ? 'check' : 'edit-2'} size={14} color={editMode ? colors.primaryForeground : colors.foreground} /><Text style={[styles.editModeText, { color: editMode ? colors.primaryForeground : colors.foreground }]}>{editMode ? 'Done' : 'Edit'}</Text></ScalePressable></View>
        </View>
        <View style={[styles.dayRail, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {weekDays.map((day) => {
            const date = parseDate(day);
            const active = day === selectedDay;
            const isToday = day === today;
            const mealCount = plannerMeals.filter((meal) => meal.day === day).length;
            const loggedCount = plannerMeals.filter((meal) => meal.day === day && logs.some((log) => log.plannerMealId === meal.id)).length;
            return (
              <ScalePressable key={day} accessibilityLabel={`Select ${dayFormatter.format(date)} ${date.getDate()}, ${mealCount} meals planned, ${loggedCount} logged`} accessibilityState={{ selected: active }} onPress={() => setSelectedDay(day)} scale={0.97} haptic="none" style={[styles.dayCol, active && { backgroundColor: colors.accent }]}>
                <Text style={[styles.dayName, { color: active ? colors.primary : colors.mutedForeground }]}>{dayFormatter.format(date)}</Text>
                <Text style={[styles.dayNumber, { color: colors.foreground }]}>{date.getDate()}</Text>
                <View style={styles.dayCoverage}>{Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.coverageDot, { backgroundColor: index < loggedCount ? colors.success : index < mealCount ? colors.primary : colors.border }]} />)}</View>
                {isToday && <Text style={[styles.todayTag, { color: active ? colors.primary : colors.mutedForeground }]}>Today</Text>}
              </ScalePressable>
            );
          })}
        </View>
        <Pressable accessibilityLabel="View or change your program" onPress={() => setPlanTypeVisible(true)} style={[styles.programCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.programIcon, { backgroundColor: colors.accent }]}><Feather name="compass" size={18} color={colors.accentForeground} /></View>
          <View style={styles.programCopy}><Text style={[styles.programEyebrow, { color: colors.primary }]}>{appliedProgramForViewedWeek ? 'PROGRAM · THIS WEEK' : 'YOUR PROGRAM'}</Text><Text style={[styles.programTitle, { color: colors.foreground }]}>{appliedProgramForViewedWeek ? findPlanType(appliedProgramForViewedWeek.programId)?.label ?? appliedProgramForViewedWeek.programId : plannerPreferences ? findPlanType(plannerPreferences.primary)?.label ?? plannerPreferences.primary : 'Choose a Program'}</Text><Text style={[styles.programMeta, { color: colors.mutedForeground }]}>{appliedProgramForViewedWeek ? (appliedProgramForViewedWeek.programId === plannerPreferences?.primary ? 'Used this week.' : `Used this week · ${plannerPreferences ? `${findPlanType(plannerPreferences.primary)?.label ?? plannerPreferences.primary} next` : 'no Program set next'}.`) : plannerPreferences ? `${findPlanType(plannerPreferences.primary)?.subtitle ?? ''} · next build.` : 'Guides your next build.'}</Text></View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
        <View style={[styles.planControlBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScalePressable
            accessibilityLabel={plannerPreferences ? 'Change plan type' : 'Choose a plan type'}
            onPress={() => setPlanTypeVisible(true)}
            scale={0.97}
            haptic="none"
            style={styles.planControlLeft}
          >
            <Text style={[styles.planControlLabel, { color: colors.mutedForeground }]}>COVERAGE</Text>
            {plannerPreferences ? (
              <Text style={[styles.planControlValue, { color: colors.foreground }]} numberOfLines={1}>
                {plannedWeek.length}/28 slots
              </Text>
            ) : (
              <Text style={[styles.planControlPrompt, { color: colors.primary }]}>Choose Program</Text>
            )}
          </ScalePressable>
          <View style={[styles.planControlDivider, { backgroundColor: colors.border }]} />
          <ScalePressable
            accessibilityLabel={plannerPreferences ? 'Generate my week' : 'Choose a plan type first'}
            onPress={() => { if (!plannerPreferences) { setPlanTypeVisible(true); } else { void generate(); } }}
            disabled={generating}
            scale={0.96}
            haptic="light"
            style={[styles.planControlRight, { opacity: generating ? 0.72 : 1 }]}
          >
            {generating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="zap" size={14} color={plannerPreferences ? colors.primary : colors.mutedForeground} />}
            <Text style={[styles.planControlAction, { color: plannerPreferences ? colors.primary : colors.mutedForeground }]}>
              {generating ? 'Building…' : 'Build week'}
            </Text>
          </ScalePressable>
        </View>
        {generationMessage && <View accessibilityLiveRegion="polite" style={[styles.generationStatus, { backgroundColor: colors.accent }]}><Feather name="check-circle" size={16} color={colors.success} /><Text style={[styles.generationStatusText, { color: colors.foreground }]}>{generationMessage}</Text></View>}
          <Animated.View entering={FadeInDown.springify().damping(20).delay(60)} style={[styles.dayDivider, { borderBottomColor: colors.border }]}>
            <View><Text style={[styles.dayHeadingTitle, { color: colors.foreground }]}>{selectedMealLabel}</Text><Text style={[styles.daySubheading, { color: colors.mutedForeground }]}>{selectedMeals.length === 4 ? 'Day planned' : `${4 - selectedMeals.length} open`}</Text></View>
            <View style={styles.weekDayActions}>
              <Text style={[styles.dayTotal, { color: colors.mutedForeground }]}>{formatCalories(selectedMeals.reduce((sum, meal) => sum + meal.calories, 0))}</Text>
              <Pressable accessibilityLabel={`Open ${selectedMealLabel} in Today`} onPress={() => openDayInToday(selectedDay)} hitSlop={8} style={[styles.weekTodayHandoff, { backgroundColor: colors.accent }]}>
                <Text style={[styles.weekTodayHandoffText, { color: colors.accentForeground }]}>Open in Today</Text>
                <Feather name="arrow-up-right" size={12} color={colors.accentForeground} />
              </Pressable>
            </View>
          </Animated.View>
           <Animated.View entering={FadeInDown.springify().damping(20).delay(120)} style={styles.mealList}>{plannerMealTypes.map((type) => { const meal = selectedMeals.find((item) => item.meal === type); return meal ? <MealCard key={meal.id} meal={meal} colors={colors} editMode={editMode} isLogged={logs.some((log) => log.plannerMealId === meal.id)} onPress={() => setDetail(meal)} onLog={() => addToDiary(meal)} onEdit={() => beginEditMeal(meal)} onActions={() => { setActionMeal(meal); setActionMode(null); }} /> : <Pressable key={type} accessibilityLabel={`Add ${type} to ${dayFormatter.format(parseDate(selectedDay))}`} onPress={() => setAddingMealType(type)} style={[styles.emptyMeal, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.emptySlotIcon, { backgroundColor: colors.accent }]}><Feather name="plus" size={15} color={colors.accentForeground} /></View><View style={styles.emptyMealCopy}><Text style={[styles.emptyMealLabel, { color: colors.foreground }]}>{type}</Text><Text style={[styles.emptyMealText, { color: colors.mutedForeground }]}>Add a meal, browse recipes, or leave open.</Text></View><Feather name="chevron-right" size={15} color={colors.mutedForeground} /></Pressable>; })}
        </Animated.View>
          <View style={{ marginTop: 20 }}><SummaryBar meals={plannedWeek} target={profile?.calorieTarget ?? 2000} colors={colors} /></View>
        </>}

        {workspace === 'shopping' && <>
           <View style={[styles.shoppingWorkspaceHeader, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.programEyebrow, { color: colors.primary }]}>THIS WEEK</Text><Text style={[styles.shoppingWorkspaceTitle, { color: colors.foreground }]}>{uncheckedShopping ? `${uncheckedShopping} left` : 'All checked'}</Text><Text style={[styles.shoppingWorkspaceMeta, { color: colors.mutedForeground }]}>{visibleShoppingItems.length} ingredients · {plannedWeek.length} meals</Text></View><View style={[styles.shoppingWorkspaceIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="shopping" size={29} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /></View></View>
          {shoppingDays.length > 1 && <SwipeGestureExclusion><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopFilterContent}>{[null, ...shoppingDays].map((day) => { const active = shoppingDayFilter === day; const label = day ? dayFormatter.format(parseDate(day)) : 'All'; return <Pressable key={day ?? 'all'} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`Show ${label} shopping items`} onPress={() => setShoppingDayFilter(day)} style={[styles.shopDayPill, { borderColor: active ? colors.primary : colors.input, backgroundColor: active ? colors.primary : colors.muted }]}><Text style={[styles.shopDayPillText, { color: active ? colors.primaryForeground : colors.foreground }]}>{label}</Text></Pressable>; })}</ScrollView></SwipeGestureExclusion>}
          <View style={[styles.shoppingListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{filteredShoppingItems.map((item) => <Pressable key={item.id} accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`} onPress={() => toggleShoppingItemByName(item.name)} style={[styles.shoppingRow, { borderBottomColor: colors.border }]}><View style={[styles.checkbox, { borderColor: item.checked ? colors.success : colors.input, backgroundColor: item.checked ? colors.success : 'transparent' }]}>{item.checked && <Feather name="check" size={13} color={colors.primaryForeground} />}</View><View style={{ flex: 1 }}><Text style={[styles.shoppingName, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text>{!!formatShoppingDays(item.days) && <Text style={[styles.shoppingDays, { color: item.checked ? colors.mutedForeground : colors.primary }]}>{formatShoppingDays(item.days)}</Text>}</View><Text style={[styles.shoppingQuantity, { color: colors.mutedForeground }]}>{item.quantity}×</Text></Pressable>)}{filteredShoppingItems.length === 0 && <View style={styles.shoppingEmpty}><Feather name="shopping-bag" size={20} color={colors.mutedForeground} /><Text style={[styles.shoppingWorkspaceTitle, { color: colors.foreground }]}>No items yet</Text><Text style={[styles.shoppingWorkspaceMeta, { color: colors.mutedForeground }]}>Plan meals to add ingredients.</Text><Pressable onPress={() => setWorkspace('week')} style={[styles.emptyShoppingButton, { backgroundColor: colors.accent }]}><Text style={[styles.emptyShoppingButtonText, { color: colors.accentForeground }]}>Go to week</Text></Pressable></View>}</View>
        </>}
        </SwipeableSectionPager>
      </ScrollView>
       <LocalSaveNotice visible={saveMessage !== null} message={saveMessage ?? ''} colors={colors} actionLabel={undoMeal || undoMoveMeal || undoSwapMeal ? 'Undo' : undefined} onAction={undoMeal ? undoRemove : undoMoveMeal ? undoMove : undoSwapMeal ? undoSwap : undefined} countdownDuration={undoMeal || undoMoveMeal || undoSwapMeal ? 6000 : undefined} />
      <BottomSheet visible={detail !== null} onRequestClose={() => { dismissPlannerReview(); setDetail(null); }} sheetStyle={[styles.detailSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            {detail && plannerReviewDraft ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
                <View style={styles.reviewTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailEyebrow, { color: colors.primary }]}>PLANNER REVIEW · {dateFormatter.format(parseDate(detail.day))}</Text>
                    <Text style={[styles.detailTitle, { color: colors.foreground }]}>{plannerReviewDraft.title}</Text>
                  </View>
                  <ScalePressable accessibilityLabel="Cancel planner review" onPress={dismissPlannerReview} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></ScalePressable>
                </View>
                <Text style={[styles.reviewSubtitle, { color: colors.mutedForeground }]}>Set your portion before logging to your diary.</Text>
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
                    <Text style={[styles.reviewFieldLabel, { color: colors.mutedForeground }]}>Portion eaten</Text>
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
                <ScalePressable accessibilityLabel="Approve and add planned meal to diary" onPress={acceptPlannerDraft} scale={0.96} haptic="light" style={[styles.addDiaryButton, { backgroundColor: colors.primary }]}>
                  <Feather name="check-circle" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.addDiaryText, { color: colors.primaryForeground }]}>Approve and add to diary</Text>
                </ScalePressable>
                <Pressable accessibilityLabel="Cancel planned meal log" onPress={dismissPlannerReview} style={styles.dismissButton}>
                  <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Not this meal</Text>
                </Pressable>
              </ScrollView>
            ) : (
              detail && (
                <>
                  <Image
                    source={[
                      ...(detail.image ? [{ uri: detail.image }] : []),
                      require('../../assets/images/calora-plan-header.jpg'),
                    ]}
                    contentFit="cover"
                    style={styles.detailImage}
                  />
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailBody}>
                    <View style={styles.detailTitleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{detail.meal.toUpperCase()} · {dateFormatter.format(parseDate(detail.day))}</Text>
                        <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
                      </View>
                      <ScalePressable accessibilityLabel="Close meal detail" onPress={() => setDetail(null)} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></ScalePressable>
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
                    <ScalePressable accessibilityLabel={`Add ${detail.name} to diary`} onPress={() => addToDiary(detail)} scale={0.96} haptic="light" style={[styles.addDiaryButton, { backgroundColor: colors.primary }]}>
                      <Feather name="plus" size={16} color={colors.primaryForeground} />
                      <Text style={[styles.addDiaryText, { color: colors.primaryForeground }]}>Add to diary</Text>
                    </ScalePressable>
                  </ScrollView>
                </>
              )
            )}
      </BottomSheet>
       <BottomSheet visible={shoppingVisible} onRequestClose={() => { setShoppingVisible(false); setShoppingDayFilter(null); }} sheetStyle={[styles.shoppingSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             <View style={styles.shoppingHeader}>
               <View>
                 <Text style={[styles.detailEyebrow, { color: colors.primary }]}>THIS WEEK</Text>
                 <Text style={[styles.detailTitle, { color: colors.foreground }]}>Shopping list</Text>
               </View>
               <ScalePressable accessibilityLabel="Close shopping list" onPress={() => { setShoppingVisible(false); setShoppingDayFilter(null); }} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
                 <Feather name="x" size={18} color={colors.foreground} />
               </ScalePressable>
             </View>
             <Text style={[styles.shoppingSubtitle, { color: colors.mutedForeground }]}>Ingredients for this week.</Text>
             {shoppingDays.length > 1 && (
               <View style={styles.shopFilterSection}>
                 <ScrollView
                   horizontal
                   showsHorizontalScrollIndicator={false}
                   contentContainerStyle={styles.shopFilterContent}
                 >
                   <Pressable
                     accessibilityLabel="Show all days"
                     onPress={() => setShoppingDayFilter(null)}
                     style={[styles.shopDayPill, { borderColor: shoppingDayFilter === null ? colors.primary : colors.input, backgroundColor: shoppingDayFilter === null ? colors.primary : colors.muted }]}
                   >
                     <Text style={[styles.shopDayPillText, { color: shoppingDayFilter === null ? colors.primaryForeground : colors.foreground }]}>All</Text>
                   </Pressable>
                   {shoppingDays.map((day) => {
                     const active = shoppingDayFilter === day;
                     return (
                       <Pressable
                         key={day}
                         accessibilityLabel={`Filter by ${dayFormatter.format(parseDate(day))}`}
                         onPress={() => setShoppingDayFilter(active ? null : day)}
                         style={[styles.shopDayPill, { borderColor: active ? colors.primary : colors.input, backgroundColor: active ? colors.primary : colors.muted }]}
                       >
                         <Text style={[styles.shopDayPillText, { color: active ? colors.primaryForeground : colors.foreground }]}>{dayFormatter.format(parseDate(day))}</Text>
                       </Pressable>
                     );
                   })}
                 </ScrollView>
               </View>
             )}
             <ScrollView showsVerticalScrollIndicator={false} style={styles.shopIngredientScroll} contentContainerStyle={{ paddingBottom: 25 }}>
               {filteredShoppingItems.map((item) => (
                 <Pressable key={item.id} accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`} onPress={() => toggleShoppingItemByName(item.name)} style={[styles.shoppingRow, { borderBottomColor: colors.border }]}>
                   <View style={[styles.checkbox, { borderColor: item.checked ? colors.success : colors.input, backgroundColor: item.checked ? colors.success : 'transparent' }]}>
                     {item.checked && <Feather name="check" size={13} color={colors.primaryForeground} />}
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={[styles.shoppingName, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text>
                     {!!formatShoppingDays(item.days) && <Text style={[styles.shoppingDays, { color: item.checked ? colors.mutedForeground : colors.primary, opacity: item.checked ? 0.55 : 0.75 }]}>{formatShoppingDays(item.days)}</Text>}
                   </View>
                   <Text style={[styles.shoppingQuantity, { color: colors.mutedForeground }]}>{item.quantity}×</Text>
                 </Pressable>
               ))}
               {filteredShoppingItems.length === 0 && (
                  <Text style={[styles.shoppingSubtitle, { color: colors.mutedForeground, textAlign: 'center', marginTop: 24 }]}>No items for this day.</Text>
               )}
             </ScrollView>
       </BottomSheet>
       <BottomSheet visible={actionMeal !== null} onRequestClose={() => { setActionMeal(null); setActionMode(null); }} sheetStyle={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             {actionMeal && !actionMode && (
               <>
                 <SheetHeader eyebrow={`${actionMeal.meal.toUpperCase()} · ${dateFormatter.format(parseDate(actionMeal.day))}`} title={actionMeal.name} onClose={() => setActionMeal(null)} colors={colors} />
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Update this planned meal.</Text>
                 <View style={styles.actionGrid}>
                   <ScalePressable accessibilityLabel={actionMealLogged ? `${actionMeal.name} is already logged` : `Log ${actionMeal.name}`} disabled={actionMealLogged} onPress={() => { setActionMeal(null); addToDiary(actionMeal); }} scale={0.96} haptic="light" style={[styles.actionTile, { backgroundColor: actionMealLogged ? colors.muted : colors.primary, opacity: actionMealLogged ? 0.7 : 1 }]}>
                     <Feather name="check-circle" size={18} color={actionMealLogged ? colors.foreground : colors.primaryForeground} />
                     <Text style={[styles.actionTileTitle, { color: actionMealLogged ? colors.foreground : colors.primaryForeground }]}>{actionMealLogged ? 'Logged' : 'Log to diary'}</Text>
                      <Text style={[styles.actionTileBody, { color: actionMealLogged ? colors.mutedForeground : colors.primaryForeground }]}>{actionMealLogged ? 'Already in diary' : 'Review portion first'}</Text>
                   </ScalePressable>
                   <ScalePressable accessibilityLabel={`Move ${actionMeal.name}`} onPress={() => setActionMode('move')} scale={0.96} haptic="none" style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="corner-up-right" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Move</Text>
                      <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Change its day</Text>
                   </ScalePressable>
                   <ScalePressable accessibilityLabel={`Copy ${actionMeal.name}`} onPress={() => setActionMode('copy')} scale={0.96} haptic="none" style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="copy" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Copy</Text>
                      <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Add another day</Text>
                   </ScalePressable>
                   <ScalePressable accessibilityLabel={`Replace ${actionMeal.name}`} onPress={() => { setReplaceMeal(actionMeal); setActionMeal(null); }} scale={0.96} haptic="none" style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                     <Feather name="refresh-cw" size={18} color={colors.foreground} />
                     <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Replace</Text>
                      <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Choose another meal</Text>
                   </ScalePressable>
                    <ScalePressable accessibilityLabel={`Edit portions for ${actionMeal.name}`} onPress={() => { beginEditMeal(actionMeal); setActionMeal(null); }} scale={0.96} haptic="none" style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="sliders" size={18} color={colors.foreground} />
                      <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Portions</Text>
                       <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>Serving and nutrition</Text>
                    </ScalePressable>
                     <ScalePressable accessibilityLabel={`View shopping ingredients for ${actionMeal.name}`} onPress={() => { setActionMeal(null); setShoppingDayFilter(actionMeal.day); setWorkspace('shopping'); }} scale={0.96} haptic="none" style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="shopping-bag" size={18} color={colors.foreground} />
                      <Text style={[styles.actionTileTitle, { color: colors.foreground }]}>Shopping</Text>
                       <Text style={[styles.actionTileBody, { color: colors.mutedForeground }]}>View ingredients</Text>
                    </ScalePressable>
                 </View>
                 <ScalePressable accessibilityLabel={`Remove ${actionMeal.name} from plan`} onPress={() => removeMealFromPlan(actionMeal)} scale={0.98} haptic="none" style={styles.removeAction}>
                   <Feather name="minus-circle" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.removeActionText, { color: colors.mutedForeground }]}>Remove from plan</Text>
                 </ScalePressable>
               </>
             )}
             {actionMeal && actionMode && (
               <>
                 <SheetHeader eyebrow={actionMode === 'copy' ? 'COPY TO' : 'MOVE TO'} title={actionMeal.name} onClose={() => { setActionMeal(null); setActionMode(null); }} colors={colors} />
                  <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Choose a day. This meal stays until then.</Text>
                 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dayChoiceList}>
                   {weekDays.map((day) => {
                     const isCurrent = day === actionMeal.day;
                      const isDisabled = isCurrent;
                     return <ScalePressable key={day} accessibilityLabel={`${actionMode === 'copy' ? 'Copy' : 'Move'} to ${dayFormatter.format(parseDate(day))}`} disabled={isDisabled} onPress={() => moveOrCopyMeal(day, actionMode === 'copy')} scale={isDisabled ? 1 : 0.98} haptic="none" style={[styles.dayChoice, { backgroundColor: colors.card, borderColor: colors.border, opacity: isDisabled ? 0.45 : 1 }]}><View style={[styles.dayChoiceIcon, { backgroundColor: isCurrent ? colors.accent : colors.muted }]}><Feather name={isCurrent ? 'check' : 'calendar'} size={15} color={isCurrent ? colors.accentForeground : colors.foreground} /></View><View style={styles.dayChoiceCopy}><Text style={[styles.dayChoiceName, { color: colors.foreground }]}>{dayFormatter.format(parseDate(day))}</Text><Text style={[styles.dayChoiceDate, { color: colors.mutedForeground }]}>{dateFormatter.format(parseDate(day))}{isCurrent ? ' · current day' : ''}</Text></View><Feather name="chevron-right" size={16} color={colors.mutedForeground} /></ScalePressable>;
                   })}
                 </ScrollView>
               </>
             )}
       </BottomSheet>
       <BottomSheet visible={addingMealType !== null} onRequestClose={() => setAddingMealType(null)} sheetStyle={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
              <SheetHeader eyebrow={`${dayFormatter.format(parseDate(selectedDay)).toUpperCase()} · ${addingMealType ?? ''}`} title="Add a meal" onClose={() => setAddingMealType(null)} colors={colors} />
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Choose a meal or add your own.</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catalogList}>
              {plannerCatalog.filter((meal) => meal.meal === addingMealType).map((meal) => <ScalePressable key={meal.id} accessibilityLabel={`Add ${meal.name} to plan`} onPress={() => addMealToPlan(meal, selectedDay, addingMealType!)} scale={0.98} haptic="none" style={[styles.catalogRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={{ uri: meal.image }} contentFit="cover" style={styles.catalogImage} /><View style={styles.catalogCopy}><Text style={[styles.catalogName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.catalogMeta, { color: colors.mutedForeground }]}>{formatCalories(meal.calories)} · {meal.prepMinutes ?? 0} min prep</Text></View><Feather name="plus-circle" size={19} color={colors.primary} /></ScalePressable>)}
             </ScrollView>
             <Pressable
               accessibilityLabel={`Browse recipes for ${addingMealType}`}
               onPress={() => {
                 setRecipeSlotTarget({ day: selectedDay, mealType: addingMealType! });
                 setAddingMealType(null);
                 router.push('/(tabs)/recipes');
               }}
               style={[styles.browseRecipesButton, { backgroundColor: colors.accent }]}
             >
               <Feather name="book-open" size={15} color={colors.accentForeground} />
               <Text style={[styles.browseRecipesText, { color: colors.accentForeground }]}>Browse recipes</Text>
             </Pressable>
               <Pressable accessibilityLabel={`Create custom ${addingMealType}`} onPress={() => openCustomMeal(addingMealType!)} style={[styles.customMealButton, { borderColor: colors.primary }]}><Feather name="edit-3" size={15} color={colors.primary} /><Text style={[styles.customMealButtonText, { color: colors.primary }]}>Custom meal</Text></Pressable>
              <Pressable accessibilityLabel={`Leave ${addingMealType} open`} onPress={() => { setAddingMealType(null); acknowledge(`${addingMealType} left open.`); }} style={styles.leaveOpenButton}><Text style={[styles.leaveOpenText, { color: colors.mutedForeground }]}>Leave open</Text></Pressable>
       </BottomSheet>
       <BottomSheet visible={replaceMeal !== null} onRequestClose={() => setReplaceMeal(null)} sheetStyle={[styles.actionSheet, { backgroundColor: colors.background }]}>
             <View style={styles.sheetHandle} />
             <SheetHeader eyebrow="REPLACE MEAL" title={replaceMeal?.name ?? ''} onClose={() => setReplaceMeal(null)} colors={colors} />
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Choose a {replaceMeal?.meal.toLowerCase()} for {dateFormatter.format(parseDate(replaceMeal?.day ?? selectedDay))}.</Text>
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catalogList}>
              {plannerCatalog.filter((meal) => meal.meal === replaceMeal?.meal && meal.id !== replaceMeal?.id).map((meal) => <ScalePressable key={meal.id} accessibilityLabel={`Replace with ${meal.name}`} onPress={() => replaceMeal && replaceMealInPlan(meal, replaceMeal)} scale={0.98} haptic="none" style={[styles.catalogRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={{ uri: meal.image }} contentFit="cover" style={styles.catalogImage} /><View style={styles.catalogCopy}><Text style={[styles.catalogName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.catalogMeta, { color: colors.mutedForeground }]}>{formatCalories(meal.calories)} · {meal.prepMinutes ?? 0} min prep</Text></View><Feather name="arrow-right" size={18} color={colors.primary} /></ScalePressable>)}
             </ScrollView>
             <Pressable
               accessibilityLabel={`Browse recipes to replace ${replaceMeal?.name ?? 'meal'}`}
               onPress={() => {
                 if (!replaceMeal) return;
                 setRecipeSlotTarget({ day: replaceMeal.day, mealType: replaceMeal.meal });
                 setReplaceMeal(null);
                 setActionMeal(null);
                 router.push('/(tabs)/recipes');
               }}
               style={[styles.browseRecipesButton, { backgroundColor: colors.accent }]}
             >
               <Feather name="book-open" size={15} color={colors.accentForeground} />
               <Text style={[styles.browseRecipesText, { color: colors.accentForeground }]}>Browse recipes</Text>
             </Pressable>
              <Pressable accessibilityLabel={`Create custom ${replaceMeal?.meal ?? 'meal'} to replace ${replaceMeal?.name ?? 'meal'}`} onPress={() => replaceMeal && openCustomMeal(replaceMeal.meal, replaceMeal)} style={[styles.customMealButton, { borderColor: colors.primary }]}><Feather name="edit-3" size={15} color={colors.primary} /><Text style={[styles.customMealButtonText, { color: colors.primary }]}>Custom meal</Text></Pressable>
             <Pressable accessibilityLabel="Cancel replace meal" onPress={() => setReplaceMeal(null)} style={styles.leaveOpenButton}><Text style={[styles.leaveOpenText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
       </BottomSheet>
        <BottomSheet visible={editMeal !== null} onRequestClose={() => setEditMeal(null)} sheetStyle={[styles.formSheet, { backgroundColor: colors.background }]}>
              <View style={styles.sheetHandle} />
              <SheetHeader eyebrow="EDIT PLANNED MEAL" title={editMeal?.name ?? ''} onClose={() => setEditMeal(null)} colors={colors} />
              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
                bottomOffset={28}
              >
                <Text style={[styles.formHint, { color: colors.mutedForeground }]}>Edits affect your plan, not logged diary entries.</Text>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Meal name</Text>
                <TextInput accessibilityLabel="Edit meal name" value={editName} onChangeText={setEditName} placeholder="Meal name" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Serving</Text>
                <TextInput accessibilityLabel="Edit serving" value={editServing} onChangeText={setEditServing} placeholder="1 serving" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nutrition per serving</Text>
                <View style={styles.formNumberGrid}>
                  {([['Calories', editCalories, setEditCalories], ['Protein g', editProtein, setEditProtein], ['Carbs g', editCarbs, setEditCarbs], ['Fat g', editFat, setEditFat]] as const).map(([label, value, setter]) => <View key={label} style={styles.formNumberField}><Text style={[styles.numberInputLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput accessibilityLabel={`Edit ${label}`} value={value} onChangeText={setter} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}
                </View>
                <ScalePressable accessibilityLabel="Save planned meal edits" onPress={saveEditedMeal} disabled={!editName.trim()} scale={0.96} haptic="light" style={[styles.formSaveButton, { backgroundColor: colors.primary, opacity: editName.trim() ? 1 : 0.5 }]}><Feather name="check" size={16} color={colors.primaryForeground} /><Text style={[styles.formSaveText, { color: colors.primaryForeground }]}>Save changes</Text></ScalePressable>
                <Pressable accessibilityLabel="Cancel planned meal edits" onPress={() => setEditMeal(null)} style={styles.formCancelButton}><Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              </KeyboardAwareScrollViewCompat>
        </BottomSheet>
        {/* Program discovery sheet — selection is non-destructive until an explicit build action. */}
        <BottomSheet visible={planTypeVisible} onRequestClose={() => setPlanTypeVisible(false)} sheetStyle={[styles.planTypeSheet, { backgroundColor: colors.background }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.planTypeSheetHeader}>
                <View style={{ flex: 1 }}>
                   <Text style={[styles.planTypeSheetEyebrow, { color: colors.primary }]}>YOUR PROGRAM</Text>
                   <Text style={[styles.planTypeSheetTitle, { color: colors.foreground }]}>Choose a strategy</Text>
                </View>
                 <ScalePressable accessibilityLabel="Close program selector" onPress={() => setPlanTypeVisible(false)} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
                  <Feather name="x" size={18} color={colors.foreground} />
                </ScalePressable>
              </View>
               <Text style={[styles.planTypeSheetSubtitle, { color: colors.mutedForeground }]}>Guides meals and nutrition on your next build. It does not replace this week automatically.</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.planTypeList}>
                {PLAN_TYPES.map((pt) => {
                  const isSelected = plannerPreferences?.primary === pt.id;
                  return (
                    <Pressable
                      key={pt.id}
                       accessibilityLabel={`Choose ${pt.label} Program`}
                       onPress={() => setProgramDetail(pt)}
                      style={[styles.planTypeOptionRow, {
                        backgroundColor: isSelected ? colors.accent : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }]}
                    >
                      <View style={[styles.planTypeOptionIcon, { backgroundColor: isSelected ? colors.primary : colors.muted }]}>
                        <Feather name={pt.icon as React.ComponentProps<typeof Feather>['name']} size={18} color={isSelected ? colors.primaryForeground : colors.foreground} />
                      </View>
                      <View style={styles.planTypeOptionCopy}>
                        <Text style={[styles.planTypeOptionLabel, { color: colors.foreground }]}>{pt.label}</Text>
                        <Text style={[styles.planTypeOptionSubtitle, { color: colors.mutedForeground }]}>{pt.subtitle}</Text>
                        {isSelected && <Text style={[styles.planTypeOptionDesc, { color: colors.primary }]}>{pt.description}</Text>}
                      </View>
                      {isSelected && (
                        <View style={[styles.planTypeCheck, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={14} color={colors.primaryForeground} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
        </BottomSheet>
        <BottomSheet visible={programDetail !== null} onRequestClose={() => setProgramDetail(null)} sheetStyle={[styles.planTypeSheet, { backgroundColor: colors.background }]}>
              <View style={styles.sheetHandle} />
              {programDetail && <>
                <SheetHeader eyebrow="PROGRAM DETAILS" title={programDetail.label} onClose={() => setProgramDetail(null)} colors={colors} />
                <Text style={[styles.planTypeSheetSubtitle, { color: colors.mutedForeground }]}>{programDetail.description}</Text>
                <View style={[styles.programDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.programDetailLabel, { color: colors.primary }]}>HOW IT SHAPES YOUR PLAN</Text>
                  <Text style={[styles.programDetailText, { color: colors.foreground }]}>Shapes meals, nutrition, recipes, replacements, and your next build.</Text>
                  <Text style={[styles.programDetailText, { color: colors.mutedForeground }]}>Your calorie target and dietary preferences stay in control.</Text>
                </View>
                <ScalePressable accessibilityLabel={`Start ${programDetail.label} next week`} onPress={() => { setPlannerPreferences(selectPrimaryProgram(plannerPreferences, programDetail.id)); setProgramDetail(null); setPlanTypeVisible(false); acknowledge(`${programDetail.label} is ready for your next build.`); }} scale={0.97} haptic="light" style={[styles.formSaveButton, { backgroundColor: colors.primary, marginTop: 10 }]}>
                  <Feather name="calendar" size={16} color={colors.primaryForeground} /><Text style={[styles.formSaveText, { color: colors.primaryForeground }]}>Start next week</Text>
                </ScalePressable>
                <Pressable accessibilityLabel={`Rebuild this week with ${programDetail.label}`} onPress={() => { setProgramRebuildConfirm(programDetail); setProgramDetail(null); }} style={styles.programRebuildLink}><Text style={[styles.programRebuildText, { color: colors.primary }]}>Rebuild this week instead</Text></Pressable>
              </>}
        </BottomSheet>
        <Modal visible={programRebuildConfirm !== null} transparent animationType="fade" onRequestClose={() => setProgramRebuildConfirm(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.confirmationDialog, { backgroundColor: colors.background }]}>
              {programRebuildConfirm && <>
                <SheetHeader eyebrow="CONFIRM REFRESH" title={`Refresh with ${programRebuildConfirm.label}?`} onClose={() => setProgramRebuildConfirm(null)} colors={colors} />
                <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Rebuild generated meals only. Added, edited, and logged meals stay unchanged.</Text>
                <ScalePressable accessibilityLabel="Confirm refresh this week" onPress={() => { const program = programRebuildConfirm; setProgramRebuildConfirm(null); setPlanTypeVisible(false); void generate(program.id); }} scale={0.97} haptic="light" style={[styles.formSaveButton, { backgroundColor: colors.primary, marginTop: 0 }]}><Feather name="refresh-cw" size={16} color={colors.primaryForeground} /><Text style={[styles.formSaveText, { color: colors.primaryForeground }]}>Refresh this week</Text></ScalePressable>
                <Pressable accessibilityLabel="Cancel week refresh" onPress={() => setProgramRebuildConfirm(null)} style={styles.formCancelButton}><Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Keep current week</Text></Pressable>
              </>}
            </View>
          </View>
        </Modal>
        <BottomSheet visible={customMealType !== null} onRequestClose={() => { setCustomMealType(null); setCustomMealReplaceTarget(null); }} sheetStyle={[styles.formSheet, { backgroundColor: colors.background }]}>
              <View style={styles.sheetHandle} />
              <SheetHeader eyebrow={`${customMealType?.toUpperCase() ?? ''} · ${dateFormatter.format(parseDate(customMealReplaceTarget?.day ?? selectedDay))}`} title="Create a custom meal" onClose={() => { setCustomMealType(null); setCustomMealReplaceTarget(null); }} colors={colors} />
              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
                bottomOffset={28}
              >
                <Text style={[styles.formHint, { color: colors.mutedForeground }]}>Add a meal to your plan.</Text>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Meal name</Text>
                <TextInput accessibilityLabel="Custom meal name" value={customName} onChangeText={setCustomName} placeholder="e.g. Sunday chili" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Serving</Text>
                <TextInput accessibilityLabel="Custom meal serving" value={customServing} onChangeText={setCustomServing} placeholder="1 serving" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Nutrition per serving</Text>
                <View style={styles.formNumberGrid}>
                  {([['Calories', customCalories, setCustomCalories], ['Protein g', customProtein, setCustomProtein], ['Carbs g', customCarbs, setCustomCarbs], ['Fat g', customFat, setCustomFat]] as const).map(([label, value, setter]) => <View key={label} style={styles.formNumberField}><Text style={[styles.numberInputLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput accessibilityLabel={`Custom ${label}`} value={value} onChangeText={setter} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Ingredients (optional)</Text>
                <TextInput accessibilityLabel="Custom meal ingredients" value={customIngredients} onChangeText={setCustomIngredients} multiline placeholder="Ingredients, separated by commas" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, styles.multilineInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
                <Pressable accessibilityLabel="Save custom meal" onPress={saveCustomMeal} disabled={!customName.trim()} style={[styles.formSaveButton, { backgroundColor: colors.primary, opacity: customName.trim() ? 1 : 0.5 }]}><Feather name="plus" size={16} color={colors.primaryForeground} /><Text style={[styles.formSaveText, { color: colors.primaryForeground }]}>Add to plan</Text></Pressable>
                <Pressable accessibilityLabel="Cancel custom meal" onPress={() => { setCustomMealType(null); setCustomMealReplaceTarget(null); }} style={styles.formCancelButton}><Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              </KeyboardAwareScrollViewCompat>
        </BottomSheet>
    </View>
  );
}

function makeStyles(f: number) {
  return StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20 },
   plannerIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13, paddingTop: 2 },
   plannerEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.3, marginBottom: 4 },
   plannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 * f, letterSpacing: -0.7 },
   memoryShortcut: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
   workspaceSwitch: { minHeight: 44, borderRadius: 14, padding: 3, flexDirection: 'row', marginBottom: 16 },
   workspaceTab: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
   workspaceTabText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
   todayDateLink: { minHeight: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
   todayDateLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
   todayDateMeta: { fontFamily: 'Inter_400Regular', fontSize: 9.5 * f, marginTop: 3 },
   focusCard: { padding: 17, marginBottom: 10, overflow: 'hidden' },
   focusTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
   focusCopy: { flex: 1 },
   focusEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8.5 * f, letterSpacing: 1.15, marginBottom: 5 },
   focusTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 * f, letterSpacing: -0.45, lineHeight: 25 * f },
   focusMeta: { fontFamily: 'Inter_400Regular', fontSize: 10.5 * f, lineHeight: 15 * f, marginTop: 6 },
   focusRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
   focusRingText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
   focusTrack: { height: 5, borderRadius: 3, marginTop: 15, overflow: 'hidden' },
   focusFill: { height: '100%', borderRadius: 3 },
   focusActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 15 },
   focusPrimary: { minHeight: 40, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
   focusPrimaryText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
   focusSecondary: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 3 },
   focusSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5 * f },
   shoppingSummary: { minHeight: 62, borderWidth: 1, borderRadius: 17, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
   shoppingSummaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
   shoppingSummaryCopy: { flex: 1 },
   shoppingSummaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 11.5 * f },
   shoppingSummaryMeta: { fontFamily: 'Inter_400Regular', fontSize: 9.5 * f, marginTop: 3 },
  headerShoppingButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 1.3, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 * f, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18, marginTop: 6 },
  shoppingButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shoppingCount: { position: 'absolute', right: -4, top: -5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shoppingCountText: { fontFamily: 'Inter_700Bold', fontSize: 9 * f },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
   weekOverviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingTop: 2 },
   weekOverviewTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 * f, letterSpacing: -0.5, lineHeight: 28 * f },
   weekOverviewSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 10.5 * f, lineHeight: 16 * f, marginTop: 5 },
   weekOverviewList: { gap: 10 },
   weekOverviewDay: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
   weekOverviewDayHeading: { minHeight: 45, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
   weekOverviewDayName: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
   weekOverviewDayDate: { fontFamily: 'Inter_400Regular', fontSize: 10 * f },
   weekOverviewDayTotal: { marginLeft: 'auto', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
   weekOverviewMeal: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingLeft: 13 },
   weekOverviewMealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
   weekOverviewMealType: { width: 56, fontFamily: 'Inter_700Bold', fontSize: 8.5 * f, letterSpacing: 0.2 },
   weekOverviewMealName: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
   weekOverviewMealMeta: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 3 },
   weekOverviewMore: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
   weekOverviewEmpty: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, paddingHorizontal: 13, paddingBottom: 13 },
   weekOverviewDone: { minHeight: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
   weekOverviewDoneText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  weekArrow: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  weekHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRange: { fontFamily: 'Inter_700Bold', fontSize: 13 * f, letterSpacing: -0.2 },
  editModeButton: { minHeight: 28, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editModeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
   dayRail: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 5, marginBottom: 16 },
   dayCol: { flex: 1, alignItems: 'center', minHeight: 66, borderRadius: 13, paddingTop: 7, paddingBottom: 5 },
  dayName: { fontFamily: 'Inter_600SemiBold', fontSize: 9.5 * f, letterSpacing: 0.2 },
  dayNumber: { fontFamily: 'Inter_700Bold', fontSize: 17 * f, marginTop: 2 },
   dayCoverage: { flexDirection: 'row', gap: 2, marginTop: 5 },
   coverageDot: { width: 4, height: 4, borderRadius: 2 },
   todayTag: { fontFamily: 'Inter_700Bold', fontSize: 7 * f, marginTop: 2 },
  summaryCard: { padding: 16, marginBottom: 12 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 * f, marginTop: 4 },
  summaryTarget: { fontFamily: 'Inter_400Regular', fontSize: 11 * f },
  goalRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  goalRingText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  goalTrack: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 3 },
  summaryMacros: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  summaryMacroValue: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  summaryMacroLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 2 },
  planControlBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  planControlLeft: { flex: 1, paddingHorizontal: 14, paddingVertical: 13 },
  planControlLabel: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 1.1, marginBottom: 4 },
  planControlValue: { fontFamily: 'Inter_700Bold', fontSize: 13 * f },
  planControlPrompt: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
  planControlDivider: { width: 1, marginVertical: 11 },
  planControlRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 13 },
  planControlAction: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
   programCard: { minHeight: 78, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
   programIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
   programCopy: { flex: 1 },
   programEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 1.1, marginBottom: 4 },
   programTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 * f },
   programMeta: { fontFamily: 'Inter_400Regular', fontSize: 9.5 * f, marginTop: 3 },
   programDetailCard: { borderRadius: 15, borderWidth: 1, padding: 13, marginTop: 16, gap: 7 },
   programDetailLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 0.9 },
   programDetailText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16 * f },
   programRebuildLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
   programRebuildText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  generationStatus: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  generationStatusText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10 * f, lineHeight: 15 },
  dayDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 11, borderBottomWidth: 1, marginBottom: 13 },
   weekDayActions: { alignItems: 'flex-end', gap: 6 },
   weekTodayHandoff: { minHeight: 27, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
   weekTodayHandoffText: { fontFamily: 'Inter_700Bold', fontSize: 8.5 * f },
   dayHeadingTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 * f, letterSpacing: -0.2 },
   daySubheading: { fontFamily: 'Inter_400Regular', fontSize: 9.5 * f, marginTop: 3 },
  dayTotal: { fontFamily: 'Inter_400Regular', fontSize: 11 * f },
  mealList: { gap: 9 },
   mealCard: { overflow: 'hidden', flexDirection: 'row', minHeight: 122 },
   mealImage: { width: 108, minHeight: 122, alignSelf: 'stretch' },
  mealCardBody: { flex: 1, padding: 12 },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMoreButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: -5, marginTop: -4 },
   mealTypeBadge: { minHeight: 21, paddingHorizontal: 7, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
   mealTypeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 0.25 },
  mealCalories: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  mealName: { fontFamily: 'Inter_700Bold', fontSize: 14 * f, lineHeight: 18, marginTop: 8 },
   mealMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5 },
   mealPrep: { fontFamily: 'Inter_400Regular', fontSize: 9 * f },
   loggedPill: { minHeight: 19, borderRadius: 7, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
   loggedPillText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f },
   macroLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  macroText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f },
  logMealButton: { marginLeft: 'auto', minHeight: 26, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 3 },
  logMealButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  editMealButton: { minHeight: 26, borderRadius: 9, paddingHorizontal: 7, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  editMealButtonText: { fontFamily: 'Inter_700Bold', fontSize: 9 * f },
  emptyMeal: { minHeight: 54, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyMealImage: { width: 48, height: 46, borderRadius: 10, opacity: 0.8 },
  emptySlotIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyMealCopy: { flex: 1 },
  emptyMealLabel: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  emptyMealText: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 3 },
  tipCard: { marginTop: 14, padding: 13, borderRadius: 15, flexDirection: 'row', gap: 9 },
  tipText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 },
  nextStepCard: { borderRadius: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 14 },
  nextStepAccent: { width: 3, alignSelf: 'stretch', minHeight: 58 },
  nextStepIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  nextStepCopy: { flex: 1, paddingVertical: 12, paddingLeft: 10 },
  nextStepEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 7.5 * f, letterSpacing: 1.2 },
  nextStepTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, lineHeight: 17, marginTop: 3 },
  nextStepLink: { width: 38, height: 58, alignItems: 'center', justifyContent: 'center' },
  weekRangeCopy: { alignItems: 'center', gap: 3 },
  todayLink: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
   detailSheet: { overflow: 'hidden' },
   actionSheet: { padding: 20 },
   confirmationDialog: { maxHeight: '86%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  sheetSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: { width: '48%', minHeight: 104, borderRadius: 16, borderWidth: 1, padding: 13 },
  actionTileTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 * f, marginTop: 13 },
  actionTileBody: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, lineHeight: 13, marginTop: 4 },
  removeAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 9 },
  removeActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  dayChoiceList: { gap: 8, paddingBottom: 12 },
  dayChoice: { minHeight: 59, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayChoiceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayChoiceCopy: { flex: 1 },
  dayChoiceName: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  dayChoiceDate: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 3 },
  catalogList: { gap: 8, paddingBottom: 8 },
  catalogRow: { minHeight: 65, borderWidth: 1, borderRadius: 15, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catalogImage: { width: 49, height: 49, borderRadius: 11 },
  catalogCopy: { flex: 1 },
  catalogName: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  catalogMeta: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 4 },
  leaveOpenButton: { alignItems: 'center', paddingVertical: 12 },
  leaveOpenText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  browseRecipesButton: { minHeight: 43, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 5 },
  browseRecipesText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  customMealButton: { minHeight: 43, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 },
  customMealButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
   formSheet: { paddingHorizontal: 20 },
   formContent: {},
  formHint: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, marginBottom: 15 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, marginTop: 10, marginBottom: 6 },
  numberInputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginBottom: 5 },
  formInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  formNumberGrid: { flexDirection: 'row', gap: 8 },
  formNumberField: { flex: 1 },
  multilineInput: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  formSaveButton: { minHeight: 47, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 20 },
  formSaveText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  formCancelButton: { alignItems: 'center', paddingVertical: 14 },
  detailImage: { height: 220, width: '100%' },
  detailBody: { padding: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginVertical: 11 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 * f, letterSpacing: -0.5, marginTop: 5 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailDescription: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18, marginTop: 12 },
  detailStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(120,120,120,0.16)', paddingVertical: 14, marginTop: 16 },
  detailStat: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  ingredientsLabel: { fontFamily: 'Inter_700Bold', fontSize: 13 * f, marginTop: 17 },
  ingredientsText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 17, marginTop: 6 },
  addDiaryButton: { minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 19 },
  addDiaryText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
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
  dismissButton: { alignItems: 'center', paddingVertical: 13 },
  dismissText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
   shoppingSheet: { flex: 1, paddingTop: 16, paddingHorizontal: 20 },
  shoppingHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  shoppingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 8, marginBottom: 12 },
  // Filter section: a plain View wrapper that owns its own height, with no overflow clipping.
  shopFilterSection: { marginBottom: 16 },
  // Content inside the horizontal ScrollView. paddingVertical gives pills breathing room
  // in the cross-axis so text is never cropped by the scroll container.
  shopFilterContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 2 },
  // Each pill must never compress: flexShrink:0 prevents the horizontal scroller from
  // squashing chips when all 8 don't fit. Vertical padding is generous so lineHeight
  // of the label has room above and below.
  shopDayPill: { flexShrink: 0, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shopDayPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, lineHeight: 15 },
  // Ingredient list takes all remaining sheet height so it scrolls independently.
  shopIngredientScroll: { flex: 1 },
  shoppingRow: { minHeight: 46, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shoppingName: { fontFamily: 'Inter_500Medium', fontSize: 12 * f },
  shoppingDays: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 1 },
  shoppingQuantity: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
   shoppingWorkspaceHeader: { borderRadius: 19, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
   shoppingWorkspaceTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 * f, letterSpacing: -0.25, marginTop: 3 },
   shoppingWorkspaceMeta: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 * f, marginTop: 4 },
   shoppingWorkspaceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
   shoppingListCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, overflow: 'hidden' },
   shoppingEmpty: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 34, gap: 7 },
   emptyShoppingButton: { minHeight: 39, paddingHorizontal: 13, borderRadius: 12, justifyContent: 'center', marginTop: 5 },
   emptyShoppingButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10.5 * f },
  // Plan type inline row (sits above generate button)
  planTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1, marginBottom: 9 },
  planTypeRowKey: { fontFamily: 'Inter_500Medium', fontSize: 12 * f },
  planTypeRowValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  planTypeRowPrompt: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  // Plan type selector modal (bottom sheet)
   planTypeSheet: { padding: 20 },
  planTypeSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  planTypeSheetEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.3, marginBottom: 3 },
  planTypeSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 * f },
  planTypeSheetSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, marginBottom: 14 },
  planTypeList: { gap: 9, paddingBottom: 28 },
  planTypeOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 18, borderWidth: 1 },
  planTypeOptionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  planTypeOptionCopy: { flex: 1 },
  planTypeOptionLabel: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  planTypeOptionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 15, marginTop: 2 },
  planTypeOptionDesc: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 14, marginTop: 5 },
  planTypeCheck: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  });
}
const styles = makeStyles(1.0);
