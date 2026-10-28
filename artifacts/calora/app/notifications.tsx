import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";
import { formatTime } from "@/lib/hydrationReminders";

type CategoryProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

export default function NotificationsScreen() {
  const {
    colors,
    fontScale,
    notificationPreferences,
    updateNotificationPreferences,
  } = useCalora();
  const [saving, setSaving] = useState(false);
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const disabled = saving || Platform.OS === "web";
  const prefs = notificationPreferences;

  const update = async (next: typeof prefs) => {
    setSaving(true);
    try {
      await updateNotificationPreferences(() => next);
    } finally {
      setSaving(false);
    }
  };
  const toggleCategory = (
    key: "hydration" | "meal" | "goal",
    enabled: boolean,
  ) => {
    void update({
      ...prefs,
      categories: {
        ...prefs.categories,
        [key]: {
          ...prefs.categories[key],
          enabled,
          preferences:
            key === "hydration"
              ? { ...prefs.categories.hydration.preferences, enabled }
              : key === "goal"
                ? { ...prefs.categories.goal.preferences, enabled }
                : prefs.categories.meal.preferences,
        },
      },
    });
  };
  const Category = ({
    icon,
    title,
    body,
    enabled,
    onChange,
  }: CategoryProps) => (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {body}
        </Text>
      </View>
      <Switch
        accessibilityLabel={`Toggle ${title}`}
        value={enabled}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.primaryForeground}
      />
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Notifications" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather
              name={prefs.masterEnabled ? "bell" : "bell-off"}
              size={22}
              color={colors.primaryForeground}
            />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.heroTitle, { color: colors.onHero }]}>
              Gentle reminders
            </Text>
            <Text style={[styles.heroBody, { color: colors.heroMuted }]}>
              {saving
                ? "Saving your preferences…"
                : prefs.masterEnabled
                  ? "Calora can keep your routines in view."
                  : "Reminders are paused. Your choices are saved."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle all notifications"
            testID="notifications-master-toggle"
            value={prefs.masterEnabled}
            onValueChange={(masterEnabled) =>
              void update({ ...prefs, masterEnabled })
            }
            disabled={disabled}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>
        {Platform.OS === "web" && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Notification scheduling is available in the Calora mobile app.
          </Text>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          REMINDER TYPES
        </Text>
        <Category
          icon="droplet"
          title="Hydration"
          body={
            prefs.categories.hydration.enabled
              ? `Every ${prefs.categories.hydration.preferences.intervalHours} hours · ${formatTime(prefs.categories.hydration.preferences.wakeHour, prefs.categories.hydration.preferences.wakeMinute)}–${formatTime(prefs.categories.hydration.preferences.sleepHour, prefs.categories.hydration.preferences.sleepMinute)}`
              : "Off"
          }
          enabled={prefs.categories.hydration.enabled}
          onChange={(value) => toggleCategory("hydration", value)}
        />
        <Category
          icon="coffee"
          title="Meal reminders"
          body={
            prefs.categories.meal.enabled
              ? "Breakfast, lunch, and dinner schedules"
              : "Off"
          }
          enabled={prefs.categories.meal.enabled}
          onChange={(value) => toggleCategory("meal", value)}
        />
        <Category
          icon="target"
          title="Daily goal check-in"
          body={
            prefs.categories.goal.enabled
              ? `Daily at ${formatTime(prefs.categories.goal.preferences.hour, prefs.categories.goal.preferences.minute)}`
              : "Off"
          }
          enabled={prefs.categories.goal.enabled}
          onChange={(value) => toggleCategory("goal", value)}
        />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          DELIVERY
        </Text>
        <View
          style={[
            styles.row,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.muted }]}>
            <Feather name="moon" size={17} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Quiet hours
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {prefs.quietHours.enabled
                ? `${formatTime(prefs.quietHours.start.hour, prefs.quietHours.start.minute)} – ${formatTime(prefs.quietHours.end.hour, prefs.quietHours.end.minute)}`
                : "Reminders allowed all day"}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle quiet hours"
            testID="notifications-quiet-hours-toggle"
            value={prefs.quietHours.enabled}
            onValueChange={(enabled) =>
              void update({
                ...prefs,
                quietHours: { ...prefs.quietHours, enabled },
              })
            }
            disabled={disabled}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel="Open detailed reminder controls"
          onPress={() => router.push("/profile?tab=you&open=reminders")}
          style={[styles.detailButton, { backgroundColor: colors.accent }]}
        >
          <Feather name="sliders" size={16} color={colors.accentForeground} />
          <Text style={[styles.detailText, { color: colors.accentForeground }]}>
            Open detailed reminder controls
          </Text>
          <Feather
            name="arrow-right"
            size={16}
            color={colors.accentForeground}
          />
        </ScalePressable>
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Calora uses local notification scheduling. You can change device
          permission any time in system settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (f: number) =>
  StyleSheet.create({
    page: { flex: 1 },
    content: { padding: 18, paddingBottom: 42, gap: 11 },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 22,
      padding: 16,
      marginBottom: 7,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    copy: { flex: 1 },
    heroTitle: { fontFamily: "Inter_700Bold", fontSize: 18 * f },
    heroBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 11 * f,
      lineHeight: 16 * f,
      marginTop: 3,
    },
    note: {
      fontFamily: "Inter_400Regular",
      fontSize: 10.5 * f,
      lineHeight: 15 * f,
    },
    sectionLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 10 * f,
      letterSpacing: 1.4,
      marginTop: 14,
      marginBottom: 2,
    },
    row: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontFamily: "Inter_600SemiBold", fontSize: 13 * f },
    body: {
      fontFamily: "Inter_400Regular",
      fontSize: 10.5 * f,
      lineHeight: 15 * f,
      marginTop: 3,
    },
    detailButton: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 15,
      paddingHorizontal: 13,
      marginTop: 5,
    },
    detailText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 11 * f },
    footer: {
      textAlign: "center",
      fontFamily: "Inter_400Regular",
      fontSize: 10 * f,
      lineHeight: 15 * f,
      marginTop: 12,
    },
  });
