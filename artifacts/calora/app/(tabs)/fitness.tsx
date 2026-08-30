import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCalora } from '@/context/CaloraContext';
import { AppHeader } from '@/components/AppChrome';
import { Surface } from '@/components/Surface';
import { ScalePressable } from '@/components/ScalePressable';
import { formatWhole } from '@/lib/formatters';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  APPROVED_FITNESS_PROGRAM_PROVIDER,
  FITNESS_PROGRAM_CONNECTION_KINDS,
  fitnessGoalCopy,
  fitnessHealthState,
  formatWorkoutDuration,
} from '@/lib/fitness';

function formatWorkoutTime(startAt: string) {
  const date = new Date(startAt);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function getWorkoutIcon(type: string): keyof typeof Feather.glyphMap {
  const t = type.toLowerCase();
  if (t.includes('run') || t.includes('jog')) return 'loader';
  if (t.includes('walk')) return 'activity';
  if (t.includes('cycle') || t.includes('bike')) return 'circle';
  if (t.includes('swim')) return 'wind';
  if (t.includes('weight') || t.includes('strength')) return 'crosshair';
  if (t.includes('yoga')) return 'smile';
  if (t.includes('hiit')) return 'zap';
  return 'activity';
}

export default function FitnessScreen() {
  const {
    colors,
    healthConnection,
    connectHealth,
    syncHealth,
    profile,
    fontScale,
  } = useCalora();

  const insets = useSafeAreaInsets();
  const [healthBusy, setHealthBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const healthState = fitnessHealthState(healthConnection);
  const goalCopy = fitnessGoalCopy(profile?.goal);

  const handleSync = async () => {
    if (healthBusy) return;
    setHealthBusy(true);
    setActionError(null);
    try {
      await syncHealth();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Activity could not be refreshed.');
    } finally {
      setHealthBusy(false);
    }
  };

  const handleConnect = async () => {
    if (healthBusy) return;
    setHealthBusy(true);
    setActionError(null);
    try {
      await connectHealth();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Health access could not be opened.');
    } finally {
      setHealthBusy(false);
    }
  };

  const workouts = healthState.kind === 'ready' ? healthState.workouts : [];
  const hasWorkouts = workouts.length > 0;

  const styles = useMemo(() => {
    const scale = fontScale ?? 1;
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: insets.bottom + 120,
        gap: 24,
      },
      heroSection: {
        gap: 8,
      },
      focusCard: {
        padding: 18,
        gap: 8,
        backgroundColor: colors.hero,
      },
      focusEyebrow: {
        fontFamily: 'Inter_700Bold',
        fontSize: 10 * scale,
        color: colors.heroMuted,
        letterSpacing: 1,
      },
      focusTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 21 * scale,
        color: colors.onHero,
      },
      focusBody: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14 * scale,
        lineHeight: 20 * scale,
        color: colors.heroMuted,
      },
      title: {
        fontFamily: 'Inter_700Bold',
        fontSize: 28 * scale,
        color: colors.foreground,
        letterSpacing: -0.5,
      },
      subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16 * scale,
        color: colors.mutedForeground,
      },
      statsGrid: {
        flexDirection: 'row',
        gap: 12,
      },
      statCard: {
        flex: 1,
        padding: 16,
        gap: 12,
      },
      statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      statTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13 * scale,
        color: colors.mutedForeground,
      },
      statValue: {
        fontFamily: 'Inter_700Bold',
        fontSize: 24 * scale,
        color: colors.foreground,
        letterSpacing: -0.5,
      },
      statUnit: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13 * scale,
        color: colors.mutedForeground,
        marginLeft: 2,
      },
      sectionTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18 * scale,
        color: colors.foreground,
        letterSpacing: -0.3,
        marginBottom: 4,
      },
      sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      },
      workoutList: {
        gap: 12,
      },
      workoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
      },
      workoutIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.muted,
      },
      workoutInfo: {
        flex: 1,
        gap: 4,
      },
      workoutType: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16 * scale,
        color: colors.foreground,
      },
      workoutMeta: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14 * scale,
        color: colors.mutedForeground,
      },
      workoutDuration: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15 * scale,
        color: colors.foreground,
      },
      emptyCard: {
        padding: 24,
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderRadius: 16,
      },
      emptyTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16 * scale,
        color: colors.foreground,
        textAlign: 'center',
      },
      emptyText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14 * scale,
        color: colors.mutedForeground,
        textAlign: 'center',
        lineHeight: 20 * scale,
      },
      primaryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
      },
      primaryButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15 * scale,
        color: colors.primaryForeground,
      },
      syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: colors.muted,
      },
      syncButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13 * scale,
        color: colors.foreground,
      },
      disclaimer: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13 * scale,
        color: colors.mutedForeground,
        textAlign: 'center',
        marginTop: 16,
      },
      errorText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13 * scale,
        lineHeight: 18 * scale,
        color: colors.warning,
        textAlign: 'center',
      },
      providerCard: {
        padding: 18,
        gap: 14,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        borderRadius: 16,
      },
      providerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      providerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
      },
      providerHeaderCopy: {
        flex: 1,
        gap: 3,
      },
      providerName: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 17 * scale,
        color: colors.foreground,
      },
      providerStatus: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12 * scale,
        color: colors.accentForeground,
      },
      providerBody: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14 * scale,
        lineHeight: 20 * scale,
        color: colors.mutedForeground,
      },
      providerPolicy: {
        gap: 9,
        paddingTop: 2,
      },
      providerPolicyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
      },
      providerPolicyText: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 12 * scale,
        lineHeight: 17 * scale,
        color: colors.foreground,
      },
      providerLink: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 16,
        backgroundColor: colors.muted,
      },
      providerLinkText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13 * scale,
        color: colors.primary,
      },
    });
  }, [colors, fontScale, insets.bottom]);

  return (
    <View style={styles.container} testID="fitness-screen">
      <AppHeader title="Fitness" />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.heroSection}>
          <Text style={styles.title}>Your Training</Text>
          <Text style={styles.subtitle}>A trustworthy home for activity, training context, and official programs.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Surface tier="raised" radius="xl" style={styles.focusCard} testID="fitness-goal-focus">
            <Text style={styles.focusEyebrow}>YOUR FITNESS FOCUS</Text>
            <Text style={styles.focusTitle}>{goalCopy.label}</Text>
            <Text style={styles.focusBody}>{goalCopy.message}</Text>
          </Surface>
        </Animated.View>

        {healthState.kind === 'ready' ? (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activity Today</Text>
              <ScalePressable accessibilityLabel={`Sync ${healthState.providerLabel}`} disabled={healthBusy} onPress={handleSync} style={styles.syncButton} testID="fitness-sync-health">
                {healthBusy ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={colors.foreground} />
                )}
                <Text style={styles.syncButtonText}>{healthBusy ? 'Syncing…' : 'Sync'}</Text>
              </ScalePressable>
            </View>
            <Text style={[styles.emptyText, { textAlign: 'left', marginBottom: 12 }]}>{healthState.message}</Text>
            <View style={styles.statsGrid}>
              <Surface style={styles.statCard} tier="flat">
                <View style={styles.statHeader}>
                  <Feather name="zap" size={16} color={colors.primary} />
                  <Text style={styles.statTitle}>Active Energy</Text>
                </View>
                <Text style={styles.statValue}>
                  {healthState.activeEnergyKcal === null ? 'Unavailable' : formatWhole(healthState.activeEnergyKcal)}
                  {healthState.activeEnergyKcal !== null && <Text style={styles.statUnit}> kcal</Text>}
                </Text>
              </Surface>

              <Surface style={styles.statCard} tier="flat">
                <View style={styles.statHeader}>
                  <Feather name="activity" size={16} color={colors.primary} />
                  <Text style={styles.statTitle}>Steps</Text>
                </View>
                <Text style={styles.statValue}>
                  {healthState.steps === null ? 'Unavailable' : formatWhole(healthState.steps)}
                </Text>
              </Surface>
            </View>
            {healthState.partial && <Text style={[styles.emptyText, { textAlign: 'left', marginTop: 10 }]}>Some activity is unavailable because access is limited.</Text>}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          
          {healthState.kind !== 'ready' ? (
            <View style={styles.emptyCard} testID="fitness-health-prompt">
              <Feather name="watch" size={32} color={colors.mutedForeground} />
              <View>
                <Text style={styles.emptyTitle}>{healthState.kind === 'unavailable' ? 'Activity import unavailable' : healthState.kind === 'sync' ? 'Refresh today’s activity' : 'Connect your activity'}</Text>
                <Text style={styles.emptyText}>{healthState.message}</Text>
              </View>
              {actionError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{actionError}</Text>}
              {healthState.kind !== 'unavailable' && (
                <ScalePressable
                  accessibilityLabel={healthState.kind === 'sync' ? `Sync ${healthState.providerLabel}` : `Connect ${healthState.providerLabel}`}
                  disabled={healthBusy}
                  onPress={healthState.kind === 'sync' ? handleSync : handleConnect}
                  style={styles.primaryButton}
                  testID="fitness-health-action"
                >
                  {healthBusy && <ActivityIndicator size="small" color={colors.primaryForeground} />}
                  <Text style={styles.primaryButtonText}>{healthBusy ? 'Working…' : healthState.kind === 'sync' ? 'Sync activity' : 'Review health access'}</Text>
                </ScalePressable>
              )}
            </View>
          ) : hasWorkouts ? (
            <View style={styles.workoutList} testID="fitness-workouts-list">
              {workouts.slice(0, 5).map((workout) => (
                <Surface key={workout.id} style={styles.workoutCard} tier="flat">
                  <View style={styles.workoutIconWrap}>
                    <Feather name={getWorkoutIcon(workout.type)} size={20} color={colors.foreground} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutType}>{workout.type}</Text>
                    <Text style={styles.workoutMeta}>{formatWorkoutTime(workout.startAt)}</Text>
                  </View>
                  <Text style={styles.workoutDuration}>{formatWorkoutDuration(workout.startAt, workout.endAt)}</Text>
                </Surface>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard} testID="fitness-no-workouts">
              <Feather name="wind" size={32} color={colors.mutedForeground} />
              <View>
                <Text style={styles.emptyTitle}>No recent workouts</Text>
                <Text style={styles.emptyText}>When you record a workout on your connected device, it will appear here.</Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Text style={styles.sectionTitle}>Programs</Text>
          <View style={styles.providerCard} testID="fitness-program-provider">
            <View style={styles.providerHeader}>
              <View style={styles.providerIconWrap}>
                <Feather name="award" size={22} color={colors.accentForeground} />
              </View>
              <View style={styles.providerHeaderCopy}>
                <Text style={styles.providerName}>{APPROVED_FITNESS_PROGRAM_PROVIDER.name}</Text>
                <Text style={styles.providerStatus}>Approved first provider · partner access pending</Text>
              </View>
            </View>
            <Text style={styles.providerBody}>
              Calora’s first program connection will use the official LES MILLS Content API when approved partner access is active.
            </Text>
            <View style={styles.providerPolicy}>
              <View style={styles.providerPolicyRow}>
                <Feather name="check-circle" size={15} color={colors.success} />
                <Text style={styles.providerPolicyText}>{APPROVED_FITNESS_PROGRAM_PROVIDER.accessLabel}</Text>
              </View>
              <View style={styles.providerPolicyRow}>
                <Feather name="shield" size={15} color={colors.success} />
                <Text style={styles.providerPolicyText}>{APPROVED_FITNESS_PROGRAM_PROVIDER.contentPolicy}</Text>
              </View>
              <View style={styles.providerPolicyRow}>
                <Feather name="file-text" size={15} color={colors.warning} />
                <Text style={styles.providerPolicyText}>{APPROVED_FITNESS_PROGRAM_PROVIDER.rightsPolicy}</Text>
              </View>
            </View>
            <ScalePressable
              accessibilityLabel="Visit the official LES MILLS website"
              accessibilityRole="link"
              onPress={() => { void Linking.openURL(APPROVED_FITNESS_PROGRAM_PROVIDER.officialUrl); }}
              style={styles.providerLink}
              testID="fitness-provider-official-link"
            >
              <Text style={styles.providerLinkText}>Visit official source</Text>
              <Feather name="external-link" size={14} color={colors.primary} />
            </ScalePressable>
          </View>
          
          <Text style={styles.disclaimer}>
            Imported activity remains context only and does not alter your logged dietary calories. Program connections remain limited to {FITNESS_PROGRAM_CONNECTION_KINDS.length} approved source types.
          </Text>
        </Animated.View>

      </ScrollView>
    </View>
  );
}
