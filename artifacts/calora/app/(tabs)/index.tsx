import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora, FoodLog, MealType } from '@/context/CaloraContext';
import { mealOrder, verifiedFoods } from '@/data/foods';

const TARGET = 2000;

function IconButton({ icon, label, onPress, colors }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <Pressable
      accessibilityLabel={label}
      testID={`quick-${label.toLowerCase().replaceAll(' ', '-')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={20} color={colors.accentForeground} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function MacroBar({ label, value, target, color, colors }: { label: string; value: number; target: number; color: string; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <View style={styles.macroBlock}>
      <View style={styles.macroHeader}>
        <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.foreground }]}>{value}g <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>/ {target}g</Text></Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.macroFill, { backgroundColor: color, width: `${Math.min((value / target) * 100, 100)}%` }]} />
      </View>
    </View>
  );
}

function MealRow({ log, colors, onRemove }: { log: FoodLog; colors: ReturnType<typeof useCalora>['colors']; onRemove: () => void }) {
  return (
    <Pressable onLongPress={onRemove} style={({ pressed }) => [styles.mealRow, { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
      <View style={[styles.mealDot, { backgroundColor: log.meal === 'Breakfast' ? colors.warning : log.meal === 'Lunch' ? colors.success : colors.primary }]} />
      <View style={styles.mealInfo}>
        <Text style={[styles.mealName, { color: colors.foreground }]} numberOfLines={1}>{log.name}</Text>
        <View style={styles.mealMeta}>
          <Text style={[styles.mealType, { color: colors.mutedForeground }]}>{log.meal} · {log.time}</Text>
          <View style={[styles.verifiedPill, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={10} color={colors.accentForeground} />
            <Text style={[styles.verifiedText, { color: colors.accentForeground }]}>{log.confidence}% verified</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.mealCalories, { color: colors.foreground }]}>{log.calories}</Text>
      <Text style={[styles.kcalLabel, { color: colors.mutedForeground }]}>kcal</Text>
    </Pressable>
  );
}

function AddFoodModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, addLog } = useCalora();
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const filtered = verifiedFoods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase()));

  const chooseFood = (food: (typeof verifiedFoods)[number]) => {
    addLog({ ...food, time: 'Just now' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const photoLog = async () => {
    setLoadingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      addLog({
        name: 'Photo meal · review estimate',
        meal: 'Lunch',
        calories: 520,
        protein: 29,
        carbs: 48,
        fat: 22,
        source: 'Photo estimate',
        confidence: 86,
        time: 'Just now',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
    setLoadingPhoto(false);
  };

  const addManual = () => {
    const kcal = Number(customCalories);
    if (!customName.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
    addLog({
      name: customName.trim(),
      meal: 'Snack',
      calories: kcal,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'Manual',
      confidence: 70,
      time: 'Just now',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomName('');
    setCustomCalories('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeading}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add to today</Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Fast now. Precise when it matters.</Text>
            </View>
            <Pressable accessibilityLabel="Close add food" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <Pressable accessibilityLabel="Log from photo" testID="photo-log-button" onPress={photoLog} style={[styles.photoButton, { backgroundColor: colors.hero }]}>
            {loadingPhoto ? <ActivityIndicator color={colors.onHero} /> : <Feather name="camera" size={20} color={colors.heroMuted} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.photoTitle, { color: colors.onHero }]}>Log from a photo</Text>
              <Text style={[styles.photoSubtitle, { color: colors.heroMuted }]}>Review an estimate before it counts</Text>
            </View>
            <Feather name="arrow-up-right" size={18} color={colors.heroMuted} />
          </Pressable>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search verified foods" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />
          </View>
          <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>VERIFIED SHORTLIST</Text>
          <ScrollView style={{ maxHeight: 210 }} showsVerticalScrollIndicator={false}>
            {filtered.map((food) => (
              <Pressable key={food.name} onPress={() => chooseFood(food)} style={[styles.foodSuggestion, { borderBottomColor: colors.border }]}>
                <View style={[styles.foodIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="check" size={15} color={colors.accentForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.foodName, { color: colors.foreground }]}>{food.name}</Text>
                  <Text style={[styles.foodMeta, { color: colors.mutedForeground }]}>{food.calories} kcal · {food.protein}g protein · {food.confidence}% confidence</Text>
                </View>
                <Feather name="plus" size={18} color={colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, marginTop: 14 }]}>MANUAL QUICK ADD</Text>
          <View style={styles.manualRow}>
            <TextInput value={customName} onChangeText={setCustomName} placeholder="Food name" placeholderTextColor={colors.mutedForeground} style={[styles.manualInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
            <TextInput value={customCalories} onChangeText={setCustomCalories} placeholder="kcal" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[styles.manualKcal, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
            <Pressable accessibilityLabel="Add manual food" onPress={addManual} style={[styles.manualAdd, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const { logs, colors, removeLog } = useCalora();
  const insets = useSafeAreaInsets();
  const [showAdd, setShowAdd] = useState(false);
  const totals = useMemo(() => logs.reduce((sum, log) => ({
    calories: sum.calories + log.calories,
    protein: sum.protein + log.protein,
    carbs: sum.carbs + log.carbs,
    fat: sum.fat + log.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [logs]);
  const remaining = Math.max(TARGET - totals.calories, 0);
  const progress = Math.min(totals.calories / TARGET, 1);

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAdd(true);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.dateKicker, { color: colors.mutedForeground }]}>THURSDAY, AUGUST 6</Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>Good morning, Alex</Text>
          </View>
          <Pressable accessibilityLabel="Profile shortcut" style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.accentForeground }]}>A</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.hero }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroEyebrow, { color: colors.heroMuted }]}>TODAY'S FUEL</Text>
              <Text style={[styles.heroTitle, { color: colors.onHero }]}>You’re on track.</Text>
            </View>
            <View style={[styles.trustBadge, { backgroundColor: 'rgba(157,215,189,0.16)' }]}>
              <Feather name="shield" size={13} color={colors.heroMuted} />
              <Text style={[styles.trustText, { color: colors.heroMuted }]}>92% trusted</Text>
            </View>
          </View>
          <View style={styles.heroMetrics}>
            <View style={[styles.ring, { borderColor: colors.primary }]}>
              <Text style={[styles.ringValue, { color: colors.onHero }]}>{remaining}</Text>
              <Text style={[styles.ringLabel, { color: colors.heroMuted }]}>left</Text>
            </View>
            <View style={styles.heroStats}>
              <Text style={[styles.heroStatValue, { color: colors.onHero }]}>{totals.calories.toLocaleString()} <Text style={[styles.heroStatUnit, { color: colors.heroMuted }]}>/ {TARGET.toLocaleString()} kcal</Text></Text>
              <View style={[styles.heroTrack, { backgroundColor: 'rgba(157,215,189,0.18)' }]}>
                <View style={[styles.heroFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.heroHint, { color: colors.heroMuted }]}>A steady pace beats a perfect day.</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <IconButton icon="camera" label="Photo log" onPress={openAdd} colors={colors} />
          <IconButton icon="search" label="Search foods" onPress={openAdd} colors={colors} />
          <IconButton icon="edit-3" label="Quick add" onPress={openAdd} colors={colors} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your balance</Text>
              <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>A simple view of what’s left</Text>
            </View>
            <Feather name="sliders" size={18} color={colors.mutedForeground} />
          </View>
          <MacroBar label="Protein" value={totals.protein} target={130} color={colors.protein} colors={colors} />
          <MacroBar label="Carbs" value={totals.carbs} target={220} color={colors.carbs} colors={colors} />
          <MacroBar label="Fat" value={totals.fat} target={68} color={colors.fat} colors={colors} />
        </View>

        <View style={styles.mealHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today’s log</Text>
            <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Long press a meal to remove it</Text>
          </View>
          <Pressable onPress={openAdd} accessibilityLabel="Add meal" style={[styles.addMealButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.addMealText, { color: colors.primaryForeground }]}>Add</Text>
          </Pressable>
        </View>
        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {mealOrder.map((meal) => {
            const mealLogs = logs.filter((log) => log.meal === meal);
            if (!mealLogs.length) return null;
            return (
              <View key={meal}>
                <Text style={[styles.mealGroup, { color: colors.mutedForeground }]}>{meal.toUpperCase()}</Text>
                {mealLogs.map((log) => <MealRow key={log.id} log={log} colors={colors} onRemove={() => removeLog(log.id)} />)}
              </View>
            );
          })}
        </View>
        <View style={styles.footerNote}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>Core foods are sourced from verified nutrition data.</Text>
        </View>
      </ScrollView>
      <AddFoodModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  dateKicker: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.1, marginBottom: 6 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.6 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  heroCard: { borderRadius: 26, padding: 20, marginBottom: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.4 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 },
  trustText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 24 },
  ring: { width: 92, height: 92, borderRadius: 46, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  ringLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: -2 },
  heroStats: { flex: 1 },
  heroStatValue: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 11 },
  heroStatUnit: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  heroTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  heroFill: { height: 7, borderRadius: 4 },
  heroHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 10 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  quickAction: { flex: 1, minHeight: 88, borderWidth: 1, borderRadius: 18, padding: 12, justifyContent: 'space-between' },
  quickIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 22, padding: 17, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 17 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  macroBlock: { marginTop: 12 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  macroLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  macroValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  macroTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: 7, borderRadius: 4 },
  mealHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  addMealButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9 },
  addMealText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  logCard: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 },
  mealGroup: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2, marginTop: 14, marginBottom: 2 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, gap: 10 },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
  mealInfo: { flex: 1, minWidth: 0 },
  mealName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  mealType: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  verifiedText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  mealCalories: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  kcalLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginLeft: -7, marginTop: 18 },
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 18 },
  footerNoteText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 28 },
  modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#9aa69e', alignSelf: 'center', marginBottom: 18 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 17 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.5 },
  modalSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 15, marginBottom: 14 },
  photoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  photoSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 45 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13 },
  sectionEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2, marginBottom: 3 },
  foodSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1 },
  foodIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  foodName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  foodMeta: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  manualRow: { flexDirection: 'row', gap: 7 },
  manualInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, height: 42, fontFamily: 'Inter_400Regular', fontSize: 12 },
  manualKcal: { width: 67, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, height: 42, fontFamily: 'Inter_400Regular', fontSize: 12 },
  manualAdd: { width: 43, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});