import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import {
  CONFIGURABLE_DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_IDS,
  RESPONSIVE_DASHBOARD_WIDGET_IDS,
  applyDashboardPreset,
  reorderDashboardWidget,
  toggleDashboardWidgetVisibility,
  type DashboardWidgetId,
} from "@/lib/dashboardPreferences";
import { useCalora } from "@/context/CaloraContext";
import { LocalSaveNotice } from "@/components/LocalSaveNotice";

const widgetCopy: Partial<Record<
  DashboardWidgetId,
  { title: string; description: string; icon: keyof typeof Feather.glyphMap }
>> = {
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
  nutrients: {
    title: "Macro balance",
    description: "Protein, carbs, and fats shown beside Steps.",
    icon: "pie-chart",
  },
  fasting: {
    title: "Fasting",
    description: "Your selected fasting rhythm and active window.",
    icon: "clock",
  },
  mood: {
    title: "Mood",
    description: "Record how you are feeling today.",
    icon: "heart",
  },
  recipes: {
    title: "Recipes for You",
    description: "Browse recipe ideas and nutrition details.",
    icon: "book-open",
  },
  quickLog: {
    title: "Quick logging",
    description: "Photo log, food search, and restaurants.",
    icon: "zap",
  },
  log: {
    title: "Today's log",
    description: "Review and edit meals logged today.",
    icon: "list",
  },
  progressSnapshot: {
    title: "Progress this week",
    description: "Weekly nutrition, activity, and weigh-in snapshot.",
    icon: "bar-chart-2",
  },
};

export default function DashboardLayoutScreen() {
  const {
    colors,
    fontScale,
    dashboardPreferences,
    updateDashboardPreferences,
  } = useCalora();
  const [undoPreferences, setUndoPreferences] = useState<typeof dashboardPreferences | null>(null);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const styles = makeStyles(colors, fontScale);
  useEffect(() => {
    if (!presetNotice) return;
    const timeout = setTimeout(() => {
      setPresetNotice(null);
      setUndoPreferences(null);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [presetNotice]);
  const applyPreset = (preset: "compact" | "extended") => {
    setUndoPreferences(dashboardPreferences);
    updateDashboardPreferences((current) => applyDashboardPreset(current, preset));
    setPresetNotice(`Default ${preset === "compact" ? "Compact" : "Extended"} dashboard applied.`);
  };
  const undoPreset = () => {
    if (!undoPreferences) return;
    updateDashboardPreferences(() => undoPreferences);
    setUndoPreferences(null);
    setPresetNotice(null);
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Customize dashboard" back onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Make Today your own. Every dashboard section except calorie progress can be shown, hidden, reordered, or resized here. Your choices stay on this device.
        </Text>
        <View style={styles.presetHeader}>
          <Text style={styles.sectionTitle}>Restore a default</Text>
          <Text style={styles.sectionDescription}>Presets restore every standard widget. You can customize the result afterward.</Text>
        </View>
        <View style={styles.presetRow}>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Apply Default Compact dashboard" testID="dashboard-preset-compact" onPress={() => applyPreset("compact")} style={styles.presetButton}>
            <Feather name="columns" size={16} color={colors.success} />
            <Text style={styles.presetButtonText}>Default Compact</Text>
          </ScalePressable>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Apply Default Extended dashboard" testID="dashboard-preset-extended" onPress={() => applyPreset("extended")} style={styles.presetButton}>
            <Feather name="maximize" size={16} color={colors.success} />
            <Text style={styles.presetButtonText}>Default Extended</Text>
          </ScalePressable>
        </View>
        <View style={styles.guidanceCard}>
          <ScalePressable accessibilityRole="button" accessibilityState={{ expanded: guidanceOpen }} accessibilityLabel="How to customize your dashboard" onPress={() => setGuidanceOpen((open) => !open)} style={styles.guidanceButton}>
            <View style={styles.guidanceCopy}>
              <Text style={styles.guidanceTitle}>How to customize your dashboard</Text>
              {guidanceOpen && <Text style={styles.guidanceText}>Use a preset to restore all standard widgets, then use the switches to choose visibility and the arrows to change order. Compact and Extended are available only for Fasting, Steps, Macro balance, and Mood. Compact cards can be placed left or right. Your layout is saved locally and can be restored here at any time.</Text>}
            </View>
            <Feather name={guidanceOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.foreground} />
          </ScalePressable>
        </View>
        {dashboardPreferences.order
          .filter(
            (id): id is DashboardWidgetId =>
              DASHBOARD_WIDGET_IDS.includes(id) &&
              CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(id),
          )
          .map((id, index) => {
            const item = widgetCopy[id];
            if (!item) return null;
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
                        index ===
                          dashboardPreferences.order.filter((candidate) =>
                            CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(candidate),
                          ).length -
                            1 &&
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
                  {RESPONSIVE_DASHBOARD_WIDGET_IDS.includes(id) && <ScalePressable
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
                  </ScalePressable>}
                  {RESPONSIVE_DASHBOARD_WIDGET_IDS.includes(id) && density === "compact" && (
                    <View style={styles.placementGroup}>
                      <Text style={styles.placementLabel}>Position</Text>
                      <View style={styles.placementOptions}>
                        {(["left", "right"] as const).map((position) => (
                          <ScalePressable
                            key={position}
                            accessibilityRole="button"
                            accessibilityLabel={`Place ${item.title} on the ${position}`}
                            onPress={() =>
                              updateDashboardPreferences((current) => ({
                                ...current,
                                placement: { ...current.placement, [id]: position },
                              }))
                            }
                            style={[styles.placementButton, dashboardPreferences.placement[id] === position && styles.placementButtonSelected]}
                          >
                            <Text style={[styles.placementButtonText, dashboardPreferences.placement[id] === position && styles.placementButtonTextSelected]}>{position === "left" ? "Left" : "Right"}</Text>
                          </ScalePressable>
                        ))}
                      </View>
                    </View>
                  )}
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
      <LocalSaveNotice visible={Boolean(presetNotice)} message={presetNotice ?? ""} colors={colors} actionLabel={undoPreferences ? "Undo" : undefined} onAction={undoPreset} bottomOffset={24} />
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
    presetHeader: { gap: 3, marginTop: 4 },
    sectionTitle: { color: colors.foreground, fontSize: 14 * scale, fontFamily: "Inter_700Bold" },
    sectionDescription: { color: colors.mutedForeground, fontSize: 12 * scale, lineHeight: 17 * scale },
    presetRow: { flexDirection: "row", gap: 9 },
    presetButton: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 8 },
    presetButtonText: { color: colors.foreground, fontSize: 11 * scale, fontFamily: "Inter_700Bold" },
    guidanceCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 2 },
    guidanceButton: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
    guidanceCopy: { flex: 1, gap: 5 },
    guidanceTitle: { color: colors.foreground, fontSize: 12 * scale, fontFamily: "Inter_700Bold" },
    guidanceText: { color: colors.mutedForeground, fontSize: 11 * scale, lineHeight: 16 * scale, paddingBottom: 8 },
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
    placementGroup: { alignItems: "flex-end", gap: 5 },
    placementLabel: { color: colors.mutedForeground, fontWeight: "700", fontSize: 10 * scale },
    placementOptions: { flexDirection: "row", gap: 5 },
    placementButton: { minWidth: 49, height: 30, paddingHorizontal: 8, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    placementButtonSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    placementButtonText: { color: colors.mutedForeground, fontWeight: "800", fontSize: 10 * scale },
    placementButtonTextSelected: { color: colors.accentForeground },
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
