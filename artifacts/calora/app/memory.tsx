import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora, type DailyActivity, type FoodLog, type MealType, type Mood } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import type { LivingMemoryKind } from '@/lib/livingMemory';
import { buildDiaryRows, buildWellnessRows, buildPlannerRows } from '@/lib/memorySections';
import { isStaleDate, relativeTime as computeRelativeTime } from '@/lib/memoryDateHelpers';
import { AppHeader } from '@/components/AppChrome';
import { FoodLogThumbnail } from '@/components/FoodLogThumbnail';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const moodLabels: Record<Mood, string> = {
  energized: 'Energized',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
  stressed: 'Stressed',
};
const activityLabels: Record<DailyActivity, string> = {
  rest: 'Rest',
  light: 'Light',
  moderate: 'Moderate',
  high: 'High',
};

function readableDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function MemoryRow({
  icon,
  title,
  detail,
  lastActiveDate,
  colors,
  onForget,
  onEdit,
  foodLog,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
  lastActiveDate?: string;
  colors: ReturnType<typeof useCalora>['colors'];
  onForget: () => void;
  onEdit?: () => void;
  foodLog?: FoodLog;
}) {
  const stale = lastActiveDate ? isStaleDate(lastActiveDate) : false;
  const timeLabel = lastActiveDate ? computeRelativeTime(lastActiveDate) : '';
  return (
    <View style={[styles.memoryRow, { backgroundColor: colors.card, borderColor: stale ? colors.border : colors.border }]}>
      {foodLog ? (
        <FoodLogThumbnail log={foodLog} size={42} borderRadius={12} />
      ) : (
        <View style={[styles.rowIcon, { backgroundColor: stale ? colors.muted : colors.accent }]}>
          <Feather name={icon} size={15} color={stale ? colors.mutedForeground : colors.accentForeground} />
        </View>
      )}
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground, flex: 1 }]}>{title}</Text>
          {stale && (
            <View style={[styles.staleBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.staleBadgeText, { color: colors.mutedForeground }]}>Stale</Text>
            </View>
          )}
        </View>
        <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text>
        <Text style={[styles.rowSource, { color: colors.mutedForeground }]}>
          {timeLabel ? `${timeLabel} · ` : ''}Confirmed on this device
        </Text>
      </View>
      <View style={styles.rowActions}>
        {onEdit && (
          <Pressable accessibilityLabel={`Correct ${title}`} onPress={onEdit} style={[styles.iconAction, { backgroundColor: colors.muted }]}>
            <Feather name="edit-2" size={14} color={colors.foreground} />
          </Pressable>
        )}
        <Pressable accessibilityLabel={`Forget ${title}`} onPress={onForget} style={[styles.iconAction, { backgroundColor: colors.muted }]}>
          <Feather name="eye-off" size={14} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

const UNDO_WINDOW_MS = 7000;

export default function LivingMemoryScreen() {
  const { colors, livingMemory, logs, plannerMeals, updateLog, forgetLivingObservation } = useCalora();
  const insets = useSafeAreaInsets();

  // Increment on every focus event so staleness labels re-evaluate when the
  // device date has changed while the screen was in the background.
  const [focusRevision, setFocusRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusRevision((r) => r + 1);
    }, []),
  );

  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMeal, setEditMeal] = useState<MealType>('Breakfast');
  const [forgetTarget, setForgetTarget] = useState<{ kind: LivingMemoryKind; id: string; label: string } | null>(null);
  const [showForgetAllStale, setShowForgetAllStale] = useState(false);
  const [pendingForget, setPendingForget] = useState<{ kind: LivingMemoryKind; id: string; label: string } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const forgetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirror pendingForget in a ref so the unmount cleanup can read it synchronously
  const pendingForgetRef = useRef<{ kind: LivingMemoryKind; id: string; label: string } | null>(null);
  // Mirror forgetLivingObservation in a ref so unmount can call the latest version
  const forgetLivingObservationRef = useRef(forgetLivingObservation);
  useEffect(() => { forgetLivingObservationRef.current = forgetLivingObservation; });

  // Countdown bar animation — shrinks from full to empty over UNDO_WINDOW_MS
  const forgetCountdown = useSharedValue(1);
  useEffect(() => {
    if (pendingForget) {
      forgetCountdown.value = 1;
      forgetCountdown.value = withTiming(0, { duration: UNDO_WINDOW_MS, easing: Easing.linear });
    } else {
      cancelAnimation(forgetCountdown);
    }
  }, [pendingForget, forgetCountdown]);
  const forgetCountdownBarStyle = useAnimatedStyle(() => ({
    width: `${forgetCountdown.value * 100}%` as `${number}%`,
  }));

  // On unmount: if a forget is still pending, commit it so navigation away never silently discards it
  useEffect(() => {
    return () => {
      if (forgetTimerRef.current) clearTimeout(forgetTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pendingForgetRef.current) {
        forgetLivingObservationRef.current(pendingForgetRef.current.kind, pendingForgetRef.current.id);
        pendingForgetRef.current = null;
      }
    };
  }, []);

  const clearTimers = () => {
    if (forgetTimerRef.current) { clearTimeout(forgetTimerRef.current); forgetTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const handleConfirmForget = () => {
    if (!forgetTarget) return;
    const { kind, id, label } = forgetTarget;
    setForgetTarget(null);

    // If another forget is already pending, commit it immediately before starting a new one
    if (pendingForgetRef.current) {
      forgetLivingObservation(pendingForgetRef.current.kind, pendingForgetRef.current.id);
    }
    clearTimers();

    const next = { kind, id, label };
    pendingForgetRef.current = next;
    const expiresAt = Date.now() + UNDO_WINDOW_MS;
    setUndoSecondsLeft(Math.ceil(UNDO_WINDOW_MS / 1000));
    setPendingForget(next);

    forgetTimerRef.current = setTimeout(() => {
      forgetLivingObservationRef.current(kind, id);
      pendingForgetRef.current = null;
      setPendingForget(null);
      clearTimers();
    }, UNDO_WINDOW_MS);

    countdownRef.current = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setUndoSecondsLeft(0);
      } else {
        setUndoSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 250);
  };

  const handleUndo = () => {
    clearTimers();
    pendingForgetRef.current = null;
    setPendingForget(null);
  };

  const handleForgetAllStale = () => {
    setShowForgetAllStale(false);
    // Commit any in-flight single forget before bulk-forgetting
    if (pendingForgetRef.current) {
      forgetLivingObservation(pendingForgetRef.current.kind, pendingForgetRef.current.id);
      pendingForgetRef.current = null;
    }
    clearTimers();
    setPendingForget(null);
    // Capture the current stale list synchronously so we forget exactly what was shown
    staleSignals.forEach(({ kind, id }) => forgetLivingObservation(kind, id));
  };

  const logsById = useMemo(() => new Map(logs.map((log) => [log.id, log])), [logs]);
  const visiblePlannerMeals = useMemo(
    () => new Map(plannerMeals.map((meal) => [meal.id, meal])),
    [plannerMeals],
  );
  const totalCount =
    Object.keys(livingMemory.mealObservations).length +
    Object.keys(livingMemory.waterObservations).length +
    Object.keys(livingMemory.moodObservations).length +
    Object.keys(livingMemory.activityObservations).length +
    Object.keys(livingMemory.plannerObservations).length;

  const staleSignals = useMemo<Array<{ kind: LivingMemoryKind; id: string }>>(() => {
    // focusRevision is included so this recomputes whenever the screen regains
    // focus — catching date changes (new day, DST, timezone switch) that
    // happened while the app was in the background.
    void focusRevision;
    const signals: Array<{ kind: LivingMemoryKind; id: string }> = [];
    Object.entries(livingMemory.mealObservations).forEach(([id, o]) => { if (isStaleDate(o.date)) signals.push({ kind: 'meal', id }); });
    Object.keys(livingMemory.waterObservations).forEach((d) => { if (isStaleDate(d)) signals.push({ kind: 'water', id: d }); });
    Object.keys(livingMemory.moodObservations).forEach((d) => { if (isStaleDate(d)) signals.push({ kind: 'mood', id: d }); });
    Object.keys(livingMemory.activityObservations).forEach((d) => { if (isStaleDate(d)) signals.push({ kind: 'activity', id: d }); });
    Object.entries(livingMemory.plannerObservations).forEach(([id, o]) => { if (isStaleDate(o.day)) signals.push({ kind: 'planner', id }); });
    return signals;
  }, [livingMemory, focusRevision]);

  const staleCount = staleSignals.length;
  const allStale = totalCount > 0 && staleCount === totalCount;

  const forget = (kind: LivingMemoryKind, id: string, label: string) => {
    setForgetTarget({ kind, id, label });
  };

  const startEdit = (log: FoodLog) => {
    setEditingLog(log);
    setEditDate(log.date);
    setEditMeal(log.meal);
  };

  const saveEdit = () => {
    if (!editingLog || !/^\d{4}-\d{2}-\d{2}$/.test(editDate)) return;
    updateLog(editingLog.id, { date: editDate, meal: editMeal });
    setEditingLog(null);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader back title="Living memory" />
      <ScrollView
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL-FIRST</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>What {BRAND.name} remembers</Text>
        </View>

        <View style={[styles.introCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.accent }]}>
            <Feather name="shield" size={20} color={colors.accentForeground} />
          </View>
          <Text style={[styles.introTitle, { color: colors.onHero }]}>You stay in control</Text>
          <Text style={[styles.introBody, { color: colors.heroMuted }]}>
            These are small, confirmed signals from your {BRAND.name} activity. They stay on this device and are never a score or diagnosis.
          </Text>
        </View>

        {totalCount === 0 ? (
          <View testID="living-memory-empty" style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="moon" size={20} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing remembered yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              As you log meals or check in, confirmed signals will appear here for you to review.
            </Text>
          </View>
        ) : (
          <>
            {staleCount > 0 && (
              <View style={styles.staleNoticeWrap}>
                <View style={[styles.staleNotice, { backgroundColor: colors.muted, flex: 1 }]}>
                  <Feather name="clock" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.staleNoticeText, { color: colors.mutedForeground }]}>
                    {allStale
                      ? 'These signals are older than a month — review or forget them if they no longer feel relevant.'
                      : `${staleCount} signal${staleCount === 1 ? '' : 's'} older than 30 days.`}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Forget all ${staleCount} stale signals`}
                  testID="forget-all-stale"
                  onPress={() => setShowForgetAllStale(true)}
                  style={[styles.forgetAllButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Feather name="eye-off" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.forgetAllText, { color: colors.mutedForeground }]}>Forget all stale</Text>
                </Pressable>
              </View>
            )}

            <MemorySection title="Diary signals" caption="Meal timing and type from confirmed diary entries." colors={colors}>
              {buildDiaryRows(livingMemory)
                .filter((row) => !(pendingForget?.kind === 'meal' && pendingForget.id === row.id))
                .map((row) => {
                  const log = logsById.get(row.id);
                  const label = `Diary entry · ${readableDate(row.date)}`;
                  return (
                    <MemoryRow
                      key={row.id}
                      icon="coffee"
                      title={label}
                      detail={`${row.meal}${log ? ` · ${log.serving}` : ''}`}
                      lastActiveDate={row.date}
                      colors={colors}
                      foodLog={log}
                      onEdit={log ? () => startEdit(log) : undefined}
                      onForget={() => forget('meal', row.id, label)}
                    />
                  );
                })}
            </MemorySection>

            <MemorySection title="Wellness check-ins" caption="Optional water, mood, and activity signals." colors={colors}>
              {buildWellnessRows(livingMemory)
                .filter((row) => !(pendingForget && row.kind === pendingForget.kind && row.date === pendingForget.id))
                .map((row) => {
                  if (row.kind === 'water') {
                    return <MemoryRow key={row.key} icon="droplet" title={`Water · ${readableDate(row.date)}`} detail={`${row.ounces} fl oz`} lastActiveDate={row.date} colors={colors} onForget={() => forget('water', row.date, `Water · ${readableDate(row.date)}`)} />;
                  }
                  if (row.kind === 'mood') {
                    return <MemoryRow key={row.key} icon="smile" title={`Mood · ${readableDate(row.date)}`} detail={moodLabels[row.mood]} lastActiveDate={row.date} colors={colors} onForget={() => forget('mood', row.date, `Mood · ${readableDate(row.date)}`)} />;
                  }
                  return <MemoryRow key={row.key} icon="activity" title={`Activity · ${readableDate(row.date)}`} detail={activityLabels[row.activity]} lastActiveDate={row.date} colors={colors} onForget={() => forget('activity', row.date, `Activity · ${readableDate(row.date)}`)} />;
                })}
            </MemorySection>

            <MemorySection title="Planning signals" caption="Meals you assigned yourself, not starter suggestions." colors={colors}>
              {buildPlannerRows(livingMemory)
                .filter((row) => !(pendingForget?.kind === 'planner' && pendingForget.id === row.id))
                .map((row) => {
                  const plannerMeal = visiblePlannerMeals.get(row.id);
                  const label = `Plan · ${readableDate(row.day)}`;
                  return (
                    <MemoryRow
                      key={row.id}
                      icon="calendar"
                      title={label}
                      detail={`${row.meal}${plannerMeal ? ` · ${plannerMeal.serving}` : ''}`}
                      lastActiveDate={row.day}
                      colors={colors}
                      onForget={() => forget('planner', row.id, label)}
                    />
                  );
                })}
            </MemorySection>
          </>
        )}

        <View style={[styles.footerNote, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Forgetting a signal does not delete your original diary, wellness, or plan record. Editing that source later can make it appear here again.
          </Text>
        </View>
      </ScrollView>

      {pendingForget && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.undoBanner, { backgroundColor: colors.foreground, bottom: insets.bottom + 20 }]}
        >
          <View style={styles.undoBannerRow}>
            <Feather name="eye-off" size={14} color={colors.background} />
            <Text style={[styles.undoLabel, { color: colors.background }]} numberOfLines={1}>
              Signal forgotten · {undoSecondsLeft}s
            </Text>
            <Pressable
              accessibilityLabel="Undo forget signal"
              testID="undo-forget-living-memory"
              onPress={handleUndo}
              style={[styles.undoButton, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.undoButtonText, { color: colors.foreground }]}>Undo</Text>
            </Pressable>
          </View>
          <View style={[styles.undoCountdownTrack, { backgroundColor: `${colors.background}33` }]}>
            <Animated.View style={[styles.undoCountdownFill, { backgroundColor: colors.background }, forgetCountdownBarStyle]} />
          </View>
        </View>
      )}

      <Modal visible={editingLog !== null} transparent animationType="slide" onRequestClose={() => setEditingLog(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.editSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.editTitle, { color: colors.foreground }]}>Correct this signal</Text>
            <Text style={[styles.editBody, { color: colors.mutedForeground }]}>This updates the original diary entry and keeps its nutrition snapshot unchanged.</Text>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>DATE · YYYY-MM-DD</Text>
            <TextInput accessibilityLabel="Memory date" value={editDate} onChangeText={setEditDate} placeholder="2026-08-06" placeholderTextColor={colors.mutedForeground} style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} />
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>MEAL TYPE</Text>
            <View style={styles.mealChoices}>
              {mealTypes.map((meal) => (
                <Pressable key={meal} accessibilityLabel={`Set meal type to ${meal}`} onPress={() => setEditMeal(meal)} style={[styles.mealChoice, { backgroundColor: editMeal === meal ? colors.primary : colors.card, borderColor: editMeal === meal ? colors.primary : colors.border }]}>
                  <Text style={[styles.mealChoiceText, { color: editMeal === meal ? colors.primaryForeground : colors.mutedForeground }]}>{meal}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityLabel="Save memory correction" onPress={saveEdit} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save correction</Text>
            </Pressable>
            <Pressable accessibilityLabel="Cancel memory correction" onPress={() => setEditingLog(null)} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={showForgetAllStale} transparent animationType="fade" onRequestClose={() => setShowForgetAllStale(false)}>
        <View style={[styles.confirmBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.muted }]}>
              <Feather name="eye-off" size={19} color={colors.foreground} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Forget all stale signals?</Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              Forget {staleCount} signal{staleCount === 1 ? '' : 's'} older than 30 days? Your underlying diary, wellness, and plan records stay saved.
            </Text>
            <Pressable
              accessibilityLabel={`Confirm forget all ${staleCount} stale signals`}
              testID="confirm-forget-all-stale"
              onPress={handleForgetAllStale}
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.confirmButtonText, { color: colors.primaryForeground }]}>Forget {staleCount} signal{staleCount === 1 ? '' : 's'}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Keep stale signals" onPress={() => setShowForgetAllStale(false)} style={styles.confirmCancel}>
              <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Keep them</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={forgetTarget !== null} transparent animationType="fade" onRequestClose={() => setForgetTarget(null)}>
        <View style={[styles.confirmBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.muted }]}>
              <Feather name="eye-off" size={19} color={colors.foreground} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Forget this signal?</Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              {forgetTarget?.label} will be removed from Living Memory. Your underlying diary, wellness, or plan record stays saved.
            </Text>
            <Pressable
              accessibilityLabel="Confirm forget signal"
              testID="confirm-forget-living-memory"
              onPress={handleConfirmForget}
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.confirmButtonText, { color: colors.primaryForeground }]}>Forget signal</Text>
            </Pressable>
            <Pressable accessibilityLabel="Keep signal" onPress={() => setForgetTarget(null)} style={styles.confirmCancel}>
              <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Keep it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MemorySection({ title, caption, colors, children }: { title: string; caption: string; colors: ReturnType<typeof useCalora>['colors']; children: React.ReactNode }) {
  if (!children || Children.count(children) === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>{caption}</Text>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerCopy: { marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3, marginBottom: 4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.7 },
  introCard: { borderRadius: 22, padding: 17, marginBottom: 24 },
  introIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  introTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  introBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 6 },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center' },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  section: { marginBottom: 23 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 10 },
  sectionRows: { gap: 8 },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 17, padding: 11 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  staleBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  staleBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5 },
  rowDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  rowSource: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 4 },
  staleNoticeWrap: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 16 },
  staleNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, padding: 11 },
  staleNoticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  forgetAllButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  forgetAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconAction: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, padding: 11, marginTop: 1 },
  footerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  editSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30 },
  editTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  editBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 17 },
  inputLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, marginTop: 8, marginBottom: 7 },
  dateInput: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 12 },
  mealChoices: { flexDirection: 'row', gap: 6 },
  mealChoice: { flex: 1, borderWidth: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 9 },
  mealChoiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  saveButton: { alignItems: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 18 },
  saveButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  cancelButton: { alignItems: 'center', paddingTop: 14 },
  cancelButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', borderRadius: 24, padding: 20 },
  confirmIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  confirmBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  confirmButton: { alignItems: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 17 },
  confirmButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  confirmCancel: { alignItems: 'center', paddingTop: 14 },
  confirmCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  undoBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  undoBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undoLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  undoButton: { borderRadius: 9, paddingHorizontal: 13, paddingVertical: 6 },
  undoButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  undoCountdownTrack: { height: 2, borderRadius: 1, marginTop: 8, overflow: 'hidden' },
  undoCountdownFill: { height: 2, borderRadius: 1 },
});