import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mood, useCalora } from '@/context/CaloraContext';

type WeekDay = {
  date: string;
  day: string;
  kcal: number;
  value: number;
  meals: number;
  water: number;
  mood?: Mood;
  hasData: boolean;
};

const moodColors: Record<Mood, string> = {
  energized: '#e5ad55',
  good: '#5dba7d',
  okay: '#7394f2',
  low: '#9875c7',
  stressed: '#ef6b4f',
};

function dateKeyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDays(logs: ReturnType<typeof useCalora>['logs'], waterLogs: ReturnType<typeof useCalora>['waterLogs'], moodLogs: ReturnType<typeof useCalora>['moodLogs'], target: number): WeekDay[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const dateKey = dateKeyFromDate(date);
    const dayLogs = logs.filter((log) => log.date === dateKey);
    const kcal = dayLogs.reduce((total, log) => total + log.calories, 0);
    const meals = new Set(dayLogs.map((log) => log.meal)).size;
    return {
      date: dateKey,
      day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
      kcal,
      value: kcal ? Math.min((kcal / target) * 100, 100) : 0,
      meals,
      water: waterLogs[dateKey] ?? 0,
      mood: moodLogs[dateKey],
      hasData: dayLogs.length > 0 || Boolean(waterLogs[dateKey]) || Boolean(moodLogs[dateKey]),
    };
  });
}

function AnimatedReveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 14 * (1 - progress.value) }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function PulseIcon({ colors }: { colors: ReturnType<typeof useCalora>['colors'] }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.08, { duration: 1350, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[styles.iconCircle, { backgroundColor: 'rgba(157,215,189,0.15)' }, animatedStyle]}>
      <Feather name="activity" size={20} color={colors.heroMuted} />
    </Animated.View>
  );
}

function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => ({ height: 128 * (Math.max(0, Math.min(value, 100)) / 100) * progress.value }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

function AnimatedTrackFill({ percentage, color, trackColor }: { percentage: number; color: string; trackColor: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(260, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(percentage, 100)) * progress.value}%` }));
  return <View style={[styles.miniTrack, { backgroundColor: trackColor }]}><Animated.View style={[styles.miniFill, { backgroundColor: color }, animatedStyle]} /></View>;
}

function WeeklyPatternsCard({ colors, days, target }: { colors: ReturnType<typeof useCalora>['colors']; days: WeekDay[]; target: number }) {
  const loggedDays = days.filter((day) => day.hasData).length;
  const waterDays = days.filter((day) => day.water > 0).length;
  const moodDays = days.filter((day) => day.mood).length;
  const averageWater = waterDays ? Math.round(days.reduce((sum, day) => sum + day.water, 0) / waterDays) : 0;
  const averageCalories = days.filter((day) => day.kcal > 0).length
    ? Math.round(days.reduce((sum, day) => sum + day.kcal, 0) / days.filter((day) => day.kcal > 0).length)
    : 0;
  return (
    <View style={[styles.patternCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly patterns</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>A gentle read on your last seven days.</Text>
        </View>
        <View style={[styles.patternBadge, { backgroundColor: colors.accent }]}>
          <Feather name="trending-up" size={12} color={colors.accentForeground} />
          <Text style={[styles.patternBadgeText, { color: colors.accentForeground }]}>{loggedDays} / 7 tracked</Text>
        </View>
      </View>
      <View style={styles.patternChart}>
        {days.map((day, index) => (
          <View key={day.date} style={styles.patternColumn}>
            <View style={[styles.patternTrack, { backgroundColor: colors.muted }]}>
              {day.hasData && <Animated.View style={[styles.patternFill, { backgroundColor: day.kcal ? (day.value > 110 ? colors.warning : colors.success) : colors.primary, height: `${Math.max(day.kcal ? day.value : 16, 16)}%` }]} />}
            </View>
            <View style={[styles.patternMoodDot, { backgroundColor: day.mood ? moodColors[day.mood] : 'transparent', borderColor: day.mood ? moodColors[day.mood] : colors.border }]} />
            <Text style={[styles.patternDay, { color: index === days.length - 1 ? colors.primary : colors.mutedForeground }]}>{day.day}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.patternLegend, { borderTopColor: colors.border }]}>
        <View style={styles.patternLegendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>logged days</Text></View>
        <View style={styles.patternLegendItem}><View style={[styles.legendDot, { backgroundColor: '#9875c7' }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>mood check-in</Text></View>
      </View>
      <View style={styles.patternStats}>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{averageWater} fl oz</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>avg. water</Text></View>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{averageCalories ? averageCalories.toLocaleString() : '—'}</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>avg. kcal</Text></View>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{moodDays}</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>mood check-ins</Text></View>
      </View>
      <Text style={[styles.patternNote, { color: colors.mutedForeground }]}>No entry is a negative score. Keep building a picture that feels useful to you.</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { colors, logs, weights, addWeight, profile, waterLogs, moodLogs } = useCalora();
  const insets = useSafeAreaInsets();
  const [showWeight, setShowWeight] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const verifiedCount = logs.filter((log) => log.confidence >= 90).length;
  const latestWeight = weights[weights.length - 1]?.kg ?? profile?.weightKg ?? 76;
  const startingWeight = profile?.weightKg ?? latestWeight;
  const weightDelta = latestWeight - startingWeight;
  const loggedToday = logs.filter((log) => log.date === new Date().toISOString().slice(0, 10));
  const nutrientTotals = loggedToday.reduce((totals, log) => ({
    fiber: totals.fiber + (log.fiber ?? 0),
    sugar: totals.sugar + (log.sugar ?? 0),
    sodium: totals.sodium + (log.sodium ?? 0),
  }), { fiber: 0, sugar: 0, sodium: 0 });
  const todayKey = new Date().toISOString().slice(0, 10);
  const waterToday = waterLogs[todayKey] ?? 0;
  const moodToday = moodLogs[todayKey];
  const moodLabel = moodToday ? moodToday.charAt(0).toUpperCase() + moodToday.slice(1) : 'Not logged';
  const target = profile?.calorieTarget ?? 2000;
  const weekDays = getWeekDays(logs, waterLogs, moodLogs, target);
  const signalDays = weekDays.filter((day) => day.hasData).length;
  const averageWeekCalories = weekDays.filter((day) => day.kcal > 0).length
    ? Math.round(weekDays.reduce((sum, day) => sum + day.kcal, 0) / weekDays.filter((day) => day.kcal > 0).length)
    : 0;
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <Image source={require('../../assets/images/calora-insights-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.78)', 'rgba(18,34,24,0.18)']}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="activity" size={12} color="#d4eadc" />
              <Text style={styles.heroBadgeText}>WEEKLY SIGNAL</Text>
            </View>
            <Text style={styles.heroEyebrow}>THE BIGGER PICTURE</Text>
            <Text style={styles.heroTitle}>Your insights</Text>
            <Text style={styles.heroSubtitle}>Patterns, not pressure. Use the signal to make tomorrow easier.</Text>
          </View>
        </View>

        <AnimatedReveal delay={80}>
        <View style={[styles.adaptiveCard, { backgroundColor: colors.hero }]}>
          <Image source={require('../../assets/images/calora-insights-header.jpg')} contentFit="cover" style={styles.adaptiveTexture} />
          <LinearGradient colors={['rgba(20,63,52,0.04)', 'rgba(20,63,52,0.62)']} style={styles.adaptiveTextureOverlay} />
          <PulseIcon colors={colors} />
          <Text style={[styles.cardEyebrow, { color: colors.heroMuted }]}>ADAPTIVE TARGET</Text>
          <Text style={[styles.adaptiveTitle, { color: colors.onHero }]}>Your target is working with you.</Text>
            <Text style={[styles.adaptiveBody, { color: colors.heroMuted }]}>{averageWeekCalories ? `You’re averaging ${averageWeekCalories.toLocaleString()} kcal across ${signalDays} tracked ${signalDays === 1 ? 'day' : 'days'} this week.` : 'Keep logging to reveal a more personal weekly recommendation.'}</Text>
          <View style={styles.adaptiveFooter}>
            <Text style={[styles.adaptiveFooterText, { color: colors.onHero }]}>{signalDays} / 7 days of signal</Text>
             <AnimatedTrackFill percentage={(signalDays / 7) * 100} color={colors.primary} trackColor="rgba(157,215,189,0.18)" />
          </View>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={150} style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>6.2</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>days logged</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{verifiedCount * 8 + 68}%</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>data trust</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: weightDelta <= 0 ? colors.success : colors.warning }]}>{weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg trend</Text>
          </View>
        </AnimatedReveal>

        <AnimatedReveal delay={220}>
          <View style={[styles.rhythmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Logging rhythm</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Small signals add up over a week.</Text>
              </View>
              <View style={[styles.rhythmBadge, { backgroundColor: colors.accent }]}>
                <Feather name="calendar" size={12} color={colors.accentForeground} />
                <Text style={[styles.rhythmBadgeText, { color: colors.accentForeground }]}>{Math.min(signalDays, 7)} / 7 days</Text>
              </View>
            </View>
            <View style={styles.rhythmGrid}>
              {weekDays.map((item, index) => (
                <View key={item.date} style={styles.rhythmDay}>
                  <View style={[styles.rhythmTrack, { backgroundColor: colors.muted }]}>
                    {item.hasData && <Animated.View style={[styles.rhythmFill, { backgroundColor: index === weekDays.length - 1 ? colors.primary : colors.success, height: `${Math.max(item.meals ? item.meals * 25 : 14, 14)}%` }]} />}
                  </View>
                  <Text style={[styles.rhythmDayLabel, { color: index === weekDays.length - 1 ? colors.primary : colors.mutedForeground }]}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedReveal>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This week</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Calories against your {target.toLocaleString()} kcal target</Text>
          </View>
          <Pressable accessibilityLabel="Change insights range" style={[styles.rangeButton, { backgroundColor: colors.muted }]}>
            <Text style={[styles.rangeText, { color: colors.foreground }]}>7D</Text>
            <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <AnimatedReveal delay={280}>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chart}>
            {weekDays.map((item, index) => (
              <View key={item.date} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{item.hasData && item.kcal ? item.kcal.toLocaleString() : '—'}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <AnimatedBar value={item.value} color={index === weekDays.length - 1 ? colors.primary : colors.success} delay={index * 65} />
                </View>
                <Text style={[styles.barDay, { color: index === weekDays.length - 1 ? colors.primary : colors.mutedForeground }]}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>on target</Text></View>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{averageWeekCalories ? `Avg. ${averageWeekCalories.toLocaleString()} kcal` : 'No calorie average yet'}</Text>
          </View>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={360}>
          <WeeklyPatternsCard colors={colors} days={weekDays} target={target} />
        </AnimatedReveal>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nutrient balance</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Today’s logged foods, with estimates clearly labeled.</Text>
          </View>
        </View>
        <AnimatedReveal delay={420}>
        <View style={[styles.nutrientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Fiber', value: `${Math.round(nutrientTotals.fiber)} g`, target: '25 g', color: colors.success },
            { label: 'Sugar', value: `${Math.round(nutrientTotals.sugar)} g`, target: 'added + natural', color: colors.warning },
            { label: 'Sodium', value: `${Math.round(nutrientTotals.sodium)} mg`, target: '2,300 mg guide', color: colors.primary },
          ].map((item) => <View key={item.label} style={styles.nutrientRow}><View style={[styles.nutrientDot, { backgroundColor: item.color }]} /><Text style={[styles.nutrientLabel, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.nutrientValue, { color: colors.foreground }]}>{item.value}</Text><Text style={[styles.nutrientTarget, { color: colors.mutedForeground }]}>{item.target}</Text></View>)}
          <Text style={[styles.nutrientNote, { color: colors.mutedForeground }]}>Micronutrients appear as verified foods are added; photo and manual entries remain estimates until reviewed.</Text>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={480}>
          <View style={[styles.signalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.signalCardHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today’s signals</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Context for the numbers, not a score.</Text>
              </View>
              <View style={[styles.signalIcon, { backgroundColor: colors.accent }]}><Feather name="heart" size={16} color={colors.accentForeground} /></View>
            </View>
            <View style={styles.signalRow}>
              <View style={styles.signalMetric}>
                <View style={styles.signalMetricTop}><Feather name="droplet" size={14} color="#5d8edb" /><Text style={[styles.signalMetricLabel, { color: colors.mutedForeground }]}>Hydration</Text></View>
                <Text style={[styles.signalMetricValue, { color: colors.foreground }]}>{waterToday} <Text style={[styles.signalMetricUnit, { color: colors.mutedForeground }]}>/ 64 fl oz</Text></Text>
                <AnimatedTrackFill percentage={(waterToday / 64) * 100} color="#5d8edb" trackColor={colors.muted} />
              </View>
              <View style={styles.signalMetric}>
                <View style={styles.signalMetricTop}><Feather name="smile" size={14} color="#9875c7" /><Text style={[styles.signalMetricLabel, { color: colors.mutedForeground }]}>Mood</Text></View>
                <Text style={[styles.signalMetricValue, { color: colors.foreground }]}>{moodLabel}</Text>
                <Text style={[styles.signalMetricHint, { color: colors.mutedForeground }]}>{moodToday ? 'Logged today' : 'Optional check-in'}</Text>
              </View>
            </View>
          </View>
        </AnimatedReveal>

        <View style={styles.weightHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight trend</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Your trend matters more than a single day</Text></View>
          <Pressable accessibilityLabel="Log weight" onPress={() => setShowWeight(true)} style={[styles.weightButton, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.weightButtonText, { color: colors.primaryForeground }]}>Log</Text></Pressable>
        </View>
        <AnimatedReveal delay={540}>
        <View style={[styles.weightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.weightValue, { color: colors.foreground }]}>{latestWeight.toFixed(1)} <Text style={[styles.weightUnit, { color: colors.mutedForeground }]}>kg</Text></Text>
          <Text style={[styles.weightHint, { color: colors.mutedForeground }]}>{weights.length > 1 ? `${weights.length} weigh-ins recorded locally` : 'Add a few weigh-ins to unlock trend guidance'}</Text>
          <View style={[styles.weightLine, { backgroundColor: colors.muted }]}><View style={[styles.weightLineFill, { backgroundColor: colors.success, width: weights.length > 1 ? '54%' : '10%' }]} /></View>
        </View>
        </AnimatedReveal>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>Built on trust</Text>
        <View style={[styles.trustRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.trustIcon, { backgroundColor: colors.accent }]}><Feather name="database" size={18} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: colors.foreground }]}>Verified core database</Text>
            <Text style={[styles.trustBody, { color: colors.mutedForeground }]}>USDA and labeled foods are separated from estimates and manual entries.</Text>
          </View>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </View>
        <View style={[styles.trustRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.trustIcon, { backgroundColor: '#fff0df' }]}><Feather name="zap" size={18} color={colors.warning} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: colors.foreground }]}>Low-friction logging</Text>
            <Text style={[styles.trustBody, { color: colors.mutedForeground }]}>Every meal can start with one tap, then you stay in control of the estimate.</Text>
          </View>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </View>
      </ScrollView>
      <Modal visible={showWeight} transparent animationType="slide" onRequestClose={() => setShowWeight(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
          <View style={[styles.weightModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log today’s weight</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>A single weigh-in is just a data point. Calora looks for a trend.</Text>
            <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder={`${latestWeight.toFixed(1)} kg`} placeholderTextColor={colors.mutedForeground} style={[styles.weightInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
            <Pressable accessibilityLabel="Save weight" onPress={() => { const value = Number(weightInput); if (value > 0) { addWeight(value); setWeightInput(''); setShowWeight(false); } }} style={[styles.saveWeight, { backgroundColor: colors.primary }]}><Text style={[styles.saveWeightText, { color: colors.primaryForeground }]}>Save weigh-in</Text></Pressable>
            <Pressable accessibilityLabel="Cancel weight entry" onPress={() => setShowWeight(false)} style={styles.cancelWeight}><Text style={[styles.cancelWeightText, { color: colors.mutedForeground }]}>Not now</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  heroHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 17, backgroundColor: '#1b3022' },
  heroContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  heroBadge: { position: 'absolute', top: 17, right: 17, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  heroBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  heroEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7 },
  heroSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 7, maxWidth: 285 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 22, maxWidth: 330 },
  adaptiveCard: { borderRadius: 24, padding: 19, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  adaptiveTexture: { ...StyleSheet.absoluteFillObject, opacity: 0.22 },
  adaptiveTextureOverlay: { ...StyleSheet.absoluteFillObject },
  iconCircle: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cardEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2, marginBottom: 7 },
  adaptiveTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.3, marginBottom: 8 },
  adaptiveBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  adaptiveFooter: { marginTop: 18 },
  adaptiveFooterText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginBottom: 8 },
  miniTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  miniFill: { height: 6, borderRadius: 3 },
  statRow: { flexDirection: 'row', gap: 9, marginBottom: 25 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 17, padding: 13 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  rhythmCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 24 },
  rhythmBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  rhythmBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  rhythmGrid: { height: 96, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, marginTop: 4 },
  rhythmDay: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  rhythmTrack: { width: '100%', height: 72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  rhythmFill: { width: '100%', borderRadius: 6 },
  rhythmDayLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  rangeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  rangeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  chartCard: { borderWidth: 1, borderRadius: 21, padding: 15 },
  chart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontFamily: 'Inter_400Regular', fontSize: 8, marginBottom: 6 },
  barTrack: { width: '100%', height: 128, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barDay: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 8 },
  chartLegend: { borderTopWidth: 1, marginTop: 14, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  nutrientCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 1 },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  nutrientDot: { width: 8, height: 8, borderRadius: 4 },
  nutrientLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, flex: 1 },
  nutrientValue: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  nutrientTarget: { fontFamily: 'Inter_400Regular', fontSize: 9, minWidth: 88, textAlign: 'right' },
  nutrientNote: { borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.14)', paddingTop: 10, marginTop: 5, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  patternCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 24 },
  patternBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  patternBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  patternChart: { height: 132, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, marginTop: 3 },
  patternColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  patternTrack: { width: '100%', height: 92, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  patternFill: { width: '100%', borderRadius: 6 },
  patternMoodDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, marginTop: 8 },
  patternDay: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginTop: 6 },
  patternLegend: { borderTopWidth: 1, marginTop: 14, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  patternLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patternStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  patternStatValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  patternStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 3 },
  patternNote: { borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.14)', paddingTop: 10, marginTop: 13, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  signalCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginTop: 24 },
  signalCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 15 },
  signalIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  signalRow: { flexDirection: 'row', gap: 12 },
  signalMetric: { flex: 1, minWidth: 0 },
  signalMetricTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  signalMetricLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  signalMetricValue: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  signalMetricUnit: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  signalMetricHint: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 9 },
  trustIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trustTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  trustBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 4 },
  weightHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  weightButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  weightButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  weightCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  weightValue: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  weightUnit: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  weightHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5 },
  weightLine: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  weightLineFill: { height: 7, borderRadius: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  weightModal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  modalBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 7 },
  weightInput: { borderWidth: 1, borderRadius: 14, height: 48, paddingHorizontal: 13, fontFamily: 'Inter_500Medium', fontSize: 16, marginTop: 17 },
  saveWeight: { borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  saveWeightText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  cancelWeight: { alignItems: 'center', paddingVertical: 13 },
  cancelWeightText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});