import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { Children, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora, type DailyActivity, type FoodLog, type MealType, type Mood } from '@/context/CaloraContext';
import type { LivingMemoryKind } from '@/lib/livingMemory';

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
  colors,
  onForget,
  onEdit,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
  colors: ReturnType<typeof useCalora>['colors'];
  onForget: () => void;
  onEdit?: () => void;
}) {
  return (
    <View style={[styles.memoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={15} color={colors.accentForeground} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text>
        <Text style={[styles.rowSource, { color: colors.mutedForeground }]}>Confirmed on this device</Text>
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

export default function LivingMemoryScreen() {
  const { colors, livingMemory, logs, plannerMeals, updateLog, forgetLivingObservation } = useCalora();
  const insets = useSafeAreaInsets();
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMeal, setEditMeal] = useState<MealType>('Breakfast');
  const [forgetTarget, setForgetTarget] = useState<{ kind: LivingMemoryKind; id: string; label: string } | null>(null);

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
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close living memory" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL-FIRST</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>What Calora remembers</Text>
          </View>
        </View>

        <View style={[styles.introCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.accent }]}>
            <Feather name="shield" size={20} color={colors.accentForeground} />
          </View>
          <Text style={[styles.introTitle, { color: colors.onHero }]}>You stay in control</Text>
          <Text style={[styles.introBody, { color: colors.heroMuted }]}>
            These are small, confirmed signals from your Calora activity. They stay on this device and are never a score or diagnosis.
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
            <MemorySection title="Diary signals" caption="Meal timing and type from confirmed diary entries." colors={colors}>
              {Object.entries(livingMemory.mealObservations).map(([id, observation]) => {
                const log = logsById.get(id);
                const label = `Diary entry · ${readableDate(observation.date)}`;
                return (
                  <MemoryRow
                    key={id}
                    icon="coffee"
                    title={label}
                    detail={`${observation.meal}${log ? ` · ${log.serving}` : ''}`}
                    colors={colors}
                    onEdit={log ? () => startEdit(log) : undefined}
                    onForget={() => forget('meal', id, label)}
                  />
                );
              })}
            </MemorySection>

            <MemorySection title="Wellness check-ins" caption="Optional water, mood, and activity signals." colors={colors}>
              {Object.entries(livingMemory.waterObservations).map(([date, observation]) => (
                <MemoryRow key={`water-${date}`} icon="droplet" title={`Water · ${readableDate(date)}`} detail={`${observation.ounces} fl oz`} colors={colors} onForget={() => forget('water', date, `Water · ${readableDate(date)}`)} />
              ))}
              {Object.entries(livingMemory.moodObservations).map(([date, observation]) => (
                <MemoryRow key={`mood-${date}`} icon="smile" title={`Mood · ${readableDate(date)}`} detail={moodLabels[observation.mood]} colors={colors} onForget={() => forget('mood', date, `Mood · ${readableDate(date)}`)} />
              ))}
              {Object.entries(livingMemory.activityObservations).map(([date, observation]) => (
                <MemoryRow key={`activity-${date}`} icon="activity" title={`Activity · ${readableDate(date)}`} detail={activityLabels[observation.activity]} colors={colors} onForget={() => forget('activity', date, `Activity · ${readableDate(date)}`)} />
              ))}
            </MemorySection>

            <MemorySection title="Planning signals" caption="Meals you assigned yourself, not starter suggestions." colors={colors}>
              {Object.entries(livingMemory.plannerObservations).map(([id, observation]) => {
                const plannerMeal = visiblePlannerMeals.get(id);
                const label = `Plan · ${readableDate(observation.day)}`;
                return (
                  <MemoryRow
                    key={id}
                    icon="calendar"
                    title={label}
                    detail={`${observation.meal}${plannerMeal ? ` · ${plannerMeal.serving}` : ''}`}
                    colors={colors}
                    onForget={() => forget('planner', id, label)}
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
              onPress={() => {
                if (forgetTarget) forgetLivingObservation(forgetTarget.kind, forgetTarget.id);
                setForgetTarget(null);
              }}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
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
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  rowDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  rowSource: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 4 },
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
});