import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Alert,
  AccessibilityInfo,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { ScalePressable } from '@/components/ScalePressable';
import { Surface } from '@/components/Surface';
import { CaloraFeatureIcon, type CaloraFeatureIconName } from '@/components/CaloraFeatureIcon';
import { AppHeader } from '@/components/AppChrome';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { FoodLogThumbnail } from '@/components/FoodLogThumbnail';
import { StepMilestoneCelebration } from '@/components/StepMilestoneCelebration';
import { AndroidStepsCard } from '@/components/AndroidStepsCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useListRecipes, type Recipe } from '@workspace/api-client-react';
import { useCalora, FoodLog, MealType, Mood } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import { savedMealCategory } from '@/lib/savedMealCategory';
import { enterMotion } from '@/lib/motion';
import { formatCoachPlainText } from '@workspace/api-zod/coach-text-presentation';
import { mealOrder, verifiedFoods } from '@/data/foods';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { formatLogTime } from '@/lib/dates';
import { normalizeWholeNumberInput, parseWholeNumberInput } from '@/lib/formatters';

import { formatGrams, formatQuantity, formatWhole } from '@/lib/formatters';
import { resolveLivingActionEffect } from '@/lib/livingActionHandler';
import {
  getMacroTargets,
  validateMacroGoalInput,
  type MacroGoalInput,
  type MacroTargets,
} from '@/lib/nutritionGoals';
import {
  clearWaterConfirmation,
  getWaterConfirmationRemaining,
  isWaterConfirmed,
  recordWaterConfirmation,
} from '@/lib/waterConfirmation';
import {
  buildDailyIntelligenceFacts,
  createIntelligenceContext,
  isIntelligenceFeatureEnabled,
  selectVisibleTodayInsight,
} from '@/lib/intelligence';
import { burnedStatusForDay } from '@/lib/health/burnedStatus';
import { burnedPresentationForStatus } from '@/lib/health/burnedPresentation';
import { ConfirmedDeletionControl } from '@/components/ConfirmedDeletionControl';
import { isLiveSessionOnly, type LiveStepTrackingState } from '@/lib/steps/stepTracking';
import { deriveFastingProgress, fastingPlanLabel, formatFastingDuration } from '@/lib/fasting';
import { normalizeFoodImageUrl } from '@/lib/foodImageMetadata';
import { buildDashboardRows, RESPONSIVE_DASHBOARD_WIDGET_IDS } from '@/lib/dashboardPreferences';
import { useClock } from '@/lib/useClock';
import { calculateProgressSnapshot } from '@/lib/progressSnapshot';
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type CaloraColors = ReturnType<typeof useCalora>['colors'];
type SupportingWidgetColors = CaloraColors & {
  surface: string;
  track: string;
  green: string;
  orange: string;
  blue: string;
  pill: string;
};
const supportingWidgetColors = (colors: CaloraColors): SupportingWidgetColors => ({
  ...colors,
  surface: colors.muted,
  track: colors.muted,
  green: colors.primary,
  orange: colors.warning,
  blue: colors.carbs,
  pill: colors.accent,
});

// Calorie gauge geometry — computed once at module load, stable across renders
const GAUGE_VBW = 260;
const GAUGE_VBH = 186;
const GAUGE_CX  = 130;
const GAUGE_CY  = 118;
const GAUGE_R   = 90;
const GAUGE_STROKE = 13;
const GAUGE_START  = 135; // °from positive x-axis (SVG y-down, clockwise)
const GAUGE_SWEEP  = 270;
const TODAY_WIDGET_HEIGHT_SCALE = 0.8;
const SUPPORTING_WIDGET_BASE_HEIGHT = 162;
const HYDRATION_WIDGET_HEIGHT = 199;
const GAUGE_HEIGHT_SCALE = 0.72;
const GAUGE_ARC_LEN = (GAUGE_SWEEP / 360) * 2 * Math.PI * GAUGE_R; // ≈ 424.1 px
const CALORIE_GAUGE_HEIGHT_SCALE = 1.155;
const CALORIE_RING_SCALE = 1.32;
const CALORIE_RING_VERTICAL_OFFSET = 24;
const WATER_WIDGET_HEIGHT_SCALE = 1.235;
const WATER_CUP_SCALE = 1.48;
const ANDROID_WATER_CUP_SCALE = 1.38;
const WATER_CUP_WIDTH = 38.5 * (Platform.OS === 'android' ? ANDROID_WATER_CUP_SCALE : WATER_CUP_SCALE);
const WATER_CUP_HEIGHT = 44 * (Platform.OS === 'android' ? ANDROID_WATER_CUP_SCALE : WATER_CUP_SCALE);
const WATER_SLOTS_GAP = Platform.OS === 'android' ? 8 : 4;
// The greeting header and calorie card read as one merged surface on Home.
// Keep their content and math unchanged while controlling only the vertical footprint.
const MERGED_WIDGET_HEIGHT_SCALE = TODAY_WIDGET_HEIGHT_SCALE;
// Local, approved food imagery keeps this rotation instant and offline-safe.
const HOME_HEADER_FOOD_PHOTOS = [
  require('../../assets/images/calora-home-header.jpg'),
  require('../../assets/images/foods/avocado-toast.jpg'),
  require('../../assets/images/foods/berry-protein-smoothie.jpg'),
  require('../../assets/images/foods/grilled-chicken-vegetables.jpg'),
  require('../../assets/images/foods/salmon-rice-bowl.jpg'),
  require('../../assets/images/foods/tofu-vegetable-stir-fry.jpg'),
] as const;
const _gaugePt = (deg: number) => ({
  x: GAUGE_CX + GAUGE_R * Math.cos((deg * Math.PI) / 180),
  y: GAUGE_CY + GAUGE_R * Math.sin((deg * Math.PI) / 180),
});
const _gs = _gaugePt(GAUGE_START);
const _ge = _gaugePt(GAUGE_START + GAUGE_SWEEP); // same as 45°
// Full 270° arc: large-arc-flag=1 (> 180°), sweep-flag=1 (clockwise in SVG)
const GAUGE_TRACK_D = `M ${_gs.x.toFixed(2)} ${_gs.y.toFixed(2)} A ${GAUGE_R} ${GAUGE_R} 0 1 1 ${_ge.x.toFixed(2)} ${_ge.y.toFixed(2)}`;

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateLabel = (key: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(dateFromKey(key)).toUpperCase();
const isToday = (key: string) => key === dateKey(new Date());
const formatShortDate = (key: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateFromKey(key));
const calendarMonthKey = (key: string) => key.slice(0, 7);
const formatCalendarMonth = (key: string) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(dateFromKey(`${key}-01`));
const calendarMonthDays = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth
      ? `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
      : null;
  });
};
const shiftCalendarMonth = (key: string, amount: number) => {
  const [year, month] = key.split('-').map(Number);
  const shifted = new Date(year, month - 1 + amount, 1);
  return `${shifted.getFullYear()}-${`${shifted.getMonth() + 1}`.padStart(2, '0')}`;
};
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FOOD_WIDGET_ART = {
  water: require('../../assets/images/foods/berry-protein-smoothie.jpg'),
  calorie: require('../../assets/images/foods/avocado-toast.jpg'),
} as const;

function CalendarPicker({
  visible,
  selectedDate,
  month,
  colors,
  onMonthChange,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: string;
  month: string;
  colors: ReturnType<typeof useCalora>['colors'];
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const days = calendarMonthDays(month);

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} sheetStyle={[styles.calendarCard, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.sheetScroll}
        contentContainerStyle={styles.calendarContent}
      >
          <View style={styles.modalHandle} />
          <View style={styles.calendarHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.calendarTitle, { color: colors.foreground }]}>Choose a day</Text>
              <Text style={[styles.calendarSubtitle, { color: colors.mutedForeground }]}>Review your ring and diary by date.</Text>
            </View>
            <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.calendarMonthHeader}>
            <Pressable
              accessibilityLabel="Previous calendar month"
              testID="previous-calendar-month"
              onPress={() => onMonthChange(shiftCalendarMonth(month, -1))}
              style={[styles.calendarMonthButton, { backgroundColor: colors.muted }]}
            >
              <Feather name="chevron-left" size={17} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.calendarMonthTitle, { color: colors.foreground }]}>{formatCalendarMonth(month)}</Text>
            <Pressable
              accessibilityLabel="Next calendar month"
              testID="next-calendar-month"
              onPress={() => onMonthChange(shiftCalendarMonth(month, 1))}
              style={[styles.calendarMonthButton, { backgroundColor: colors.muted }]}
            >
              <Feather name="chevron-right" size={17} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.calendarWeekRow}>
            {weekdayLabels.map((label, index) => (
              <Text key={`${label}-${index}`} style={[styles.calendarWeekday, { color: colors.mutedForeground }]}>{label}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.calendarDay} />;
              const selected = day === selectedDate;
              const today = isToday(day);
              return (
                <Pressable
                  key={day}
                  accessibilityLabel={today ? `${formatShortDate(day)}, today` : `Select ${formatShortDate(day)}`}
                  testID={`calendar-day-${day}`}
                  onPress={() => onSelect(day)}
                  style={[
                    styles.calendarDay,
                    selected && { backgroundColor: colors.primary },
                    !selected && today && { borderColor: colors.primary, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.calendarDayText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{Number(day.slice(-2))}</Text>
                  {today && <View style={[styles.calendarTodayDot, { backgroundColor: selected ? colors.primaryForeground : colors.primary }]} />}
                </Pressable>
              );
            })}
          </View>

          {!isToday(selectedDate) && (
            <Pressable
              accessibilityLabel="Back to today"
              testID="calendar-back-to-today"
              onPress={() => onSelect(dateKey(new Date()))}
              style={[styles.calendarTodayAction, { backgroundColor: colors.accent }]}
            >
              <Feather name="rotate-ccw" size={15} color={colors.accentForeground} />
              <Text style={[styles.calendarTodayActionText, { color: colors.accentForeground }]}>Back to today</Text>
            </Pressable>
          )}
      </ScrollView>
    </BottomSheet>
  );
}

function IconButton({
  feature,
  label,
  onPress,
  colors,
  iconPrimaryColor,
  iconAccentColor,
  iconHighlightColor,
}: {
  feature: CaloraFeatureIconName;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useCalora>['colors'];
  iconPrimaryColor: string;
  iconAccentColor: string;
  iconHighlightColor: string;
}) {
  return (
    <ScalePressable
      accessibilityLabel={label}
      testID={`quick-${label.toLowerCase().replaceAll(' ', '-')}`}
      onPress={onPress}
      haptic="none"
      style={styles.quickAction}
    >
      <CaloraFeatureIcon
        name={feature}
        size={48}
        primaryColor={iconPrimaryColor}
        accentColor={iconAccentColor}
        foregroundColor={colors.foreground}
        highlightColor={iconHighlightColor}
      />
      <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{label}</Text>
    </ScalePressable>
  );
}

const routineStageCopy: Record<ReturnType<typeof useCalora>['livingState']['routineStage'], { title: string; body: string }> = {
  first_day: {
    title: 'Start with one entry',
    body: 'One entry starts your rhythm.',
  },
  building: {
    title: 'Building your picture',
    body: 'Small signals show what fits your day.',
  },
  emerging: {
    title: 'Your rhythm is emerging',
    body: `Recent entries give ${BRAND.name} more context.`,
  },
  consistent: {
    title: 'Your routine is taking shape',
    body: 'Your recent history is easier to read.',
  },
  returning: {
    title: 'Welcome back',
    body: 'Your earlier history is here. Start where you are.',
  },
};

const livingCategoryLabel: Record<ReturnType<typeof useCalora>['livingState']['category'], string> = {
  first_day: 'First step',
  early_habit: 'Early habit',
  emerging_routine: 'Emerging rhythm',
  consistent_routine: 'Steady rhythm',
  returning_after_gap: 'Welcome back',
  incomplete_day: 'Open day',
  plan_ready: 'Plan-ready',
  reflection_ready: 'Reflection-ready',
};

function LivingRhythmCard({
  colors,
  livingState,
  waterOunces,
  mealsLogged,
  selectedDate,
  onAddMeal,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  livingState: ReturnType<typeof useCalora>['livingState'];
  waterOunces: number;
  mealsLogged: number;
  selectedDate: string;
  onAddMeal: () => void;
}) {
  const copy = routineStageCopy[livingState.routineStage];
  const waterProgress = Math.min(waterOunces / 64, 1);
  const weekProgress = Math.min(livingState.signal.loggedDaysLast7 / 7, 1);
  const dateLabel = isToday(selectedDate) ? 'today' : formatShortDate(selectedDate);

  return (
    <View
      testID="living-rhythm-card"
      accessibilityLabel={`${copy.title}. ${mealsLogged} meals for ${dateLabel}, ${waterOunces} fluid ounces of water for ${dateLabel}, ${livingState.signal.loggedDaysLast7} days tracked this week.`}
      style={[styles.livingRhythmCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.livingRhythmHeader}>
        <View style={[styles.livingRhythmIcon, { backgroundColor: colors.accent }]}>
          <CaloraFeatureIcon name="rhythm" size={27} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.livingRhythmTitle, { color: colors.foreground }]}>{copy.title}</Text>
        </View>
        <View style={[styles.livingRhythmStage, { backgroundColor: colors.muted }]}>
          <Text style={[styles.livingRhythmStageText, { color: colors.mutedForeground }]}>{livingCategoryLabel[livingState.category]}</Text>
        </View>
      </View>
      <View style={styles.livingRhythmSignals}>
        <View style={styles.livingRhythmSignal}>
          <Text style={[styles.livingRhythmValue, { color: colors.foreground }]}>{mealsLogged}</Text>
          <Text style={[styles.livingRhythmLabel, { color: colors.mutedForeground }]}>meal slots</Text>
        </View>
        <View style={[styles.livingRhythmDivider, { backgroundColor: colors.border }]} />
        <View style={styles.livingRhythmSignal}>
          <Text style={[styles.livingRhythmValue, { color: colors.foreground }]}>{waterOunces}</Text>
          <Text style={[styles.livingRhythmLabel, { color: colors.mutedForeground }]}>fl oz water</Text>
        </View>
        <View style={[styles.livingRhythmDivider, { backgroundColor: colors.border }]} />
        <View style={styles.livingRhythmSignal}>
          <Text style={[styles.livingRhythmValue, { color: colors.foreground }]}>{livingState.signal.loggedDaysLast7}<Text style={styles.livingRhythmUnit}>/7</Text></Text>
          <Text style={[styles.livingRhythmLabel, { color: colors.mutedForeground }]}>days tracked</Text>
        </View>
      </View>
      <View style={styles.livingRhythmTracks}>
        <View style={styles.livingRhythmTrackGroup}>
          <Text style={[styles.livingRhythmTrackLabel, { color: colors.mutedForeground }]}>water</Text>
          <View style={[styles.livingRhythmTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.livingRhythmFill, { backgroundColor: colors.primary, width: `${waterProgress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.livingRhythmTrackGroup}>
          <Text style={[styles.livingRhythmTrackLabel, { color: colors.mutedForeground }]}>week</Text>
          <View style={[styles.livingRhythmTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.livingRhythmFill, { backgroundColor: colors.success, width: `${weekProgress * 100}%` }]} />
          </View>
        </View>
      </View>
      <ScalePressable
        accessibilityLabel="Add a meal from your rhythm card"
        testID="living-rhythm-add-meal-button"
        onPress={onAddMeal}
        haptic="none"
        scale={0.96}
        style={[styles.livingRhythmAddMealAction, { backgroundColor: colors.accent }]}
      >
        <Feather name="plus" size={13} color={colors.accentForeground} />
        <Text style={[styles.wellnessActionText, { color: colors.accentForeground }]}>Add meal</Text>
      </ScalePressable>
    </View>
  );
}

function RecipeSwipeWidget({ colors, onOpen, onViewAll }: { colors: ReturnType<typeof useCalora>['colors']; onOpen: (recipe: Recipe) => void; onViewAll: () => void }) {
  const { savedRecipeIds, toggleSavedRecipe } = useCalora();
  const { width } = useWindowDimensions();
  const referenceColors = supportingWidgetColors(colors);
  const recipeCardIsDark = colors.background === '#101916';
  const recipeCardSurface = recipeCardIsDark ? '#0b2b21' : '#f7f8f3';
  const recipeCardTitleColor = recipeCardIsDark ? referenceColors.foreground : '#26312b';
  const recipeCardMetaColor = recipeCardIsDark ? referenceColors.mutedForeground : '#52605a';
  const recipeCardArrowColor = recipeCardIsDark ? referenceColors.orange : '#41554a';
  const { data, isLoading, isError, isFetching, refetch } = useListRecipes({ limit: 6, offset: 0 }, { query: { queryKey: ['dashboard-recipes'], staleTime: 1000 * 60 * 10, refetchInterval: (query) => (query.state.data as ({ warmupPending?: boolean } | undefined))?.warmupPending ? 15_000 : false } });
  const recipes = data?.recipes ?? [];
  const carouselRef = React.useRef<FlatList<Recipe>>(null);
  const autoScrollFrameRef = React.useRef<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState(0);
  const [carouselInteractionActive, setCarouselInteractionActive] = useState(false);
  // Keep several previews visible on ordinary phones while retaining a safe
  // minimum for very narrow screens and larger accessibility text.
  const pageWidth = Math.max(110, Math.min(140, (width - 70) / 3));
  const stopCarouselAnimation = () => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  };
  const snapToRecipe = (nextIndex: number) => {
    stopCarouselAnimation();
    const next = Math.max(0, Math.min(nextIndex, recipes.length - 1));
    setActiveRecipe(next);
    carouselRef.current?.scrollToIndex({ index: next, animated: true });
  };
  const smoothlyAdvanceToRecipe = (nextIndex: number) => {
    const next = Math.max(0, Math.min(nextIndex, recipes.length - 1));
    if (next === activeRecipe) return;
    if (next === 0 && activeRecipe === recipes.length - 1) {
      snapToRecipe(0);
      return;
    }
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
    }
    const fromOffset = activeRecipe * pageWidth;
    const toOffset = next * pageWidth;
    const startedAt = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      carouselRef.current?.scrollToOffset({ offset: fromOffset + (toOffset - fromOffset) * eased, animated: false });
      if (progress < 1) {
        autoScrollFrameRef.current = requestAnimationFrame(animate);
      } else {
        autoScrollFrameRef.current = null;
        setActiveRecipe(next);
      }
    };
    autoScrollFrameRef.current = requestAnimationFrame(animate);
  };
  useEffect(() => () => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
    }
  }, []);
  useEffect(() => {
    if (recipes.length <= 1 || carouselInteractionActive) return;
    const timer = setTimeout(() => {
      smoothlyAdvanceToRecipe(activeRecipe >= recipes.length - 1 ? 0 : activeRecipe + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeRecipe, carouselInteractionActive, recipes.length]);

  return (
    <View style={[styles.recipeWidget, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }]}>
      <View style={styles.recipeWidgetHeader}>
          <View style={styles.recipeWidgetTitleRow}>
            <CaloraFeatureIcon name="restaurant" size={27} primaryColor={referenceColors.orange} accentColor={referenceColors.orange} foregroundColor={referenceColors.orange} highlightColor={referenceColors.foreground} />
            <View style={styles.recipeWidgetHeadingCopy}>
              <Text style={[styles.recipeWidgetTitleHeading, { color: referenceColors.foreground }]}>Recipes for you</Text>
            </View>
          </View>
          <ScalePressable accessibilityRole="button" accessibilityLabel="View all recipes" onPress={onViewAll} scale={0.96} haptic="none" style={styles.recipeWidgetViewAll}>
            <Text style={[styles.recipeWidgetViewAllText, { color: referenceColors.orange }]}>View all</Text>
            <Feather name="chevron-right" size={16} color={referenceColors.foreground} />
          </ScalePressable>
        <View style={styles.recipeWidgetHeaderActions}>
          {recipes.length > 1 && <View style={styles.recipeWidgetNav}>
            <ScalePressable accessibilityLabel="Previous dashboard recipe" onPress={() => snapToRecipe(activeRecipe - 1)} scale={0.95} haptic="none" style={[styles.recipeWidgetNavButton, { backgroundColor: referenceColors.muted }]}><Feather name="chevron-left" size={15} color={referenceColors.foreground} /></ScalePressable>
            <ScalePressable accessibilityLabel="Next dashboard recipe" onPress={() => snapToRecipe(activeRecipe + 1)} scale={0.95} haptic="none" style={[styles.recipeWidgetNavButton, { backgroundColor: referenceColors.muted }]}><Feather name="chevron-right" size={15} color={referenceColors.foreground} /></ScalePressable>
          </View>}
        </View>
      </View>
      {isLoading ? (
        <View style={styles.recipeWidgetLoading}><ActivityIndicator color={referenceColors.green} /><Text style={[styles.loadingText, { color: referenceColors.mutedForeground }]}>Finding recipes…</Text></View>
      ) : isError ? (
        <View accessible accessibilityRole="alert" accessibilityLabel="Recipes could not be loaded" style={styles.recipeWidgetLoading}>
          <Text style={[styles.loadingText, { color: referenceColors.mutedForeground }]}>Recipes are unavailable right now.</Text>
          <ScalePressable accessibilityLabel="Retry dashboard recipes" accessibilityState={{ busy: isFetching }} disabled={isFetching} onPress={() => { void refetch(); }} haptic="none" style={[styles.recipeWidgetRetry, { borderColor: referenceColors.border, opacity: isFetching ? 0.65 : 1 }]}>
            <Feather name="refresh-cw" size={14} color={referenceColors.foreground} />
            <Text style={[styles.recipeWidgetRetryText, { color: referenceColors.foreground }]}>{isFetching ? 'Retrying…' : 'Retry recipes'}</Text>
          </ScalePressable>
        </View>
      ) : recipes.length === 0 ? (
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel="No recipe suggestions are available" style={styles.recipeWidgetLoading}>
          <Text style={[styles.loadingText, { color: referenceColors.mutedForeground }]}>No recipe suggestions are available yet.</Text>
        </View>
      ) : (
        <FlatList
          ref={carouselRef}
          data={recipes}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          directionalLockEnabled
          nestedScrollEnabled
          snapToInterval={pageWidth}
          snapToAlignment="start"
          keyExtractor={(recipe) => recipe.id}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          onScrollBeginDrag={() => {
            stopCarouselAnimation();
            setCarouselInteractionActive(true);
          }}
          onMomentumScrollBegin={() => setCarouselInteractionActive(true)}
          onMomentumScrollEnd={(event) => {
            const next = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.x / pageWidth), recipes.length - 1));
            setActiveRecipe(next);
            setCarouselInteractionActive(false);
          }}
          onScrollEndDrag={(event) => {
            if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.05) {
              const next = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.x / pageWidth), recipes.length - 1));
              setActiveRecipe(next);
              setCarouselInteractionActive(false);
            }
          }}
          renderItem={({ item: recipe }) => (
            <View style={[styles.recipeWidgetCard, { width: pageWidth, backgroundColor: recipeCardSurface, borderColor: referenceColors.border }] }>
              {normalizeFoodImageUrl(recipe.image) ? <Image source={{ uri: normalizeFoodImageUrl(recipe.image) }} style={styles.recipeWidgetImage} resizeMode="cover" /> : <View style={[styles.recipeWidgetImageUnavailable, { backgroundColor: referenceColors.accent }]}><Feather name="image" size={24} color={referenceColors.accentForeground} /></View>}
              <View style={styles.recipeWidgetTopActions}>
                <ScalePressable accessibilityRole="button" accessibilityLabel={`${savedRecipeIds.includes(recipe.id) ? 'Remove' : 'Save'} recipe ${recipe.name}`} onPress={() => toggleSavedRecipe(recipe.id)} scale={0.94} haptic="none" style={[styles.recipeWidgetSaveButton, { backgroundColor: referenceColors.muted }]}>
                  <Feather name="heart" size={17} color={referenceColors.orange} />
                </ScalePressable>
              </View>
              <View style={styles.recipeWidgetCopy}>
                <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.recipeWidgetTitle, { color: recipeCardTitleColor }]}>{recipe.name}</Text>
                <View style={styles.recipeWidgetFooter}>
                  <Text style={[styles.recipeWidgetMeta, { color: recipeCardMetaColor }]}>{recipe.calories ? `${Math.round(recipe.calories)} kcal` : 'Nutrition review needed'}{recipe.prepMinutes ? ` · ${recipe.prepMinutes} min` : ''}</Text>
                  <ScalePressable accessibilityLabel={`View recipe details for ${recipe.name}`} onPress={() => onOpen(recipe)} scale={0.98} haptic="none" style={styles.recipeWidgetAction}>
                    <Feather name="chevron-right" size={14} color={recipeCardArrowColor} />
                  </ScalePressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const moodOptions: Array<{ value: Mood; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { value: 'energized', label: 'Energized', icon: 'sun' },
  { value: 'good', label: 'Good', icon: 'smile' },
  { value: 'okay', label: 'Okay', icon: 'minus-circle' },
  { value: 'low', label: 'Low', icon: 'cloud' },
  { value: 'stressed', label: 'Stressed', icon: 'activity' },
];

const waterQuickAmounts = [8] as const;

export function WaterCard({
  colors,
  waterOunces,
  waterConfirmed,
  waterConfirmedAmount,
  onAddWater,
  onSubtractWater,
  onOpenHydration,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  waterOunces: number;
  waterConfirmed: boolean;
  waterConfirmedAmount: number | null;
  onAddWater: (ounces: number) => void;
  onSubtractWater: () => void;
  onOpenHydration: () => void;
}) {
  const waterGoal = 64;
  const normalizedWater = Math.max(0, waterOunces);
  const filledGlasses = Math.min(Math.ceil(normalizedWater / 8), waterGoal / 8);
  const cupsLogged = Math.floor(normalizedWater / 8);

  return (
    <View style={styles.wellnessSection} accessibilityLabel={`Water tracking: ${normalizedWater} fluid ounces, ${cupsLogged} cups logged`}>
      <View style={[styles.wellnessCard, { flex: 0, width: '100%', minHeight: HYDRATION_WIDGET_HEIGHT * TODAY_WIDGET_HEIGHT_SCALE * WATER_WIDGET_HEIGHT_SCALE, backgroundColor: colors.card, borderColor: colors.border }]}>
        <View pointerEvents="none" style={styles.waterFoodAccent}>
          <Image source={FOOD_WIDGET_ART.water} resizeMode="cover" style={styles.waterFoodAccentImage} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Hydration" onPress={onOpenHydration} style={styles.wellnessCardHeader}>
          <View style={[styles.wellnessIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="water" size={26} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /></View>
          <Text style={[styles.wellnessCardTitle, { color: colors.foreground, flex: 1 }]}>Water</Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Hydration details" onPress={onOpenHydration} style={styles.waterSummary}>
          <Text style={[styles.wellnessValue, { color: colors.foreground }]}>{normalizedWater} <Text style={[styles.wellnessUnit, { color: colors.mutedForeground }]}>/ {waterGoal} fl oz</Text></Text>
          <Text style={[styles.waterCupsLogged, { color: colors.mutedForeground }]}>{cupsLogged} cups logged</Text>
        </Pressable>
        <View style={styles.waterSlots}>
          {Array.from({ length: 8 }, (_, index) => (
            <AnimatedWaterSlot key={index} filled={index < filledGlasses} muted={colors.muted} />
          ))}
        </View>
        <View style={styles.waterAdjustActions}>
          <View style={styles.waterQuickActions}>
            {waterQuickAmounts.map((ounces) => (
              <ScalePressable
                key={ounces}
                accessibilityLabel={waterConfirmed && waterConfirmedAmount === ounces ? 'Water added' : `Add ${ounces} fluid ounces of water`}
                testID={ounces === 8 ? 'log-water-button' : `log-water-${ounces}-button`}
                disabled={waterConfirmed}
                onPress={() => onAddWater(ounces)}
                haptic="none"
                scale={0.96}
                style={[styles.waterAdjustButton, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: waterConfirmed ? 0.72 : 1 }]}
              >
                <Feather name={waterConfirmed && waterConfirmedAmount === ounces ? 'check' : 'plus'} size={15} color={colors.accentForeground} />
                <Text style={[styles.wellnessActionText, { color: colors.accentForeground }]}>{waterConfirmed && waterConfirmedAmount === ounces ? 'Added ✓' : `${ounces} fl oz`}</Text>
              </ScalePressable>
            ))}
          <ScalePressable
            accessibilityLabel={normalizedWater > 0 ? 'Subtract 8 fluid ounces of water' : 'Subtract water disabled at zero'}
            testID="subtract-water-button"
            disabled={normalizedWater === 0}
            onPress={onSubtractWater}
            haptic="none"
            scale={0.96}
            style={[styles.waterAdjustButton, { backgroundColor: colors.muted, borderColor: colors.border, opacity: normalizedWater === 0 ? 0.45 : 1 }]}
          >
            <Feather name="minus" size={15} color={colors.foreground} />
            <Text style={[styles.wellnessActionText, { color: colors.foreground }]}>8 fl oz</Text>
          </ScalePressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function stepStatusCopy(
  tracking: LiveStepTrackingState,
  hasDailyProviderTotal: boolean,
  hasReadyHealthConnection: boolean,
  needsStepsAccess: boolean,
  healthStepsProvider: string,
): string {
  if (Platform.OS === 'web') {
    return 'Live device steps are available in the Calora mobile app';
  }
  if (isLiveSessionOnly(tracking)) {
    const healthMessage = needsStepsAccess
      ? 'update Health access for today’s total'
      : hasReadyHealthConnection
        ? `no ${healthStepsProvider} Steps recorded today`
        : 'connect Health for today’s total';
    return tracking.status === 'live'
      ? `Live since opened — ${healthMessage}`
      : `Session steps since opened — ${healthMessage}`;
  }
  if (tracking.status === 'live') return 'Live';
  if (tracking.status === 'syncing') return 'Syncing steps…';
  if (tracking.status === 'permission-required') return 'Enable motion access for live steps';
  if (tracking.status === 'denied') return 'Motion access is off';
  if (tracking.status === 'unavailable') {
    if (hasDailyProviderTotal) return 'Updated from Health';
    return hasReadyHealthConnection ? `No ${healthStepsProvider} Steps recorded today` : 'Connect Health for today’s total';
  }
  if (tracking.status === 'error') return 'Unable to refresh live steps';
  if (tracking.status === 'health-only') return 'Updated from Health';
  if (!hasDailyProviderTotal) {
    return hasReadyHealthConnection ? `No ${healthStepsProvider} Steps recorded today` : 'Connect Health for today’s total';
  }
  return tracking.updatedAt ? 'Updated just now' : 'Preparing steps…';
}

const STEPS_RING_SIZE = 150 * TODAY_WIDGET_HEIGHT_SCALE;
const STEPS_RING_STROKE = 10;
const STEPS_RING_RADIUS = (STEPS_RING_SIZE - STEPS_RING_STROKE) / 2;
const STEPS_RING_LENGTH = 2 * Math.PI * STEPS_RING_RADIUS;

function StepProgressRing({
  steps,
  dailyStepGoal,
  progress,
  colors,
  accessibilitySummary,
  compact = false,
  ringSizeOverride,
}: {
  steps: number | null;
  dailyStepGoal: number;
  progress: number;
  colors: ReturnType<typeof useCalora>['colors'];
  accessibilitySummary: string;
  compact?: boolean;
  ringSizeOverride?: number;
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const ringSize = ringSizeOverride ?? (compact ? (viewportWidth < 400 ? 80 : 90) : STEPS_RING_SIZE);
  const ringRadius = (ringSize - STEPS_RING_STROKE) / 2;
  const ringLength = 2 * Math.PI * ringRadius;
  const dashOffset = useSharedValue(ringLength);
  const scale = useSharedValue(1);
  const previousSteps = useRef<number | null>(steps);

  useEffect(() => {
    dashOffset.value = withTiming(ringLength * (1 - progress), {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [dashOffset, progress, ringLength]);

  useEffect(() => {
    if (steps !== null && previousSteps.current !== null && steps > previousSteps.current) {
      scale.value = withSequence(
        withTiming(1.025, { duration: 110, reduceMotion: ReduceMotion.System }),
        withSpring(1, { damping: 13, stiffness: 230, reduceMotion: ReduceMotion.System }),
      );
    }
    previousSteps.current = steps;
  }, [scale, steps]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilitySummary}
      testID="dashboard-steps-value"
      style={[styles.stepsRing, compact && { width: ringSize, height: ringSize }, ringStyle]}
    >
      <Svg testID="dashboard-steps-ring" width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          stroke={colors.muted}
          strokeWidth={STEPS_RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          animatedProps={ringProps}
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={ringRadius}
          stroke={colors.primary}
          strokeWidth={STEPS_RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ringLength}
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
        />
      </Svg>
      <View pointerEvents="none" accessible={false} style={[styles.stepsRingCopy, ringSizeOverride !== undefined && { left: 8, right: 8 }]}>
        {compact ? (
              <CaloraFeatureIcon name="steps" size={compact && viewportWidth < 400 ? 25 : 31} primaryColor={colors.primary} accentColor={colors.success} foregroundColor={colors.foreground} highlightColor={colors.primaryForeground} />
        ) : (
          <>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.stepsRingValue, { color: colors.foreground }]}>
              {steps === null ? '—' : formatWhole(steps)}
            </Text>
            <Text style={[styles.stepsRingLabel, { color: colors.mutedForeground }]}>steps</Text>
            <Text style={[styles.stepsRingGoal, { color: colors.mutedForeground }]}>of {formatWhole(dailyStepGoal)}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function StepsTodayCard({
  expanded = false,
  colors,
  tracking,
  dailyStepGoal,
  healthConnection,
  onEnableLiveSteps,
  onRetryLiveSteps,
  onOpenMotionSettings,
  onOpenHealth,
  onOpenSteps,
  milestone,
  onDismissMilestone,
}: {
  expanded?: boolean;
  colors: ReturnType<typeof useCalora>['colors'];
  tracking: LiveStepTrackingState;
  dailyStepGoal: number;
  healthConnection: ReturnType<typeof useCalora>['healthConnection'];
  onEnableLiveSteps: () => void;
  onRetryLiveSteps: () => void;
  onOpenMotionSettings: () => void;
  onOpenHealth: () => void;
  onOpenSteps: () => void;
  milestone: number | null;
  onDismissMilestone: (milestone: number) => void;
}) {
  const referenceColors = supportingWidgetColors(colors);
  const steps = tracking.displayedSteps;
  const progress = steps === null ? 0 : Math.min(steps / dailyStepGoal, 1);
  const sessionOnly = isLiveSessionOnly(tracking);
  const hasDailyProviderTotal = tracking.providerSteps !== null;
  const needsStepsAccess = healthConnection.provider === 'health-connect'
    && healthConnection.authorization === 'partial'
    && !healthConnection.granted.includes('steps');
  const hasReadyHealthConnection = healthConnection.authorization === 'requested'
    || healthConnection.authorization === 'authorized'
    || healthConnection.authorization === 'partial';
  const healthStepsProvider = healthConnection.provider === 'health-connect' ? 'Health Connect' : 'Health';
  const status = stepStatusCopy(
    tracking,
    hasDailyProviderTotal,
    hasReadyHealthConnection,
    needsStepsAccess,
    healthStepsProvider,
  );
  const needsMotionSettings = tracking.status === 'denied';
  const needsMotionAccess = tracking.status === 'permission-required';
  const needsRetry = tracking.status === 'error';
  const needsDailyStepTotal = !hasDailyProviderTotal && (tracking.status !== 'live' || sessionOnly);
  const actionLabel = Platform.OS === 'web'
    ? 'Connect Health'
    : needsMotionSettings
    ? 'Open motion settings'
    : needsMotionAccess
    ? 'Enable live steps'
    : needsRetry
      ? 'Retry live steps'
    : needsDailyStepTotal
      ? needsStepsAccess
        ? 'Update Health access'
        : hasReadyHealthConnection
          ? 'Sync Health'
          : 'Connect Health'
      : null;
  const onPress = Platform.OS === 'web'
    ? onOpenHealth
    : needsMotionSettings
    ? onOpenMotionSettings
    : needsMotionAccess
      ? onEnableLiveSteps
      : needsRetry
        ? onRetryLiveSteps
      : needsDailyStepTotal
        ? needsStepsAccess || !hasReadyHealthConnection
          ? onOpenHealth
          : onRetryLiveSteps
        : undefined;
  const accessibilityPrefix = sessionOnly
    ? tracking.status === 'live'
      ? 'Live session steps since Calora opened'
      : 'Session steps since Calora opened'
    : 'Steps today';
  const accessibilitySummary = `${accessibilityPrefix}: ${steps === null ? 'unavailable' : formatWhole(steps)} of ${formatWhole(dailyStepGoal)}. ${status}.`;
  if (Platform.OS === 'android') {
    return (
      <AndroidStepsCard expanded={expanded} colors={referenceColors} steps={steps} goal={dailyStepGoal} progress={progress} status={status} live={tracking.status === 'live'} sessionOnly={sessionOnly} accessibilitySummary={accessibilitySummary} actionLabel={actionLabel} onAction={onPress} onOpenSteps={onOpenSteps}>
        {milestone !== null ? <StepMilestoneCelebration milestone={milestone} colors={referenceColors} onDismiss={() => onDismissMilestone(milestone)} /> : null}
      </AndroidStepsCard>
    );
  }
  if (expanded) {
    return (
      <View testID="dashboard-steps-card-expanded" style={[styles.dashboardHydrationFrame, styles.stepsExpandedCard, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }]}>
        <View style={styles.stepsExpandedHeader}>
          <View style={styles.stepsExpandedHeaderGroup}>
            <View style={[styles.stepsIcon, { backgroundColor: referenceColors.accent }]}><Feather name="activity" size={20} color={referenceColors.accentForeground} /></View>
            <Text accessibilityRole="header" style={[styles.stepsCardTitle, { color: referenceColors.foreground }]}>Steps today</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Steps" onPress={onOpenSteps} style={styles.stepsExpandedHeaderAction}>
            <Feather name="chevron-right" size={18} color={referenceColors.foreground} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Steps" onPress={onOpenSteps} style={styles.stepsExpandedBody}>
          <StepProgressRing steps={steps} dailyStepGoal={dailyStepGoal} progress={progress} colors={referenceColors} accessibilitySummary={accessibilitySummary} ringSizeOverride={160} />
          <View style={styles.stepsExpandedSummary}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} testID="dashboard-steps-status" style={[styles.stepsExpandedStatus, { color: tracking.status === 'live' ? referenceColors.success : referenceColors.mutedForeground }]}>{status}</Text>
          </View>
        </Pressable>
        {milestone !== null && <StepMilestoneCelebration milestone={milestone} colors={referenceColors} onDismiss={() => onDismissMilestone(milestone)} />}
        {actionLabel && onPress && <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} testID="dashboard-steps-action" onPress={onPress} style={[styles.stepsAction, styles.stepsExpandedAction, { backgroundColor: referenceColors.muted, borderColor: referenceColors.border }]}><Text style={[styles.stepsActionText, { color: referenceColors.primary }]}>{actionLabel}</Text><Feather name="chevron-right" size={11} color={referenceColors.primary} /></Pressable>}
      </View>
    );
  }

  return (
    <View
      testID="dashboard-steps-card"
      style={[styles.stepsCard, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Open Steps" onPress={onOpenSteps} style={styles.stepsCardBody}>
        <StepProgressRing
          steps={steps}
          dailyStepGoal={dailyStepGoal}
          progress={progress}
          colors={referenceColors}
          accessibilitySummary={accessibilitySummary}
          compact
        />
        <View style={styles.stepsSummary}>
          <Text accessibilityRole="header" style={[styles.stepsCardTitle, { color: referenceColors.foreground }]}>Steps</Text>
          <Text style={[styles.stepsSummaryValue, { color: referenceColors.foreground }]}>{steps === null ? '—' : formatWhole(steps)} <Text style={[styles.stepsSummaryGoal, { color: referenceColors.mutedForeground }]}>/ {formatWhole(dailyStepGoal)}</Text></Text>
          <Text testID="dashboard-steps-status" style={[styles.stepsSummaryLabel, { color: tracking.status === 'live' ? referenceColors.green : referenceColors.mutedForeground }]}>{tracking.status === 'live' ? 'Live steps' : 'Steps today'}</Text>
        </View>
        <View pointerEvents="none" style={styles.stepsBodyArrow}>
          <Feather name="chevron-right" size={18} color={referenceColors.foreground} />
        </View>
      </Pressable>
      {milestone !== null && (
        <StepMilestoneCelebration
          milestone={milestone}
          colors={referenceColors}
          onDismiss={() => onDismissMilestone(milestone)}
        />
      )}
      {actionLabel && onPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          testID="dashboard-steps-action"
          onPress={onPress}
          style={[styles.stepsAction, { backgroundColor: referenceColors.pill, borderColor: referenceColors.border }]}
        >
          <CaloraFeatureIcon name="mood" size={22} primaryColor={referenceColors.orange} accentColor={referenceColors.orange} foregroundColor={referenceColors.foreground} highlightColor={referenceColors.foreground} />
          <Text style={[styles.stepsActionText, { color: referenceColors.foreground }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function MoodCard({
  compact,
  expanded = false,
  colors,
  mood,
  onMood,
}: {
  compact?: boolean;
  expanded?: boolean;
  colors: ReturnType<typeof useCalora>['colors'];
  mood?: Mood;
  onMood: (mood: Mood) => void;
}) {
  const referenceColors = supportingWidgetColors(colors);
  const { width: viewportWidth } = useWindowDimensions();
  const narrowCompact = compact && viewportWidth < 400;
  return (
    <View style={[expanded && styles.dashboardHydrationFrame, expanded ? styles.moodExpandedCard : styles.moodCard, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }] }>
      <View style={styles.moodHeading}>
        <View style={[styles.wellnessIcon, { backgroundColor: referenceColors.orange }]}><CaloraFeatureIcon name="mood" size={26} primaryColor={referenceColors.orange} accentColor={referenceColors.orange} foregroundColor={referenceColors.foreground} highlightColor={referenceColors.foreground} /></View>
        <Text numberOfLines={narrowCompact ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.moodHeadingTitle, narrowCompact && { fontSize: 10, lineHeight: 11 }, { color: referenceColors.foreground }]}>How are you feeling?</Text>
      </View>
      <View style={[styles.moodOptions, compact && styles.moodOptionsCompact, expanded && styles.moodOptionsExpanded]}>
        {moodOptions.map((item) => {
          const selected = mood === item.value;
          return (
            <ScalePressable key={item.value} accessibilityLabel={`Log mood ${item.label}`} testID={`mood-${item.value}`} onPress={() => onMood(item.value)} scale={0.98} haptic="none" style={[styles.moodOption, compact && styles.moodOptionCompact, expanded && styles.moodOptionExpanded, narrowCompact && { minHeight: 32, gap: 1 }, { backgroundColor: selected ? referenceColors.green : referenceColors.surface, borderColor: selected ? referenceColors.green : referenceColors.border }]}>
              <Feather name={item.icon} size={compact ? 17 : expanded ? 18 : 15} color={selected ? referenceColors.primaryForeground : referenceColors.mutedForeground} />
              <Text adjustsFontSizeToFit={!compact} numberOfLines={1} minimumFontScale={0.74} style={[styles.moodOptionText, compact && { fontSize: 7.4, lineHeight: 8.6, letterSpacing: -0.32 }, { color: selected ? referenceColors.primaryForeground : referenceColors.mutedForeground }]}>{item.label}</Text>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
}

function MacroBalanceDonut({
  colors,
  protein,
  carbs,
  fat,
  targets,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  protein: number;
  carbs: number;
  fat: number;
  targets: Pick<MacroTargets, 'protein' | 'carbs' | 'fat'>;
}) {
  const referenceColors = supportingWidgetColors(colors);
  const { width: viewportWidth } = useWindowDimensions();
  const narrowCompact = viewportWidth < 400;
  const size = narrowCompact ? 58 : 70;
  const stroke = narrowCompact ? 9 : 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const values = [
    { label: 'Protein', value: protein, target: targets.protein, color: referenceColors.green },
    { label: 'Carbs', value: carbs, target: targets.carbs, color: referenceColors.blue },
    { label: 'Fat', value: fat, target: targets.fat, color: referenceColors.orange },
  ];
  const weights = values.map(({ value, target }) => Math.max(value / Math.max(target, 1), 0));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let offset = 0;

  return (
    <View style={styles.macroDonutLayout} accessible accessibilityRole="summary" accessibilityLabel={`Macro balance: ${formatQuantity(protein)} grams protein, ${formatQuantity(carbs)} grams carbs, and ${formatQuantity(fat)} grams fat.`}>
      <View style={[styles.macroDonutWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={referenceColors.track} strokeWidth={stroke} fill="none" />
          {values.map((item, index) => {
            const share = totalWeight > 0 ? weights[index] / totalWeight : 1 / values.length;
            const segment = circumference * share;
            const dashOffset = -offset;
            offset += segment;
            return <Circle key={item.label} cx={size / 2} cy={size / 2} r={radius} stroke={item.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" strokeDasharray={`${segment} ${circumference - segment}`} strokeDashoffset={dashOffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          })}
        </Svg>
        <View pointerEvents="none" style={styles.macroDonutCenter}>
          <Text style={[styles.macroDonutCenterTitle, narrowCompact && { fontSize: 7.5 }, { color: referenceColors.foreground }]}>Macros</Text>
          <Text style={[styles.macroDonutCenterSubtitle, narrowCompact && { fontSize: 6.2 }, { color: referenceColors.mutedForeground }]}>Balance</Text>
        </View>
      </View>
      <View style={styles.macroLegend}>
        {values.map((item) => (
          <View key={item.label} style={styles.macroLegendRow}>
            <View style={[styles.macroLegendDot, { backgroundColor: item.color }]} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.macroLegendLabel, narrowCompact && { width: 34, fontSize: 8.6, letterSpacing: -0.35 }, { color: referenceColors.foreground }]}>{item.label}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6} testID={`macro-target-${item.label.toLowerCase()}`} style={[styles.macroLegendValue, narrowCompact && { fontSize: 8.1, letterSpacing: -0.45 }, { color: referenceColors.mutedForeground }]}>{formatQuantity(item.value)} / {formatQuantity(item.target)}g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AnimatedMacroBar({ label, value, target, color, colors, expanded = false }: { label: string; value: number; target: number; color: string; colors: ReturnType<typeof useCalora>['colors']; expanded?: boolean }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  useEffect(() => {
    if (trackWidth > 0) {
      fillWidth.value = withTiming((pct / 100) * trackWidth, { duration: 700, easing: Easing.out(Easing.cubic) });
    }
  }, [pct, trackWidth, fillWidth]);
  const animStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${formatQuantity(value)} grams consumed of ${formatQuantity(target)} gram target.`}
      style={expanded ? styles.macroBlockExpanded : styles.macroBlock}
    >
      <View style={[styles.macroHeader, expanded && styles.macroHeaderExpanded]}>
        <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text testID={`macro-target-${label.toLowerCase()}`} style={[styles.macroValue, { color: colors.foreground }]}>{formatQuantity(value)}g <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>/ {formatQuantity(target)}g</Text></Text>
      </View>
      <View style={[styles.macroTrack, expanded && styles.macroTrackExpanded, { backgroundColor: colors.muted }]} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.macroFill, { backgroundColor: color }, animStyle]} />
      </View>
    </View>
  );
}

function AnimatedWaterSlot({ filled, muted }: { filled: boolean; muted: string }) {
  const scale = useSharedValue(filled ? 1 : 0.7);
  const prevFilled = useRef(filled);
  useEffect(() => {
    if (filled && !prevFilled.current) {
      scale.value = 0.3;
      scale.value = withSpring(1, { damping: 10, stiffness: 380 });
    } else if (!filled && prevFilled.current) {
      scale.value = withTiming(0.7, { duration: 200 });
    }
    prevFilled.current = filled;
  }, [filled, scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const cupStroke = filled ? '#6f9fe0' : muted;
  const cupFill = filled ? '#8db8ed' : 'transparent';
  return (
    <Animated.View style={[styles.waterSlot, animStyle]}>
        <Svg width={WATER_CUP_WIDTH} height={WATER_CUP_HEIGHT} viewBox="0 0 24 28">
        <Path d="M4 5h16l-1.5 18H5.5L4 5Z" fill={cupFill} stroke={cupStroke} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M3 4h18" stroke={cupStroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M7 13h10l-.8 8H7.8L7 13Z" fill={filled ? '#b9d7ff' : 'transparent'} opacity={0.72} />
      </Svg>
    </Animated.View>
  );
}

function MealRow({ log, colors, onEdit, onSave }: { log: FoodLog; colors: ReturnType<typeof useCalora>['colors']; onEdit: () => void; onSave: () => void }) {
  const recordedAt = log.syncUpdatedAt ?? log.nutritionSnapshot?.capturedAt;
  const displayedTime = log.time === 'Just now' && recordedAt
    ? formatLogTime(new Date(recordedAt))
    : log.time;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ScalePressable accessibilityLabel={`Edit ${log.name}`} onPress={onEdit} scale={0.98} haptic="none" style={[styles.mealRow, { flex: 1, borderBottomColor: colors.border }]}>
        <FoodLogThumbnail log={log} size={44} borderRadius={14} />
        <View style={styles.mealInfo}>
          <Text style={[styles.mealName, { color: colors.foreground }]} numberOfLines={1}>{log.name}</Text>
          <View style={styles.mealMeta}>
            <Text style={[styles.mealType, { color: colors.mutedForeground }]}>{displayedTime}</Text>
          </View>
        </View>
        <Text style={[styles.mealCalories, { color: colors.foreground }]}>{formatWhole(log.calories)}</Text>
        <Text style={[styles.kcalLabel, { color: colors.mutedForeground }]}>kcal</Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </ScalePressable>
      <ScalePressable
        accessibilityRole="button"
        accessibilityLabel={`Save ${log.name} as meal`}
        onPress={onSave}
        scale={0.94}
        haptic="none"
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
      >
        <Feather name="coffee" size={17} color={colors.primary} />
      </ScalePressable>
    </View>
  );
}

type MacroGoalKey = keyof MacroGoalInput;
type MacroGoalDraft = MacroGoalInput;

const macroGoalFields: Array<{ key: MacroGoalKey; label: string; unit: string; placeholder: string }> = [
  { key: 'calories', label: 'Calories', unit: 'kcal / day', placeholder: '2000' },
  { key: 'protein', label: 'Protein', unit: 'g / day', placeholder: '130' },
  { key: 'carbs', label: 'Carbs', unit: 'g / day', placeholder: '220' },
  { key: 'fat', label: 'Fat', unit: 'g / day', placeholder: '67' },
];

function MacroGoalsModal({
  visible,
  draft,
  colors,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  draft: MacroGoalDraft | null;
  colors: ReturnType<typeof useCalora>['colors'];
  onChange: (draft: MacroGoalDraft) => void;
  onClose: () => void;
  onSave: (values: MacroTargets) => void;
}) {
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && error) {
      // iOS does not implement accessibilityLiveRegion. Queue the explicit
      // announcement behind the save-control feedback so VoiceOver does not
      // lose the error while focus remains in the editor.
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibilityWithOptions(error, { queue: true });
      }
    }
  }, [error, visible]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSave = () => {
    if (!draft) return;
    const result = validateMacroGoalInput(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    onSave(result.values);
    setError('');
  };

  return (
    <BottomSheet visible={visible} onRequestClose={handleClose} sheetStyle={[styles.modalCard, { backgroundColor: colors.background }]}>
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.macroGoalScrollContent}
            bottomOffset={80}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeading}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nutrition goals</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Set the daily targets used in Macro balance.</Text>
              </View>
              <ScalePressable accessibilityLabel="Close nutrition goals" onPress={handleClose} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={18} color={colors.foreground} />
              </ScalePressable>
            </View>

            <View style={[styles.macroGoalIntro, { backgroundColor: colors.muted }]}>
              <Feather name="sliders" size={17} color={colors.primary} />
              <Text style={[styles.macroGoalIntroText, { color: colors.mutedForeground }]}>These targets are independent. They do not need to add up to the calorie target.</Text>
            </View>

            <View style={styles.macroGoalFields}>
              {macroGoalFields.map((field) => (
                <View key={field.key} style={styles.macroGoalField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                  <View style={[styles.macroGoalInputWrap, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.input }]}>
                    <TextInput
                      accessibilityLabel={`${field.label} goal`}
                      testID={`macro-goal-${field.key}`}
                      value={draft?.[field.key] ?? ''}
                      onChangeText={(value) => {
                        setError('');
                        if (draft) onChange({ ...draft, [field.key]: normalizeWholeNumberInput(value) });
                      }}
                      keyboardType="number-pad"
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.macroGoalInput, { color: colors.foreground }]}
                    />
                    <Text style={[styles.macroGoalUnit, { color: colors.mutedForeground }]}>{field.unit}</Text>
                  </View>
                </View>
              ))}
            </View>

            {!!error && (
              <Text
                accessibilityLiveRegion={Platform.OS === 'android' ? 'assertive' : 'none'}
                accessibilityRole="alert"
                style={[styles.macroGoalError, { color: colors.destructive }]}
              >
                {error}
              </Text>
            )}

            <ScalePressable accessibilityLabel="Save nutrition goals" testID="save-macro-goals" onPress={handleSave} scale={0.96} haptic="light" style={[styles.saveEntry, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveEntryText, { color: colors.primaryForeground }]}>Save goals</Text>
            </ScalePressable>
            <ScalePressable accessibilityLabel="Cancel nutrition goals" testID="cancel-macro-goals" onPress={handleClose} scale={0.98} haptic="none" style={styles.macroGoalCancel}>
              <Text style={[styles.macroGoalCancelText, { color: colors.primary }]}>Cancel</Text>
            </ScalePressable>
          </KeyboardAwareScrollViewCompat>
    </BottomSheet>
  );
}

function formatDiaryServingForEdit(log: FoodLog): string {
  const raw = log.serving?.trim() || '';
  const hasSelectedMetadata = log.servingQuantity != null && log.servingUnit;
  const staleReferenceLabel = /reference quantity/i.test(raw)
    && hasSelectedMetadata
    && (log.servingWeightG != null && log.servingWeightG !== 100 || log.servingQuantity !== 100);
  if (!staleReferenceLabel) return raw;
  const quantity = Number.isInteger(log.servingQuantity) ? String(log.servingQuantity) : String(log.servingQuantity);
  const unit = log.servingUnit!.toLowerCase();
  if ((unit === 'packet' || unit === 'sachet') && log.servingWeightG != null) {
    return `${quantity} ${unit}${Number(log.servingWeightG) > 0 ? ` (${log.servingWeightG} g)` : ''}`;
  }
  return `${quantity} ${unit}`;
}

function EditLogModal({ log, onClose }: { log: FoodLog | null; onClose: () => void }) {
  const { colors, updateLog, removeLog } = useCalora();
  const [name, setName] = useState(log?.name ?? '');
  const [calories, setCalories] = useState(log ? `${Math.round(log.calories)}` : '');
  const [meal, setMeal] = useState<MealType>(log?.meal ?? 'Snack');
  const [serving, setServing] = useState(log ? formatDiaryServingForEdit(log) : '1 serving');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!log) return;
    setName(log.name);
    setCalories(`${Math.round(log.calories)}`);
    setMeal(log.meal);
    setServing(formatDiaryServingForEdit(log));
    setError(null);
  }, [log]);

  const save = () => {
    if (!log) return;
    const nextCalories = parseWholeNumberInput(calories);
    if (!name.trim()) {
      setError('Add a food name before saving.');
      return;
    }
    if (nextCalories === null) {
      setError('Enter calories as zero or a positive whole number.');
      return;
    }
    updateLog(log.id, { name: name.trim(), calories: nextCalories, meal, serving });
    onClose();
  };

  return (
    <BottomSheet visible={log !== null} onRequestClose={onClose} sheetStyle={[styles.editCard, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        style={styles.sheetScroll}
        contentContainerStyle={styles.editSheetContent}
        bottomOffset={80}
      >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeading}>
            <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit entry</Text><Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Corrections update your trend.</Text></View>
            <ScalePressable accessibilityLabel="Close edit entry" onPress={onClose} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></ScalePressable>
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Food name</Text>
          <TextInput accessibilityLabel="Edited food name" value={name} onChangeText={(value) => { setName(value); if (error) setError(null); }} style={[styles.editInput, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.input, color: colors.foreground }]} />
          <View style={styles.editFields}>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Calories</Text><TextInput accessibilityLabel="Edited calories" value={calories} onChangeText={(value) => { setCalories(normalizeWholeNumberInput(value)); if (error) setError(null); }} keyboardType="number-pad" style={[styles.editInput, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.input, color: colors.foreground }]} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Serving</Text><TextInput value={serving} onChangeText={setServing} style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} /></View>
          </View>
          {error ? <Text accessibilityRole="alert" style={[styles.editError, { color: colors.destructive }]}>{error}</Text> : null}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>Meal</Text>
          <View style={styles.mealPicker}>{mealOrder.map((item) => <ScalePressable key={item} onPress={() => setMeal(item)} scale={0.95} haptic="none" style={[styles.mealChoice, { backgroundColor: meal === item ? colors.primary : colors.card, borderColor: meal === item ? colors.primary : colors.border }]}><Text style={[styles.mealChoiceText, { color: meal === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></ScalePressable>)}</View>
          <ScalePressable accessibilityLabel="Save edited entry" onPress={save} scale={0.96} haptic="light" style={[styles.saveEntry, { backgroundColor: colors.primary }]}><Text style={[styles.saveEntryText, { color: colors.primaryForeground }]}>Save changes</Text></ScalePressable>
          <ConfirmedDeletionControl
            key={log?.id ?? 'no-log'}
            itemName={name.trim() || log?.name || 'this entry'}
            onConfirm={async () => {
              if (!log) return false;
              const removed = await removeLog(log.id);
              if (removed) onClose();
              return removed;
            }}
            destructiveColor={colors.destructive}
            foregroundColor={colors.foreground}
            mutedForegroundColor={colors.mutedForeground}
            surfaceColor={colors.card}
            borderColor={colors.border}
          />
      </KeyboardAwareScrollViewCompat>
    </BottomSheet>
  );
}

type AddFoodEntryMode = 'search' | 'manual';

function AddFoodModal({ visible, onClose, entryDate, initialMode = 'search' }: { visible: boolean; onClose: () => void; entryDate: string; initialMode?: AddFoodEntryMode }) {
  const { colors, addLog, savedMeals } = useCalora();
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'search' | 'voice' | 'barcode'>('search');
  const filtered = verifiedFoods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase()));

  const chooseFood = (food: (typeof verifiedFoods)[number]) => {
    addLog({ ...food, date: entryDate, time: formatLogTime(), serving: food.serving });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const chooseSavedMeal = (meal: (typeof savedMeals)[number]) => {
    addLog({
      name: meal.name,
      date: entryDate,
      meal: meal.mealType ?? savedMealCategory(meal),
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      source: 'Recipe',
      confidence: 92,
      time: formatLogTime(),
      serving: '1 saved portion',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const photoLog = () => {
    onClose();
    router.navigate({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  const voiceLog = () => {
    onClose();
    router.navigate({ pathname: '/(tabs)/scan', params: { date: entryDate, capture: 'voice' } });
  };

  const barcodeLog = () => {
    onClose();
    router.navigate({ pathname: '/(tabs)/scan', params: { date: entryDate, capture: 'barcode' } });
  };

  const addManual = () => {
    const kcal = parseWholeNumberInput(customCalories);
    if (!customName.trim()) {
      setManualError('Add a food name before saving.');
      return;
    }
    if (kcal === null || kcal <= 0) {
      setManualError('Enter whole-number calories greater than zero.');
      return;
    }
    addLog({
      name: customName.trim(),
      date: entryDate,
      meal: 'Snack',
      calories: kcal,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'Manual',
      confidence: 70,
      time: formatLogTime(),
      serving: '1 serving',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setManualError(null);
    setCustomName('');
    setCustomCalories('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} sheetStyle={[styles.modalCard, styles.addFoodModalCard, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.addFoodSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeading}>
          <View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{initialMode === 'manual' ? 'Quick add to' : 'Add to'} {isToday(entryDate) ? 'today' : formatShortDate(entryDate)}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{initialMode === 'manual' ? 'Enter a food and calories.' : 'Choose a food or add one manually.'}</Text>
          </View>
          <ScalePressable accessibilityLabel="Close add food" onPress={onClose} scale={0.92} haptic="none" style={[styles.closeButton, { backgroundColor: colors.muted }]}>
            <Feather name="x" size={18} color={colors.foreground} />
          </ScalePressable>
        </View>
        {initialMode === 'manual' ? (
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={80}
            style={styles.manualModeScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={[styles.quickAddFocus, { backgroundColor: colors.accent }]}>
              <CaloraFeatureIcon name="food" size={38} primaryColor={colors.carbs} accentColor={colors.primary} foregroundColor={colors.foreground} highlightColor={colors.card} />
              <Text style={[styles.quickAddFocusTitle, { color: colors.foreground }]}>Add a food manually</Text>
              <Text style={[styles.quickAddFocusBody, { color: colors.mutedForeground }]}>For foods outside the verified list.</Text>
              <View style={[styles.manualRow, styles.manualFooterRow]}>
                <TextInput accessibilityLabel="Manual food name" value={customName} onChangeText={(value) => { setCustomName(value); setManualError(null); }} placeholder="Food name" placeholderTextColor={colors.mutedForeground} style={[styles.manualInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                <TextInput accessibilityLabel="Manual food calories" value={customCalories} onChangeText={(value) => { setCustomCalories(normalizeWholeNumberInput(value)); setManualError(null); }} placeholder="kcal" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.manualKcal, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                <ScalePressable accessibilityLabel="Add manual food" onPress={addManual} scale={0.96} haptic="light" style={[styles.manualAdd, { backgroundColor: colors.primary }]}>
                  <Feather name="plus" size={20} color={colors.primaryForeground} />
                </ScalePressable>
              </View>
              {manualError ? <Text accessibilityLiveRegion="polite" style={[styles.manualError, { color: colors.destructive }]}>{manualError}</Text> : null}
            </View>
          </KeyboardAwareScrollViewCompat>
        ) : (
          <>
            <KeyboardAwareScrollViewCompat
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              bottomOffset={80}
              style={styles.foodOptionsScroll}
              contentContainerStyle={styles.foodOptionsContent}
            >
              <ScalePressable accessibilityLabel="Log from photo" testID="photo-log-button" onPress={photoLog} scale={0.96} haptic="light" style={[styles.photoButton, { backgroundColor: colors.hero }]}>
                <CaloraFeatureIcon name="camera" size={31} primaryColor={colors.primary} accentColor={colors.heroMuted} foregroundColor={colors.foreground} highlightColor={colors.onHero} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoTitle, { color: colors.onHero }]}>Log from a photo</Text>
                  <Text style={[styles.photoSubtitle, { color: colors.heroMuted }]}>Review an estimate before it counts</Text>
                </View>
                <Feather name="arrow-up-right" size={18} color={colors.heroMuted} />
              </ScalePressable>
              <View style={[styles.captureModes, { backgroundColor: colors.muted }]}>
                <ScalePressable accessibilityLabel="Text food logging" onPress={() => setCaptureMode('search')} scale={0.95} haptic="none" style={[styles.captureMode, captureMode === 'search' && { backgroundColor: colors.card }]}><Feather name="edit-3" size={14} color={captureMode === 'search' ? colors.primary : colors.mutedForeground} /><Text style={[styles.captureModeText, { color: captureMode === 'search' ? colors.foreground : colors.mutedForeground }]}>Text</Text></ScalePressable>
                <ScalePressable accessibilityLabel="Voice food logging" testID="voice-log-button" onPress={voiceLog} scale={0.95} haptic="none" style={[styles.captureMode, { backgroundColor: colors.card }]}><CaloraFeatureIcon name="voice" size={22} primaryColor={colors.primary} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.captureModeText, { color: colors.foreground }]}>Voice</Text></ScalePressable>
                <ScalePressable accessibilityLabel="Barcode food logging" testID="barcode-log-button" onPress={barcodeLog} scale={0.95} haptic="none" style={[styles.captureMode, { backgroundColor: colors.card }]}><CaloraFeatureIcon name="barcode" size={22} primaryColor={colors.primary} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.captureModeText, { color: colors.foreground }]}>Barcode</Text></ScalePressable>
              </View>
              {captureMode !== 'search' && <View style={[styles.unavailableCard, { backgroundColor: colors.accent }]}>
                <CaloraFeatureIcon name={captureMode === 'voice' ? 'voice' : 'barcode'} size={29} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} />
                 <View style={{ flex: 1 }}><Text style={[styles.unavailableTitle, { color: colors.foreground }]}>{captureMode === 'voice' ? 'Voice needs microphone access' : 'Barcode scanning needs camera access'}</Text><Text style={[styles.unavailableBody, { color: colors.mutedForeground }]}>{captureMode === 'voice' ? `${BRAND.name} turns your words into a reviewable draft.` : `${BRAND.name} looks up a verified product by barcode.`}</Text></View>
                <Pressable accessibilityLabel="Use text logging instead" onPress={() => setCaptureMode('search')}><Text style={[styles.useText, { color: colors.primary }]}>Use text</Text></Pressable>
              </View>}
              {savedMeals.length > 0 && <View>
                 <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, marginTop: 2 }]}>SAVED</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedMealRow}>
                  {savedMeals.map((meal) => <ScalePressable key={meal.id} accessibilityLabel={`Add saved ${meal.name}`} onPress={() => chooseSavedMeal(meal)} scale={0.98} haptic="none" style={[styles.savedMealChip, { backgroundColor: colors.accent, borderColor: colors.border }]}><CaloraFeatureIcon name={meal.kind === 'recipe' ? 'recipes' : 'food'} size={22} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /><View><Text style={[styles.savedMealName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.savedMealMeta, { color: colors.mutedForeground }]}>{formatWhole(meal.calories)} kcal · {meal.kind}</Text></View></ScalePressable>)}
                </ScrollView>
              </View>}
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}>
                <Feather name="search" size={18} color={colors.mutedForeground} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search verified foods" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />
              </View>
               <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>VERIFIED</Text>
              <View>
                {filtered.map((food) => (
                  <ScalePressable key={food.name} onPress={() => chooseFood(food)} scale={0.98} haptic="none" style={[styles.foodSuggestion, { borderBottomColor: colors.border }]}>
                    <View style={[styles.foodIcon, { backgroundColor: colors.accent }]}>
                      <Feather name="check" size={15} color={colors.accentForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.foodName, { color: colors.foreground }]}>{food.name}</Text>
                      <Text style={[styles.foodMeta, { color: colors.mutedForeground }]}>{formatWhole(food.calories)} kcal · {formatGrams(food.protein)} protein · {food.confidence}% confidence</Text>
                    </View>
                    <Feather name="plus" size={18} color={colors.primary} />
                  </ScalePressable>
                ))}
              </View>
            </KeyboardAwareScrollViewCompat>
            <View style={[styles.manualEntryFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
              <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>MANUAL</Text>
              <View style={styles.manualRow}>
                <TextInput accessibilityLabel="Manual food name" value={customName} onChangeText={(value) => { setCustomName(value); setManualError(null); }} placeholder="Food name" placeholderTextColor={colors.mutedForeground} returnKeyType="next" style={[styles.manualInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                <TextInput accessibilityLabel="Manual food calories" value={customCalories} onChangeText={(value) => { setCustomCalories(normalizeWholeNumberInput(value)); setManualError(null); }} placeholder="kcal" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={addManual} style={[styles.manualKcal, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                <ScalePressable accessibilityLabel="Add manual food" onPress={addManual} scale={0.96} haptic="light" style={[styles.manualAdd, { backgroundColor: colors.primary }]}>
                  <Feather name="plus" size={20} color={colors.primaryForeground} />
                </ScalePressable>
              </View>
              {manualError ? <Text accessibilityLiveRegion="polite" style={[styles.manualError, { color: colors.destructive }]}>{manualError}</Text> : null}
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

export function CalorieGauge({
  consumed,
  burned,
  burnedActionLabel,
  onBurnedPress,
  target,
  colors,
}: {
  consumed: number;
  burned: number | null;
  burnedActionLabel?: string;
  onBurnedPress?: () => void;
  target: number;
  colors: ReturnType<typeof useCalora>['colors'];
}) {
  const { width: windowWidth } = useWindowDimensions();
  const adjustedTarget = target + (burned ?? 0);
  const progress = adjustedTarget > 0 ? Math.min(Math.max(consumed / adjustedTarget, 0), 1) : 0;
  const remaining = Math.max(adjustedTarget - consumed, 0);
  const overGoal  = consumed > adjustedTarget;

  // Responsive sizing:
  //   heroCard sits 10px into the scrollContent's 20px H padding each side
  //   and keeps its own 20px padding → inner = windowWidth - 60
  //   gauge fills the full inner card width (Eaten/Burned move below)
  const cardInnerW = windowWidth - 60;
  const gaugeW     = Math.min(cardInnerW, 340);
  const gaugeH     = gaugeW * (GAUGE_VBH / GAUGE_VBW) * GAUGE_HEIGHT_SCALE * TODAY_WIDGET_HEIGHT_SCALE * CALORIE_GAUGE_HEIGHT_SCALE;
  const ringW      = gaugeW * CALORIE_RING_SCALE;
  const ringH      = gaugeH * CALORIE_RING_SCALE;
  const ringLeft   = (gaugeW - ringW) / 2;
  const ringTop    = gaugeH - ringH;

  // Animate the fill arc via strokeDashoffset
  const dashOffset = useSharedValue(GAUGE_ARC_LEN);
  useEffect(() => {
    dashOffset.value = withTiming(GAUGE_ARC_LEN * (1 - progress), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, dashOffset]);

  const fillProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const fillColor = overGoal ? colors.warning : colors.primary;

  // Centre the text stack in the horseshoe eye.
  // Arc inner top in VB = CY − R + STROKE/2 = 34.5
  // Arc inner bottom in VB ≈ 175.  Eye height ≈ 140.5 VB.
  // Text block ≈ 90 screen-px → half-height anchored to eye centre (VB ≈ 105).
  // A gap of 32 VB units from the inner top lands the stack at eye centre.
  const overlayTop = ((GAUGE_CY - GAUGE_R + GAUGE_STROKE / 2 + 32) / GAUGE_VBH) * gaugeH * CALORIE_RING_SCALE + ringTop + CALORIE_RING_VERTICAL_OFFSET;

  return (
    <View style={gaugeStyles.container}>
      <View pointerEvents="none" style={gaugeStyles.foodAccent}>
        <Image source={FOOD_WIDGET_ART.calorie} resizeMode="cover" style={gaugeStyles.foodAccentImage} />
      </View>
      {/* ── Full-width SVG arc + centred text ── */}
      <View style={[gaugeStyles.arcWrap, { width: gaugeW, height: gaugeH }]}>
        <View pointerEvents="none" style={[gaugeStyles.ringLayer, { width: ringW, height: ringH, left: ringLeft, top: ringTop, transform: [{ translateY: CALORIE_RING_VERTICAL_OFFSET }] }]}>
          <Svg width={ringW} height={ringH} viewBox={`0 0 ${GAUGE_VBW} ${GAUGE_VBH}`}>
            {/* Track — full 270° muted arc */}
            <Path
              d={GAUGE_TRACK_D}
              stroke={colors.border}
              strokeWidth={GAUGE_STROKE}
              fill="none"
              strokeLinecap="round"
            />
            {/* Fill — animated progress arc */}
            {progress > 0 && (
              <AnimatedPath
                animatedProps={fillProps}
                d={GAUGE_TRACK_D}
                stroke={fillColor}
                strokeWidth={GAUGE_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={GAUGE_ARC_LEN}
              />
            )}
          </Svg>
        </View>

        {/* Text precisely centred in the horseshoe eye */}
        <View style={[gaugeStyles.textOverlay, { top: overlayTop }]}>
          <Text style={[gaugeStyles.remainingLabel, { color: colors.mutedForeground }]}>Remaining</Text>
          <Text
            style={[gaugeStyles.remainingNumber, { color: colors.strongForeground }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatWhole(remaining)}
          </Text>
          <Text style={[gaugeStyles.kcalLeft, { color: colors.mutedForeground }]}>kcal left</Text>
          <Text style={[gaugeStyles.goalText, { color: colors.mutedForeground }]}>
            Goal {formatWhole(target)} kcal
          </Text>
        </View>
      </View>

      {/* ── Eaten / Burned row beneath the gauge ── */}
      <View style={gaugeStyles.statsRow}>
        <View style={gaugeStyles.statItem}>
          <Text style={[gaugeStyles.statNumber, { color: colors.foreground }]} adjustsFontSizeToFit numberOfLines={1}>
            {formatWhole(consumed)}
          </Text>
          <Text style={[gaugeStyles.statLabel, { color: colors.mutedForeground }]}>Eaten</Text>
        </View>
        <View style={[gaugeStyles.statDivider, { backgroundColor: colors.border }]} />
        <Pressable
          accessibilityRole={onBurnedPress ? 'button' : undefined}
          accessibilityLabel={burnedActionLabel ?? `Burned ${burned === null ? 'unavailable' : formatWhole(burned)} calories`}
          disabled={!onBurnedPress}
          onPress={onBurnedPress}
          testID="dashboard-burned-stat"
          style={gaugeStyles.statItem}
        >
          <Text testID="dashboard-burned-value" style={[gaugeStyles.statNumber, { color: colors.foreground }]}>
            {burned === null ? '—' : formatWhole(burned)}
          </Text>
          <Text style={[gaugeStyles.statLabel, { color: colors.mutedForeground }]}>Burned</Text>
          {burnedActionLabel ? <Text testID="dashboard-burned-status" style={[gaugeStyles.burnedAction, { color: colors.primary }]} numberOfLines={1}>{burnedActionLabel}</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

function makeGaugeStyles(f: number) {
  return StyleSheet.create({
  container: { marginTop: 14 * MERGED_WIDGET_HEIGHT_SCALE, marginBottom: 0, alignItems: 'center' },
  foodAccent: { position: 'absolute' as const, width: 56, height: 56, borderRadius: 18, right: 4, top: 6, overflow: 'hidden' as const, opacity: 0.14 },
  foodAccentImage: { width: '100%', height: '100%' },
  arcWrap:   { position: 'relative' as const },
  ringLayer: { position: 'absolute' as const },
  textOverlay: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
  },
  remainingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9 * f,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  remainingNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40 * f,
    letterSpacing: -1.5,
    lineHeight: 44,
    maxWidth: 150,
  },
  kcalLeft: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: 2 },
  goalText:  { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 6, opacity: 0.72 },
  statsRow:  { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 32, marginTop: (Platform.OS === 'android' ? 20 : 14) * MERGED_WIDGET_HEIGHT_SCALE },
  statItem:  { alignItems: 'center' as const },
  statDivider: { width: 1, height: 28 },
  statNumber: { fontFamily: 'Inter_700Bold', fontSize: 22 * f, letterSpacing: -0.6 },
  statLabel:  { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: (Platform.OS === 'android' ? 10 : 7), letterSpacing: 0.5, textTransform: 'uppercase' as const },
  burnedAction: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 4, maxWidth: 140, textAlign: 'center' as const },
  });
}
const gaugeStyles = makeGaugeStyles(1.0);

function ProgressSnapshotCard({
  colors,
  fontScale,
  logs,
  healthConnection,
  weights,
  todayKey,
  dailyStepGoal,
  expanded,
  onOpenProgress,
}: {
  colors: CaloraColors;
  fontScale: number;
  logs: FoodLog[];
  healthConnection: ReturnType<typeof useCalora>['healthConnection'];
  weights: ReturnType<typeof useCalora>['weights'];
  todayKey: string;
  dailyStepGoal: number;
  expanded: boolean;
  onOpenProgress: () => void;
}) {
  const styles = makeStyles(fontScale);
  const snapshot = calculateProgressSnapshot(logs, healthConnection.snapshot?.dailyMetrics, weights, todayKey, dailyStepGoal);
  const ringSize = expanded ? 110 : 98;
  const ringStroke = 9;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProgress = snapshot.nutritionDays / 7;
  const metricColors = [colors.success, colors.carbs, colors.warning];
  const metrics = [
    { label: 'Nutrition', ...snapshot.nutrition },
    { label: 'Steps', ...snapshot.steps },
    { label: 'Weight', ...snapshot.weight },
  ];
  return (
    <ScalePressable
      testID="progress-snapshot-widget"
      accessibilityRole="button"
      accessibilityLabel={`Open Progress. ${snapshot.nutritionDays} of 7 nutrition days logged this week.`}
      onPress={onOpenProgress}
      scale={0.985}
      haptic="light"
      style={[styles.progressSnapshotCard, expanded && styles.progressSnapshotCardExpanded, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.progressSnapshotHeader}>
        <View style={styles.progressSnapshotTitleRow}>
          <View style={[styles.progressSnapshotIcon, { backgroundColor: colors.success + '18' }]}>
            <Feather name="bar-chart-2" size={19} color={colors.success} />
          </View>
          <View style={styles.progressSnapshotTitleCopy}>
            <Text style={[styles.progressSnapshotTitle, { color: colors.foreground, fontSize: 15 * fontScale }]}>Progress this week</Text>
            <Text style={[styles.progressSnapshotSubtitle, { color: colors.mutedForeground, fontSize: 10 * fontScale }]}>Your weekly snapshot</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </View>
      <View style={styles.progressSnapshotHero}>
        <View style={[styles.progressSnapshotRing, { width: ringSize, height: ringSize }]}>
          <Svg width={ringSize} height={ringSize}>
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke={colors.muted} strokeWidth={ringStroke} fill="none" />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={colors.success}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - ringProgress)}
              rotation="-90"
              origin={`${ringSize / 2}, ${ringSize / 2}`}
            />
          </Svg>
          <View style={styles.progressSnapshotRingCopy}>
            <Text style={[styles.progressSnapshotRingValue, { color: colors.foreground, fontSize: 17 * fontScale }]}>{snapshot.nutritionDays}/7</Text>
            <Text style={[styles.progressSnapshotRingLabel, { color: colors.mutedForeground, fontSize: 8 * fontScale }]}>days logged</Text>
          </View>
        </View>
        <View style={styles.progressSnapshotSummary}>
          <Text style={[styles.progressSnapshotSummaryValue, { color: colors.foreground, fontSize: 18 * fontScale }]}>{snapshot.nutritionDays} active day{snapshot.nutritionDays === 1 ? '' : 's'}</Text>
          <Text style={[styles.progressSnapshotSummaryCopy, { color: colors.mutedForeground, fontSize: 10 * fontScale }]}>You&apos;ve logged nutrition on {snapshot.nutritionDays} day{snapshot.nutritionDays === 1 ? '' : 's'} this week.</Text>
          <View style={[styles.progressSnapshotConsistency, { backgroundColor: colors.success + '18' }]}>
            <Feather name="calendar" size={14} color={colors.success} />
            <Text style={[styles.progressSnapshotConsistencyText, { color: colors.success, fontSize: 10 * fontScale }]}>Weekly consistency</Text>
          </View>
        </View>
      </View>
      <View style={styles.progressSnapshotMetrics}>
        {metrics.map((metric, index) => (
          <View key={metric.label} style={[styles.progressSnapshotMetric, { backgroundColor: `${metricColors[index]}18` }]}>
            <View style={styles.progressSnapshotMetricHeader}>
              <View style={[styles.progressSnapshotMetricDot, { backgroundColor: metricColors[index] }]} />
              <Text style={[styles.progressSnapshotMetricLabel, { color: colors.mutedForeground, fontSize: 9 * fontScale }]}>{metric.label}</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.progressSnapshotMetricValue, { color: colors.foreground, fontSize: 13 * fontScale }]}>{metric.value}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.progressSnapshotMetricDetail, { color: colors.mutedForeground, fontSize: 8.5 * fontScale }]}>{metric.detail}</Text>
            {metric.progress !== null && <View style={[styles.progressSnapshotMetricTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressSnapshotMetricFill, { width: `${Math.round(metric.progress * 100)}%`, backgroundColor: metricColors[index] }]} /></View>}
          </View>
        ))}
      </View>
      <View style={[styles.progressSnapshotAction, { backgroundColor: colors.primary }]}>
        <Text style={[styles.progressSnapshotActionText, { color: colors.primaryForeground, fontSize: 11 * fontScale }]}>View full progress</Text>
        <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
      </View>
    </ScalePressable>
  );
}

function DashboardFastingCard({
  expanded = false,
  colors,
  fontScale,
}: {
  expanded?: boolean;
  colors: ReturnType<typeof useCalora>['colors'];
  fontScale: number;
}) {
  const { fasting } = useCalora();
  const referenceColors = supportingWidgetColors(colors);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const status = deriveFastingProgress(fasting, now);
  if (expanded) {
    return (
      <ScalePressable accessibilityRole="button" accessibilityLabel="Open fasting" onPress={() => router.push('/fasting')} style={[styles.dashboardHydrationFrame, styles.dashboardFastingExpandedCard, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }]}>
        <View style={styles.dashboardFastingExpandedTopRow}>
          <View style={[styles.dashboardFastingIcon, { backgroundColor: 'rgba(36,164,104,0.12)' }]}><Feather name="clock" size={20} color={referenceColors.green} /></View>
          <Text style={[styles.dashboardFastingTitle, { color: referenceColors.foreground, fontSize: 15 * fontScale }]}>Fasting</Text>
          <Feather name="chevron-right" size={18} color={referenceColors.foreground} />
        </View>
        <View style={styles.dashboardFastingExpandedMiddle}>
          {status.active ? (
            <View style={styles.dashboardFastingExpandedStats}>
              <Text style={[styles.dashboardFastingCopy, { color: referenceColors.foreground, fontSize: 12 * fontScale }]}>{formatFastingDuration(status.elapsedMs)} elapsed</Text>
              <Text style={[styles.dashboardFastingCopy, { color: referenceColors.mutedForeground, fontSize: 11 * fontScale }]}>{formatFastingDuration(status.remainingMs)} remaining</Text>
            </View>
          ) : (
            <Text style={[styles.dashboardFastingCopy, { color: referenceColors.foreground, fontSize: 12 * fontScale }]}>Ready to start</Text>
          )}
          <View style={[styles.dashboardFastingTrack, { backgroundColor: referenceColors.track }]}>
            <View style={[styles.dashboardFastingFill, { backgroundColor: referenceColors.green, width: `${Math.round(status.progress * 100)}%` }]} />
          </View>
        </View>
        <View style={styles.dashboardFastingExpandedFooter}>
          <Text style={[styles.dashboardFastingPlan, { color: referenceColors.mutedForeground, fontSize: 10 * fontScale }]}>{fastingPlanLabel(fasting)} plan</Text>
          <Text style={[styles.dashboardFastingAction, { color: referenceColors.orange, fontSize: 11 * fontScale }]}>{status.active ? 'View' : 'Set up'}</Text>
        </View>
      </ScalePressable>
    );
  }
  const isRunning = status.active && status.remainingMs > 0;
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open fasting"
      onPress={() => router.push('/fasting')}
      style={[styles.dashboardFastingCard, { backgroundColor: referenceColors.card, borderColor: referenceColors.border }]}
    >
      <View style={styles.dashboardFastingTopRow}>
        <View style={[styles.dashboardFastingIcon, { backgroundColor: 'rgba(36,164,104,0.12)' }]}>
          <Feather name="clock" size={20} color={referenceColors.green} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.dashboardFastingTitle, { color: referenceColors.foreground, fontSize: 14 * fontScale, flex: 1 }]}>Fasting</Text>
        <Feather name="chevron-right" size={18} color={referenceColors.foreground} />
      </View>
      <View style={styles.dashboardFastingMiddle}>
        {isRunning ? (
          <View>
            <Text numberOfLines={1} style={[styles.dashboardFastingCopy, { color: referenceColors.mutedForeground, fontSize: 11 * fontScale }]}>{formatFastingDuration(status.elapsedMs)} elapsed</Text>
            <Text numberOfLines={1} style={[styles.dashboardFastingCopy, { color: referenceColors.mutedForeground, fontSize: 11 * fontScale }]}>{formatFastingDuration(status.remainingMs)} remaining</Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={[styles.dashboardFastingCopy, { color: referenceColors.mutedForeground, fontSize: 11 * fontScale }]}>{status.active ? 'Window complete' : 'Ready to start'}</Text>
        )}
        <View style={[styles.dashboardFastingTrack, { backgroundColor: referenceColors.track }]}>
          <View style={[styles.dashboardFastingFill, { backgroundColor: referenceColors.green, width: `${Math.round(status.progress * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.dashboardFastingFooter}>
        <Text style={[styles.dashboardFastingPlan, { color: referenceColors.mutedForeground, fontSize: 10 * fontScale }]}>{fastingPlanLabel(fasting)} plan</Text>
        <Text style={[styles.dashboardFastingAction, { color: referenceColors.orange, fontSize: 11 * fontScale }]}>{isRunning ? 'View' : 'Set up'}</Text>
      </View>
    </ScalePressable>
  );
}

export default function HomeScreen() {
  const {
    logs, colors, profile, profilePhotoUri, syncState, waterLogs, moodLogs, addWater, setMood,
    livingState, fontScale, healthConnection, healthConnected, liveStepTracking, liveStepMilestones, dailyStepGoal,
    startLiveStepTracking, setLiveStepsDashboardFocused, dismissLiveStepMilestone, openMotionSettings, weights,
    activityLogs, activityMinutesLogs, plannerMeals, shoppingItems, localRecipes, hydrated, hydrationError, retryHydration, isRetrying,
    updateProfile, dashboardPreferences, saveMeal,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  // Keep the requested 2x2 composition on ordinary phones. At 320px and below,
  // or with large accessibility text, use one column to preserve readability.
  const useSingleColumnWellness = viewportWidth < 360 || fontScale > 1.22;
  const gaugeStyles = useMemo(() => makeGaugeStyles(fontScale), [fontScale]);
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const [showAdd, setShowAdd] = useState(false);
  const [addFoodMode, setAddFoodMode] = useState<AddFoodEntryMode>('search');
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const followsTodayRef = useRef(true);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(calendarMonthKey(dateKey(new Date())));
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [waterConfirmed, setWaterConfirmed] = useState(false);
  const [waterConfirmedAmount, setWaterConfirmedAmount] = useState<number | null>(null);
  const [macroGoalsVisible, setMacroGoalsVisible] = useState(false);
  const [macroGoalDraft, setMacroGoalDraft] = useState<MacroGoalDraft | null>(null);
  const macroTargets = useMemo(() => getMacroTargets(profile), [profile]);
  const target = macroTargets.calories;
  const selectedLogs = logs.filter((log) => log.date === selectedDate || (!log.date && isToday(selectedDate)));
  const saveLoggedMeal = useCallback((log: FoodLog) => {
    saveMeal({
      name: log.name,
      kind: 'meal',
      foodIds: log.sourceRecipeId ? [log.sourceRecipeId] : [],
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      mealType: log.meal,
    });
    setSaveNotice(`${log.name} saved for quick logging.`);
  }, [saveMeal]);
  const selectedTotals = useMemo(() => selectedLogs.reduce((sum, log) => ({
    calories: sum.calories + log.calories,
    protein: sum.protein + log.protein,
    carbs: sum.carbs + log.carbs,
    fat: sum.fat + log.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [selectedLogs]);
  const mealsLogged = new Set(selectedLogs.map((log) => log.meal)).size;
  const now = useClock();
  const todayKey = dateKey(now);
  const isViewingToday = selectedDate === todayKey;
  useEffect(() => {
    if (followsTodayRef.current) setSelectedDate(todayKey);
  }, [todayKey]);
  const burnedStatus = burnedStatusForDay({
    isToday: selectedDate === todayKey,
    isFuture: selectedDate > todayKey,
    connection: healthConnection,
    now,
  });
  const burnedPresentation = burnedPresentationForStatus(burnedStatus);
  const activeEnergy = burnedStatus.kind === 'ready' ? burnedStatus.calories : 0;
  const remaining = Math.max(target - selectedTotals.calories + activeEnergy, 0);
  const progress = Math.min(selectedTotals.calories / (target + activeEnergy), 1);
  const isProgressAction = livingState.action.kind === 'view_progress';
  const selectedWater = waterLogs[selectedDate] ?? 0;
  const todayInsight = useMemo(() => {
    if (!isToday(selectedDate)) return null;

    const context = createIntelligenceContext({
      logs,
      profile,
      weights,
      waterLogs,
      moodLogs,
      activityLogs,
      activityMinutesLogs,
      plannerMeals,
      shoppingItems,
      localRecipes,
      activeEnergyKcal: activeEnergy,
    }, { date: selectedDate });

    return selectVisibleTodayInsight(buildDailyIntelligenceFacts(context), {
      hydrated,
      enabled: isIntelligenceFeatureEnabled('intelligence.insights.today'),
    });
  }, [
    activeEnergy,
    activityLogs,
    activityMinutesLogs,
    hydrated,
    localRecipes,
    logs,
    moodLogs,
    plannerMeals,
    profile,
    selectedDate,
    shoppingItems,
    waterLogs,
    weights,
  ]);
  const todayInsightMessage = formatCoachPlainText(todayInsight?.message)
    ?.replace('Across your logged 28-day comparison window, ', '')
    .replace(' local-calendar', '')
    .replace('today’s logged calories', 'logged calories')
    .replace('while more than half of daily calories are logged.', 'after half your calories are logged.');
  const postGridWidgetOrder = useMemo(
    () => dashboardPreferences.order.filter((id) => id === 'water' || id === 'recipes' || id === 'quickLog' || id === 'log' || id === 'progressSnapshot'),
    [dashboardPreferences.order],
  );
  const supportingRows = useMemo(
    () => buildDashboardRows(dashboardPreferences),
    [dashboardPreferences],
  );
  const headerPhoto = HOME_HEADER_FOOD_PHOTOS[now.getHours() % HOME_HEADER_FOOD_PHOTOS.length];

  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !isViewingToday) {
        setLiveStepsDashboardFocused(false);
        return undefined;
      }

      setLiveStepsDashboardFocused(true);
      return () => {
        setLiveStepsDashboardFocused(false);
      };
    }, [hydrated, isViewingToday, setLiveStepsDashboardFocused]),
  );

  const openAdd = (mode: AddFoodEntryMode = 'search') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddFoodMode(mode);
    setShowAdd(true);
  };
  const openPhotoLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate({ pathname: '/(tabs)/scan', params: { date: selectedDate } });
  };
  const openRestaurants = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/restaurants', params: { date: selectedDate } });
  };
  const openMacroGoals = () => {
    setMacroGoalDraft({
      calories: String(macroTargets.calories),
      protein: String(macroTargets.protein),
      carbs: String(macroTargets.carbs),
      fat: String(macroTargets.fat),
    });
    setMacroGoalsVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const openCalendar = () => {
    setCalendarMonth(calendarMonthKey(selectedDate));
    setCalendarVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const selectCalendarDate = (date: string) => {
    followsTodayRef.current = date === dateKey(new Date());
    setSelectedDate(date);
    setCalendarVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const goToToday = () => {
    followsTodayRef.current = true;
    setSelectedDate(dateKey(new Date()));
    setCalendarVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const saveMacroGoals = (values: MacroTargets) => {
    void updateProfile({
      calorieTarget: values.calories,
      proteinTargetGrams: values.protein,
      carbsTargetGrams: values.carbs,
      fatTargetGrams: values.fat,
      targetMode: 'custom',
    }).catch(() => undefined);
    setMacroGoalsVisible(false);
    setMacroGoalDraft(null);
    setSaveNotice('Nutrition goals saved locally.');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLivingAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const effect = resolveLivingActionEffect(livingState.action.kind);
    if (effect.kind === 'open_add_food') {
      openAdd();
    } else if (effect.kind === 'add_water') {
      // State updates do not take effect until the next render. Consult the
      // shared deadline too, so two rapid presses cannot both add water before
      // the button receives its disabled prop.
      if (isWaterConfirmed()) {
        setWaterConfirmed(true);
        return;
      }
      addWater(selectedDate, effect.ounces);
      setSaveNotice('Water check-in added for this day.');
      recordWaterConfirmation();
      setWaterConfirmed(true);
      setWaterConfirmedAmount(effect.ounces);
    } else {
      router.navigate(effect.route as Parameters<typeof router.navigate>[0]);
    }
  };

  // On mount: if the module-level deadline is still in the future (e.g. the
  // user switched tabs and returned within the 1.5 s window), restore the
  // confirmed state immediately. Module-level state survives unmount/remount,
  // so this is the correct place to check it.
  useEffect(() => {
    if (isWaterConfirmed()) {
      setWaterConfirmed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the confirmed state flips to true, schedule a timer for however
  // much of the 1.5 s window remains. This handles both the initial tap (full
  // window) and remount restoration (partial window), and survives re-renders
  // during the countdown because clearTimeout is called on cleanup.
  useEffect(() => {
    if (!waterConfirmed) return;
    const remaining = getWaterConfirmationRemaining();
    if (remaining === 0) {
      setWaterConfirmed(false);
      setWaterConfirmedAmount(null);
      clearWaterConfirmation();
      return;
    }
    const id = setTimeout(() => {
      setWaterConfirmed(false);
      setWaterConfirmedAmount(null);
      clearWaterConfirmation();
    }, remaining);
    return () => clearTimeout(id);
  }, [waterConfirmed]);

  const livingActionFeature: CaloraFeatureIconName = livingState.action.kind === 'add_water'
    ? 'water'
    : livingState.action.kind === 'view_progress'
      ? 'progress'
      : livingState.action.kind === 'open_planner'
        ? 'calendar'
        : 'food';

  useEffect(() => {
    if (!saveNotice) return;
    const timeout = setTimeout(() => setSaveNotice(null), 2200);
    return () => clearTimeout(timeout);
  }, [saveNotice]);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        leftAlignTitle
        title="Today"
        action={
          <View style={styles.homeHeaderActions}>
            {/* Icon-only in the compact header: a labeled pill plus the avatar can
                crowd out the header title at large accessibility font scales. */}
            <ScalePressable
              accessibilityLabel={`Open ${BRAND.name} Coach`}
              onPress={() => router.push('/coach')}
              scale={0.96}
              haptic="light"
              style={[styles.homeHeaderCoachIcon, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <CaloraFeatureIcon name="coach" size={24} primaryColor={colors.primary} accentColor={colors.accent} foregroundColor={colors.primary} highlightColor={colors.primaryForeground} />
            </ScalePressable>
            <Pressable
              accessibilityLabel="Profile shortcut"
              onPress={() => router.navigate('/(tabs)/profile')}
              style={[styles.homeHeaderAvatar, { backgroundColor: colors.muted, borderColor: colors.border, overflow: 'hidden' }]}
            >
              <ProfilePhoto
                key={profilePhotoUri ?? 'profile-photo-empty'}
                uri={profilePhotoUri}
                size={40}
                accessibilityLabel="Profile photo"
                fallback={<Feather name="user" size={18} color={colors.foreground} />}
              />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 14, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <Image source={headerPhoto} style={styles.homeHeaderImage} resizeMode="cover" />
          <View pointerEvents="none" style={styles.homeHeaderScrim} />
          <View style={styles.homeHeaderContent}>
            <View style={styles.homeHeaderTop}>
              <ScalePressable accessibilityRole="button" accessibilityLabel="Customize dashboard" testID="customize-dashboard-button" onPress={() => router.push('/dashboard-layout')} scale={0.94} haptic="none" style={[styles.homeHeaderCustomize, { transform: [{ translateX: -9 }, { translateY: -7 }], backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.62)', shadowColor: '#0f2d22' }]}>
                <Feather name="sliders" size={17} color="#fff7ed" />
              </ScalePressable>
              <Text style={styles.homeHeaderDate}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.homeHeaderTitle}>{livingState.greeting}, {profile?.name?.split(' ')[0] ?? 'there'}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={styles.homeHeaderSubtitle}>{livingState.message}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroDateNav, { borderBottomColor: colors.border }]}>
            <Pressable accessibilityLabel="Previous diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() - 1); const nextDate = dateKey(date); followsTodayRef.current = nextDate === dateKey(new Date()); setSelectedDate(nextDate); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={17} color={colors.foreground} /></Pressable>
             <Pressable accessibilityLabel={`Open calendar for ${isToday(selectedDate) ? 'today' : formatShortDate(selectedDate)}`} testID="open-calendar-date-picker" onPress={openCalendar} style={styles.dateNavCenter}>
               <View style={styles.dateNavCenterLine}>
                 <Text style={[styles.dateNavLabel, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today' : formatShortDate(selectedDate)}</Text>
                 <Feather name="calendar" size={14} color={colors.primary} />
               </View>
               <Text style={[styles.dateNavSub, { color: colors.mutedForeground }]}>Viewing {selectedDate}</Text>
             </Pressable>
            <Pressable accessibilityLabel="Next diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() + 1); const nextDate = dateKey(date); followsTodayRef.current = nextDate === dateKey(new Date()); setSelectedDate(nextDate); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={17} color={colors.foreground} /></Pressable>
          </View>
           {!isToday(selectedDate) && (
             <Pressable accessibilityLabel="Back to today" testID="back-to-today" onPress={goToToday} style={[styles.backToToday, { backgroundColor: colors.accent }]}>
               <Feather name="rotate-ccw" size={14} color={colors.accentForeground} />
               <Text style={[styles.backToTodayText, { color: colors.accentForeground }]}>Back to today</Text>
             </Pressable>
           )}

          {/* Dominant calorie gauge */}
          <CalorieGauge
            consumed={selectedTotals.calories}
            burned={burnedPresentation.calories}
            burnedActionLabel={burnedPresentation.statusLabel}
            onBurnedPress={burnedPresentation.canOpenHealthRecovery
              ? () => router.push('/profile?tab=account&open=health')
              : undefined}
            target={target}
            colors={colors}
          />

          <View style={[styles.fuelSnapshot, { borderTopColor: colors.border }]}>
            <View style={styles.fuelSnapshotItem}>
              <Text style={[styles.fuelSnapshotValue, { color: colors.foreground }]}>{formatQuantity(selectedTotals.protein)}g</Text>
              <Text style={[styles.fuelSnapshotLabel, { color: colors.mutedForeground }]}>protein</Text>
            </View>
            <View style={styles.fuelSnapshotItem}>
              <Text style={[styles.fuelSnapshotValue, { color: colors.foreground }]}>{formatQuantity(selectedTotals.carbs)}g</Text>
              <Text style={[styles.fuelSnapshotLabel, { color: colors.mutedForeground }]}>carbs</Text>
            </View>
            <View style={styles.fuelSnapshotItem}>
              <Text style={[styles.fuelSnapshotValue, { color: colors.foreground }]}>{selectedWater}</Text>
              <Text style={[styles.fuelSnapshotLabel, { color: colors.mutedForeground }]}>fl oz water</Text>
            </View>
          </View>

          {/* Living-state action */}
          <ScalePressable
            accessibilityLabel={waterConfirmed ? 'Water added' : livingState.action.label}
            accessibilityRole="button"
            testID="living-state-action"
            disabled={waterConfirmed}
            onPress={handleLivingAction}
            scale={0.96}
            haptic="none"
            style={[styles.livingAction, isProgressAction && styles.livingActionSecondary, { backgroundColor: isProgressAction ? colors.muted : colors.primary, borderColor: isProgressAction ? colors.border : colors.primary, opacity: waterConfirmed ? 0.72 : 1 }]}
          >
             {waterConfirmed ? <Feather name="check" size={16} color={isProgressAction ? colors.foreground : colors.primaryForeground} /> : <CaloraFeatureIcon name={livingActionFeature} size={25} primaryColor={isProgressAction ? colors.foreground : colors.primaryForeground} accentColor={colors.accent} foregroundColor={isProgressAction ? colors.foreground : colors.primary} highlightColor={isProgressAction ? colors.card : colors.primaryForeground} />}
            <Text style={[styles.livingActionText, { color: isProgressAction ? colors.foreground : colors.primaryForeground }]}>
              {waterConfirmed ? 'Added ✓' : livingState.action.label}
            </Text>
            {!waterConfirmed && <Feather name="arrow-up-right" size={15} color={isProgressAction ? colors.foreground : colors.primaryForeground} />}
          </ScalePressable>
        </View>

        {isViewingToday && (
          <>
            <View testID="today-supporting-widgets-grid" style={styles.dashboardRows}>
              {supportingRows.map((row, rowIndex) => (
                <View key={`supporting-row-${rowIndex}`} style={[styles.dashboardWidgetRow, row.some((widgetId) => dashboardPreferences.density[widgetId] === 'expanded') && styles.dashboardExpandedWidgetRow]}>
                  {row.map((widgetId) => {
                    const expanded = dashboardPreferences.density[widgetId] === 'expanded';
                    const cellStyle = expanded ? styles.dashboardFullWidthCell : styles.dashboardGridCell;
                    if (widgetId === 'fasting') return <View key={widgetId} style={cellStyle}><DashboardFastingCard expanded={expanded} colors={colors} fontScale={fontScale} /></View>;
                    if (widgetId === 'steps') return <View key={widgetId} style={cellStyle}><StepsTodayCard expanded={expanded} colors={colors} tracking={liveStepTracking} dailyStepGoal={dailyStepGoal} healthConnection={healthConnection} onEnableLiveSteps={() => { void startLiveStepTracking(true); }} onRetryLiveSteps={() => { void startLiveStepTracking(); }} milestone={liveStepMilestones[0] ?? null} onDismissMilestone={dismissLiveStepMilestone} onOpenMotionSettings={() => { void openMotionSettings().catch((error) => Alert.alert('Open motion settings', error instanceof Error ? error.message : 'Could not open motion settings. Please try again.')); }} onOpenHealth={() => router.push('/profile?tab=account&open=health')} onOpenSteps={() => router.push({ pathname: '/steps' } as never)} /></View>;
                    if (widgetId === 'nutrients') return <View key={widgetId} style={cellStyle}><View testID="dashboard-macro-card" style={[styles.sectionCard, expanded && styles.dashboardHydrationFrame, expanded ? styles.macroExpandedCard : styles.dashboardGridCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.sectionHeader}><Text style={[styles.dashboardCardTitle, { color: colors.foreground }]}>Macros Balance</Text><ScalePressable accessibilityLabel="Edit nutrition goals" accessibilityRole="button" testID="edit-macro-goals" onPress={openMacroGoals} scale={0.9} haptic="none" style={[styles.sectionHeaderAction, { backgroundColor: colors.muted }]}><Feather name="sliders" size={17} color={colors.foreground} /></ScalePressable></View>{expanded ? <><AnimatedMacroBar expanded label="Protein" value={selectedTotals.protein} target={macroTargets.protein} color={colors.protein} colors={colors} /><AnimatedMacroBar expanded label="Carbs" value={selectedTotals.carbs} target={macroTargets.carbs} color={colors.carbs} colors={colors} /><AnimatedMacroBar expanded label="Fat" value={selectedTotals.fat} target={macroTargets.fat} color={colors.fat} colors={colors} /></> : <MacroBalanceDonut colors={supportingWidgetColors(colors)} protein={selectedTotals.protein} carbs={selectedTotals.carbs} fat={selectedTotals.fat} targets={macroTargets} />}</View></View>;
                    if (widgetId === 'mood') return <View key={widgetId} testID="dashboard-mood-card" style={cellStyle}><MoodCard expanded={expanded} compact={!expanded} colors={colors} mood={moodLogs[selectedDate]} onMood={(mood) => { setMood(selectedDate, mood); setSaveNotice('Mood check-in saved for this day.'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} /></View>;
                    return null;
                  })}
                </View>
              ))}
            </View>
            {postGridWidgetOrder.map((widgetId) => {
              if (!dashboardPreferences.visible.includes(widgetId)) return null;
              if (widgetId === 'progressSnapshot') {
                return <ProgressSnapshotCard key={widgetId} colors={colors} fontScale={fontScale} logs={logs} healthConnection={healthConnection} weights={weights} todayKey={todayKey} dailyStepGoal={dailyStepGoal} expanded={dashboardPreferences.density[widgetId] === 'expanded'} onOpenProgress={() => router.navigate('/(tabs)/insights')} />;
              }
              if (widgetId === 'water') {
                return <View key={widgetId} style={styles.dashboardWideSection}><WaterCard colors={colors} waterOunces={selectedWater} waterConfirmed={waterConfirmed} waterConfirmedAmount={waterConfirmedAmount} onOpenHydration={() => router.push('/hydration' as never)} onAddWater={(ounces) => { if (isWaterConfirmed()) { setWaterConfirmed(true); return; } addWater(selectedDate, ounces); setSaveNotice(`${ounces} fl oz added for this day.`); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); recordWaterConfirmation(); setWaterConfirmed(true); setWaterConfirmedAmount(ounces); }} onSubtractWater={() => { if (selectedWater <= 0) return; addWater(selectedDate, -8); setSaveNotice('8 fl oz removed from this day.'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} /></View>;
              }
              if (widgetId === 'recipes') {
                return <View key={widgetId} style={styles.recipeSection}><RecipeSwipeWidget colors={colors} onOpen={(recipe) => router.navigate({ pathname: '/(tabs)/recipes', params: { recipeId: recipe.id } })} onViewAll={() => router.navigate('/(tabs)/recipes')} /></View>;
              }
              if (widgetId === 'quickLog') {
                return <View key={widgetId} style={styles.quickLogSection} accessibilityLabel="Quick food logging actions"><View style={styles.quickActions}><IconButton feature="camera" label="Photo log" onPress={openPhotoLog} colors={colors} iconPrimaryColor={colors.primary} iconAccentColor={colors.warning} iconHighlightColor={colors.primaryForeground} /><IconButton feature="food" label="Search foods" onPress={() => openAdd('search')} colors={colors} iconPrimaryColor={colors.success} iconAccentColor={colors.protein} iconHighlightColor={colors.card} /><IconButton feature="restaurant" label="Restaurants" onPress={openRestaurants} colors={colors} iconPrimaryColor={colors.primary} iconAccentColor={colors.success} iconHighlightColor={colors.card} /></View></View>;
              }
              return <View key={widgetId} style={[styles.logCard, styles.dashboardWideSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.logCardHeader, { borderBottomColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today’s log' : 'Diary log'}</Text><ScalePressable onPress={() => openAdd()} accessibilityLabel="Add meal" scale={0.96} haptic="none" style={[styles.addMealButton, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.addMealText, { color: colors.primaryForeground }]}>Add</Text></ScalePressable></View>
                {!selectedLogs.length && <View style={styles.emptyDiary}><View style={[styles.emptyDiaryGlyph, { backgroundColor: colors.muted }]}><Feather name="calendar" size={22} color={colors.primary} /></View><Text style={[styles.emptyDiaryTitle, { color: colors.foreground }]}>No meals yet</Text><Text style={[styles.emptyDiaryBody, { color: colors.mutedForeground }]}>Add a meal. It stays here offline.</Text></View>}
                {mealOrder.map((meal) => { const mealLogs = selectedLogs.filter((log) => log.meal === meal); if (!mealLogs.length) return null; return <View key={meal}><Text style={[styles.mealGroup, { color: colors.mutedForeground }]}>{meal.toUpperCase()}</Text>{mealLogs.map((log, logIndex) => <Animated.View key={log.id} entering={enterMotion('component', logIndex)}><MealRow log={log} colors={colors} onEdit={() => setEditingLog(log)} onSave={() => saveLoggedMeal(log)} /></Animated.View>)}</View>; })}
              </View>;
            })}
          </>
        )}
        <View style={styles.footerNote}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>{syncState === 'needs-attention' ? 'Saved locally · backup needs attention' : syncState === 'needs-connection' ? 'Saved locally · sync pending' : syncState === 'local' ? 'Saved locally · ready to sync' : syncState === 'offline' ? 'Loading local diary…' : 'Verified core nutrition.'}</Text>
        </View>
        {todayInsight ? (
          <Surface tier="flat" radius="lg" testID="today-contextual-insight"
            accessibilityRole="summary"
            accessibilityLabel={`Today insight: ${formatCoachPlainText(todayInsight.title)}. ${todayInsightMessage}`}
            style={[styles.todayInsightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.todayInsightIcon, { backgroundColor: colors.accent }]}>
              <CaloraFeatureIcon name="rhythm" size={27} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} />
            </View>
            <View style={styles.todayInsightCopy}>
              <Text style={[styles.todayInsightTitle, { color: colors.foreground }]}>{formatCoachPlainText(todayInsight.title)}</Text>
              <Text style={[styles.todayInsightMessage, { color: colors.mutedForeground }]}>{todayInsightMessage}</Text>
            </View>
          </Surface>
        ) : null}

      </ScrollView>
      {hydrationError || isRetrying ? (
        <View style={[styles.hydrationRecoveryOverlay, { backgroundColor: colors.background }]}>
          <View accessibilityRole="alert" style={[styles.hydrationRecoveryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.hydrationRecoveryIcon, { backgroundColor: colors.muted }]}>
              {isRetrying ? <ActivityIndicator color={colors.primary} /> : <Feather name="refresh-cw" size={20} color={colors.primary} />}
            </View>
            <Text style={[styles.hydrationRecoveryTitle, { color: colors.foreground }]}>Today needs to reload</Text>
            <Text style={[styles.hydrationRecoveryMessage, { color: colors.mutedForeground }]}>{hydrationError ?? 'Reloading your saved diary data.'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading Today"
              accessibilityState={{ disabled: isRetrying, busy: isRetrying }}
              disabled={isRetrying}
              onPress={retryHydration}
              style={[styles.hydrationRecoveryButton, { backgroundColor: colors.primary, opacity: isRetrying ? 0.65 : 1 }]}
            >
              <Feather name="refresh-cw" size={15} color={colors.primaryForeground} />
              <Text style={[styles.hydrationRecoveryButtonText, { color: colors.primaryForeground }]}>{isRetrying ? 'Retrying…' : 'Try again'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <AddFoodModal visible={showAdd} entryDate={selectedDate} initialMode={addFoodMode} onClose={() => setShowAdd(false)} />
      <CalendarPicker
        visible={calendarVisible}
        selectedDate={selectedDate}
        month={calendarMonth}
        colors={colors}
        onMonthChange={setCalendarMonth}
        onSelect={selectCalendarDate}
        onClose={() => setCalendarVisible(false)}
      />
      <EditLogModal log={editingLog} onClose={() => setEditingLog(null)} />
      <MacroGoalsModal
        visible={macroGoalsVisible}
        draft={macroGoalDraft}
        colors={colors}
        onChange={setMacroGoalDraft}
        onClose={() => {
          setMacroGoalsVisible(false);
          setMacroGoalDraft(null);
        }}
        onSave={saveMacroGoals}
      />
      <LocalSaveNotice visible={Boolean(saveNotice)} message={saveNotice ?? ''} colors={colors} />
    </View>
  );
}

function makeStyles(f: number) {
  const h = (value: number) => value * TODAY_WIDGET_HEIGHT_SCALE;
  return StyleSheet.create({
   page: { flex: 1 },
   hydrationRecoveryOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, zIndex: 20 },
   hydrationRecoveryCard: { width: '100%', maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, alignItems: 'center', padding: 24 },
   hydrationRecoveryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
   hydrationRecoveryTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, textAlign: 'center' },
   hydrationRecoveryMessage: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18 * f, textAlign: 'center', marginTop: 8 },
   hydrationRecoveryButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 16, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
   hydrationRecoveryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
    homeHeader: { minHeight: 125 * MERGED_WIDGET_HEIGHT_SCALE, borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', marginHorizontal: -10, marginBottom: 0, backgroundColor: '#1b3022', shadowColor: '#17231f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },
    homeHeaderImage: { ...StyleSheet.absoluteFillObject, transform: [{ scale: 0.88 }] },
    homeHeaderScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 31, 24, 0.44)' },
  homeHeaderContent: { minHeight: 125 * MERGED_WIDGET_HEIGHT_SCALE, padding: 18, paddingLeft: 48, paddingBottom: 26 * MERGED_WIDGET_HEIGHT_SCALE, justifyContent: 'flex-end' },
  homeHeaderTop: { position: 'absolute', top: 8, left: 8, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeHeaderCustomize: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.3)', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 4 },
  homeHeaderThemeToggle: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderAvatar: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderAvatarText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 16 * f },
  homeHeaderCoach: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderCoachIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  homeHeaderCoachText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 11 * f, letterSpacing: 0.1 },
   homeHeaderDate: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 8 * f, letterSpacing: 0.5, textAlign: 'right', maxWidth: 146, textTransform: 'uppercase', transform: [{ translateY: -12 }] },
  homeHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_800ExtraBold', fontSize: 14.4 * f, letterSpacing: -0.4, transform: [{ translateX: 6 }, { translateY: 2 }] },
  homeHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_500Medium', fontSize: 11.2 * f, marginTop: 6, transform: [{ translateX: -9 }, { translateY: 11 }] },
  scrollContent: { paddingHorizontal: 20 },
  dashboardRows: { gap: 10, marginHorizontal: -18, marginBottom: h(18) },
  dashboardWidgetRow: { flexDirection: 'row', gap: 10, width: '100%' },
  dashboardExpandedWidgetRow: { width: 'auto', marginHorizontal: 8, marginBottom: 14 },
  dashboardTwoColumnGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginHorizontal: -18, marginBottom: h(18) },
  dashboardSingleColumnGrid: { flexDirection: 'column', gap: 10, marginHorizontal: -10, marginBottom: h(18) },
  dashboardHydrationFrame: { height: h(HYDRATION_WIDGET_HEIGHT), minHeight: h(HYDRATION_WIDGET_HEIGHT) },
  dashboardFullWidthCell: { width: '100%', minWidth: 0 },
  dashboardGridCell: { flexGrow: 0, flexShrink: 1, flexBasis: '49%', width: '49%', minWidth: 0, maxWidth: '49%' },
  dashboardSingleColumnCell: { width: '100%', maxWidth: '100%', minWidth: 0 },
  dashboardWideSection: { width: 'auto', marginHorizontal: -10 },
  progressSnapshotCard: { width: 'auto', marginHorizontal: -10, marginTop: h(12), borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: h(13.5), marginBottom: h(24), shadowColor: '#17231f', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  progressSnapshotCardExpanded: { paddingVertical: h(17), borderRadius: 24 },
  progressSnapshotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressSnapshotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  progressSnapshotIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  progressSnapshotTitleCopy: { flex: 1, minWidth: 0 },
  progressSnapshotTitle: { fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.25 },
  progressSnapshotSubtitle: { fontFamily: 'Inter_500Medium', marginTop: 2 },
  progressSnapshotHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: h(10), marginBottom: h(8) },
  progressSnapshotRing: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  progressSnapshotRingCopy: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  progressSnapshotRingValue: { fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  progressSnapshotRingLabel: { fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  progressSnapshotSummary: { flex: 1, minWidth: 0 },
  progressSnapshotSummaryValue: { fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.35 },
  progressSnapshotSummaryCopy: { fontFamily: 'Inter_500Medium', lineHeight: 14 * f, marginTop: 4 },
  progressSnapshotConsistency: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  progressSnapshotConsistencyText: { fontFamily: 'Inter_700Bold' },
  progressSnapshotMetrics: { flexDirection: 'row', gap: 8 },
  progressSnapshotMetric: { flex: 1, minWidth: 0, paddingTop: 8, paddingHorizontal: 7, paddingBottom: 7, borderRadius: 13 },
  progressSnapshotMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressSnapshotMetricDot: { width: 6, height: 6, borderRadius: 3 },
  progressSnapshotMetricLabel: { fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.35 },
  progressSnapshotMetricValue: { fontFamily: 'Inter_800ExtraBold', marginTop: 5, letterSpacing: -0.3 },
  progressSnapshotMetricDetail: { fontFamily: 'Inter_500Medium', marginTop: 2, minHeight: 11 },
  progressSnapshotMetricTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  progressSnapshotMetricFill: { height: 4, borderRadius: 2 },
  progressSnapshotAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, marginTop: h(10), paddingVertical: h(8.5) },
  progressSnapshotActionText: { fontFamily: 'Inter_700Bold' },
  dashboardGridCard: { flex: 1, alignSelf: 'stretch', height: h(SUPPORTING_WIDGET_BASE_HEIGHT), minHeight: h(SUPPORTING_WIDGET_BASE_HEIGHT), overflow: 'hidden', marginBottom: 0, paddingVertical: h(6), paddingHorizontal: 10, borderRadius: 18 },
  dashboardCardTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 * f, letterSpacing: -0.25 },
  dashboardFastingExpandedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 15, paddingVertical: h(13), marginBottom: 0, gap: h(5) },
  dashboardFastingExpandedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dashboardFastingExpandedMiddle: { flex: 1, justifyContent: 'center', minHeight: 0, paddingHorizontal: 2 },
  dashboardFastingExpandedStats: { gap: 1 },
  dashboardFastingExpandedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashboardFastingCard: { height: h(SUPPORTING_WIDGET_BASE_HEIGHT), minHeight: 0, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: h(7), marginBottom: 0, gap: h(3) },
  dashboardFastingTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  dashboardFastingIcon: { height: h(34), width: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dashboardFastingTitle: { fontFamily: 'Inter_800ExtraBold' },
  dashboardFastingMiddle: { flex: 1, justifyContent: 'center', minHeight: 0, paddingLeft: 40 },
  dashboardFastingCopy: { fontFamily: 'Inter_500Medium', marginTop: 3, lineHeight: 14 },
  dashboardFastingTrack: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: h(8) },
  dashboardFastingFill: { height: 7, borderRadius: 4 },
  dashboardFastingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  dashboardFastingPlan: { fontFamily: 'Inter_600SemiBold' },
  dashboardFastingAction: { fontFamily: 'Inter_700Bold' },
  dashboardCompactWidget: { marginBottom: -6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  dateKicker: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
  greeting: { fontFamily: 'Inter_800ExtraBold', fontSize: 28 * f, letterSpacing: -0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 17 * f },
    heroCard: { borderRadius: 24, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingVertical: h(16), paddingHorizontal: 20, marginHorizontal: -10, marginBottom: h(20), borderWidth: StyleSheet.hairlineWidth, shadowColor: '#17231f', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 },
   todayInsightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: h(16), marginTop: h(16), marginBottom: h(20), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
   todayInsightIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
   todayInsightCopy: { flex: 1, minWidth: 0 },
   todayInsightTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 * f, lineHeight: 16 * f },
    todayInsightMessage: { fontFamily: 'Inter_500Medium', fontSize: 10.4 * f, lineHeight: 15.2 * f, marginTop: 4 },
     fuelSnapshot: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13 * MERGED_WIDGET_HEIGHT_SCALE, marginTop: 22 * MERGED_WIDGET_HEIGHT_SCALE },
   fuelSnapshotItem: { flex: 1, alignItems: 'center' },
   fuelSnapshotValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 18 * f, letterSpacing: -0.4 },
   fuelSnapshotLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4, textAlign: 'center' },
     livingAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: h(36), width: '78%', alignSelf: 'center', borderRadius: 14, paddingHorizontal: 10, marginTop: h(32) },
   livingActionSecondary: { borderWidth: StyleSheet.hairlineWidth },
  livingActionText: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  livingRhythmCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: h(17), paddingHorizontal: 20, marginBottom: h(24), shadowColor: '#17231f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  livingRhythmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  livingRhythmIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  livingRhythmTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14.4 * f, letterSpacing: -0.3 },
  livingRhythmStage: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  livingRhythmStageText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, textTransform: 'capitalize' },
  livingRhythmSignals: { flexDirection: 'row', alignItems: 'center', marginTop: h(17) },
  livingRhythmSignal: { flex: 1 },
  livingRhythmValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 20 * f, letterSpacing: -0.4 },
  livingRhythmUnit: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  livingRhythmLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 4 },
  livingRhythmDivider: { width: 1, height: h(28), marginHorizontal: 16 },
  livingRhythmTracks: { flexDirection: 'row', gap: 14, marginTop: h(17) },
  livingRhythmTrackGroup: { flex: 1, gap: 6 },
  livingRhythmTrackLabel: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, textTransform: 'uppercase', letterSpacing: 0.8 },
  livingRhythmTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  livingRhythmFill: { height: 7, borderRadius: 4 },
  livingRhythmAddMealAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: h(10), marginTop: h(16) },
  stepsExpandedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: h(17), marginBottom: 0, shadowColor: '#17231f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  stepsExpandedHeader: { position: 'relative', minHeight: 36, alignItems: 'center', justifyContent: 'center', marginBottom: h(3) },
  stepsExpandedHeaderGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stepsExpandedHeaderAction: { position: 'absolute', right: 0, top: 2, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepsExpandedBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 18 },
  stepsExpandedSummary: { flex: 1, minWidth: 0, alignItems: 'flex-start', justifyContent: 'center' },
  stepsExpandedStatus: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, lineHeight: 14 * f },
  stepsCard: { flex: 1, alignSelf: 'stretch', height: h(SUPPORTING_WIDGET_BASE_HEIGHT), minHeight: 0, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: h(7), marginBottom: 0, shadowColor: '#17231f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  stepsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: h(8) },
  stepsIcon: { width: 36, height: h(36), borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepsCardTitleGroup: { flex: 1, minWidth: 0 },
  stepsCardTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  stepsCardStatus: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 2 },
  stepsLiveDot: { width: 8, height: 8, borderRadius: 4 },
  stepsCardBody: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flex: 1, minWidth: 0 },
  stepsSummary: { flex: 1, minWidth: 0, alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 0, paddingLeft: 8, paddingRight: 12 },
  stepsSummaryValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 19 * f, letterSpacing: -0.5 },
  stepsSummaryGoal: { fontFamily: 'Inter_500Medium', fontSize: 11 * f },
  stepsSummaryLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepsRing: { width: STEPS_RING_SIZE, height: STEPS_RING_SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  stepsRingCopy: { position: 'absolute', left: 22, right: 22, alignItems: 'center', justifyContent: 'center' },
  stepsRingValue: { alignSelf: 'stretch', fontFamily: 'Inter_800ExtraBold', fontSize: 28 * f, letterSpacing: -0.8, textAlign: 'center' },
  stepsRingLabel: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 0.6, marginTop: 1, textTransform: 'uppercase' },
  stepsRingGoal: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 1 },
  stepsBodyArrow: { position: 'absolute', right: 2, top: 2, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepsAction: { minHeight: h(36), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: h(4), paddingHorizontal: 8 },
  stepsExpandedAction: { alignSelf: 'flex-end', width: '52%', minHeight: h(30), marginTop: h(4), marginRight: 0, paddingHorizontal: 8, borderRadius: 10, gap: 4 },
  stepsActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
    quickLogSection: { marginBottom: h(28) },
    quickActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 },
    quickAction: { flex: 1, minWidth: 0, minHeight: h(76), alignItems: 'center', justifyContent: 'center', gap: 4 },
    quickActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, textAlign: 'center' },
  recipeWidget: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, paddingVertical: h(13), paddingHorizontal: 14, marginBottom: h(28), shadowColor: '#17231f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
   recipeSection: { marginTop: 4, marginHorizontal: -10 },
  recipeWidgetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: h(11) },
  recipeWidgetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  recipeWidgetHeadingCopy: { flex: 1, minWidth: 0 },
  recipeWidgetTitleHeading: { fontFamily: 'Inter_800ExtraBold', fontSize: 17 * f, letterSpacing: -0.25 },
  recipeWidgetSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 10.5 * f, marginTop: 3 },
  recipeWidgetViewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 34, paddingLeft: 8 },
  recipeWidgetViewAllText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  recipeWidgetHeaderActions: { alignItems: 'flex-end', gap: 8 },
  recipeWidgetNav: { flexDirection: 'row', gap: 6 },
  recipeWidgetNavButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recipeWidgetPages: { },
  recipeWidgetCard: { height: h(154), borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  recipeWidgetImage: { width: '100%', height: h(78) },
  recipeWidgetImageUnavailable: { width: '100%', height: h(78), alignItems: 'center', justifyContent: 'center' },
  recipeWidgetTopActions: { position: 'absolute', top: 8, right: 8 },
  recipeWidgetSaveButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recipeWidgetCopy: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  recipeWidgetTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 11.2 * f, lineHeight: 13.2 * f, letterSpacing: -0.15, flexShrink: 1 },
  recipeWidgetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2, marginTop: 3 },
  recipeWidgetMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 8.8 * f, lineHeight: 10.5 * f, flex: 1, minWidth: 0 },
  recipeWidgetAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeWidgetActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  recipeWidgetLoading: { height: h(120), alignItems: 'center', justifyContent: 'center', gap: 9 },
  recipeWidgetRetry: { minHeight: 44, minWidth: 144, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12 },
  recipeWidgetRetryText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 12 * f },
  wellnessSection: { gap: 14, marginBottom: h(28) },
  wellnessRow: { flexDirection: 'row', gap: 12 },
  wellnessCard: { flex: 1, minHeight: h(182), borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: h(16), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  waterFoodAccent: { position: 'absolute', right: 0, top: 0, width: 104, height: 76, borderTopRightRadius: 22, borderBottomLeftRadius: 34, overflow: 'hidden', opacity: 0.12 },
  waterFoodAccentImage: { width: '100%', height: '100%' },
  wellnessCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: h(14) },
  wellnessIcon: { width: 34, height: h(34), borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wellnessCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f, flexShrink: 1 },
  wellnessValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 22 * f, letterSpacing: -0.5 },
  wellnessUnit: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, letterSpacing: 0 },
   waterSlots: { flexDirection: 'row', alignItems: 'flex-end', gap: WATER_SLOTS_GAP, height: h(44 * (Platform.OS === 'android' ? ANDROID_WATER_CUP_SCALE : WATER_CUP_SCALE)), marginTop: h(8), marginBottom: h(8) },
   waterSlot: { flex: 1, height: h(50 * (Platform.OS === 'android' ? ANDROID_WATER_CUP_SCALE : WATER_CUP_SCALE)), alignItems: 'center', justifyContent: 'flex-end' },
  waterSummary: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  waterCupsLogged: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  mealsLoggedNames: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: h(14), minHeight: h(18) },
  wellnessAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: h(10), marginTop: 'auto' },
  wellnessActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  waterAdjustActions: { gap: 8, marginTop: h(4) },
  waterQuickActions: { flexDirection: 'row-reverse', gap: 8 },
  waterAdjustButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: h(10) },
  moodExpandedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: h(18), marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  moodOptionsExpanded: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  moodOptionExpanded: { minHeight: 0, height: h(52) },
  macroExpandedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: h(18), paddingHorizontal: 20, marginBottom: 0, shadowColor: '#17231f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  moodCard: { flex: 1, height: h(SUPPORTING_WIDGET_BASE_HEIGHT), minHeight: 0, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: h(7), marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  moodHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: h(5) },
  moodHeadingTitle: { flex: 1, minWidth: 0, fontFamily: 'Inter_800ExtraBold', fontSize: 11 * f, letterSpacing: -0.25, transform: [{ translateX: 3 }] },
  moodOptions: { flexDirection: 'row', gap: 4 },
  moodOptionsCompact: { flexWrap: 'wrap', columnGap: 3, rowGap: 3, justifyContent: 'center', alignContent: 'center', flex: 1 },
  moodOption: { flex: 1, minWidth: 0, minHeight: h(42), alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 1, gap: 3 },
  moodOptionCompact: { flexBasis: '31%', maxWidth: '31%', minHeight: h(38), flexGrow: 0 },
  moodOptionText: { flexShrink: 1, fontFamily: 'Inter_600SemiBold', fontSize: 8.5 * f, letterSpacing: -0.1 },
  moodOptionTextCompact: { fontSize: 5.8 * f, letterSpacing: -0.45 },
     heroDateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 * MERGED_WIDGET_HEIGHT_SCALE, marginBottom: 4 * MERGED_WIDGET_HEIGHT_SCALE, borderBottomWidth: StyleSheet.hairlineWidth },
   dateNavCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 3, minWidth: 150 },
   dateNavCenterLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateNavButton: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dateNavLabel: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  dateNavSub: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: 2 },
    backToToday: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 * MERGED_WIDGET_HEIGHT_SCALE },
   backToTodayText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
    calendarCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12 },
    calendarContent: { paddingBottom: 4 },
    sheetScroll: { flexShrink: 1, minHeight: 0 },
   calendarHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
   calendarTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 24 * f, letterSpacing: -0.6 },
   calendarSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, marginTop: 5 },
   calendarMonthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
   calendarMonthButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
   calendarMonthTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 * f },
   calendarWeekRow: { flexDirection: 'row', marginBottom: 8 },
   calendarWeekday: { width: '14.2857%', textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 0.5 },
   calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
   calendarDay: { width: '14.2857%', aspectRatio: 1, maxHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginBottom: 3 },
   calendarDayText: { fontFamily: 'Inter_700Bold', fontSize: 13 * f },
   calendarTodayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
   calendarTodayAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 12, marginTop: 14 },
   calendarTodayActionText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  sectionCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: h(18), paddingHorizontal: 20, marginBottom: h(28), shadowColor: '#17231f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: h(8) },
  sectionHeaderAction: { width: 38, height: h(38), borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20 * f, letterSpacing: -0.4 },
  macroDonutLayout: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  macroDonutWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  macroDonutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  macroDonutCenterTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 9 * f },
  macroDonutCenterSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 7 * f, marginTop: 1 },
  macroLegend: { flex: 1, minWidth: 0, gap: 4 },
  macroLegendRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 2 },
  macroLegendDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  macroLegendLabel: { fontFamily: 'Inter_700Bold', fontSize: 9.3 * f, width: 37, flexShrink: 0 },
  macroLegendValue: { fontFamily: 'Inter_600SemiBold', fontSize: 8.1 * f, flexShrink: 1, letterSpacing: -0.35 },
  sectionCaption: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, marginTop: 5 },
  macroBlock: { marginTop: 13 },
  macroBlockExpanded: { marginTop: h(4), gap: h(2) },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  macroHeaderExpanded: { marginBottom: 3 },
  macroLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
  macroValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
  macroTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  macroTrackExpanded: { height: 6 },
  macroFill: { height: 7, borderRadius: 4 },
   macroGoalScrollContent: {},
  macroGoalIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, padding: 14, marginBottom: 18 },
  macroGoalIntroText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 11 * f, lineHeight: 16 * f },
  macroGoalFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroGoalField: { flexGrow: 1, flexBasis: '45%', minWidth: 140 },
  macroGoalInputWrap: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12 },
  macroGoalInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: 'Inter_700Bold', fontSize: 15 * f },
  macroGoalUnit: { fontFamily: 'Inter_500Medium', fontSize: 9 * f },
  macroGoalError: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, lineHeight: 17 * f, marginTop: 14 },
  macroGoalCancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 6 },
  macroGoalCancelText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  mealHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 },
  addMealButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  addMealText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  logCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  logCardHeader: { minHeight: h(62), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  mealGroup: { fontFamily: 'Inter_700Bold', fontSize: 11 * f, letterSpacing: 1.2, marginTop: h(16), marginBottom: h(4), textTransform: 'uppercase' },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: h(14), borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  mealRowGlyph: { width: 36, height: h(36), borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1, minWidth: 0 },
  mealName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 * f },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  mealType: { fontFamily: 'Inter_500Medium', fontSize: 11 * f },
  mealCalories: { fontFamily: 'Inter_800ExtraBold', fontSize: 16 * f },
  kcalLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginLeft: -8, marginTop: 20 },
  emptyDiary: { alignItems: 'center', paddingVertical: h(28), gap: 6 },
   emptyDiaryGlyph: { width: 48, height: h(48), borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: h(4) },
  emptyDiaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 * f, marginTop: h(4) },
  emptyDiaryBody: { fontFamily: 'Inter_500Medium', fontSize: 12 * f, textAlign: 'center', maxWidth: 240 },
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  footerNoteText: { fontFamily: 'Inter_500Medium', fontSize: 9 * f },
  modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12 },
   addFoodModalCard: { height: '96%' },
   addFoodSheet: { flex: 1, minHeight: 0 },
  modalScrollContent: { paddingBottom: 4 },
   manualModeScroll: { flex: 1, minHeight: 0 },
  foodOptionsScroll: { flex: 1, minHeight: 0 },
  foodOptionsContent: { paddingBottom: 12 },
  manualEntryFooter: { paddingTop: 12, paddingBottom: 2, borderTopWidth: StyleSheet.hairlineWidth },
  editSheetContent: { paddingBottom: 4 },
  modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#9aa69e', alignSelf: 'center', marginBottom: 20 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 24 * f, letterSpacing: -0.6 },
  modalSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, marginTop: 5 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16, marginBottom: 16 },
  photoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 * f },
  photoSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 12 * f, marginTop: 5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 14, height: 50 },
  searchInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 * f },
  sectionEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11 * f, letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase' },
  foodSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  foodIcon: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  foodName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 * f },
  foodMeta: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: 5 },
  manualRow: { flexDirection: 'row', gap: 8, minWidth: 0 },
  manualFooterRow: { marginRight: 8 },
  manualInput: { flex: 1, minWidth: 0, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, height: 46, fontFamily: 'Inter_500Medium', fontSize: 13 * f },
  manualKcal: { width: 72, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 10, height: 46, fontFamily: 'Inter_500Medium', fontSize: 13 * f },
  manualAdd: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickAddFocus: { borderRadius: 22, padding: 18, marginTop: 4 },
  quickAddFocusTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18 * f, marginTop: 10 },
  quickAddFocusBody: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, lineHeight: 18 * f, marginTop: 5, marginBottom: 18 },
  manualError: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, lineHeight: 18 * f, marginTop: 8 },
  captureModes: { flexDirection: 'row', borderRadius: 15, padding: 5, marginBottom: 15, gap: 4 },
  captureMode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 9 },
  captureModeText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  unavailableCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 14, marginBottom: 14 },
  unavailableTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  unavailableBody: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, lineHeight: 16, marginTop: 4 },
  useText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  savedMealRow: { gap: 10, paddingVertical: 6, paddingBottom: 14 },
  savedMealChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9, minWidth: 150 },
  savedMealName: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  savedMealMeta: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 3 },
  editCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12 },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 11 * f, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  editInput: { height: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, fontFamily: 'Inter_500Medium', fontSize: 14 * f, marginBottom: 14 },
  editError: { fontFamily: 'Inter_500Medium', fontSize: 12 * f, lineHeight: 17 * f, marginTop: -6, marginBottom: 10 },
  editFields: { flexDirection: 'row', gap: 10 },
  mealPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  mealChoice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  mealChoiceText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  saveEntry: { alignItems: 'center', borderRadius: 15, paddingVertical: 14, marginTop: 16 },
  saveEntryText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 * f },
  });
}
const styles = makeStyles(1.0);
