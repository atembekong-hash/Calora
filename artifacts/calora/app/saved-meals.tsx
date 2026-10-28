import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { dateKey, formatLogTime } from "@/lib/dates";
import {
  useCalora,
  type MealType,
  type SavedMeal,
} from "@/context/CaloraContext";

const mealTypes: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function SavedMealsScreen() {
  const { colors, fontScale, savedMeals, addLog, deleteSavedMeal } =
    useCalora();
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const styles = makeStyles(colors, fontScale);
  const logSavedMeal = (meal: SavedMeal) => {
    addLog({
      name: meal.name,
      date: dateKey(),
      meal: mealType,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      source: "Manual",
      confidence: 1,
      time: formatLogTime(),
      serving: "1 saved serving",
      notes: "Logged from Saved Meals.",
    });
    Alert.alert(
      "Meal logged",
      `${meal.name} was added to ${mealType.toLowerCase()}.`,
    );
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Saved meals" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Keep favorite meals close. Logging a saved meal uses the same diary
          and nutrition data as the rest of Calora.
        </Text>
        <View style={styles.segment}>
          {mealTypes.map((type) => (
            <ScalePressable
              key={type}
              onPress={() => setMealType(type)}
              style={[
                styles.segmentButton,
                mealType === type && styles.segmentSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: mealType === type }}
            >
              <Text
                style={[
                  styles.segmentText,
                  mealType === type && styles.segmentTextSelected,
                ]}
              >
                {type}
              </Text>
            </ScalePressable>
          ))}
        </View>
        {savedMeals.length ? (
          savedMeals.map((meal) => (
            <View key={meal.id} style={styles.card}>
              <View style={styles.icon}>
                <Feather
                  name={meal.kind === "recipe" ? "book-open" : "coffee"}
                  size={20}
                  color={colors.successForeground}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{meal.name}</Text>
                <Text style={styles.macros}>
                  {meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g
                  carbs
                </Text>
                <View style={styles.actions}>
                  <ScalePressable
                    onPress={() => logSavedMeal(meal)}
                    style={styles.logButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${meal.name}`}
                  >
                    <Text style={styles.logText}>Log meal</Text>
                    <Feather name="plus" size={15} color={colors.primaryForeground} />
                  </ScalePressable>
                  <ScalePressable
                    onPress={() =>
                      Alert.alert("Remove saved meal?", meal.name, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => deleteSavedMeal(meal.id),
                        },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${meal.name}`}
                    style={styles.remove}
                  >
                    <Feather name="trash-2" size={18} color={colors.mutedForeground} />
                  </ScalePressable>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="bookmark" size={26} color={colors.successForeground} />
            </View>
            <Text style={styles.emptyTitle}>No saved meals yet</Text>
            <Text style={styles.emptyCopy}>
              Save a meal from your diary or a recipe to log it again without
              rebuilding its nutrition.
            </Text>
            <ScalePressable
              style={styles.browse}
              onPress={() => router.push("/(tabs)/recipes")}
              accessibilityRole="button"
            >
              <Text style={styles.browseText}>Browse recipes</Text>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </ScalePressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const makeStyles = (
  colors: ReturnType<typeof useCalora>["colors"],
  scale: number,
) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 42 },
    intro: {
      color: colors.mutedForeground,
      fontSize: 13 * scale,
      lineHeight: 19 * scale,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 4,
    },
    segmentButton: {
      flex: 1,
      minHeight: 37,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    segmentSelected: { backgroundColor: colors.primary },
    segmentText: {
      color: colors.mutedForeground,
      fontWeight: "700",
      fontSize: 11 * scale,
    },
    segmentTextSelected: { color: colors.primaryForeground },
    card: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(36,164,104,.1)",
    },
    copy: { flex: 1, gap: 4 },
    name: { color: colors.text, fontSize: 15 * scale, fontWeight: "800" },
    macros: { color: colors.mutedForeground, fontSize: 11 * scale },
    actions: { flexDirection: "row", gap: 8, marginTop: 7 },
    logButton: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      paddingHorizontal: 12,
      height: 35,
      borderRadius: 11,
      backgroundColor: colors.primary,
    },
    logText: { color: colors.primaryForeground, fontWeight: "800", fontSize: 12 * scale },
    remove: {
      height: 35,
      width: 35,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    empty: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 30,
      gap: 9,
      marginTop: 24,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(36,164,104,.1)",
    },
    emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 17 * scale },
    emptyCopy: {
      color: colors.mutedForeground,
      textAlign: "center",
      fontSize: 12 * scale,
      lineHeight: 18 * scale,
    },
    browse: {
      marginTop: 7,
      height: 43,
      paddingHorizontal: 16,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    browseText: { color: colors.primaryForeground, fontWeight: "800", fontSize: 13 * scale },
  });
