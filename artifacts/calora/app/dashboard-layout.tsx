import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import {
  CONFIGURABLE_DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_IDS,
  reorderDashboardWidget,
  toggleDashboardWidgetVisibility,
  type DashboardWidgetId,
} from "@/lib/dashboardPreferences";
import { useCalora } from "@/context/CaloraContext";

const widgetCopy: Record<
  DashboardWidgetId,
  { title: string; description: string; icon: keyof typeof Feather.glyphMap }
> = {
  calories: {
    title: "Calorie progress",
    description: "Your daily target and logged intake.",
    icon: "target",
  },
  steps: {
    title: "Steps",
    description: "Activity progress from Health Connect when available.",
    icon: "activity",
  },
  water: {
    title: "Hydration",
    description: "Water intake for today.",
    icon: "droplet",
  },
  weight: {
    title: "Weight",
    description: "Latest weight and direction.",
    icon: "trending-down",
  },
  mealRhythm: {
    title: "Meal rhythm",
    description: "Timing across your logged meals.",
    icon: "bar-chart-2",
  },
  nutrients: {
    title: "Nutrient balance",
    description: "Protein, carbs, and fats.",
    icon: "pie-chart",
  },
  fasting: {
    title: "Fasting",
    description: "Your selected fasting rhythm and active window.",
    icon: "clock",
  },
};

export default function DashboardLayoutScreen() {
  const {
    colors,
    fontScale,
    dashboardPreferences,
    updateDashboardPreferences,
  } = useCalora();
  const styles = makeStyles(colors, fontScale);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Customize dashboard" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Choose which insights appear on Today, arrange them in your preferred
          order, and pick a compact or expanded display when available. Your
          choices stay on this device.
        </Text>
        {dashboardPreferences.order
          .filter(
            (id): id is DashboardWidgetId =>
              DASHBOARD_WIDGET_IDS.includes(id) &&
              CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(id),
          )
          .map((id, index) => {
            const item = widgetCopy[id];
            const visible = dashboardPreferences.visible.includes(id);
            const density = dashboardPreferences.density[id];
            return (
              <View
                style={[styles.card, !visible && styles.cardHidden]}
                key={id}
              >
                <View style={styles.topRow}>
                  <View style={styles.icon}>
                    <Feather
                      name={item.icon}
                      size={18}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                  </View>
                  <Switch
                    value={visible}
                    onValueChange={() =>
                      updateDashboardPreferences((current) =>
                        toggleDashboardWidgetVisibility(current, id),
                      )
                    }
                    trackColor={{
                      false: colors.border,
                      true: colors.success,
                    }}
                    thumbColor={visible ? colors.success : colors.disabledForeground}
                    accessibilityLabel={`Show ${item.title} on dashboard`}
                  />
                </View>
                <View style={styles.controls}>
                  <View style={styles.orderControls}>
                    <ScalePressable
                      disabled={index === 0}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${item.title} up`}
                      onPress={() =>
                        updateDashboardPreferences((current) =>
                          reorderDashboardWidget(current, id, "up"),
                        )
                      }
                      style={[
                        styles.iconButton,
                        index === 0 && styles.disabled,
                      ]}
                    >
                      <Feather
                        name="chevron-up"
                        size={18}
                        color={index === 0 ? colors.disabledForeground : colors.foreground}
                      />
                    </ScalePressable>
                    <ScalePressable
                      disabled={
                        index ===
                        dashboardPreferences.order.filter((candidate) =>
                          CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(candidate),
                        ).length -
                          1
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${item.title} down`}
                      onPress={() =>
                        updateDashboardPreferences((current) =>
                          reorderDashboardWidget(current, id, "down"),
                        )
                      }
                      style={[
                        styles.iconButton,
                        index === dashboardPreferences.order.length - 1 &&
                          styles.disabled,
                      ]}
                    >
                      <Feather
                        name="chevron-down"
                        size={18}
                        color={index === dashboardPreferences.order.filter((candidate) => CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(candidate)).length - 1 ? colors.disabledForeground : colors.foreground}
                      />
                    </ScalePressable>
                  </View>
                  <ScalePressable
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${item.title} to ${density === "compact" ? "expanded" : "compact"} display`}
                    onPress={() =>
                      updateDashboardPreferences((current) => ({
                        ...current,
                        density: {
                          ...current.density,
                          [id]:
                            current.density[id] === "compact"
                              ? "expanded"
                              : "compact",
                        },
                      }))
                    }
                    style={styles.density}
                  >
                    <Feather
                      name={density === "compact" ? "maximize-2" : "minimize-2"}
                      size={14}
                      color={colors.success}
                    />
                    <Text style={styles.densityText}>
                      {density === "compact" ? "Compact" : "Expanded"}
                    </Text>
                  </ScalePressable>
                </View>
              </View>
            );
          })}
        <View style={styles.note}>
          <Feather name="info" size={17} color={colors.mutedForeground} />
          <Text style={styles.noteText}>
            Calora keeps recorded meals, health data, and privacy controls
            unchanged. This only changes your dashboard layout.
          </Text>
        </View>
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
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    intro: {
      color: colors.mutedForeground,
      fontSize: 13 * scale,
      lineHeight: 19 * scale,
      marginBottom: 5,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
      gap: 11,
    },
    cardHidden: { backgroundColor: colors.muted },
    topRow: { flexDirection: "row", alignItems: "center", gap: 11 },
    icon: {
      height: 39,
      width: 39,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(36,164,104,.1)",
    },
    copy: { flex: 1 },
    title: { color: colors.text, fontWeight: "800", fontSize: 14 * scale },
    description: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 15 * scale,
      marginTop: 2,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    orderControls: { flexDirection: "row", gap: 7 },
    iconButton: {
      height: 31,
      width: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabled: { backgroundColor: colors.secondary, borderColor: colors.border },
    density: {
      height: 31,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: "rgba(36,164,104,.1)",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    densityText: {
      color: colors.successForeground,
      fontWeight: "800",
      fontSize: 11 * scale,
    },
    note: {
      flexDirection: "row",
      gap: 9,
      padding: 14,
      marginTop: 8,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteText: {
      flex: 1,
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
    },
  });
