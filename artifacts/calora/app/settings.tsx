import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora, type ThemePreference } from "@/context/CaloraContext";

const themes: Array<{
  key: ThemePreference;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: "system", label: "System", icon: "smartphone" },
  { key: "light", label: "Light", icon: "sun" },
  { key: "dark", label: "Dark", icon: "moon" },
];

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function SettingsScreen() {
  const {
    colors,
    fontScale,
    themePreference,
    setThemePreference,
    profile,
    savedMeals,
  } = useCalora();
  const styles = makeStyles(fontScale);

  const Row = ({
    icon,
    title,
    body,
    onPress,
    destructive = false,
  }: RowProps) => (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: destructive
              ? `${colors.destructive}18`
              : colors.muted,
          },
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={destructive ? colors.destructive : colors.primary}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>
          {body}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </ScalePressable>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Settings"
        onBack={() => router.back()}
        action={
          <ScalePressable
            accessibilityLabel="Open notifications"
            onPress={() => router.push("/notifications" as never)}
          >
            <Feather name="bell" size={20} color={colors.foreground} />
          </ScalePressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather
              name="sliders"
              size={22}
              color={colors.primaryForeground}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.onHero }]}>
              Make Calora yours
            </Text>
            <Text style={[styles.heroBody, { color: colors.heroMuted }]}>
              Appearance, reminders, privacy, and connected services in one calm
              place.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>
            Theme
          </Text>
          <View style={styles.themeGrid}>
            {themes.map((theme) => {
              const selected = themePreference === theme.key;
              return (
                <ScalePressable
                  key={theme.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${theme.label} mode`}
                  onPress={() => setThemePreference(theme.key)}
                  style={[
                    styles.themeChoice,
                    {
                      backgroundColor: selected ? colors.accent : colors.muted,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={theme.icon}
                    size={17}
                    color={
                      selected
                        ? colors.accentForeground
                        : colors.mutedForeground
                    }
                  />
                  <Text
                    style={[
                      styles.themeText,
                      {
                        color: selected
                          ? colors.accentForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {theme.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          PERSONALIZE
        </Text>
        <Row
          icon="type"
          title="Text size and measurement units"
          body="Adjust reading comfort and metric or imperial units."
          onPress={() => router.push("/profile?tab=you")}
        />
        <Row
          icon="layout"
          title="Customize dashboard"
          body="Choose which insights appear on Today."
          onPress={() => router.push("/dashboard-layout")}
        />
        <Row
          icon="bookmark"
          title="Saved meals"
          body={`${savedMeals.length} saved meal${savedMeals.length === 1 ? "" : "s"} ready to reuse.`}
          onPress={() => router.push("/saved-meals")}
        />
        <Row
          icon="bell"
          title="Notifications and reminders"
          body="Meal, hydration, goal, and quiet-hour controls."
          onPress={() => router.push("/notifications" as never)}
        />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          TRUST & CONNECTIONS
        </Text>
        <Row
          icon="activity"
          title="Health data"
          body={
            profile
              ? "Manage local health permissions and sync."
              : "Connect health data when your profile is ready."
          }
          onPress={() => router.push("/profile?tab=account&open=health")}
        />
        <Row
          icon="layers"
          title="Saved signals"
          body="Review, correct, or forget remembered signals."
          onPress={() => router.push("/memory")}
        />
        <Row
          icon="user"
          title="Account and privacy"
          body="Export, local-data deletion, sign-out, and legal information."
          onPress={() => router.push("/profile?tab=account")}
        />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          SUPPORT
        </Text>
        <Row
          icon="help-circle"
          title="Help and legal"
          body="Answers, privacy policy, terms, and support."
          onPress={() => router.push("/profile?tab=account")}
        />
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Calora · Settings are stored locally and remain available offline.
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
      gap: 13,
      borderRadius: 22,
      padding: 17,
      marginBottom: 8,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: { flex: 1 },
    heroTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 18 * f,
      letterSpacing: -0.3,
    },
    heroBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 11 * f,
      lineHeight: 16 * f,
      marginTop: 4,
    },
    sectionLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 10 * f,
      letterSpacing: 1.4,
      marginTop: 15,
      marginBottom: 2,
    },
    panel: { borderWidth: 1, borderRadius: 19, padding: 14 },
    panelTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 14 * f,
      marginBottom: 10,
    },
    themeGrid: { flexDirection: "row", gap: 7 },
    themeChoice: {
      flex: 1,
      minHeight: 43,
      borderWidth: 1,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    themeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 * f },
    row: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    rowCopy: { flex: 1 },
    rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 * f },
    rowBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 10.5 * f,
      lineHeight: 15 * f,
      marginTop: 3,
    },
    footer: {
      fontFamily: "Inter_400Regular",
      fontSize: 10 * f,
      textAlign: "center",
      lineHeight: 15 * f,
      marginTop: 15,
    },
  });
