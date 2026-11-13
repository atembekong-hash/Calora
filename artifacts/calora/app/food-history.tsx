import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora, type FoodLog, type MealType } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { filterFoodHistory, shiftHistoryDate, summarizeFoodHistory } from "@/lib/foodHistory";

const MEALS: Array<MealType | "All"> = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

function displayDate(date: string): string {
  const today = dateKey();
  if (date === today) return "Today";
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function editableNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

export default function FoodHistoryScreen() {
  const { colors, fontScale, logs, updateLog, removeLog } = useCalora();
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<MealType | "All">("All");
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const [editValues, setEditValues] = useState({
    serving: "",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    notes: "",
  });
  const styles = makeStyles(colors, fontScale);
  const visibleLogs = useMemo(
    () => filterFoodHistory(logs, selectedDate, { query, meal }),
    [logs, meal, query, selectedDate],
  );
  const totals = useMemo(() => summarizeFoodHistory(visibleLogs), [visibleLogs]);

  const openEdit = (entry: FoodLog) => {
    setEditing(entry);
    setEditValues({
      serving: entry.serving,
      calories: editableNumber(entry.calories),
      protein: editableNumber(entry.protein),
      carbs: editableNumber(entry.carbs),
      fat: editableNumber(entry.fat),
      notes: entry.notes ?? "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const numberOr = (value: string, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    updateLog(editing.id, {
      serving: editValues.serving.trim() || editing.serving,
      calories: numberOr(editValues.calories, editing.calories),
      protein: numberOr(editValues.protein, editing.protein),
      carbs: numberOr(editValues.carbs, editing.carbs),
      fat: numberOr(editValues.fat, editing.fat),
      notes: editValues.notes.trim() || undefined,
    });
    setEditing(null);
  };

  const confirmDelete = (entry: FoodLog) => {
    Alert.alert("Delete diary entry?", `${entry.name} will be removed from your history.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeLog(entry.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Food History" back onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateRow}>
          <ScalePressable accessibilityLabel="Previous day" onPress={() => setSelectedDate((value) => shiftHistoryDate(value, -1))} style={styles.dateButton}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </ScalePressable>
          <View style={styles.dateCopy}>
            <Text style={styles.dateTitle}>{displayDate(selectedDate)}</Text>
            <Text style={styles.dateSubtitle}>{selectedDate}</Text>
          </View>
          <ScalePressable accessibilityLabel="Next day" onPress={() => setSelectedDate((value) => shiftHistoryDate(value, 1))} style={styles.dateButton}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </ScalePressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search food, serving, or notes"
          placeholderTextColor={colors.mutedForeground}
          style={styles.search}
          accessibilityLabel="Search food history"
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {MEALS.map((item) => (
            <ScalePressable key={item} onPress={() => setMeal(item)} style={[styles.filter, meal === item && styles.filterSelected]} accessibilityRole="button" accessibilityState={{ selected: meal === item }}>
              <Text style={[styles.filterText, meal === item && styles.filterTextSelected]}>{item}</Text>
            </ScalePressable>
          ))}
        </ScrollView>

        <View style={styles.totalCard}>
          <View><Text style={styles.totalLabel}>Daily total</Text><Text style={styles.totalCalories}>{Math.round(totals.calories)} kcal</Text></View>
          <View style={styles.macroRow}>
            <Text style={styles.macro}>P {Math.round(totals.protein)}g</Text>
            <Text style={styles.macro}>C {Math.round(totals.carbs)}g</Text>
            <Text style={styles.macro}>F {Math.round(totals.fat)}g</Text>
          </View>
        </View>

        {visibleLogs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="calendar" size={28} color={colors.primary} />
            <Text style={styles.emptyTitle}>{query || meal !== "All" ? "No matching entries" : "No food logged"}</Text>
            <Text style={styles.emptyCopy}>{query || meal !== "All" ? "Try another search, meal, or date." : "Your saved meals will appear here after you log them."}</Text>
            <ScalePressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/scan")} accessibilityRole="button">
              <Text style={styles.primaryText}>Log food</Text><Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </ScalePressable>
          </View>
        ) : (
          visibleLogs.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryIcon}><Feather name={entry.meal === "Snack" ? "sun" : "coffee"} size={19} color={colors.primary} /></View>
              <View style={styles.entryCopy}>
                <View style={styles.entryTitleRow}><Text style={styles.entryName}>{entry.name}</Text><Text style={styles.entryTime}>{entry.time}</Text></View>
                <Text style={styles.entryMeta}>{entry.meal} · {entry.serving}</Text>
                <Text style={styles.entryMacros}>{Math.round(entry.calories)} kcal · P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F {Math.round(entry.fat)}g</Text>
                <View style={styles.entryActions}>
                  <ScalePressable onPress={() => openEdit(entry)} accessibilityRole="button" style={styles.smallButton}><Feather name="edit-2" size={13} color={colors.primary} /><Text style={styles.smallButtonText}>Edit</Text></ScalePressable>
                  <ScalePressable onPress={() => confirmDelete(entry)} accessibilityRole="button" style={styles.deleteButton}><Feather name="trash-2" size={13} color={colors.destructive} /><Text style={styles.deleteText}>Delete</Text></ScalePressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit entry</Text><Pressable onPress={() => setEditing(null)} accessibilityLabel="Close edit entry"><Feather name="x" size={22} color={colors.foreground} /></Pressable></View>
            <Text style={styles.modalName}>{editing?.name}</Text>
            {(["serving", "calories", "protein", "carbs", "fat"] as const).map((field) => (
              <TextInput key={field} value={editValues[field]} onChangeText={(value) => setEditValues((current) => ({ ...current, [field]: value }))} placeholder={field} placeholderTextColor={colors.mutedForeground} keyboardType={field === "serving" ? "default" : "decimal-pad"} style={styles.input} accessibilityLabel={`Edit ${field}`} />
            ))}
            <TextInput value={editValues.notes} onChangeText={(value) => setEditValues((current) => ({ ...current, notes: value }))} placeholder="Notes (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.notesInput]} multiline accessibilityLabel="Edit notes" />
            <ScalePressable onPress={saveEdit} style={styles.primaryButton} accessibilityRole="button"><Text style={styles.primaryText}>Save changes</Text></ScalePressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useCalora>["colors"], scale: number) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 14, paddingBottom: 48 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dateCopy: { alignItems: "center" },
  dateTitle: { color: colors.foreground, fontSize: 20 * scale, fontWeight: "800" },
  dateSubtitle: { color: colors.mutedForeground, fontSize: 11 * scale, marginTop: 2 },
  search: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, paddingHorizontal: 14, fontSize: 14 * scale },
  filters: { gap: 8, paddingVertical: 2 },
  filter: { paddingHorizontal: 14, minHeight: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.mutedForeground, fontWeight: "700", fontSize: 12 * scale },
  filterTextSelected: { color: colors.primaryForeground },
  totalCard: { padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: colors.mutedForeground, fontSize: 12 * scale, fontWeight: "700" },
  totalCalories: { color: colors.foreground, fontSize: 24 * scale, fontWeight: "900", marginTop: 3 },
  macroRow: { alignItems: "flex-end", gap: 3 },
  macro: { color: colors.mutedForeground, fontSize: 12 * scale, fontWeight: "700" },
  entryCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  entryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.successTint },
  entryCopy: { flex: 1, minWidth: 0, gap: 4 },
  entryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryName: { flex: 1, color: colors.foreground, fontSize: 15 * scale, fontWeight: "800" },
  entryTime: { color: colors.mutedForeground, fontSize: 11 * scale },
  entryMeta: { color: colors.mutedForeground, fontSize: 12 * scale },
  entryMacros: { color: colors.foreground, fontSize: 12 * scale, fontWeight: "700" },
  entryActions: { flexDirection: "row", gap: 8, marginTop: 7 },
  smallButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, minHeight: 30, borderRadius: 9, backgroundColor: colors.successTint },
  smallButtonText: { color: colors.primary, fontWeight: "800", fontSize: 11 * scale },
  deleteButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, minHeight: 30, borderRadius: 9, backgroundColor: colors.destructiveTint },
  deleteText: { color: colors.destructive, fontWeight: "800", fontSize: 11 * scale },
  empty: { alignItems: "center", padding: 28, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 8 },
  emptyTitle: { color: colors.foreground, fontSize: 16 * scale, fontWeight: "800", marginTop: 3 },
  emptyCopy: { color: colors.mutedForeground, fontSize: 13 * scale, textAlign: "center", lineHeight: 19 * scale },
  primaryButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 4 },
  primaryText: { color: colors.primaryForeground, fontWeight: "800", fontSize: 13 * scale },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  modalCard: { padding: 18, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, gap: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: colors.foreground, fontSize: 19 * scale, fontWeight: "900" },
  modalName: { color: colors.mutedForeground, fontSize: 13 * scale, marginBottom: 2 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, color: colors.foreground, paddingHorizontal: 12, fontSize: 14 * scale },
  notesInput: { minHeight: 68, paddingTop: 12, textAlignVertical: "top" },
});
