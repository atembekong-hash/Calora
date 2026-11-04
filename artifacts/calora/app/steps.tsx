import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppChrome';
import { BottomSheet } from '@/components/BottomSheet';
import { ScalePressable } from '@/components/ScalePressable';
import { useCalora } from '@/context/CaloraContext';
import { dateKey } from '@/lib/dates';
import { formatWhole } from '@/lib/formatters';
import { localHealthHistoryRange, type HealthDailyMetric } from '@/lib/health/weekHistory';
import { MAX_DAILY_STEP_GOAL, MIN_DAILY_STEP_GOAL, normalizeDailyStepGoal } from '@/lib/steps/stepTracking';
import { estimateStepCalories, ESTIMATED_KCAL_PER_STEP } from '@/lib/steps/stepCalories';

function shortDay(value: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
}

function StepRing({ progress, value, goal, colors, size = 184 }: { progress: number; value: number | null; goal: number; colors: ReturnType<typeof useCalora>['colors']; size?: number }) {
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${value === null ? 'Steps unavailable' : `${formatWhole(value)} steps`} of ${formatWhole(goal)} daily goal`} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.muted} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.success} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - Math.min(Math.max(progress, 0), 1))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={styles.ringCopy} pointerEvents="none">
        <Feather name="activity" size={20} color={colors.success} />
        <Text style={[styles.ringValue, { color: colors.foreground }]}>{value === null ? '—' : formatWhole(value)}</Text>
        <Text style={[styles.ringCaption, { color: colors.mutedForeground }]}>steps today</Text>
      </View>
    </View>
  );
}

function hourLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(value));
}

type TrendPeriod = 'week' | 'month';
type TrendSummary = { average: number | null; total: number | null; measured: number; goalDays: number };
function summarizeTrend(values: Array<{ steps: number | null }>, goal: number): TrendSummary {
  const measured = values.filter((item) => item.steps !== null);
  const total = measured.length ? measured.reduce((sum, item) => sum + (item.steps ?? 0), 0) : null;
  return { average: total === null ? null : Math.round(total / measured.length), total, measured: measured.length, goalDays: measured.filter((item) => (item.steps ?? 0) >= goal).length };
}
function TrendComparison({ metrics, fallback, goal, colors }: { metrics: Array<{ date: string; steps: number | null }>; fallback: Array<{ date: string; steps: number | null }>; goal: number; colors: ReturnType<typeof useCalora>['colors'] }) {
  const [period, setPeriod] = useState<TrendPeriod>('week');
  const source = metrics.length ? metrics : fallback;
  const windowSize = period === 'week' ? 7 : 30;
  const current = source.slice(-windowSize);
  const previous = source.slice(-(windowSize * 2), -windowSize);
  const currentSummary = summarizeTrend(current, goal);
  const previousSummary = summarizeTrend(previous, goal);
  const hasComparison = currentSummary.average !== null && previousSummary.average !== null;
  const delta = hasComparison && previousSummary.average ? Math.round(((currentSummary.average! - previousSummary.average) / previousSummary.average) * 100) : null;
  const max = Math.max(currentSummary.average ?? 0, previousSummary.average ?? 0, goal, 1);
  const periodLabel = period === 'week' ? '7-day average' : '30-day average';
  const renderPeriod = (label: string, summary: TrendSummary, color: string) => <View style={styles.trendRow}><View style={styles.trendRowLabel}><Text style={[styles.trendPeriodLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.trendPeriodMeta, { color: colors.mutedForeground }]}>{summary.measured ? `${summary.measured} days measured` : 'No provider data'}</Text></View><View style={[styles.trendBarTrack, { backgroundColor: colors.muted }]}><View style={[styles.trendBar, { width: `${Math.max(summary.average === null ? 0 : (summary.average / max) * 100, summary.average === null ? 0 : 7)}%`, backgroundColor: color, opacity: summary.average === null ? 0.2 : 1 }]} /></View><Text style={[styles.trendValue, { color: colors.foreground }]}>{summary.average === null ? '—' : formatWhole(summary.average)}</Text></View>;
  return <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.chartHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trend comparison</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Average daily steps against the previous period</Text></View><View style={[styles.trendToggle, { backgroundColor: colors.muted }]}>{(['week', 'month'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} accessibilityLabel={`Show ${value} trend`} onPress={() => setPeriod(value)} style={[styles.trendToggleItem, period === value && { backgroundColor: colors.success }]}><Text style={[styles.trendToggleText, { color: period === value ? colors.successForeground : colors.mutedForeground }]}>{value === 'week' ? 'WEEK' : 'MONTH'}</Text></Pressable>)}</View></View><View style={styles.trendSummaryRow}><View><Text style={[styles.trendHeadline, { color: colors.foreground }]}>{currentSummary.average === null ? '—' : formatWhole(currentSummary.average)}</Text><Text style={[styles.trendHeadlineLabel, { color: colors.mutedForeground }]}>{periodLabel}</Text></View><View style={[styles.trendDelta, { backgroundColor: delta !== null && delta >= 0 ? colors.successTint : colors.muted }]}><Feather name={delta !== null && delta >= 0 ? 'trending-up' : 'trending-down'} size={14} color={delta !== null && delta >= 0 ? colors.success : colors.mutedForeground} /><Text style={[styles.trendDeltaText, { color: delta !== null && delta >= 0 ? colors.successForeground : colors.mutedForeground }]}>{delta === null ? 'Need more history' : `${delta >= 0 ? '+' : ''}${delta}% vs prior`}</Text></View></View>{renderPeriod('Current', currentSummary, colors.primary)}{renderPeriod('Previous', previousSummary, colors.success)}<Text style={[styles.chartFootnote, { color: colors.mutedForeground }]}>{hasComparison ? `${currentSummary.goalDays} current days reached your ${formatWhole(goal)} step goal.` : period === 'month' ? 'Monthly comparison will appear after two complete 30-day periods.' : 'Weekly comparison will appear after another week of synced history.'}</Text></View>;
}
function HourlyMovementChart({ values, total, colors }: { values: Array<{ hour: string; steps: number | null }>; total: number | null; colors: ReturnType<typeof useCalora>['colors'] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const measured = values.filter((item) => item.steps !== null);
  const max = Math.max(...measured.map((item) => item.steps ?? 0), 1);
  const selected = selectedIndex === null ? null : values[selectedIndex];
  const hasData = measured.length > 0;
  return <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}>    <View style={styles.chartHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Movement by hour</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Tap a bar to inspect your day</Text></View><View style={[styles.hourlyBadge, { backgroundColor: colors.successTint }]}><Feather name="bar-chart-2" size={14} color={colors.success} /><Text style={[styles.goalKeyText, { color: colors.successForeground }]}>HOURLY</Text></View></View>    {hasData ? <><View style={styles.hourlyChartArea} accessibilityRole="image" accessibilityLabel="Interactive hourly movement chart"><View style={styles.hourlyGrid}><View style={[styles.hourlyGridLine, { borderTopColor: colors.border }]} /><View style={[styles.hourlyGridLine, { borderTopColor: colors.border }]} /><View style={[styles.hourlyGridLine, { borderTopColor: colors.border }]} /></View><View style={styles.hourlyBars}>{values.map((item, index) => { const active = selectedIndex === index; return <Pressable key={item.hour} accessibilityRole="button" accessibilityLabel={`${hourLabel(item.hour)}, ${item.steps === null ? 'no movement data' : `${formatWhole(item.steps)} steps`}`} onPress={() => setSelectedIndex(active ? null : index)} style={styles.hourColumn}><View style={[styles.hourBarTrack, { backgroundColor: colors.muted }]}><View style={[styles.hourBar, { height: item.steps === null ? 4 : Math.max(5, ((item.steps ?? 0) / max) * 112), backgroundColor: active ? colors.primary : colors.success, opacity: item.steps === null ? 0.22 : 1 }]} /></View>{index % 3 === 0 || active ? <Text style={[styles.hourLabel, { color: active ? colors.foreground : colors.mutedForeground }]}>{hourLabel(item.hour)}</Text> : <View style={styles.hourLabelSpacer} />}</Pressable>; })}</View></View><View style={[styles.hourlyDetail, { backgroundColor: colors.successTint, borderColor: colors.border }]}><View><Text style={[styles.hourlyDetailLabel, { color: colors.mutedForeground }]}>{selected ? hourLabel(selected.hour) : 'Today'}</Text><Text style={[styles.hourlyDetailValue, { color: colors.foreground }]}>{selected?.steps === null || selected === null ? (selected ? 'No data' : total === null ? '—' : `${formatWhole(total)} steps`) : `${formatWhole(selected.steps)} steps`}</Text></View><Text style={[styles.hourlyDetailShare, { color: colors.successForeground }]}>{selected?.steps !== null && selected?.steps !== undefined && total ? `${Math.round((selected.steps / total) * 100)}% of today` : selected ? 'No provider reading' : 'Select an hour'}</Text></View></> : <View style={[styles.hourlyEmpty, { backgroundColor: colors.successTint }]}><Feather name="clock" size={18} color={colors.success} /><Text style={[styles.hourlyEmptyText, { color: colors.successForeground }]}>Hourly detail will appear after your next Health sync.</Text></View>}
  </View>;
}

function WeekBars({ values, goal, colors }: { values: Array<{ date: string; steps: number | null }>; goal: number; colors: ReturnType<typeof useCalora>['colors'] }) {
  const max = Math.max(goal, ...values.map((item) => item.steps ?? 0), 1);
  return (
    <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your week in motion</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Measured daily totals</Text>
        </View>
        <View style={[styles.goalKey, { backgroundColor: colors.successTint }]}><View style={[styles.goalDot, { backgroundColor: colors.success }]} /><Text style={[styles.goalKeyText, { color: colors.successForeground }]}>Goal</Text></View>
      </View>
      <View style={styles.bars}>
        {values.map((item) => {
          const measured = item.steps !== null;
          const height = measured ? Math.max(6, (item.steps! / max) * 128) : 6;
          const isToday = item.date === values[values.length - 1]?.date;
          return (
            <View key={item.date} style={styles.barColumn}>
              <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{measured ? (item.steps! >= 1000 ? `${(item.steps! / 1000).toFixed(1).replace('.0', '')}k` : item.steps) : '—'}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.bar, { height, backgroundColor: isToday ? colors.primary : colors.success, opacity: measured ? 1 : 0.35 }]} />
              </View>
              <Text style={[styles.barLabel, { color: isToday ? colors.foreground : colors.mutedForeground }]}>{shortDay(item.date)}</Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.goalLine, { borderTopColor: colors.success }]} />
      <Text style={[styles.chartFootnote, { color: colors.mutedForeground }]}>A day counts toward your goal at {formatWhole(goal)} steps.</Text>
    </View>
  );
}

function StepCalorieBreakdown({ steps, colors }: { steps: number | null; colors: ReturnType<typeof useCalora>['colors'] }) {
  const estimate = steps === null ? null : estimateStepCalories(steps);
  return (
    <View style={[styles.calorieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calorieCardHeader}>
        <View style={[styles.calorieIcon, { backgroundColor: '#FEF3C7' }]}><Feather name="zap" size={18} color="#D97706" /></View>
        <View style={styles.calorieCopy}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Steps to energy</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>A transparent movement estimate for today</Text></View>
      </View>
      {estimate ? (
        <>
          <View style={styles.calorieBreakdownRow}>
            <View style={styles.calorieMetric}><Text style={[styles.calorieMetricValue, { color: colors.foreground }]}>{formatWhole(estimate.steps)}</Text><Text style={[styles.calorieMetricLabel, { color: colors.mutedForeground }]}>steps</Text></View>
            <Text style={[styles.calorieOperator, { color: colors.mutedForeground }]}>×</Text>
            <View style={styles.calorieMetric}><Text style={[styles.calorieMetricValue, { color: colors.foreground }]}>{ESTIMATED_KCAL_PER_STEP.toFixed(2)}</Text><Text style={[styles.calorieMetricLabel, { color: colors.mutedForeground }]}>kcal / step</Text></View>
            <Text style={[styles.calorieOperator, { color: colors.mutedForeground }]}>=</Text>
            <View style={styles.calorieMetric}><Text style={[styles.calorieMetricValue, { color: '#D97706' }]}>{formatWhole(estimate.estimatedCalories)}</Text><Text style={[styles.calorieMetricLabel, { color: colors.mutedForeground }]}>estimated kcal</Text></View>
          </View>
          <View style={[styles.calorieDistance, { backgroundColor: colors.successTint }]}><Feather name="map-pin" size={14} color={colors.success} /><Text style={[styles.calorieDistanceText, { color: colors.successForeground }]}>Approximately {estimate.estimatedDistanceKm.toFixed(1)} km of movement</Text></View>
        </>
      ) : (
        <View style={[styles.calorieEmpty, { backgroundColor: colors.successTint }]}><Text style={[styles.calorieEmptyText, { color: colors.successForeground }]}>Sync your steps to see an estimated movement calorie breakdown.</Text></View>
      )}
      <Text style={[styles.calorieDisclaimer, { color: colors.mutedForeground }]}>Estimate only — pace, terrain, stride, and body size can change actual energy use. Health data calories remain the authoritative measured value when available.</Text>
    </View>
  );
}

const STEP_GOAL_PRESETS = [5_000, 7_500, 10_000, 12_500, 15_000];

function StepGoalSheet({
  visible,
  goal,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  goal: number;
  colors: ReturnType<typeof useCalora>['colors'];
  onClose: () => void;
  onSave: (value: number) => void;
}) {
  const goalAccent = '#8B5CF6';
  const goalAccentForeground = '#FFFFFF';
  const goalAccentTint = '#F0EAFE';
  const goalWarmAccent = '#F59E0B';
  const [draft, setDraft] = useState(String(goal));
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setDraft(String(goal));
      setError(null);
    }
  }, [goal, visible]);

  const submit = () => {
    const parsed = Number(draft.replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed < MIN_DAILY_STEP_GOAL || parsed > MAX_DAILY_STEP_GOAL) {
      setError(`Choose a goal from ${formatWhole(MIN_DAILY_STEP_GOAL)} to ${formatWhole(MAX_DAILY_STEP_GOAL)} steps.`);
      return;
    }
    onSave(normalizeDailyStepGoal(parsed));
  };

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} onBackdropPress={onClose} sheetStyle={styles.goalSheet}>
      <View style={styles.goalSheetHeader}>
        <View style={styles.goalSheetHeading}>
          <View style={styles.goalKickerRow}><View style={[styles.goalKickerDot, { backgroundColor: goalWarmAccent }]} /><Text style={[styles.goalSheetKicker, { color: goalAccent }]}>PERSONAL TARGET</Text></View>
          <Text style={[styles.goalSheetTitle, { color: colors.foreground }]}>Set your daily step goal</Text>
          <Text style={[styles.goalSheetSubtitle, { color: colors.mutedForeground }]}>Make the target fit your current rhythm. You can change it anytime.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close step goal editor" onPress={onClose} hitSlop={10} style={[styles.goalClose, { backgroundColor: goalAccentTint }]}>
          <Feather name="x" size={17} color={goalAccent} />
        </Pressable>
      </View>
      <Text style={[styles.goalFieldLabel, { color: colors.mutedForeground }]}>STEPS PER DAY</Text>
      <View style={[styles.goalInputWrap, { backgroundColor: colors.background, borderColor: error ? colors.destructive : colors.border }]}>
        <TextInput
          accessibilityLabel="Daily step goal"
          value={draft}
          onChangeText={(value) => { setDraft(value.replace(/[^0-9,]/g, '')); setError(null); }}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          onSubmitEditing={submit}
          selectTextOnFocus
          style={[styles.goalInput, { color: colors.foreground }]}
        />
        <Text style={[styles.goalInputUnit, { color: colors.mutedForeground }]}>steps</Text>
      </View>
      <View style={styles.goalPresetRow}>
        {STEP_GOAL_PRESETS.map((preset) => (
          <Pressable key={preset} accessibilityRole="button" accessibilityLabel={`Set goal to ${formatWhole(preset)} steps`} onPress={() => { setDraft(String(preset)); setError(null); }} style={[styles.goalPreset, { backgroundColor: draft.replace(/,/g, '') === String(preset) ? colors.successTint : colors.muted, borderColor: draft.replace(/,/g, '') === String(preset) ? colors.success : colors.border }]}>
            <Text style={[styles.goalPresetText, { color: draft.replace(/,/g, '') === String(preset) ? colors.successForeground : colors.mutedForeground }]}>{preset >= 1000 ? `${preset / 1000}k` : preset}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={[styles.goalError, { color: colors.destructive }]}>{error}</Text> : null}
      <ScalePressable accessibilityRole="button" accessibilityLabel="Save daily step goal" onPress={submit} style={[styles.goalSave, { backgroundColor: goalAccent }]}>
        <Text style={[styles.goalSaveText, { color: goalAccentForeground }]}>Save step goal</Text>
        <Feather name="arrow-right" size={17} color={goalAccentForeground} />
      </ScalePressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel step goal editor" onPress={onClose} style={styles.goalCancel}>
        <Text style={[styles.goalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
}

export default function StepsScreen() {
  const {
    colors, fontScale, hydrated, healthConnection, liveStepTracking, dailyStepGoal,
    setDailyStepGoal, startLiveStepTracking, setLiveStepsDashboardFocused,
  } = useCalora();
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const today = dateKey();
  const values = useMemo(() => {
    const range = localHealthHistoryRange(new Date()).dates;
    const metrics = new Map((healthConnection.snapshot?.dailyMetrics ?? []).map((item: HealthDailyMetric) => [item.date, item.steps]));
    return range.map((date) => ({ date, steps: date === today && liveStepTracking.displayedSteps !== null ? liveStepTracking.displayedSteps : (metrics.get(date) ?? null) }));
  }, [healthConnection.snapshot?.dailyMetrics, liveStepTracking.displayedSteps, today]);
  const todaySteps = values[values.length - 1]?.steps ?? null;
  const hourlyValues = useMemo(() => (healthConnection.snapshot?.hourlyMetrics ?? []).map((item) => ({ hour: item.hour, steps: item.steps })), [healthConnection.snapshot?.hourlyMetrics]);
  const trendValues = useMemo(() => (healthConnection.snapshot?.trendMetrics ?? []).map((item) => ({ date: item.date, steps: item.steps })), [healthConnection.snapshot?.trendMetrics]);
  const progress = todaySteps === null ? 0 : todaySteps / dailyStepGoal;
  const measured = values.filter((item) => item.steps !== null);
  const average = measured.length ? Math.round(measured.reduce((sum, item) => sum + (item.steps ?? 0), 0) / measured.length) : null;
  const best = measured.length ? Math.max(...measured.map((item) => item.steps ?? 0)) : null;
  const goalDays = measured.filter((item) => (item.steps ?? 0) >= dailyStepGoal).length;
  const isConnected = healthConnection.authorization === 'authorized' || healthConnection.authorization === 'partial' || healthConnection.authorization === 'requested';
  const providerLabel = healthConnection.provider === 'health-connect' ? 'Health Connect' : healthConnection.provider === 'healthkit' ? 'Apple Health' : 'Health';
  const stylesForScale = useMemo(() => ({ title: 32 * fontScale, heroValue: 22 * fontScale }), [fontScale]);

  useFocusEffect(useCallback(() => {
    if (!hydrated) return undefined;
    setLiveStepsDashboardFocused(true);
    void startLiveStepTracking();
    return () => setLiveStepsDashboardFocused(false);
  }, [hydrated, setLiveStepsDashboardFocused, startLiveStepTracking]));

  const openHealth = () => router.push('/profile?tab=account&open=health');
  const openGoalEditor = () => setGoalSheetVisible(true);
  const onPrimaryAction = () => {
    if (Platform.OS === 'web' || !isConnected) {
      openHealth();
      return;
    }
    void startLiveStepTracking(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Steps" back onBack={() => router.back()} action={<View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Edit daily step goal" onPress={openGoalEditor} hitSlop={10} style={[styles.headerAction, { backgroundColor: colors.successTint }]}><Feather name="target" size={17} color={colors.success} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open step settings" onPress={openHealth} hitSlop={10} style={styles.headerAction}><Feather name="settings" size={18} color={colors.foreground} /></Pressable></View>} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.eyebrowRow, { backgroundColor: colors.successTint }]}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={[styles.eyebrow, { color: colors.successForeground }]}>{liveStepTracking.status === 'live' ? 'LIVE TRACKING' : 'DAILY MOVEMENT'}</Text><Text style={[styles.eyebrowDate, { color: colors.mutedForeground }]}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}</Text></View>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroKicker, { color: colors.mutedForeground }]}>TODAY'S MOVEMENT</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground, fontSize: stylesForScale.title }]}>Keep your body in motion.</Text>
            <Text style={[styles.heroDescription, { color: colors.mutedForeground }]}>Small walks add up. Your daily goal is a gentle guide, not a judgment.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit daily step goal of ${formatWhole(dailyStepGoal)} steps`} onPress={openGoalEditor} style={[styles.goalPill, { backgroundColor: '#F0EAFE' }]}><Feather name="target" size={13} color="#8B5CF6" /><Text style={[styles.goalPillText, { color: '#6D28D9' }]}>Goal {formatWhole(dailyStepGoal)} steps</Text><Feather name="edit-2" size={12} color="#8B5CF6" /></Pressable>
          </View>
          <StepRing progress={progress} value={todaySteps} goal={dailyStepGoal} colors={colors} />
          <View style={styles.heroStats}>
            <View><Text style={[styles.heroStatValue, { color: colors.foreground }]}>{average === null ? '—' : formatWhole(average)}</Text><Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>7-day average</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View><Text style={[styles.heroStatValue, { color: colors.foreground }]}>{best === null ? '—' : formatWhole(best)}</Text><Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>best day</Text></View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View><Text style={[styles.heroStatValue, { color: colors.foreground }]}>{goalDays}</Text><Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>goal days</Text></View>
          </View>
        </View>
        <StepCalorieBreakdown steps={todaySteps} colors={colors} />
        <WeekBars values={values} goal={dailyStepGoal} colors={colors} />
        <TrendComparison metrics={trendValues} fallback={values} goal={dailyStepGoal} colors={colors} />
        <HourlyMovementChart values={hourlyValues} total={todaySteps} colors={colors} />
        {!isConnected || todaySteps === null ? (
          <ScalePressable accessibilityRole="button" accessibilityLabel={isConnected ? `Refresh ${providerLabel}` : `Connect ${providerLabel}`} onPress={onPrimaryAction} style={[styles.connectCard, { backgroundColor: colors.hero, borderColor: colors.border }]}>
            <View style={[styles.connectIcon, { backgroundColor: colors.success }]}><Feather name="heart" size={22} color={colors.successForeground} /></View>
            <View style={styles.connectCopy}><Text style={[styles.connectTitle, { color: colors.onHero }]}>{isConnected ? 'Waiting for today’s steps' : 'Connect your health data'}</Text><Text style={[styles.connectText, { color: colors.heroMuted }]}>{isConnected ? `Refresh ${providerLabel} to bring in your latest total.` : `Allow ${providerLabel} to turn your walks into a calm daily picture.`}</Text></View><Feather name="arrow-up-right" size={21} color={colors.onHero} /></ScalePressable>
        ) : (
          <View style={[styles.insightCard, { backgroundColor: colors.successTint, borderColor: colors.border }]}><Feather name="sun" size={20} color={colors.success} /><View style={styles.insightCopy}><Text style={[styles.insightTitle, { color: colors.successForeground }]}>{progress >= 1 ? 'You reached your movement goal.' : `${formatWhole(Math.max(dailyStepGoal - todaySteps, 0))} steps to go.`}</Text><Text style={[styles.insightText, { color: colors.mutedForeground }]}>{liveStepTracking.status === 'live' ? 'Your live count will update while Calora is open.' : `Your total is synced from ${providerLabel}.`}</Text></View></View>
        )}
        <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>A healthier rhythm</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>A few ways to make movement feel effortless.</Text></View>
        <View style={styles.tipGrid}>
          {[['sunrise', 'Start small', 'A ten-minute walk is a meaningful start.'], ['navigation', 'Take the long way', 'Add a little distance to routines you already have.'], ['check-circle', 'Celebrate consistency', 'Your trend matters more than one perfect day.']].map(([icon, title, copy]) => <View key={title} style={[styles.tip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={19} color={colors.success} /><Text style={[styles.tipTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.tipText, { color: colors.mutedForeground }]}>{copy}</Text></View>)}
        </View>
        <View style={styles.learningSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Learn about walking</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Optional guides to help movement fit your real day.</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Movement breaks count lesson"
            accessibilityHint="Opens the walking and movement guide in Learning"
            onPress={() => router.push({ pathname: '/learning/[lessonId]', params: { lessonId: 'movement-breaks-count' } } as never)}
            style={[styles.learningFeature, { backgroundColor: colors.hero, borderColor: colors.border }]}
          >
            <View style={[styles.learningIcon, { backgroundColor: colors.success }]}><Feather name="book-open" size={20} color={colors.successForeground} /></View>
            <View style={styles.learningCopy}><Text style={[styles.learningTitle, { color: colors.onHero }]}>Movement breaks count</Text><Text style={[styles.learningText, { color: colors.heroMuted }]}>Short walks, stretches, and daily tasks can all be meaningful ways to move.</Text></View>
            <Feather name="chevron-right" size={20} color={colors.onHero} />
          </Pressable>
          <View style={styles.learningSuggestions}>
            {[
              ['activity', 'Movement snacks', 'Make room for a few comfortable minutes of movement.', 'movement-snacks'],
              ['refresh-cw', 'Make room for recovery', 'Use rest and lower-energy days in a sustainable rhythm.', 'recovery-is-part-of-routine'],
            ].map(([icon, title, copy, lessonId]) => (
              <Pressable
                key={lessonId}
                accessibilityRole="link"
                accessibilityLabel={`Open ${title} lesson`}
                onPress={() => router.push({ pathname: '/learning/[lessonId]', params: { lessonId } } as never)}
                style={[styles.learningSuggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.learningSuggestionIcon, { backgroundColor: colors.successTint }]}><Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={17} color={colors.success} /></View>
                <View style={styles.learningCopy}><Text style={[styles.learningSuggestionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.learningSuggestionText, { color: colors.mutedForeground }]}>{copy}</Text></View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Steps are wellness information, not medical advice. Provider totals may arrive after a short delay.</Text>
      </ScrollView>
      <StepGoalSheet visible={goalSheetVisible} goal={dailyStepGoal} colors={colors} onClose={() => setGoalSheetVisible(false)} onSave={(value) => { setDailyStepGoal(value); setGoalSheetVisible(false); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAction: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  eyebrowRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7, marginTop: 16 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1.2 },
  eyebrowDate: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginLeft: 3 },
  hero: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 20, overflow: 'hidden' },
  heroCopy: { marginBottom: 8 },
  heroKicker: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1.6 },
  heroTitle: { fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.8, marginTop: 6, maxWidth: 290 },
  heroDescription: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 295 },
  goalPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, marginTop: 11 },
  goalPillText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 0.2 },
  ringCopy: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 25, letterSpacing: -1, marginTop: 7 },
  ringCaption: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 2 },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 8 },
  heroStatValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, textAlign: 'center' },
  heroStatLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, textAlign: 'center', marginTop: 3 },
  statDivider: { height: 30, width: StyleSheet.hairlineWidth },
  chart: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 17, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hourlyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  hourlyChartArea: { height: 156, marginTop: 18, position: 'relative' },
  hourlyGrid: { position: 'absolute', left: 0, right: 0, top: 8, bottom: 25, justifyContent: 'space-between' },
  hourlyGridLine: { borderTopWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  hourlyBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 },
  hourColumn: { flex: 1, height: 156, alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },
  hourBarTrack: { width: 9, height: 116, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  hourBar: { width: '100%', borderRadius: 7 },
  hourLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, marginTop: 7 },
  hourLabelSpacer: { height: 18 },
  hourlyDetail: { borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  hourlyDetailLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  hourlyDetailValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 17, marginTop: 2 },
  hourlyDetailShare: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  hourlyEmpty: { borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  hourlyEmptyText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16 },
  sectionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 17, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 4 },
  goalKey: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  goalDot: { width: 6, height: 6, borderRadius: 3 },
  goalKeyText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  bars: { height: 172, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 },
  barColumn: { flex: 1, alignItems: 'center', height: 152, justifyContent: 'flex-end', gap: 6 },
  barValue: { fontFamily: 'Inter_700Bold', fontSize: 9, height: 14 },
  barTrack: { width: 20, height: 128, borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 10 },
  barLabel: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  goalLine: { position: 'absolute', left: 17, right: 17, top: 86, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.7 },
  chartFootnote: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 4 },
  trendToggle: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  trendToggleItem: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  trendToggleText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },
  trendSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 14 },
  trendHeadline: { fontFamily: 'Inter_800ExtraBold', fontSize: 25, letterSpacing: -0.8 },
  trendHeadlineLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 2 },
  trendDelta: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 150 },
  trendDeltaText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  trendRowLabel: { width: 68 },
  trendPeriodLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 11 },
  trendPeriodMeta: { fontFamily: 'Inter_500Medium', fontSize: 8, marginTop: 2 },
  trendBarTrack: { flex: 1, height: 10, borderRadius: 8, overflow: 'hidden' },
  trendBar: { height: '100%', borderRadius: 8 },
  trendValue: { width: 47, textAlign: 'right', fontFamily: 'Inter_800ExtraBold', fontSize: 11 },
  connectCard: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  connectCopy: { flex: 1 },
  connectTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  connectText: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 3 },
  insightCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  insightCopy: { flex: 1 },
  insightTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
  insightText: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionHeading: { marginTop: 4 },
  tipGrid: { gap: 10 },
  tip: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 15 },
  tipTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13, marginTop: 10 },
  tipText: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 4 },
  learningSection: { gap: 10, marginTop: 2 },
  learningFeature: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  learningIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  learningCopy: { flex: 1, minWidth: 0 },
  learningTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
  learningText: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, marginTop: 3 },
  learningSuggestions: { gap: 8 },
  learningSuggestion: { borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  learningSuggestionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  learningSuggestionTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
  learningSuggestionText: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14, marginTop: 2 },
  calorieCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 15, gap: 12 },
  calorieCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calorieIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calorieCopy: { flex: 1, minWidth: 0 },
  calorieBreakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  calorieMetric: { flex: 1, alignItems: 'center', minWidth: 0 },
  calorieMetricValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 18 },
  calorieMetricLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginTop: 2, textAlign: 'center' },
  calorieOperator: { fontFamily: 'Inter_800ExtraBold', fontSize: 16 },
  calorieDistance: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  calorieDistanceText: { fontFamily: 'Inter_700Bold', fontSize: 10, flex: 1 },
  calorieEmpty: { borderRadius: 12, padding: 10 },
  calorieEmptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 15 },
  calorieDisclaimer: { fontFamily: 'Inter_500Medium', fontSize: 9, lineHeight: 13 },
  disclaimer: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 3 },
  goalSheet: { paddingHorizontal: 20 },
  goalSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  goalSheetHeading: { flex: 1 },
  goalSheetKicker: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1.4 },
  goalKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  goalKickerDot: { width: 7, height: 7, borderRadius: 4 },
  goalSheetTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 23, letterSpacing: -0.6, marginTop: 5 },
  goalSheetSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginTop: 7 },
  goalClose: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalFieldLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1, marginTop: 24, marginBottom: 7 },
  goalInputWrap: { height: 58, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  goalInput: { flex: 1, minWidth: 0, fontFamily: 'Inter_800ExtraBold', fontSize: 25, padding: 0 },
  goalInputUnit: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  goalPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  goalPreset: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  goalPresetText: { fontFamily: 'Inter_800ExtraBold', fontSize: 11 },
  goalError: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16, marginTop: 10 },
  goalSave: { minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  goalSaveText: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
  goalCancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4 },
  goalCancelText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});
