import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppChrome";
import { SectionHeader, SettingRow } from "@/components/ProfileSettingsPrimitives";
import { useCalora, type ThemePreference } from "@/context/CaloraContext";
import { useAuth } from "@/context/AuthContext";
import { BRAND, EMAILS, URLS } from "@/lib/brand";
import { completeDeviceLocalReset } from "@/lib/deviceLocalReset";
import { ClearAllDataError } from "@/lib/clearAllData";
import { deriveExportHasData, makeExportHandler } from "@/lib/exportUiHandler";
import { launchExternalUrl } from "@/lib/externalLink";

const themeOptions: Array<{ key: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: "system", label: "System default", icon: "smartphone" },
  { key: "light", label: "Light", icon: "sun" },
  { key: "dark", label: "Dark", icon: "moon" },
];
const fontOptions = [
  { key: "small" as const, label: "Small" },
  { key: "default" as const, label: "Default" },
  { key: "large" as const, label: "Large" },
  { key: "xlarge" as const, label: "Extra large" },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const {
    colors, themePreference, setThemePreference, fontSizeScale, setFontSizeScale,
    profile, updateProfile, healthConnected, connectHealth, openHealthSettings,
    disconnectHealth, exportData, clearAllData, isClearing, logs, onboardingDraft,
    persistenceError, retryPersistence,
  } = useCalora();
  const [working, setWorking] = useState(false);
  const exportLockRef = useRef(false);
  const hasExportData = deriveExportHasData(profile, logs, onboardingDraft);
  const styles = useMemo(() => makeStyles(colors, 1), [colors]);

  const openExternal = async (title: string, url: string) => {
    const result = await launchExternalUrl(Linking, url);
    if (result !== "opened") Alert.alert(`${title} unavailable`, `Could not open ${title.toLowerCase()} right now.`);
  };
  const handleExport = makeExportHandler(
    exportLockRef, exportData,
    { cacheDirectory: FileSystem.cacheDirectory, writeAsStringAsync: FileSystem.writeAsStringAsync, deleteAsync: FileSystem.deleteAsync, shareAsync: Sharing.shareAsync },
    { setLoading: setWorking, onNoData: () => Alert.alert("No data", "There is no local data to export yet."), onError: () => Alert.alert("Export failed", "Could not prepare the export. Please try again.") },
  );
  const handleClear = () => {
    if (isClearing) return;
    Alert.alert("Clear this device?", "This removes local Calora data and signs this device out. Your remote account is not deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear local data", style: "destructive", onPress: () => {
        void (async () => {
          try { await completeDeviceLocalReset(clearAllData, signOut); }
          catch (error) { Alert.alert("Could not clear data", error instanceof ClearAllDataError ? "Your local data was not fully cleared. Please try again." : "Please try again."); }
        })();
      } },
    ]);
  };
  const setUnits = (units: "metric" | "imperial") => { void updateProfile({ units }); };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader back leftAlignTitle title="Settings" action={<Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push("/profile")}><Feather name="user" size={20} color={colors.foreground} /></Pressable>} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={styles.heroIcon}><Feather name="sliders" size={21} color={colors.hero} /></View>
          <View style={styles.heroCopy}><Text style={[styles.heroEyebrow, { color: colors.heroMuted }]}>CALORA CONTROL CENTER</Text><Text style={[styles.heroTitle, { color: colors.onHero }]}>Make Calora feel like yours.</Text><Text style={[styles.heroBody, { color: colors.heroMuted }]}>Appearance, behavior, privacy, and help live here.</Text></View>
        </View>

        <SectionHeader eyebrow="01" title="Appearance" description="Choose how Calora looks and reads." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themeOptions.map((option) => <Pressable key={option.key} accessibilityRole="radio" accessibilityLabel={`Use ${option.label} theme`} accessibilityState={{ selected: themePreference === option.key }} onPress={() => setThemePreference(option.key)} style={styles.choiceRow}><View style={[styles.choiceIcon, { backgroundColor: themePreference === option.key ? colors.accent : colors.muted }]}><Feather name={option.icon} size={16} color={themePreference === option.key ? colors.accentForeground : colors.mutedForeground} /></View><Text style={[styles.choiceText, { color: colors.foreground }]}>{option.label}</Text>{themePreference === option.key ? <Feather name="check" size={18} color={colors.primary} /> : null}</Pressable>)}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Text size</Text>
          <View style={styles.chips}>{fontOptions.map((option) => <Pressable key={option.key} accessibilityRole="radio" accessibilityLabel={`Use ${option.label} text`} accessibilityState={{ selected: fontSizeScale === option.key }} onPress={() => setFontSizeScale(option.key)} style={[styles.chip, { borderColor: fontSizeScale === option.key ? colors.primary : colors.border, backgroundColor: fontSizeScale === option.key ? colors.accent : colors.card }]}><Text style={[styles.chipText, { color: fontSizeScale === option.key ? colors.accentForeground : colors.foreground }]}>{option.label}</Text></Pressable>)}</View>
        </View>

        <SectionHeader eyebrow="02" title="App behavior" description="Set measurement and wellness connections." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Units</Text>
          <View style={styles.chips}>{(["metric", "imperial"] as const).map((unit) => <Pressable key={unit} accessibilityRole="radio" accessibilityLabel={`Use ${unit} units`} accessibilityState={{ selected: (profile?.units ?? "metric") === unit }} onPress={() => setUnits(unit)} style={[styles.chip, { borderColor: (profile?.units ?? "metric") === unit ? colors.primary : colors.border, backgroundColor: (profile?.units ?? "metric") === unit ? colors.accent : colors.card }]}><Text style={[styles.chipText, { color: colors.foreground }]}>{unit === "metric" ? "Metric (kg, cm)" : "Imperial (lb, in)"}</Text></Pressable>)}</View>
          <SettingRow icon="heart" title="Health connection" description={healthConnected ? "Connected and syncing on this device" : "Connect steps and active energy when you are ready"} theme={colors} onPress={() => void (healthConnected ? openHealthSettings() : connectHealth())} right={<Feather name="chevron-right" size={18} color={colors.mutedForeground} />} />
          {healthConnected ? <SettingRow icon="x-circle" title="Disconnect health data" description="Stop local health reads without deleting your Calora records" theme={colors} onPress={disconnectHealth} destructive /> : null}
        </View>

        <SectionHeader eyebrow="03" title="Privacy & data" description="Your local data stays under your control." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {persistenceError ? <Pressable accessibilityRole="alert" onPress={retryPersistence} style={[styles.notice, { backgroundColor: colors.warningTint }]}><Feather name="alert-triangle" size={17} color={colors.warning} /><Text style={[styles.noticeText, { color: colors.warningForeground }]}>Some changes are waiting to be saved. Tap to retry.</Text></Pressable> : null}
          <SettingRow icon="download" title="Export your data" description={hasExportData ? "Share a portable copy of your local wellness data" : "No local data is ready to export yet"} theme={colors} onPress={hasExportData && !working ? () => void handleExport() : undefined} right={working ? <Text style={[styles.status, { color: colors.primary }]}>Preparing…</Text> : <Feather name="chevron-right" size={18} color={hasExportData ? colors.mutedForeground : colors.disabledForeground} />} />
          <SettingRow icon="shield" title="Privacy policy" description="How Calora handles your information" theme={colors} onPress={() => void openExternal("Privacy policy", URLS.privacy)} />
          <SettingRow icon="trash-2" title="Clear local data" description="Remove this device's data and sign out" theme={colors} onPress={handleClear} destructive />
        </View>

        <SectionHeader eyebrow="04" title="Support & information" description="Get help or learn more about Calora." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="help-circle" title="Help center" description="Answers for setup, tracking, and reminders" theme={colors} onPress={() => void openExternal("Help center", URLS.help)} />
          <SettingRow icon="message-circle" title="Contact support" description={EMAILS.support} theme={colors} onPress={() => void openExternal("Support", `mailto:${EMAILS.support}`)} />
          <SettingRow icon="info" title="About Calora" description={`${BRAND.name} · ${BRAND.tagline}`} theme={colors} />
        </View>
        {user ? <Text style={[styles.accountHint, { color: colors.mutedForeground }]}>Signed in securely. Account and membership details are on your Profile.</Text> : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: typeof import("@/constants/colors").default.light | typeof import("@/constants/colors").default.dark, scale: number) {
  return StyleSheet.create({
    page: { flex: 1 }, content: { padding: 20, paddingBottom: 42, gap: 10 }, hero: { borderRadius: 24, padding: 18, flexDirection: "row", gap: 14, marginBottom: 14 }, heroIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#dff2e7", alignItems: "center", justifyContent: "center" }, heroCopy: { flex: 1 }, heroEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 }, heroTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 22 * scale, letterSpacing: -0.4, marginTop: 4 }, heroBody: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 4 }, card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12 }, choiceRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 11 }, choiceIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, choiceText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 5 }, subLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 8 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12 }, chip: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, chipText: { fontFamily: "Inter_600SemiBold", fontSize: 11 }, notice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 10, marginVertical: 8 }, noticeText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 16 }, status: { fontFamily: "Inter_600SemiBold", fontSize: 11 }, accountHint: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 4 },
  });
}
