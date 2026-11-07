import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '@/components/AppChrome';
import { useCalora } from '@/context/CaloraContext';
import { deriveLiveInsights, type LiveActivityEvent, type LiveInsight } from '@/lib/insights/deriveLiveInsights';

const CATEGORY_META: Record<LiveInsight['category'], { icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
  nutrition: { icon: 'coffee', color: '#51b879' },
  hydration: { icon: 'droplet', color: '#45bde6' },
  steps: { icon: 'activity', color: '#6e91ef' },
  fasting: { icon: 'clock', color: '#dca64f' },
  mood: { icon: 'smile', color: '#9875c7' },
  workout: { icon: 'zap', color: '#e96c50' },
  weight: { icon: 'trending-down', color: '#bc8247' },
  planning: { icon: 'calendar', color: '#51b879' },
  sync: { icon: 'refresh-cw', color: '#6e91ef' },
  learning: { icon: 'book-open', color: '#9875c7' },
};

function metaFor(category: LiveInsight['category']) {
  return CATEGORY_META[category];
}

function SignalIcon({ category, colors, size = 18 }: { category: LiveInsight['category']; colors: ReturnType<typeof useCalora>['colors']; size?: number }) {
  const meta = metaFor(category);
  return (
    <View style={[styles.signalIcon, { backgroundColor: `${meta.color}1c` }]}>
      <Feather name={meta.icon} size={size} color={meta.color || colors.primary} />
    </View>
  );
}

function LiveBadge({ colors, timestamp }: { colors: ReturnType<typeof useCalora>['colors']; timestamp: Date }) {
  return (
    <View style={[styles.liveBadge, { backgroundColor: `${colors.success}18` }]}>
      <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
      <Text style={[styles.liveBadgeText, { color: colors.success }]}>LIVE</Text>
      <Text style={[styles.liveTime, { color: colors.mutedForeground }]}>{timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
    </View>
  );
}

function ActionButton({ item, colors }: { item: LiveInsight; colors: ReturnType<typeof useCalora>['colors'] }) {
  if (!item.action) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.action.label}
      onPress={() => router.push(item.action!.route as never)}
      style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
    >
      <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>{item.action.label}</Text>
      <Feather name="arrow-up-right" size={14} color={colors.primaryForeground} />
    </Pressable>
  );
}

function SignalCard({ item, colors, index }: { item: LiveInsight; colors: ReturnType<typeof useCalora>['colors']; index: number }) {
  const meta = metaFor(item.category);
  const stateLabel = item.state === 'attention' || item.state === 'stale' ? 'Needs attention' : item.evidence.kind === 'observed' ? 'Just recorded' : 'Live signal';
  return (
    <View style={[styles.signalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.signalAccent, { backgroundColor: meta.color }]} />
      <View style={styles.signalCardInner}>
        <View style={styles.signalCardTop}>
          <SignalIcon category={item.category} colors={colors} size={index === 0 ? 19 : 17} />
          <View style={styles.signalTitleWrap}>
            <View style={styles.signalEyebrowRow}>
              <Text style={[styles.signalEyebrow, { color: meta.color }]}>{stateLabel.toUpperCase()}</Text>
              {item.metric ? <Text style={[styles.signalMetric, { color: meta.color }]}>{item.metric}</Text> : null}
            </View>
            <Text allowFontScaling style={[styles.signalTitle, index === 0 && styles.signalTitleProminent, { color: colors.foreground }]}>{item.title}</Text>
          </View>
        </View>
        <Text allowFontScaling style={[styles.signalSummary, { color: colors.mutedForeground }]}>{item.summary}</Text>
        <View style={styles.signalBottomRow}>
          <Text style={[styles.signalEvidence, { color: colors.mutedForeground }]}>{item.evidence.kind === 'observed' ? 'Verified from your records' : item.evidence.kind === 'derived' ? 'Calculated from today’s data' : 'Suggested next step'}</Text>
          <ActionButton item={item} colors={colors} />
        </View>
      </View>
    </View>
  );
}

function RecommendationRow({ item, colors }: { item: LiveInsight; colors: ReturnType<typeof useCalora>['colors'] }) {
  const meta = metaFor(item.category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.action?.label ?? item.title}
      onPress={() => item.action && router.push(item.action.route as never)}
      style={({ pressed }) => [styles.recommendationRow, { borderBottomColor: colors.border }, pressed && styles.rowPressed]}
    >
      <View style={[styles.recommendationIcon, { backgroundColor: `${meta.color}18` }]}><Feather name={meta.icon} size={16} color={meta.color} /></View>
      <View style={styles.recommendationCopy}>
        <Text allowFontScaling style={[styles.recommendationTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text allowFontScaling numberOfLines={2} style={[styles.recommendationSummary, { color: colors.mutedForeground }]}>{item.summary}</Text>
      </View>
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

function TimelineRow({ event, colors, isLast }: { event: LiveActivityEvent; colors: ReturnType<typeof useCalora>['colors']; isLast: boolean }) {
  const meta = metaFor(event.category);
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
        {!isLast ? <View style={[styles.timelineLine, { backgroundColor: colors.border }]} /> : null}
      </View>
      <View style={styles.timelineContent}>
        <Text allowFontScaling style={[styles.timelineDescription, { color: colors.foreground }]}>{event.description}</Text>
        <Text style={[styles.timelineTime, { color: colors.mutedForeground }]}>{event.timeLabel}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ eyebrow, title, subtitle, colors }: { eyebrow: string; title: string; subtitle?: string; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{eyebrow}</Text>
      <Text allowFontScaling style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? <Text allowFontScaling style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

export default function ProgressInsightsScreen() {
  const {
    colors,
    logs,
    waterLogs,
    hydrationGoalOunces,
    healthConnection,
    dailyStepGoal,
    fasting,
    moodLogs,
    activityMinutesLogs,
    weights,
    plannerMeals,
    syncState,
    hydrated,
    syncHealth,
  } = useCalora();
  const [refreshing, setRefreshing] = useState(false);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockNow(new Date());
      setRefreshNonce((value) => value + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const snapshot = useMemo(() => deriveLiveInsights({
    now: clockNow,
    logs,
    waterLogs,
    hydrationGoalOunces,
    healthConnection,
    dailyStepGoal,
    fasting,
    moodLogs,
    activityMinutesLogs,
    weights,
    plannerMeals,
    syncState,
    hydrated,
  }), [activityMinutesLogs, clockNow, dailyStepGoal, fasting, healthConnection, hydrationGoalOunces, hydrated, logs, moodLogs, plannerMeals, refreshNonce, syncState, waterLogs, weights]);

  useFocusEffect(useCallback(() => {
    setClockNow(new Date());
    setRefreshNonce((value) => value + 1);
  }, []));

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (healthConnection.authorization === 'authorized' || healthConnection.authorization === 'partial') await syncHealth();
      setClockNow(new Date());
      setRefreshNonce((value) => value + 1);
    } finally {
      setRefreshing(false);
    }
  }, [healthConnection.authorization, refreshing, syncHealth]);

  const visibleSignals = snapshot.observations.slice(0, 4);
  const visibleRecommendations = snapshot.recommendations.slice(0, 3);
  const liveSignalCount = visibleSignals.length + snapshot.activity.length;
  const freshnessColor = snapshot.freshness.state === 'fresh' ? colors.success : snapshot.freshness.state === 'stale' ? colors.warning : colors.mutedForeground;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Live Insights"
        back
        onBack={() => router.replace('/(tabs)/insights')}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh live insights" onPress={() => void refresh()} style={[styles.headerButton, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="refresh-cw" size={17} color={colors.foreground} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeading}>
          <View style={styles.heroCopy}>
            <View style={styles.heroEyebrowRow}>
              <Text style={[styles.heroEyebrow, { color: colors.primary }]}>YOUR DAY, LIVE</Text>
              <LiveBadge colors={colors} timestamp={clockNow} />
            </View>
            <Text allowFontScaling style={[styles.heroTitle, { color: colors.foreground }]}>What is happening now.</Text>
            <Text allowFontScaling style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>{snapshot.freshness.detail}</Text>
          </View>
        </View>

        <View style={[styles.statusRail, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StatusCell label="Signals" value={String(liveSignalCount)} detail="active" icon="activity" color={colors.primary} colors={colors} />
          <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
          <StatusCell label="Today" value={`${snapshot.today.mealsLogged} · ${snapshot.today.waterOunces} oz`} detail="logged" icon="sun" color="#dca64f" colors={colors} />
          <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
          <StatusCell label="Data" value={snapshot.freshness.state === 'fresh' ? 'Fresh' : snapshot.freshness.state === 'stale' ? 'Dated' : snapshot.freshness.state === 'offline' ? 'Offline' : 'Local'} detail="status" icon="radio" color={freshnessColor} colors={colors} />
        </View>

        <View style={[styles.briefingPanel, { backgroundColor: colors.primary }]}>
          <View style={styles.briefingHeader}>
            <View style={styles.briefingPulse}><View style={[styles.briefingPulseDot, { backgroundColor: colors.primaryForeground }]} /></View>
            <Text style={[styles.briefingEyebrow, { color: colors.primaryForeground }]}>CALORA BRIEFING</Text>
          </View>
          <Text allowFontScaling style={[styles.briefingTitle, { color: colors.primaryForeground }]}>{snapshot.briefing.title}</Text>
          <Text allowFontScaling style={[styles.briefingSummary, { color: colors.primaryForeground }]}>{snapshot.briefing.summary}</Text>
          <View style={styles.briefingFooter}>
            <Text style={[styles.briefingUpdated, { color: `${colors.primaryForeground}c9` }]}>Updated just now from available app data</Text>
            <Feather name="arrow-down-right" size={17} color={colors.primaryForeground} />
          </View>
        </View>

        {visibleSignals.length > 0 ? (
          <>
            <SectionHeader eyebrow="LIVE SIGNALS" title="What Calora noticed" subtitle="Prioritized from your records and current connection state" colors={colors} />
            <View style={styles.signalStack}>
              {visibleSignals.map((item, index) => <SignalCard key={item.id} item={item} colors={colors} index={index} />)}
            </View>
          </>
        ) : null}

        {visibleRecommendations.length > 0 ? (
          <>
            <SectionHeader eyebrow="NEXT BEST MOVES" title="Useful from here" subtitle="Small actions based on what is available right now" colors={colors} />
            <View style={[styles.recommendationPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {visibleRecommendations.map((item) => <RecommendationRow key={item.id} item={item} colors={colors} />)}
            </View>
          </>
        ) : null}

        <SectionHeader eyebrow="TIMELINE" title="Your activity stream" subtitle="Recorded events only — no invented milestones" colors={colors} />
        <View style={[styles.timelinePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {snapshot.activity.length > 0 ? snapshot.activity.map((event, index) => <TimelineRow key={event.id} event={event} colors={colors} isLast={index === snapshot.activity.length - 1} />) : (
            <View style={styles.emptyTimeline}>
              <View style={[styles.emptyTimelineIcon, { backgroundColor: colors.muted }]}><Feather name="clock" size={18} color={colors.mutedForeground} /></View>
              <Text allowFontScaling style={[styles.emptyTimelineTitle, { color: colors.foreground }]}>The stream is quiet for now</Text>
              <Text allowFontScaling style={[styles.emptyTimelineBody, { color: colors.mutedForeground }]}>When Calora records a meal, sync, weigh-in, or completed fast, it will appear here with its source and time.</Text>
            </View>
          )}
        </View>

        <View style={styles.trustNote}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text allowFontScaling style={[styles.trustNoteText, { color: colors.mutedForeground }]}>Insights reflect available app records. They are not medical advice and do not infer what was not logged.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatusCell({ label, value, detail, icon, color, colors }: { label: string; value: string; detail: string; icon: React.ComponentProps<typeof Feather>['name']; color: string; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <View style={styles.statusCell}>
      <View style={[styles.statusIcon, { backgroundColor: `${color}18` }]}><Feather name={icon} size={14} color={color} /></View>
      <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.statusValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statusDetail, { color: colors.mutedForeground }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  headerButton: { width: 38, height: 38, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  heroHeading: { marginBottom: 17 },
  heroCopy: { flex: 1 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 33, letterSpacing: -0.8, marginTop: 8 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 320 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  liveTime: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  statusRail: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, marginBottom: 16 },
  statusCell: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 6 },
  statusDivider: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  statusIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  statusLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  statusValue: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 2, maxWidth: '100%' },
  statusDetail: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 1 },
  briefingPanel: { borderRadius: 22, padding: 18, marginBottom: 25 },
  briefingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  briefingPulse: { width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  briefingPulseDot: { width: 7, height: 7, borderRadius: 4 },
  briefingEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  briefingTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 27, letterSpacing: -0.3, marginTop: 17 },
  briefingSummary: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 320 },
  briefingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 19, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.22)' },
  briefingUpdated: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  sectionHeader: { marginTop: 2, marginBottom: 11 },
  sectionEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 24, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  signalStack: { gap: 10, marginBottom: 25 },
  signalCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', flexDirection: 'row' },
  signalAccent: { width: 4 },
  signalCardInner: { flex: 1, padding: 14 },
  signalCardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  signalIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  signalTitleWrap: { flex: 1, minWidth: 0 },
  signalEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  signalEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.05 },
  signalMetric: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  signalTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 19, marginTop: 3 },
  signalTitleProminent: { fontSize: 16, lineHeight: 21 },
  signalSummary: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 10, marginLeft: 43 },
  signalBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, marginLeft: 43 },
  signalEvidence: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10 },
  actionButton: { minHeight: 32, borderRadius: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  recommendationPanel: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, marginBottom: 25 },
  recommendationRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  recommendationRowLast: { borderBottomWidth: 0 },
  recommendationIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  recommendationCopy: { flex: 1, minWidth: 0 },
  recommendationTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 18 },
  recommendationSummary: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  rowPressed: { opacity: 0.72 },
  timelinePanel: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 15 },
  timelineRow: { flexDirection: 'row', minHeight: 54 },
  timelineRail: { width: 20, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 1, flex: 1, marginTop: 3 },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  timelineDescription: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17, flex: 1 },
  timelineTime: { fontFamily: 'Inter_500Medium', fontSize: 10, paddingTop: 1 },
  emptyTimeline: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  emptyTimelineIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTimelineTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, textAlign: 'center' },
  emptyTimelineBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  trustNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 17, paddingHorizontal: 3 },
  trustNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
});
