import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppChrome';
import { ScalePressable } from '@/components/ScalePressable';
import { useCalora, type HydrationUnit } from '@/context/CaloraContext';
import { LEARNING_LESSONS } from '@/content/learning';
import { getLearningEditorialImage } from '@/lib/learningImages';
import { addDays, dateFromKey, dateKey, dateList } from '@/lib/dates';
import { deriveWaterTrend } from '@/lib/progressTrends';

const ML_PER_OUNCE = 29.5735;
const HYDRATION_LESSONS = ['hydration-check-in', 'fluid-rich-foods', 'drinks-that-fit-your-day'];
const PERIODS = ['Daily', 'Weekly', 'Monthly'] as const;
type Period = typeof PERIODS[number];

function displayAmount(ounces: number, unit: HydrationUnit): number {
  return unit === 'ml' ? Math.round(ounces * ML_PER_OUNCE) : Math.round(ounces);
}
function unitLabel(unit: HydrationUnit): string { return unit === 'ml' ? 'ml' : 'fl oz'; }
function ouncesFromDisplay(value: number, unit: HydrationUnit): number { return unit === 'ml' ? value / ML_PER_OUNCE : value; }
function formatDate(value: string): string { return dateFromKey(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function periodRange(period: Period, anchor: string) {
  if (period === 'Daily') return { start: addDays(anchor, -6), end: anchor };
  if (period === 'Weekly') return { start: addDays(anchor, -55), end: anchor };
  return { start: addDays(anchor, -179), end: anchor };
}
function shiftAnchor(period: Period, anchor: string, direction: number): string {
  if (period === 'Daily') return addDays(anchor, direction * 7);
  if (period === 'Weekly') return addDays(anchor, direction * 56);
  return addDays(anchor, direction * 180);
}

function HydrationRing({ progress, status, colors, size }: { progress: number; status: string; colors: any; size: number }) {
  const radius = (size - 22) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.muted} strokeWidth={14} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.protein} strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - Math.min(progress, 1))} rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={styles.ringCenter}>
        <Feather name="droplet" size={20} color={colors.protein} />
        <Text style={[styles.ringPercent, { color: colors.foreground }]}>{Math.round(progress * 100)}%</Text>
        <Text style={[styles.ringCaption, { color: colors.mutedForeground }]}>of goal</Text>
        <Text style={[styles.ringStatus, { color: colors.protein }]}>{status}</Text>
      </View>
    </View>
  );
}

function CupRow({ ounces, goal, colors }: { ounces: number; goal: number; colors: any }) {
  const filled = Math.min(8, Math.ceil(Math.max(0, ounces) / Math.max(goal / 8, 1)));
  return <View style={styles.cupRow} accessibilityLabel={`${filled} of 8 water cups filled`}>
    {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.cup, { borderColor: colors.protein, backgroundColor: index < filled ? colors.protein : colors.muted }]}><View style={[styles.cupWater, { backgroundColor: colors.protein, opacity: index < filled ? 0.9 : 0.12 }]} /></View>)}
  </View>;
}

export default function HydrationScreen() {
  const { colors, fontScale, waterLogs, addWater, hydrationGoalOunces, setHydrationGoal, hydrationUnit, setHydrationUnit, profile } = useCalora();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('Daily');
  const [anchor, setAnchor] = useState(dateKey());
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(displayAmount(hydrationGoalOunces, hydrationUnit)));
  const [showAllHistory, setShowAllHistory] = useState(false);
  const today = dateKey();
  const todayOunces = Math.max(0, waterLogs[today] ?? 0);
  const goal = Math.max(8, hydrationGoalOunces || 64);
  const progress = todayOunces / goal;
  const remaining = Math.max(0, goal - todayOunces);
  const elapsedDay = Math.max(1 / 24, Math.min(1, (new Date().getHours() + new Date().getMinutes() / 60) / 24));
  const paceRatio = progress / elapsedDay;
  const pacingLabel = progress >= 1 ? 'ON TRACK' : paceRatio >= 0.85 ? 'ON PACE' : paceRatio >= 0.55 ? 'CATCHING UP' : 'START GENTLY';
  const pacingColor = progress >= 1 || paceRatio >= 0.85 ? colors.protein : paceRatio >= 0.55 ? colors.warning : colors.primary;
  const consistency = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return { date, ratio: Math.min(1, Math.max(0, (waterLogs[date] ?? 0) / goal)) };
  }), [goal, today, waterLogs]);
  const consistencyDays = consistency.filter((item) => item.ratio >= 1).length;
  const stylesForScale = useMemo(() => ({ ...styles, page: { ...styles.page, paddingHorizontal: width < 360 ? 14 : 18 } }), [width]);
  const range = periodRange(period, anchor);
  const points = useMemo(() => deriveWaterTrend(waterLogs, range), [waterLogs, range.start, range.end]);
  const maxValue = Math.max(goal, ...points.map((point) => point.value ?? 0), 1);
  const history = useMemo(() => Object.entries(waterLogs).filter(([, value]) => Number.isFinite(value) && value > 0).sort(([a], [b]) => b.localeCompare(a)), [waterLogs]);
  const lessons = useMemo(() => HYDRATION_LESSONS.map((id) => LEARNING_LESSONS.find((lesson) => lesson.id === id)).filter(Boolean), []);
  const selected = selectedPoint === null ? null : points[selectedPoint];
  const currentLabel = period === 'Daily' ? 'Last 7 days' : period === 'Weekly' ? 'Last 8 weeks' : 'Last 6 months';
  const commitGoal = () => {
    const parsed = Number(goalInput);
    if (!Number.isFinite(parsed) || parsed <= 0) { Alert.alert('Enter a valid goal', `Choose a daily goal in ${unitLabel(hydrationUnit)}.`); return; }
    setHydrationGoal(Math.max(8, ouncesFromDisplay(parsed, hydrationUnit)));
    setEditingGoal(false);
  };
  const changeUnit = (unit: HydrationUnit) => {
    setGoalInput(String(displayAmount(goal, unit)));
    setHydrationUnit(unit);
  };
  const clearDay = (date: string, ounces: number) => Alert.alert('Clear this day?', `Remove ${displayAmount(ounces, hydrationUnit)} ${unitLabel(hydrationUnit)} from ${formatDate(date)}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => addWater(date, -ounces) }]);
  const chartWidth = Math.max(280, width - 48);
  const barWidth = Math.max(10, Math.min(34, (chartWidth - 24) / Math.max(points.length, 1) - 8));

  return <SafeAreaView style={[stylesForScale.page, { backgroundColor: colors.background }]} edges={['top']}>
    <AppHeader title="Hydration" back onBack={() => router.back()} action={<Pressable accessibilityRole="button" accessibilityLabel="Open hydration learning" onPress={() => router.push('/learning')} hitSlop={10}><Feather name="book-open" size={20} color={colors.foreground} /></Pressable>} />
    <ScrollView contentContainerStyle={stylesForScale.content} showsVerticalScrollIndicator={false}>
      <View style={[stylesForScale.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[stylesForScale.eyebrow, { color: colors.protein }]}>TODAY'S HYDRATION</Text>
        <View style={stylesForScale.overviewRow}>
          <HydrationRing progress={progress} status={pacingLabel} colors={colors} size={width < 360 ? 168 : 188} />
          <View style={stylesForScale.overviewCopy}>
            <Text style={[stylesForScale.consumed, { color: colors.foreground }]}>{displayAmount(todayOunces, hydrationUnit)} <Text style={[stylesForScale.unit, { color: colors.mutedForeground }]}>{unitLabel(hydrationUnit)}</Text></Text>
            <Text style={[stylesForScale.goalLine, { color: colors.mutedForeground }]}>of {displayAmount(goal, hydrationUnit)} {unitLabel(hydrationUnit)} daily goal</Text>
            <View style={stylesForScale.metricGrid}>
              <View><Text style={[stylesForScale.metricValue, { color: colors.foreground }]}>{Math.round(progress * 100)}%</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>completed</Text></View>
              <View><Text style={[stylesForScale.metricValue, { color: colors.foreground }]}>{Math.floor(todayOunces / 8)}</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>cups logged</Text></View>
              <View><Text style={[stylesForScale.metricValue, { color: colors.foreground }]}>{displayAmount(remaining, hydrationUnit)}</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>remaining</Text></View>
            </View>
          </View>
        </View>
      </View>

      <View style={[stylesForScale.rhythmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={stylesForScale.rhythmHeader}>
          <View style={[stylesForScale.rhythmIcon, { backgroundColor: colors.accent }]}><Feather name="activity" size={17} color={colors.accentForeground} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={[stylesForScale.sectionTitle, { color: colors.foreground }]}>Hydration rhythm</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>A gentle view of pace, not a prescription.</Text></View>
          <Text style={[stylesForScale.rhythmStatus, { color: pacingColor }]}>{pacingLabel}</Text>
        </View>
          <View style={stylesForScale.rhythmMetrics}>
          <View><Text style={[stylesForScale.rhythmMetricValue, { color: colors.foreground }]}>{displayAmount(todayOunces, hydrationUnit)}</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>logged today</Text></View>
          <View style={stylesForScale.rhythmMetricDivider} />
          <View><Text style={[stylesForScale.rhythmMetricValue, { color: colors.foreground }]}>{history.length}</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>days recorded</Text></View>
          <View style={stylesForScale.rhythmMetricDivider} />
            <View><Text style={[stylesForScale.rhythmMetricValue, { color: colors.foreground }]}>{displayAmount(remaining, hydrationUnit)}</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>to goal</Text></View>
          </View>
          <View style={stylesForScale.consistencyRow}>
            <View style={stylesForScale.consistencyCopy}><Text style={[stylesForScale.consistencyTitle, { color: colors.foreground }]}>{consistencyDays}/7 days at goal</Text><Text style={[stylesForScale.metricLabel, { color: colors.mutedForeground }]}>Seven-day consistency</Text></View>
            <View style={stylesForScale.consistencyDots} accessibilityLabel={`${consistencyDays} of 7 recent days met the hydration goal`}>
              {consistency.map((item) => <View key={item.date} style={[stylesForScale.consistencyDot, { backgroundColor: item.ratio >= 1 ? colors.protein : item.ratio > 0 ? colors.warning : colors.muted }]} />)}
            </View>
          </View>
        </View>

      <View style={[stylesForScale.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={stylesForScale.sectionHeader}><View><Text style={[stylesForScale.sectionTitle, { color: colors.foreground }]}>Quick water logging</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Keep your existing Calora cups in sync.</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Switch hydration units, currently ${unitLabel(hydrationUnit)}`} onPress={() => changeUnit(hydrationUnit === 'ml' ? 'fl oz' : 'ml')} style={[stylesForScale.unitToggle, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentForeground, fontWeight: '800' }}>{unitLabel(hydrationUnit)}</Text></Pressable></View>
        <CupRow ounces={todayOunces} goal={goal} colors={colors} />
        <View style={stylesForScale.actionRow}><ScalePressable accessibilityRole="button" accessibilityLabel={`Remove 8 fluid ounces`} onPress={() => addWater(today, -8)} disabled={todayOunces <= 0} style={[stylesForScale.logButton, { backgroundColor: colors.muted, borderColor: colors.border, opacity: todayOunces <= 0 ? 0.45 : 1 }]}><Feather name="minus" size={17} color={colors.foreground} /><Text style={{ color: colors.foreground, fontWeight: '800' }}>8 {unitLabel(hydrationUnit)}</Text></ScalePressable><ScalePressable accessibilityRole="button" accessibilityLabel="Add 8 fluid ounces" onPress={() => addWater(today, 8)} style={[stylesForScale.logButton, { backgroundColor: colors.protein, borderColor: colors.protein }]}><Feather name="plus" size={17} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>8 {unitLabel(hydrationUnit)}</Text></ScalePressable></View>
        <View style={stylesForScale.goalRow}><View style={{ flex: 1, minWidth: 145 }}><Text style={[stylesForScale.goalTitle, { color: colors.foreground }]}>Daily goal</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Past totals stay unchanged when you edit it.</Text></View>{editingGoal ? <View style={stylesForScale.goalEditor}><TextInput accessibilityLabel="Daily hydration goal" value={goalInput} onChangeText={setGoalInput} keyboardType="numeric" style={[stylesForScale.goalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} /><Pressable accessibilityLabel="Save daily hydration goal" onPress={commitGoal}><Text style={{ color: colors.protein, fontWeight: '800' }}>Save</Text></Pressable></View> : <Pressable accessibilityRole="button" accessibilityLabel="Edit daily hydration goal" onPress={() => { setGoalInput(String(displayAmount(goal, hydrationUnit))); setEditingGoal(true); }} style={{ flexShrink: 1 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: colors.protein, fontWeight: '800' }}>{displayAmount(goal, hydrationUnit)} {unitLabel(hydrationUnit)} · Edit</Text></Pressable>}</View>
      </View>

      <View style={[stylesForScale.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={stylesForScale.sectionHeader}><View><Text style={[stylesForScale.sectionTitle, { color: colors.foreground }]}>Intake trends</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>{currentLabel} · actual logged totals</Text></View><View style={stylesForScale.periodNav}><Pressable accessibilityLabel="Previous hydration period" onPress={() => { setAnchor(shiftAnchor(period, anchor, -1)); setSelectedPoint(null); }}><Feather name="chevron-left" size={18} color={colors.foreground} /></Pressable><Pressable accessibilityLabel="Next hydration period" disabled={anchor >= today} onPress={() => { setAnchor(shiftAnchor(period, anchor, 1)); setSelectedPoint(null); }} style={{ opacity: anchor >= today ? 0.35 : 1 }}><Feather name="chevron-right" size={18} color={colors.foreground} /></Pressable></View></View>
        <View style={stylesForScale.segmented}>{PERIODS.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: period === item }} onPress={() => { setPeriod(item); setAnchor(today); setSelectedPoint(null); }} style={[stylesForScale.segment, { backgroundColor: period === item ? colors.protein : colors.muted }]}><Text style={{ color: period === item ? '#fff' : colors.mutedForeground, fontWeight: '800', fontSize: 12 }}>{item}</Text></Pressable>)}</View>
        <View style={[stylesForScale.chart, { width: chartWidth }]}>{points.map((point, index) => { const value = point.value ?? 0; const height = Math.max(4, (value / maxValue) * 126); const missing = point.value === null; return <Pressable key={point.date} accessibilityRole="button" accessibilityLabel={`${point.label}: ${missing ? 'no water logged' : `${displayAmount(value, hydrationUnit)} ${unitLabel(hydrationUnit)}`}`} onPress={() => setSelectedPoint(index)} style={stylesForScale.barColumn}><View style={[stylesForScale.bar, { width: barWidth, height, backgroundColor: missing ? colors.border : colors.protein, opacity: selectedPoint === index ? 1 : missing ? 0.45 : 0.82 }]} /><Text numberOfLines={1} style={[stylesForScale.barLabel, { color: colors.mutedForeground }]}>{point.label}</Text></Pressable>; })}<View pointerEvents="none" style={[stylesForScale.goalLineMark, { bottom: 28 + (goal / maxValue) * 126, borderColor: colors.warning }]} /></View>
        <View style={stylesForScale.chartLegend}><View style={[stylesForScale.legendDot, { backgroundColor: colors.protein }]} /><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Logged intake</Text><View style={[stylesForScale.legendDash, { borderColor: colors.warning }]} /><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Daily goal</Text></View>
        {selected && <View style={[stylesForScale.tooltip, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentForeground, fontWeight: '800' }}>{formatDate(selected.date)} · {selected.value === null ? 'No recorded intake' : `${displayAmount(selected.value, hydrationUnit)} ${unitLabel(hydrationUnit)}`}</Text></View>}
      </View>

      <View style={[stylesForScale.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={stylesForScale.sectionHeader}><View><Text style={[stylesForScale.sectionTitle, { color: colors.foreground }]}>Hydration history</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>{history.length ? `${history.length} recorded day${history.length === 1 ? '' : 's'}` : 'Your logged days will appear here.'}</Text></View>{history.length > 5 && <Pressable accessibilityRole="button" accessibilityLabel={showAllHistory ? 'Show recent hydration history' : 'Show all hydration history'} onPress={() => setShowAllHistory((value) => !value)}><Text style={{ color: colors.protein, fontWeight: '800' }}>{showAllHistory ? 'Show less' : 'View all'}</Text></Pressable>}</View>
        {!history.length ? <View style={stylesForScale.empty}><Feather name="droplet" size={24} color={colors.protein} /><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Log water to build your history.</Text></View> : (showAllHistory ? history : history.slice(0, 5)).map(([date, ounces]) => <View key={date} style={[stylesForScale.historyRow, { borderTopColor: colors.border }]}><View><Text style={[stylesForScale.historyDate, { color: colors.foreground }]}>{date === today ? 'Today' : formatDate(date)}</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>Daily total · no separate entries are stored</Text></View><View style={stylesForScale.historyValue}><Text style={[stylesForScale.historyAmount, { color: colors.foreground }]}>{displayAmount(ounces, hydrationUnit)} {unitLabel(hydrationUnit)}</Text><Pressable accessibilityLabel={`Clear water total for ${formatDate(date)}`} onPress={() => clearDay(date, ounces)} hitSlop={8}><Feather name="trash-2" size={16} color={colors.mutedForeground} /></Pressable></View></View>)}
      </View>

      <View style={stylesForScale.learnHeader}><View><Text style={[stylesForScale.sectionTitle, { color: colors.foreground }]}>Learn About Hydration</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>General education for real days—not a universal prescription.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="View all hydration learning" onPress={() => router.push('/learning')}><Text style={{ color: colors.protein, fontWeight: '800' }}>View all</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesForScale.lessonRow}>{lessons.map((lesson) => lesson && <Pressable key={lesson.id} accessibilityRole="button" accessibilityLabel={`Read ${lesson.title}`} onPress={() => router.push({ pathname: '/learning/[lessonId]', params: { lessonId: lesson.id } } as never)} style={[stylesForScale.lessonCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={getLearningEditorialImage(lesson)} style={stylesForScale.lessonImage} /><View style={stylesForScale.lessonCopy}><Text numberOfLines={2} style={[stylesForScale.lessonTitle, { color: colors.foreground }]}>{lesson.title}</Text><Text style={[stylesForScale.sectionSub, { color: colors.mutedForeground }]}>{lesson.readingMinutes} min read · Open article</Text></View></Pressable>)}</ScrollView>
      <Text style={[stylesForScale.disclaimer, { color: colors.mutedForeground }]}>Hydration needs vary with activity, climate, health, medications, and other factors. Use your records as a gentle reference and seek professional guidance for personal medical questions.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { paddingBottom: 40, gap: 14 },
  heroCard: { borderWidth: 1, borderRadius: 24, padding: 18 }, eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }, overviewCopy: { flex: 1, minWidth: 0 }, consumed: { fontSize: 28, fontWeight: '900' }, unit: { fontSize: 15, fontWeight: '700' }, goalLine: { fontSize: 13, marginTop: 2 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 17 }, metricValue: { fontSize: 17, fontWeight: '900' }, metricLabel: { fontSize: 11, marginTop: 2 }, ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' }, ringPercent: { fontSize: 26, fontWeight: '900', marginTop: 2 }, ringCaption: { fontSize: 11 }, ringStatus: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16 },
  rhythmCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 15 },
  rhythmHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rhythmIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rhythmStatus: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  rhythmMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rhythmMetricValue: { fontSize: 18, fontWeight: '900' },
  rhythmMetricDivider: { width: 1, height: 28, backgroundColor: '#00000018' },
  consistencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 2 },
  consistencyCopy: { flex: 1, minWidth: 0 },
  consistencyTitle: { fontSize: 13, fontWeight: '900' },
  consistencyDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  consistencyDot: { width: 9, height: 9, borderRadius: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, sectionTitle: { fontSize: 18, fontWeight: '900' }, sectionSub: { fontSize: 12, lineHeight: 17, marginTop: 3 }, unitToggle: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12 }, cupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginVertical: 20, gap: 5 }, cup: { width: 24, height: 42, borderWidth: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' }, cupWater: { height: '72%', width: '100%' }, actionRow: { flexDirection: 'row', gap: 10 }, logButton: { flex: 1, minHeight: 45, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, goalRow: { borderTopWidth: 1, borderTopColor: '#00000018', marginTop: 16, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, goalTitle: { fontWeight: '900' }, goalEditor: { flexDirection: 'row', alignItems: 'center', gap: 9 }, goalInput: { width: 82, height: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, textAlign: 'center', fontWeight: '800' },
  periodNav: { flexDirection: 'row', gap: 14 }, segmented: { flexDirection: 'row', gap: 6, marginTop: 14, padding: 4, borderRadius: 14, backgroundColor: '#00000010' }, segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 }, chart: { height: 184, marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', position: 'relative', paddingBottom: 25 }, barColumn: { height: 160, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }, bar: { borderRadius: 8, minHeight: 4 }, barLabel: { fontSize: 10, maxWidth: 42, textAlign: 'center' }, goalLineMark: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' }, chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendDash: { width: 18, borderTopWidth: 1, borderStyle: 'dashed', marginLeft: 9 }, tooltip: { marginTop: 10, padding: 10, borderRadius: 12 },
  historyRow: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, historyDate: { fontWeight: '900' }, historyValue: { flexDirection: 'row', alignItems: 'center', gap: 12 }, historyAmount: { fontWeight: '900' }, empty: { alignItems: 'center', gap: 8, paddingVertical: 22 }, learnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 6 }, lessonRow: { gap: 12, paddingVertical: 10 }, lessonCard: { width: 214, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }, lessonImage: { width: '100%', height: 104 }, lessonCopy: { padding: 12 }, lessonTitle: { fontSize: 15, fontWeight: '900', lineHeight: 19 }, disclaimer: { fontSize: 11, lineHeight: 16, paddingHorizontal: 2, paddingTop: 4 },
});
