import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';

const days = [
  { day: 'Fri', value: 72, kcal: '1,920' },
  { day: 'Sat', value: 88, kcal: '2,040' },
  { day: 'Sun', value: 64, kcal: '1,780' },
  { day: 'Mon', value: 92, kcal: '1,980' },
  { day: 'Tue', value: 78, kcal: '2,110' },
  { day: 'Wed', value: 84, kcal: '1,870' },
  { day: 'Thu', value: 79, kcal: '1,025' },
];

export default function InsightsScreen() {
  const { colors, logs } = useCalora();
  const insets = useSafeAreaInsets();
  const verifiedCount = logs.filter((log) => log.confidence >= 90).length;
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>THE BIGGER PICTURE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Your insights</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Patterns, not pressure. Use the signal to make tomorrow easier.</Text>

        <View style={[styles.adaptiveCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(157,215,189,0.15)' }]}>
            <Feather name="activity" size={20} color={colors.heroMuted} />
          </View>
          <Text style={[styles.cardEyebrow, { color: colors.heroMuted }]}>ADAPTIVE TARGET</Text>
          <Text style={[styles.adaptiveTitle, { color: colors.onHero }]}>Your target is working with you.</Text>
          <Text style={[styles.adaptiveBody, { color: colors.heroMuted }]}>You’re averaging 1,940 kcal this week. Keep logging for 4 more days and Calora can make a more personal recommendation.</Text>
          <View style={styles.adaptiveFooter}>
            <Text style={[styles.adaptiveFooterText, { color: colors.onHero }]}>4 / 7 days of signal</Text>
            <View style={[styles.miniTrack, { backgroundColor: 'rgba(157,215,189,0.18)' }]}><View style={[styles.miniFill, { width: '57%', backgroundColor: colors.primary }]} /></View>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>6.2</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>days logged</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{verifiedCount * 8 + 68}%</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>data trust</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>−0.4</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg trend</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This week</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Calories against your 2,000 kcal target</Text>
          </View>
          <Pressable accessibilityLabel="Change insights range" style={[styles.rangeButton, { backgroundColor: colors.muted }]}>
            <Text style={[styles.rangeText, { color: colors.foreground }]}>7D</Text>
            <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chart}>
            {days.map((item, index) => (
              <View key={item.day} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{item.kcal}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.bar, { height: `${item.value}%`, backgroundColor: index === 6 ? colors.primary : colors.success }]} />
                </View>
                <Text style={[styles.barDay, { color: index === 6 ? colors.primary : colors.mutedForeground }]}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>on target</Text></View>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Avg. 1,940 kcal</Text>
          </View>
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 22, maxWidth: 330 },
  adaptiveCard: { borderRadius: 24, padding: 19, marginBottom: 14 },
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
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 9 },
  trustIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trustTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  trustBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 4 },
});