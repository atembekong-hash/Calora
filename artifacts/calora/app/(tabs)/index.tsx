import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
import { router } from 'expo-router';
import { useCalora, FoodLog, MealType } from '@/context/CaloraContext';
import { mealOrder, verifiedFoods } from '@/data/foods';

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

function MealRow({ log, colors, onEdit }: { log: FoodLog; colors: ReturnType<typeof useCalora>['colors']; onEdit: () => void }) {
  return (
    <Pressable accessibilityLabel={`Edit ${log.name}`} onPress={onEdit} style={({ pressed }) => [styles.mealRow, { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
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
      <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
    </Pressable>
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
    <Modal visible={log !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
        <View style={[styles.editCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeading}>
            <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit entry</Text><Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Correct anything before it shapes your trend.</Text></View>
            <Pressable accessibilityLabel="Close edit entry" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Food name</Text>
          <TextInput value={name} onChangeText={setName} style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} />
          <View style={styles.editFields}>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Calories</Text><TextInput value={calories} onChangeText={setCalories} keyboardType="number-pad" style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Serving</Text><TextInput value={serving} onChangeText={setServing} style={[styles.editInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]} /></View>
          </View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>Meal</Text>
          <View style={styles.mealPicker}>{mealOrder.map((item) => <Pressable key={item} onPress={() => setMeal(item)} style={[styles.mealChoice, { backgroundColor: meal === item ? colors.primary : colors.card, borderColor: meal === item ? colors.primary : colors.border }]}><Text style={[styles.mealChoiceText, { color: meal === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
          <Pressable accessibilityLabel="Save edited entry" onPress={save} style={[styles.saveEntry, { backgroundColor: colors.primary }]}><Text style={[styles.saveEntryText, { color: colors.primaryForeground }]}>Save changes</Text></Pressable>
          <Pressable accessibilityLabel="Delete edited entry" onPress={() => { if (log) { removeLog(log.id); onClose(); } }} style={styles.deleteEntry}><Feather name="trash-2" size={15} color={colors.destructive} /><Text style={[styles.deleteEntryText, { color: colors.destructive }]}>Delete this entry</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddFoodModal({ visible, onClose, entryDate }: { visible: boolean; onClose: () => void; entryDate: string }) {
  const { colors, addLog, savedMeals } = useCalora();
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [captureMode, setCaptureMode] = useState<'search' | 'voice' | 'barcode'>('search');
  const filtered = verifiedFoods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase()));

  const chooseFood = (food: (typeof verifiedFoods)[number]) => {
    addLog({ ...food, date: entryDate, time: 'Just now', serving: food.serving });
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
      time: 'Just now',
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
    if (!customName.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
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
      time: 'Just now',
      serving: '1 serving',
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add to {isToday(entryDate) ? 'today' : formatShortDate(entryDate)}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Fast now. Precise when it matters.</Text>
            </View>
            <Pressable accessibilityLabel="Close add food" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <Pressable accessibilityLabel="Log from photo" testID="photo-log-button" onPress={photoLog} style={[styles.photoButton, { backgroundColor: colors.hero }]}>
            <Feather name="camera" size={20} color={colors.heroMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.photoTitle, { color: colors.onHero }]}>Log from a photo</Text>
              <Text style={[styles.photoSubtitle, { color: colors.heroMuted }]}>Review an estimate before it counts</Text>
            </View>
            <Feather name="arrow-up-right" size={18} color={colors.heroMuted} />
          </Pressable>
          <View style={[styles.captureModes, { backgroundColor: colors.muted }]}>
            <Pressable accessibilityLabel="Text food logging" onPress={() => setCaptureMode('search')} style={[styles.captureMode, captureMode === 'search' && { backgroundColor: colors.card }]}><Feather name="edit-3" size={14} color={captureMode === 'search' ? colors.primary : colors.mutedForeground} /><Text style={[styles.captureModeText, { color: captureMode === 'search' ? colors.foreground : colors.mutedForeground }]}>Text</Text></Pressable>
            <Pressable accessibilityLabel="Voice food logging" onPress={() => setCaptureMode('voice')} style={[styles.captureMode, captureMode === 'voice' && { backgroundColor: colors.card }]}><Feather name="mic" size={14} color={captureMode === 'voice' ? colors.primary : colors.mutedForeground} /><Text style={[styles.captureModeText, { color: captureMode === 'voice' ? colors.foreground : colors.mutedForeground }]}>Voice</Text></Pressable>
            <Pressable accessibilityLabel="Barcode food logging" onPress={() => setCaptureMode('barcode')} style={[styles.captureMode, captureMode === 'barcode' && { backgroundColor: colors.card }]}><Feather name="maximize" size={14} color={captureMode === 'barcode' ? colors.primary : colors.mutedForeground} /><Text style={[styles.captureModeText, { color: captureMode === 'barcode' ? colors.foreground : colors.mutedForeground }]}>Barcode</Text></Pressable>
          </View>
          {captureMode !== 'search' && <View style={[styles.unavailableCard, { backgroundColor: colors.accent }]}>
            <Feather name={captureMode === 'voice' ? 'mic-off' : 'camera-off'} size={20} color={colors.accentForeground} />
            <View style={{ flex: 1 }}><Text style={[styles.unavailableTitle, { color: colors.foreground }]}>{captureMode === 'voice' ? 'Voice capture needs permission' : 'Barcode scanning needs camera access'}</Text><Text style={[styles.unavailableBody, { color: colors.mutedForeground }]}>{captureMode === 'voice' ? 'In the native build, Calora will request microphone access and turn your words into a reviewable draft.' : 'In the native build, Calora will request camera access and look up a verified product by barcode.'}</Text></View>
            <Pressable accessibilityLabel="Use text logging instead" onPress={() => setCaptureMode('search')}><Text style={[styles.useText, { color: colors.primary }]}>Use text</Text></Pressable>
          </View>}
          {savedMeals.length > 0 && <View>
            <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, marginTop: 2 }]}>SAVED MEALS & RECIPES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedMealRow}>
              {savedMeals.map((meal) => <Pressable key={meal.id} accessibilityLabel={`Add saved ${meal.name}`} onPress={() => chooseSavedMeal(meal)} style={[styles.savedMealChip, { backgroundColor: colors.accent, borderColor: colors.border }]}><Feather name={meal.kind === 'recipe' ? 'book-open' : 'bookmark'} size={13} color={colors.accentForeground} /><View><Text style={[styles.savedMealName, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.savedMealMeta, { color: colors.mutedForeground }]}>{meal.calories} kcal · {meal.kind}</Text></View></Pressable>)}
            </ScrollView>
          </View>}
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
  const { logs, colors, profile, syncState } = useCalora();
  const insets = useSafeAreaInsets();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const target = profile?.calorieTarget ?? 2000;
  const selectedLogs = logs.filter((log) => log.date === selectedDate || (!log.date && isToday(selectedDate)));
  const selectedTotals = useMemo(() => selectedLogs.reduce((sum, log) => ({
    calories: sum.calories + log.calories,
    protein: sum.protein + log.protein,
    carbs: sum.carbs + log.carbs,
    fat: sum.fat + log.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [selectedLogs]);
  const remaining = Math.max(target - selectedTotals.calories, 0);
  const progress = Math.min(selectedTotals.calories / target, 1);

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAdd(true);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <Image source={require('../../assets/images/calora-home-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.72)', 'rgba(18,34,24,0.16)']} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.homeHeaderContent}>
            <View style={styles.homeHeaderTop}>
              <View style={styles.homeHeaderBadge}><Feather name="sunrise" size={12} color="#d4eadc" /><Text style={styles.homeHeaderBadgeText}>DAILY RHYTHM</Text></View>
              <Pressable accessibilityLabel="Profile shortcut" onPress={() => router.navigate('/(tabs)/profile')} style={styles.homeHeaderAvatar}><Text style={styles.homeHeaderAvatarText}>{profile?.name?.charAt(0) ?? 'A'}</Text></Pressable>
            </View>
            <Text style={styles.homeHeaderEyebrow}>{formatDateLabel(selectedDate)}</Text>
            <Text style={styles.homeHeaderTitle}>Good morning, {profile?.name?.split(' ')[0] ?? 'there'}</Text>
            <Text style={styles.homeHeaderSubtitle}>A steady pace beats a perfect day.</Text>
          </View>
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
              <Text style={[styles.heroStatValue, { color: colors.onHero }]}>{selectedTotals.calories.toLocaleString()} <Text style={[styles.heroStatUnit, { color: colors.heroMuted }]}>/ {target.toLocaleString()} kcal</Text></Text>
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
          <MacroBar label="Protein" value={selectedTotals.protein} target={Math.round(target * 0.26 / 4)} color={colors.protein} colors={colors} />
          <MacroBar label="Carbs" value={selectedTotals.carbs} target={Math.round(target * 0.44 / 4)} color={colors.carbs} colors={colors} />
          <MacroBar label="Fat" value={selectedTotals.fat} target={Math.round(target * 0.3 / 9)} color={colors.fat} colors={colors} />
        </View>

        <View style={styles.mealHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today’s log' : 'Diary log'}</Text>
            <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Tap an entry to edit · {selectedLogs.length} logged</Text>
          </View>
          <Pressable onPress={openAdd} accessibilityLabel="Add meal" style={[styles.addMealButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.addMealText, { color: colors.primaryForeground }]}>Add</Text>
          </Pressable>
        </View>
        <View style={[styles.dateNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable accessibilityLabel="Previous diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() - 1); setSelectedDate(dateKey(date)); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-left" size={17} color={colors.foreground} /></Pressable>
          <View style={{ alignItems: 'center' }}><Text style={[styles.dateNavLabel, { color: colors.foreground }]}>{isToday(selectedDate) ? 'Today' : formatShortDate(selectedDate)}</Text><Text style={[styles.dateNavSub, { color: colors.mutedForeground }]}>{selectedDate}</Text></View>
          <Pressable accessibilityLabel="Next diary day" onPress={() => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() + 1); setSelectedDate(dateKey(date)); }} style={[styles.dateNavButton, { backgroundColor: colors.muted }]}><Feather name="chevron-right" size={17} color={colors.foreground} /></Pressable>
        </View>
        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!selectedLogs.length && <View style={styles.emptyDiary}><View style={styles.emptyDiaryVisual}><Image source={require('../../assets/images/calora-home-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} /><LinearGradient colors={['rgba(18,34,24,0.1)', 'rgba(18,34,24,0.68)']} style={StyleSheet.absoluteFillObject} /><View style={styles.emptyDiaryVisualLabel}><Feather name="sunrise" size={12} color="#d4eadc" /><Text style={styles.emptyDiaryVisualText}>MAKE SPACE FOR A MEAL</Text></View></View><Feather name="calendar" size={22} color={colors.mutedForeground} /><Text style={[styles.emptyDiaryTitle, { color: colors.foreground }]}>Nothing logged yet</Text><Text style={[styles.emptyDiaryBody, { color: colors.mutedForeground }]}>Add a meal for this day and it will stay here offline.</Text></View>}
          {mealOrder.map((meal) => {
            const mealLogs = selectedLogs.filter((log) => log.meal === meal);
            if (!mealLogs.length) return null;
            return (
              <View key={meal}>
                <Text style={[styles.mealGroup, { color: colors.mutedForeground }]}>{meal.toUpperCase()}</Text>
                {mealLogs.map((log) => <MealRow key={log.id} log={log} colors={colors} onEdit={() => setEditingLog(log)} />)}
              </View>
            );
          })}
        </View>
        <View style={styles.footerNote}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>{syncState === 'needs-connection' ? 'Saved on this device · waiting for a connection' : syncState === 'local' ? 'Saved on this device · ready to sync' : syncState === 'offline' ? 'Loading your local diary…' : 'Core foods are sourced from verified nutrition data.'}</Text>
        </View>
      </ScrollView>
      <AddFoodModal visible={showAdd} entryDate={selectedDate} onClose={() => setShowAdd(false)} />
      <EditLogModal log={editingLog} onClose={() => setEditingLog(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  homeHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 16, backgroundColor: '#1b3022' },
  homeHeaderContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  homeHeaderTop: { position: 'absolute', top: 16, left: 19, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  homeHeaderBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  homeHeaderAvatar: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,234,220,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  homeHeaderAvatarText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  homeHeaderEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2, marginBottom: 6 },
  homeHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.7 },
  homeHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 7 },
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
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 17, padding: 8, marginBottom: 11 },
  dateNavButton: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  dateNavLabel: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  dateNavSub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
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
  emptyDiary: { alignItems: 'center', paddingVertical: 26, gap: 5 },
   emptyDiaryVisual: { width: '100%', height: 68, borderRadius: 15, overflow: 'hidden', marginBottom: 8 },
   emptyDiaryVisualLabel: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 10 },
   emptyDiaryVisualText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.1 },
  emptyDiaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 3 },
  emptyDiaryBody: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', maxWidth: 230 },
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
  captureModes: { flexDirection: 'row', borderRadius: 13, padding: 4, marginBottom: 13, gap: 3 },
  captureMode: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8 },
  captureModeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  unavailableCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, padding: 12, marginBottom: 12 },
  unavailableTitle: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  unavailableBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 3 },
  useText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  savedMealRow: { gap: 8, paddingVertical: 5, paddingBottom: 12 },
  savedMealChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8, minWidth: 142 },
  savedMealName: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  savedMealMeta: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  editCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 28 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginBottom: 6 },
  editInput: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 11 },
  editFields: { flexDirection: 'row', gap: 9 },
  mealPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  mealChoice: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  mealChoiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  saveEntry: { alignItems: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 13 },
  saveEntryText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  deleteEntry: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  deleteEntryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});