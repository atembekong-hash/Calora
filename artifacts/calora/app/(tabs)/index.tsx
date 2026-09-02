import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { ScalePressable } from '@/components/ScalePressable';
import { Surface } from '@/components/Surface';
import { CaloraFeatureIcon, type CaloraFeatureIconName } from '@/components/CaloraFeatureIcon';
import { AppHeader } from '@/components/AppChrome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useListRecipes, type Recipe } from '@workspace/api-client-react';
import { useCalora, FoodLog, MealType, Mood } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import { enterMotion } from '@/lib/motion';
import { mealOrder, verifiedFoods } from '@/data/foods';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PlannerPeek } from '@/components/PlannerPeek';
import { formatLogTime } from '@/lib/dates';

function RecipeWidgetImage({ recipe }: { recipe: Recipe }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [recipe.id, recipe.image]);
  return (
    <Image
      accessibilityLabel={`${recipe.name} recipe image`}
      source={recipe.image && !failed ? { uri: recipe.image } : require('../../assets/images/calora-recipes-header.jpg')}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
      placeholder={require('../../assets/images/calora-recipes-header.jpg')}
      recyclingKey={`${recipe.id}:${recipe.image ?? 'fallback'}`}
      style={styles.recipeWidgetImage}
    />
  );
}
import { FoodLogThumbnail } from '@/components/FoodLogThumbnail';
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

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Calorie gauge geometry — computed once at module load, stable across renders
const GAUGE_VBW = 260;
const GAUGE_VBH = 186;
const GAUGE_CX  = 130;
const GAUGE_CY  = 118;
const GAUGE_R   = 90;
const GAUGE_STROKE = 13;
const GAUGE_START  = 135; // °from positive x-axis (SVG y-down, clockwise)
const GAUGE_SWEEP  = 270;
const GAUGE_HEIGHT_SCALE = 0.72;
const GAUGE_ARC_LEN = (GAUGE_SWEEP / 360) * 2 * Math.PI * GAUGE_R; // ≈ 424.1 px
const CALORIE_RING_SCALE = 1.2;
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
    <BottomSheet visible={visible} onRequestClose={onClose} overlayColor="rgba(0,0,0,0.42)" sheetStyle={[styles.calendarCard, { backgroundColor: colors.background }]}>
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
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  livingState: ReturnType<typeof useCalora>['livingState'];
  waterOunces: number;
  mealsLogged: number;
  selectedDate: string;
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
    </View>
  );
}

function RecipeSwipeWidget({ colors, onOpen }: { colors: ReturnType<typeof useCalora>['colors']; onOpen: (recipe: Recipe) => void }) {
  const { data, isLoading, isError } = useListRecipes({ limit: 6, offset: 0 }, { query: { queryKey: ['dashboard-recipes'], staleTime: 1000 * 60 * 10, refetchInterval: (query) => (query.state.data as ({ warmupPending?: boolean } | undefined))?.warmupPending ? 15_000 : false } });
  const recipes = data?.recipes ?? [];
  const carouselRef = React.useRef<FlatList<Recipe>>(null);
  const autoScrollFrameRef = React.useRef<number | null>(null);
  const [activeRecipe, setActiveRecipe] = useState(0);
  const pageWidth = 322;
  const snapToRecipe = (nextIndex: number) => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
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
    if (recipes.length <= 1) return;
    const timer = setTimeout(() => {
      smoothlyAdvanceToRecipe(activeRecipe >= recipes.length - 1 ? 0 : activeRecipe + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeRecipe, recipes.length]);

  if (isError || (!isLoading && recipes.length === 0)) return null;

  return (
    <View style={[styles.recipeWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.recipeWidgetHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recipes</Text>
        </View>
        <View style={styles.recipeWidgetHeaderActions}>
          {recipes.length > 1 && <View style={styles.recipeWidgetNav}>
            <ScalePressable accessibilityLabel="Previous dashboard recipe" onPress={() => snapToRecipe(activeRecipe - 1)} scale={0.95} haptic="none" style={[styles.recipeWidgetNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={15} color={colors.foreground} /></ScalePressable>
            <ScalePressable accessibilityLabel="Next dashboard recipe" onPress={() => snapToRecipe(activeRecipe + 1)} scale={0.95} haptic="none" style={[styles.recipeWidgetNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={15} color={colors.foreground} /></ScalePressable>
          </View>}
        </View>
      </View>
      {isLoading ? (
        <View style={styles.recipeWidgetLoading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Finding recipes…</Text></View>
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
          onMomentumScrollEnd={(event) => {
            const next = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.x / pageWidth), recipes.length - 1));
            setActiveRecipe(next);
          }}
          renderItem={({ item: recipe }) => (
            <View style={[styles.recipeWidgetCard, { backgroundColor: colors.hero }]}>
              <RecipeWidgetImage recipe={recipe} />
              <LinearGradient colors={['rgba(18,34,24,0.08)', 'rgba(18,34,24,0.88)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.recipeWidgetCopy}>
                <Text style={styles.recipeWidgetEyebrow}>{recipe.area ? `${recipe.area.toUpperCase()} · OPEN SOURCE` : 'OPEN SOURCE RECIPE'}</Text>
                <Text numberOfLines={2} style={styles.recipeWidgetTitle}>{recipe.name}</Text>
                <View style={styles.recipeWidgetFooter}>
                  <Text style={styles.recipeWidgetMeta}>{recipe.calories ? `${Math.round(recipe.calories)} kcal` : 'Nutrition review needed'}</Text>
                  <ScalePressable accessibilityLabel={`View recipe details for ${recipe.name}`} onPress={() => onOpen(recipe)} scale={0.98} haptic="none" style={styles.recipeWidgetAction}>
                    <Text style={styles.recipeWidgetActionText}>View details</Text>
                    <Feather name="arrow-up-right" size={13} color="#ffffff" />
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

function WaterCard({
  colors,
  waterOunces,
  waterConfirmed,
  waterConfirmedAmount,
  onAddWater,
  onSubtractWater,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  waterOunces: number;
  waterConfirmed: boolean;
  waterConfirmedAmount: number | null;
  onAddWater: (ounces: number) => void;
  onSubtractWater: () => void;
}) {
  const waterGoal = 64;
  const normalizedWater = Math.max(0, waterOunces);
  const filledGlasses = Math.min(Math.ceil(normalizedWater / 8), waterGoal / 8);
  const cupsLogged = Math.floor(normalizedWater / 8);

  return (
    <View style={styles.wellnessSection} accessibilityLabel={`Water tracking: ${normalizedWater} fluid ounces, ${cupsLogged} cups logged`}>
      <View style={[styles.wellnessCard, { flex: 0, width: '100%', minHeight: 221, backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.wellnessCardHeader}>
          <View style={[styles.wellnessIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="water" size={26} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /></View>
          <Text style={[styles.wellnessCardTitle, { color: colors.foreground }]}>Water</Text>
        </View>
        <View style={styles.waterSummary}>
          <Text style={[styles.wellnessValue, { color: colors.foreground }]}>{normalizedWater} <Text style={[styles.wellnessUnit, { color: colors.mutedForeground }]}>/ {waterGoal} fl oz</Text></Text>
          <Text style={[styles.waterCupsLogged, { color: colors.mutedForeground }]}>{cupsLogged} cups logged</Text>
        </View>
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

function WellnessCards({
  colors,
  mealsLogged,
  mealNames,
  onAddMeal,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  mealsLogged: number;
  mealNames: string[];
  onAddMeal: () => void;
}) {
  return (
    <View style={styles.wellnessSection}>
      <View style={styles.wellnessRow}>
        <View style={[styles.wellnessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.wellnessCardHeader}>
            <View style={[styles.wellnessIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="food" size={26} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /></View>
            <Text style={[styles.wellnessCardTitle, { color: colors.foreground }]}>Meals logged</Text>
          </View>
          <Text style={[styles.wellnessValue, { color: colors.foreground }]}>{mealsLogged} <Text style={[styles.wellnessUnit, { color: colors.mutedForeground }]}>/ 4 today</Text></Text>
          <Text numberOfLines={1} style={[styles.mealsLoggedNames, { color: colors.mutedForeground }]}>{mealNames.length ? mealNames.join(' · ') : 'No meals logged yet'}</Text>
          <ScalePressable accessibilityLabel="Add a meal from the meals logged card" testID="wellness-add-meal-button" onPress={onAddMeal} haptic="none" scale={0.96} style={[styles.wellnessAction, { backgroundColor: colors.accent }]}>
            <Feather name="plus" size={13} color={colors.accentForeground} /><Text style={[styles.wellnessActionText, { color: colors.accentForeground }]}>Add meal</Text>
          </ScalePressable>
        </View>
      </View>
    </View>
  );
}

function MoodCard({
  colors,
  mood,
  onMood,
}: {
  colors: ReturnType<typeof useCalora>['colors'];
  mood?: Mood;
  onMood: (mood: Mood) => void;
}) {
  return (
    <View style={[styles.moodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.moodHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How are you feeling?</Text>
        </View>
        <View style={[styles.wellnessIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="mood" size={26} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} /></View>
      </View>
      <View style={styles.moodOptions}>
        {moodOptions.map((item) => {
          const selected = mood === item.value;
          return (
            <ScalePressable key={item.value} accessibilityLabel={`Log mood ${item.label}`} testID={`mood-${item.value}`} onPress={() => onMood(item.value)} scale={0.98} haptic="none" style={[styles.moodOption, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}>
              <Feather name={item.icon} size={15} color={selected ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.moodOptionText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{item.label}</Text>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedMacroBar({ label, value, target, color, colors }: { label: string; value: number; target: number; color: string; colors: ReturnType<typeof useCalora>['colors'] }) {
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
      accessibilityLabel={`${label}: ${formatQuantity(value, 1)} grams consumed of ${formatQuantity(target, 1)} gram target.`}
      style={styles.macroBlock}
    >
      <View style={styles.macroHeader}>
        <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text testID={`macro-target-${label.toLowerCase()}`} style={[styles.macroValue, { color: colors.foreground }]}>{formatQuantity(value, 1)}g <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>/ {formatQuantity(target, 1)}g</Text></Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.muted }]} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
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
        <Svg width={38.5} height={44} viewBox="0 0 24 28">
        <Path d="M4 5h16l-1.5 18H5.5L4 5Z" fill={cupFill} stroke={cupStroke} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M3 4h18" stroke={cupStroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M7 13h10l-.8 8H7.8L7 13Z" fill={filled ? '#b9d7ff' : 'transparent'} opacity={0.72} />
      </Svg>
    </Animated.View>
  );
}

function MealRow({ log, colors, onEdit }: { log: FoodLog; colors: ReturnType<typeof useCalora>['colors']; onEdit: () => void }) {
  const recordedAt = log.syncUpdatedAt ?? log.nutritionSnapshot?.capturedAt;
  const displayedTime = log.time === 'Just now' && recordedAt
    ? formatLogTime(new Date(recordedAt))
    : log.time;
  return (
    <ScalePressable accessibilityLabel={`Edit ${log.name}`} onPress={onEdit} scale={0.98} haptic="none" style={[styles.mealRow, { borderBottomColor: colors.border }]}>
      <FoodLogThumbnail log={log} />
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
    <BottomSheet visible={visible} onRequestClose={handleClose} overlayColor="rgba(0,0,0,0.42)" sheetStyle={[styles.modalCard, { backgroundColor: colors.background }]}>
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
                        if (draft) onChange({ ...draft, [field.key]: value });
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

function EditLogModal({ log, onClose }: { log: FoodLog | null; onClose: () => void }) {
  const { colors, updateLog, removeLog } = useCalora();
  const [name, setName] = useState(log?.name ?? '');
  const [calories, setCalories] = useState(log ? `${log.calories}` : '');
  const [meal, setMeal] = useState<MealType>(log?.meal ?? 'Snack');
  const [serving, setServing] = useState(log?.serving ?? '1 serving');

  React.useEffect(() => {
    if (!log) return;
    setName(log.name);
    setCalories(`${log.calories}`);
    setMeal(log.meal);
    setServing(log.serving);
  }, [log]);

  const save = () => {
    if (!log || !name.trim() || !Number(calories) || Number(calories) < 0) return;
    updateLog(log.id, { name: name.trim(), calories: Number(calories), meal, serving });
    onClose();
  };

  return (
    <BottomSheet visible={log !== null} onRequestClose={onClose} overlayColor="rgba(0,0,0,0.42)" sheetStyle={[styles.editCard, { backgroundColor: colors.background }]}>
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
          <TextInput value={name} onChangeText={setName} style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} />
          <View style={styles.editFields}>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Calories</Text><TextInput value={calories} onChangeText={setCalories} keyboardType="number-pad" style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Serving</Text><TextInput value={serving} onChangeText={setServing} style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} /></View>
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>Meal</Text>
          <View style={styles.mealPicker}>{mealOrder.map((item) => <ScalePressable key={item} onPress={() => setMeal(item)} scale={0.95} haptic="none" style={[styles.mealChoice, { backgroundColor: meal === item ? colors.primary : colors.card, borderColor: meal === item ? colors.primary : colors.border }]}><Text style={[styles.mealChoiceText, { color: meal === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></ScalePressable>)}</View>
          <ScalePressable accessibilityLabel="Save edited entry" onPress={save} scale={0.96} haptic="light" style={[styles.saveEntry, { backgroundColor: colors.primary }]}><Text style={[styles.saveEntryText, { color: colors.primaryForeground }]}>Save changes</Text></ScalePressable>
          <ScalePressable accessibilityLabel="Delete edited entry" onPress={() => { if (log) { removeLog(log.id); onClose(); } }} scale={0.98} haptic="none" style={styles.deleteEntry}><Feather name="trash-2" size={15} color={colors.destructive} /><Text style={[styles.deleteEntryText, { color: colors.destructive }]}>Delete this entry</Text></ScalePressable>
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
      meal: 'Dinner',
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

  const addManual = () => {
    const kcal = Number(customCalories);
    if (!customName.trim()) {
      setManualError('Add a food name before saving.');
      return;
    }
    if (!Number.isFinite(kcal) || kcal <= 0) {
      setManualError('Enter calories greater than zero.');
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
    <BottomSheet visible={visible} onRequestClose={onClose} overlayColor="rgba(0,0,0,0.42)" sheetStyle={[styles.modalCard, styles.addFoodModalCard, { backgroundColor: colors.background }]}>
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bottomOffset={80}
            stickyHeaderIndices={initialMode === 'manual' ? undefined : [2]}
            contentContainerStyle={styles.modalScrollContent}
          >
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
              <View style={[styles.quickAddFocus, { backgroundColor: colors.accent }]}>
                <CaloraFeatureIcon name="food" size={38} primaryColor={colors.carbs} accentColor={colors.primary} foregroundColor={colors.foreground} highlightColor={colors.card} />
                <Text style={[styles.quickAddFocusTitle, { color: colors.foreground }]}>Add a food manually</Text>
                <Text style={[styles.quickAddFocusBody, { color: colors.mutedForeground }]}>For foods outside the verified list.</Text>
                <View style={styles.manualRow}>
                  <TextInput accessibilityLabel="Manual food name" value={customName} onChangeText={(value) => { setCustomName(value); setManualError(null); }} placeholder="Food name" placeholderTextColor={colors.mutedForeground} style={[styles.manualInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                  <TextInput accessibilityLabel="Manual food calories" value={customCalories} onChangeText={(value) => { setCustomCalories(value); setManualError(null); }} placeholder="kcal" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.manualKcal, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                  <ScalePressable accessibilityLabel="Add manual food" onPress={addManual} scale={0.96} haptic="light" style={[styles.manualAdd, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={20} color={colors.primaryForeground} />
                  </ScalePressable>
                </View>
                {manualError ? <Text accessibilityLiveRegion="polite" style={[styles.manualError, { color: colors.destructive }]}>{manualError}</Text> : null}
              </View>
            ) : (
              <>
                <View style={[styles.manualEntrySection, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>MANUAL</Text>
                  <View style={styles.manualRow}>
                    <TextInput accessibilityLabel="Manual food name" value={customName} onChangeText={(value) => { setCustomName(value); setManualError(null); }} placeholder="Food name" placeholderTextColor={colors.mutedForeground} style={[styles.manualInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                    <TextInput accessibilityLabel="Manual food calories" value={customCalories} onChangeText={(value) => { setCustomCalories(value); setManualError(null); }} placeholder="kcal" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.manualKcal, { color: colors.foreground, backgroundColor: colors.card, borderColor: manualError ? colors.destructive : colors.input }]} />
                    <ScalePressable accessibilityLabel="Add manual food" onPress={addManual} scale={0.96} haptic="light" style={[styles.manualAdd, { backgroundColor: colors.primary }]}>
                      <Feather name="plus" size={20} color={colors.primaryForeground} />
                    </ScalePressable>
                  </View>
                  {manualError ? <Text accessibilityLiveRegion="polite" style={[styles.manualError, { color: colors.destructive }]}>{manualError}</Text> : null}
                </View>
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
                  <ScalePressable accessibilityLabel="Voice food logging" onPress={() => setCaptureMode('voice')} scale={0.95} haptic="none" style={[styles.captureMode, captureMode === 'voice' && { backgroundColor: colors.card }]}><CaloraFeatureIcon name="voice" size={22} primaryColor={captureMode === 'voice' ? colors.primary : colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.captureModeText, { color: captureMode === 'voice' ? colors.foreground : colors.mutedForeground }]}>Voice</Text></ScalePressable>
                  <ScalePressable accessibilityLabel="Barcode food logging" onPress={() => setCaptureMode('barcode')} scale={0.95} haptic="none" style={[styles.captureMode, captureMode === 'barcode' && { backgroundColor: colors.card }]}><CaloraFeatureIcon name="barcode" size={22} primaryColor={captureMode === 'barcode' ? colors.primary : colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.captureModeText, { color: captureMode === 'barcode' ? colors.foreground : colors.mutedForeground }]}>Barcode</Text></ScalePressable>
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
              </>
            )}
          </KeyboardAwareScrollViewCompat>
    </BottomSheet>
  );
}

function CalorieGauge({
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
  const gaugeH     = gaugeW * (GAUGE_VBH / GAUGE_VBW) * GAUGE_HEIGHT_SCALE;
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
  const overlayTop = ((GAUGE_CY - GAUGE_R + GAUGE_STROKE / 2 + 32) / GAUGE_VBH) * gaugeH * CALORIE_RING_SCALE + ringTop;

  return (
    <View style={gaugeStyles.container}>
      {/* ── Full-width SVG arc + centred text ── */}
      <View style={[gaugeStyles.arcWrap, { width: gaugeW, height: gaugeH }]}>
        <View pointerEvents="none" style={[gaugeStyles.ringLayer, { width: ringW, height: ringH, left: ringLeft, top: ringTop }]}>
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
            {remaining.toLocaleString()}
          </Text>
          <Text style={[gaugeStyles.kcalLeft, { color: colors.mutedForeground }]}>kcal left</Text>
          <Text style={[gaugeStyles.goalText, { color: colors.mutedForeground }]}>
            Goal {target.toLocaleString()} kcal
          </Text>
        </View>
      </View>

      {/* ── Eaten / Burned row beneath the gauge ── */}
      <View style={gaugeStyles.statsRow}>
        <View style={gaugeStyles.statItem}>
          <Text style={[gaugeStyles.statNumber, { color: colors.foreground }]} adjustsFontSizeToFit numberOfLines={1}>
            {consumed.toLocaleString()}
          </Text>
          <Text style={[gaugeStyles.statLabel, { color: colors.mutedForeground }]}>Eaten</Text>
        </View>
        <View style={[gaugeStyles.statDivider, { backgroundColor: colors.border }]} />
        <Pressable
          accessibilityRole={onBurnedPress ? 'button' : undefined}
          accessibilityLabel={burnedActionLabel ?? `Burned ${burned?.toLocaleString() ?? 'unavailable'} calories`}
          disabled={!onBurnedPress}
          onPress={onBurnedPress}
          style={gaugeStyles.statItem}
        >
          <Text style={[gaugeStyles.statNumber, { color: colors.foreground }]}>
            {burned === null ? '—' : burned.toLocaleString()}
          </Text>
          <Text style={[gaugeStyles.statLabel, { color: colors.mutedForeground }]}>Burned</Text>
          {burnedActionLabel ? <Text style={[gaugeStyles.burnedAction, { color: colors.primary }]} numberOfLines={1}>{burnedActionLabel}</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

function makeGaugeStyles(f: number) {
  return StyleSheet.create({
  container: { marginTop: 14, marginBottom: 4, alignItems: 'center' },
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
  statsRow:  { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 32, marginTop: 6 },
  statItem:  { alignItems: 'center' as const },
  statDivider: { width: 1, height: 28 },
  statNumber: { fontFamily: 'Inter_700Bold', fontSize: 22 * f, letterSpacing: -0.6 },
  statLabel:  { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  burnedAction: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 4, maxWidth: 140, textAlign: 'center' as const },
  });
}
const gaugeStyles = makeGaugeStyles(1.0);

export default function HomeScreen() {
  const {
    logs, colors, profile, syncState, waterLogs, moodLogs, addWater, setMood,
    livingState, fontScale, profilePhotoUri, healthConnection, weights,
    activityLogs, activityMinutesLogs, plannerMeals, shoppingItems, localRecipes, hydrated,
    updateProfile,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const gaugeStyles = useMemo(() => makeGaugeStyles(fontScale), [fontScale]);
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const [showAdd, setShowAdd] = useState(false);
  const [addFoodMode, setAddFoodMode] = useState<AddFoodEntryMode>('search');
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
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
  const selectedTotals = useMemo(() => selectedLogs.reduce((sum, log) => ({
    calories: sum.calories + log.calories,
    protein: sum.protein + log.protein,
    carbs: sum.carbs + log.carbs,
    fat: sum.fat + log.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [selectedLogs]);
  const mealsLogged = new Set(selectedLogs.map((log) => log.meal)).size;
  const mealNames = Array.from(new Set(selectedLogs.map((log) => log.meal)));
  const burnedStatus = burnedStatusForDay({ isToday: isToday(selectedDate), connection: healthConnection, now: new Date() });
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
  const todayInsightMessage = todayInsight?.message
    ?.replace('Across your logged 28-day comparison window, ', '')
    .replace(' local-calendar', '')
    .replace('today’s logged calories', 'logged calories')
    .replace('while more than half of daily calories are logged.', 'after half your calories are logged.');

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
    setSelectedDate(date);
    setCalendarVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const goToToday = () => {
    setSelectedDate(dateKey(new Date()));
    setCalendarVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const saveMacroGoals = (values: MacroTargets) => {
    updateProfile({
      calorieTarget: values.calories,
      proteinTargetGrams: values.protein,
      carbsTargetGrams: values.carbs,
      fatTargetGrams: values.fat,
    });
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
              style={[styles.homeHeaderAvatar, { backgroundColor: colors.muted, borderColor: colors.border }, profilePhotoUri ? { padding: 0, overflow: 'hidden' } : {}]}
            >
              {profilePhotoUri
                ? <Image source={{ uri: profilePhotoUri }} style={{ width: 38, height: 38 }} contentFit="cover" />
                : <Text style={[styles.homeHeaderAvatarText, { color: colors.foreground }]}>{profile?.name?.charAt(0) ?? 'A'}</Text>}
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 14, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <Image source={require('../../assets/images/calora-home-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.72)', 'rgba(18,34,24,0.16)']} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.homeHeaderContent}>
            <View style={styles.homeHeaderTop}>
                <View style={[styles.homeHeaderBadge, { transform: [{ translateX: -8 }, { translateY: -8 }] }]}><CaloraFeatureIcon name="rhythm" size={20} primaryColor="#d4eadc" accentColor="#9dd7bd" foregroundColor="#143f34" highlightColor="#f7fff9" /></View>
              <Text style={styles.homeHeaderDate}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <Text style={styles.homeHeaderTitle}>{livingState.greeting}, {profile?.name?.split(' ')[0] ?? 'there'}</Text>
            <Text style={styles.homeHeaderSubtitle}>{livingState.message}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroDateNav, { borderBottomColor: colors.border }]}>
            <Pressable accessibilityLabel="Previous diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() - 1); setSelectedDate(dateKey(date)); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={17} color={colors.foreground} /></Pressable>
             <Pressable accessibilityLabel={`Open calendar for ${isToday(selectedDate) ? 'today' : formatShortDate(selectedDate)}`} testID="open-calendar-date-picker" onPress={openCalendar} style={styles.dateNavCenter}>
               <View style={styles.dateNavCenterLine}>
                 <Text style={[styles.dateNavLabel, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today' : formatShortDate(selectedDate)}</Text>
                 <Feather name="calendar" size={14} color={colors.primary} />
               </View>
               <Text style={[styles.dateNavSub, { color: colors.mutedForeground }]}>Viewing {selectedDate}</Text>
             </Pressable>
            <Pressable accessibilityLabel="Next diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() + 1); setSelectedDate(dateKey(date)); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={17} color={colors.foreground} /></Pressable>
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
            burned={burnedStatus.kind === 'ready' ? burnedStatus.calories : null}
            burnedActionLabel={burnedStatus.kind === 'ready' ? undefined : burnedStatus.actionLabel}
            onBurnedPress={burnedStatus.kind === 'connect' || burnedStatus.kind === 'permission' || burnedStatus.kind === 'failed' || burnedStatus.kind === 'syncing'
              ? () => router.push('/profile?tab=account')
              : undefined}
            target={target}
            colors={colors}
          />

          <View style={[styles.fuelSnapshot, { borderTopColor: colors.border }]}>
            <View style={styles.fuelSnapshotItem}>
              <Text style={[styles.fuelSnapshotValue, { color: colors.foreground }]}>{formatQuantity(selectedTotals.protein, 1)}g</Text>
              <Text style={[styles.fuelSnapshotLabel, { color: colors.mutedForeground }]}>protein</Text>
            </View>
            <View style={styles.fuelSnapshotItem}>
              <Text style={[styles.fuelSnapshotValue, { color: colors.foreground }]}>{formatQuantity(selectedTotals.carbs, 1)}g</Text>
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

        <View style={styles.quickLogSection} accessibilityLabel="Quick food logging actions">
          <View style={styles.quickActions}>
            <IconButton feature="camera" label="Photo log" onPress={openPhotoLog} colors={colors} iconPrimaryColor={colors.primary} iconAccentColor={colors.warning} iconHighlightColor={colors.primaryForeground} />
            <IconButton feature="food" label="Search foods" onPress={() => openAdd('search')} colors={colors} iconPrimaryColor={colors.success} iconAccentColor={colors.protein} iconHighlightColor={colors.card} />
            <IconButton feature="restaurant" label="Restaurants" onPress={openRestaurants} colors={colors} iconPrimaryColor={colors.primary} iconAccentColor={colors.success} iconHighlightColor={colors.card} />
          </View>
        </View>

        <WaterCard
          colors={colors}
          waterOunces={selectedWater}
          waterConfirmed={waterConfirmed}
          waterConfirmedAmount={waterConfirmedAmount}
          onAddWater={(ounces) => {
            // isWaterConfirmed is the synchronous authority for the 1.5-second
            // window. The React state remains responsible for the visual
            // confirmation, but cannot alone protect against a double tap in
            // the same render frame.
            if (isWaterConfirmed()) {
              setWaterConfirmed(true);
              return;
            }
            addWater(selectedDate, ounces);
            setSaveNotice(`${ounces} fl oz added for this day.`);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            recordWaterConfirmation();
            setWaterConfirmed(true);
            setWaterConfirmedAmount(ounces);
          }}
          onSubtractWater={() => {
            if (selectedWater <= 0) return;
            addWater(selectedDate, -8);
            setSaveNotice('8 fl oz removed from this day.');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Macro balance</Text>
            </View>
            <ScalePressable
              accessibilityLabel="Edit nutrition goals"
              accessibilityRole="button"
              testID="edit-macro-goals"
              onPress={openMacroGoals}
              scale={0.9}
              haptic="none"
              style={[styles.sectionHeaderAction, { backgroundColor: colors.muted }]}
            >
              <Feather name="sliders" size={17} color={colors.mutedForeground} />
            </ScalePressable>
          </View>
          <AnimatedMacroBar label="Protein" value={selectedTotals.protein} target={macroTargets.protein} color={colors.protein} colors={colors} />
          <AnimatedMacroBar label="Carbs" value={selectedTotals.carbs} target={macroTargets.carbs} color={colors.carbs} colors={colors} />
          <AnimatedMacroBar label="Fat" value={selectedTotals.fat} target={macroTargets.fat} color={colors.fat} colors={colors} />
        </View>

        <MoodCard
          colors={colors}
          mood={moodLogs[selectedDate]}
          onMood={(mood) => { setMood(selectedDate, mood); setSaveNotice('Mood check-in saved for this day.'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
        />

        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.logCardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today’s log' : 'Diary log'}</Text>
            <ScalePressable onPress={() => openAdd()} accessibilityLabel="Add meal" scale={0.96} haptic="none" style={[styles.addMealButton, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={14} color={colors.primaryForeground} />
              <Text style={[styles.addMealText, { color: colors.primaryForeground }]}>Add</Text>
            </ScalePressable>
          </View>
          {!selectedLogs.length && <View style={styles.emptyDiary}><View style={styles.emptyDiaryVisual}><Image source={require('../../assets/images/calora-home-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} /><LinearGradient colors={['rgba(18,34,24,0.1)', 'rgba(18,34,24,0.68)']} style={StyleSheet.absoluteFillObject} /></View><Feather name="calendar" size={22} color={colors.mutedForeground} /><Text style={[styles.emptyDiaryTitle, { color: colors.foreground }]}>No meals yet</Text><Text style={[styles.emptyDiaryBody, { color: colors.mutedForeground }]}>Add a meal. It stays here offline.</Text></View>}
          {mealOrder.map((meal) => {
            const mealLogs = selectedLogs.filter((log) => log.meal === meal);
            if (!mealLogs.length) return null;
            return (
              <View key={meal}>
                <Text style={[styles.mealGroup, { color: colors.mutedForeground }]}>{meal.toUpperCase()}</Text>
                {mealLogs.map((log, logIndex) => (
                  <Animated.View key={log.id} entering={enterMotion('component', logIndex)}>
                    <MealRow log={log} colors={colors} onEdit={() => setEditingLog(log)} />
                  </Animated.View>
                ))}
              </View>
            );
          })}
        </View>
        <View style={styles.footerNote}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>{syncState === 'needs-connection' ? 'Saved locally · sync pending' : syncState === 'local' ? 'Saved locally · ready to sync' : syncState === 'offline' ? 'Loading local diary…' : 'Verified core nutrition.'}</Text>
        </View>
        {todayInsight ? (
          <Surface tier="flat" radius="lg" testID="today-contextual-insight"
            accessibilityRole="summary"
            accessibilityLabel={`Today insight: ${todayInsight.title}. ${todayInsightMessage}`}
            style={[styles.todayInsightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.todayInsightIcon, { backgroundColor: colors.accent }]}>
              <CaloraFeatureIcon name="rhythm" size={27} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.card} />
            </View>
            <View style={styles.todayInsightCopy}>
              <Text style={[styles.todayInsightTitle, { color: colors.foreground }]}>{todayInsight.title}</Text>
              <Text style={[styles.todayInsightMessage, { color: colors.mutedForeground }]}>{todayInsightMessage}</Text>
            </View>
          </Surface>
        ) : null}

        <PlannerPeek selectedDate={selectedDate} />

        <LivingRhythmCard
          colors={colors}
          livingState={livingState}
          waterOunces={selectedWater}
          mealsLogged={mealsLogged}
          selectedDate={selectedDate}
        />

        <WellnessCards
          colors={colors}
          mealsLogged={mealsLogged}
          mealNames={mealNames}
          onAddMeal={openAdd}
        />

        <View style={styles.recipeSection}>
          <RecipeSwipeWidget colors={colors} onOpen={(recipe) => router.navigate({ pathname: '/(tabs)/recipes', params: { recipeId: recipe.id } })} />
        </View>
      </ScrollView>
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
  return StyleSheet.create({
  page: { flex: 1 },
    homeHeader: { minHeight: 125, borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', marginHorizontal: -10, marginBottom: 0, backgroundColor: '#1b3022', shadowColor: '#17231f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },
    homeHeaderContent: { minHeight: 125, padding: 18, paddingBottom: 26, justifyContent: 'flex-end' },
  homeHeaderTop: { position: 'absolute', top: 16, left: 20, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.3)' },
  homeHeaderThemeToggle: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderAvatar: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderAvatarText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 16 * f },
  homeHeaderCoach: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderCoachIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  homeHeaderCoachText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 11 * f, letterSpacing: 0.1 },
   homeHeaderDate: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 8 * f, letterSpacing: 0.5, textAlign: 'right', maxWidth: 146, textTransform: 'uppercase', transform: [{ translateY: -12 }] },
    homeHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_800ExtraBold', fontSize: 14.4 * f, letterSpacing: -0.4, transform: [{ translateY: 2 }] },
    homeHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_500Medium', fontSize: 11.2 * f, marginTop: 6, transform: [{ translateY: 11 }] },
  scrollContent: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  dateKicker: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
  greeting: { fontFamily: 'Inter_800ExtraBold', fontSize: 28 * f, letterSpacing: -0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 17 * f },
    heroCard: { borderRadius: 24, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingVertical: 18, paddingHorizontal: 20, marginHorizontal: -10, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#17231f', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 },
   todayInsightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, marginTop: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
   todayInsightIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
   todayInsightCopy: { flex: 1, minWidth: 0 },
   todayInsightTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 * f, lineHeight: 16 * f },
    todayInsightMessage: { fontFamily: 'Inter_500Medium', fontSize: 10.4 * f, lineHeight: 15.2 * f, marginTop: 4 },
     fuelSnapshot: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 25 },
   fuelSnapshotItem: { flex: 1, alignItems: 'center' },
   fuelSnapshotValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 18 * f, letterSpacing: -0.4 },
   fuelSnapshotLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4, textAlign: 'center' },
    livingAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 36, width: '78%', alignSelf: 'center', borderRadius: 14, paddingHorizontal: 10, marginTop: 40 },
   livingActionSecondary: { borderWidth: StyleSheet.hairlineWidth },
  livingActionText: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  livingRhythmCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: 17, paddingHorizontal: 20, marginBottom: 24, shadowColor: '#17231f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  livingRhythmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  livingRhythmIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  livingRhythmTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14.4 * f, letterSpacing: -0.3 },
  livingRhythmStage: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  livingRhythmStageText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, textTransform: 'capitalize' },
  livingRhythmSignals: { flexDirection: 'row', alignItems: 'center', marginTop: 17 },
  livingRhythmSignal: { flex: 1 },
  livingRhythmValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 20 * f, letterSpacing: -0.4 },
  livingRhythmUnit: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  livingRhythmLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginTop: 4 },
  livingRhythmDivider: { width: 1, height: 28, marginHorizontal: 16 },
  livingRhythmTracks: { flexDirection: 'row', gap: 14, marginTop: 17 },
  livingRhythmTrackGroup: { flex: 1, gap: 6 },
  livingRhythmTrackLabel: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, textTransform: 'uppercase', letterSpacing: 0.8 },
  livingRhythmTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  livingRhythmFill: { height: 7, borderRadius: 4 },
    quickLogSection: { marginBottom: 28 },
    quickActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 },
    quickAction: { flex: 1, minWidth: 0, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 4 },
    quickActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, textAlign: 'center' },
  recipeWidget: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 28, shadowColor: '#17231f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
   recipeSection: { marginTop: 4 },
  recipeWidgetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 },
  recipeWidgetHeaderActions: { alignItems: 'flex-end', gap: 8 },
  recipeWidgetNav: { flexDirection: 'row', gap: 6 },
  recipeWidgetNavButton: { width: 30, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recipeWidgetPages: { },
  recipeWidgetCard: { width: 322, height: 146, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  recipeWidgetImage: { ...StyleSheet.absoluteFillObject },
  recipeWidgetCopy: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  recipeWidgetEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
  recipeWidgetTitle: { color: '#ffffff', fontFamily: 'Inter_800ExtraBold', fontSize: 20 * f, lineHeight: 24, letterSpacing: -0.4, maxWidth: 260 },
  recipeWidgetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  recipeWidgetMeta: { color: '#d4eadc', fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  recipeWidgetAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeWidgetActionText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  recipeWidgetLoading: { height: 146, alignItems: 'center', justifyContent: 'center', gap: 9 },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 12 * f },
  wellnessSection: { gap: 14, marginBottom: 28 },
  wellnessRow: { flexDirection: 'row', gap: 12 },
  wellnessCard: { flex: 1, minHeight: 182, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  wellnessCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  wellnessIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wellnessCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f, flexShrink: 1 },
  wellnessValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 22 * f, letterSpacing: -0.5 },
  wellnessUnit: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, letterSpacing: 0 },
   waterSlots: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44, marginTop: 12, marginBottom: 14 },
   waterSlot: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'flex-end' },
  waterSummary: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  waterCupsLogged: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  mealsLoggedNames: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: 14, minHeight: 18 },
  wellnessAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: 10, marginTop: 'auto' },
  wellnessActionText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  waterAdjustActions: { gap: 8, marginTop: 8 },
  waterQuickActions: { flexDirection: 'row-reverse', gap: 8 },
  waterAdjustButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 10 },
  moodCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  moodHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  moodOptions: { flexDirection: 'row', gap: 8 },
  moodOption: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 2, gap: 4 },
  moodOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
   heroDateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
   dateNavCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 3, minWidth: 150 },
   dateNavCenterLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateNavButton: { width: 38, height: 38, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dateNavLabel: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  dateNavSub: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, marginTop: 2 },
   backToToday: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
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
  sectionCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 28, shadowColor: '#17231f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sectionHeaderAction: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20 * f, letterSpacing: -0.4 },
  sectionCaption: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, marginTop: 5 },
  macroBlock: { marginTop: 13 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  macroLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
  macroValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
  macroTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
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
  logCardHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  mealGroup: { fontFamily: 'Inter_700Bold', fontSize: 11 * f, letterSpacing: 1.2, marginTop: 16, marginBottom: 4, textTransform: 'uppercase' },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  mealInfo: { flex: 1, minWidth: 0 },
  mealName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 * f },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  mealType: { fontFamily: 'Inter_500Medium', fontSize: 11 * f },
  mealCalories: { fontFamily: 'Inter_800ExtraBold', fontSize: 16 * f },
  kcalLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 * f, marginLeft: -8, marginTop: 20 },
  emptyDiary: { alignItems: 'center', paddingVertical: 28, gap: 6 },
   emptyDiaryVisual: { width: '100%', height: 74, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  emptyDiaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 * f, marginTop: 4 },
  emptyDiaryBody: { fontFamily: 'Inter_500Medium', fontSize: 12 * f, textAlign: 'center', maxWidth: 240 },
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  footerNoteText: { fontFamily: 'Inter_500Medium', fontSize: 9 * f },
  modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12 },
  addFoodModalCard: {},
  modalScrollContent: { paddingBottom: 4 },
  manualEntrySection: { paddingBottom: 14 },
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
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, height: 46, fontFamily: 'Inter_500Medium', fontSize: 13 * f },
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
  editFields: { flexDirection: 'row', gap: 10 },
  mealPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  mealChoice: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  mealChoiceText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  saveEntry: { alignItems: 'center', borderRadius: 15, paddingVertical: 14, marginTop: 16 },
  saveEntryText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 * f },
  deleteEntry: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  deleteEntryText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  });
}
const styles = makeStyles(1.0);
