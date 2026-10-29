import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/components/AppChrome";
import { ProfileYouSettings } from "@/components/ProfileYouSettings";
import { SectionHeader, SettingRow } from "@/components/ProfileSettingsPrimitives";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { useCalora } from "@/context/CaloraContext";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/brand";
import { useSubscription } from "@/lib/revenuecat";
import { completeDeviceLocalReset } from "@/lib/deviceLocalReset";
import { ClearAllDataError } from "@/lib/clearAllData";
import { deriveExportHasData, makeExportHandler } from "@/lib/exportUiHandler";

const legacyIntents = new Set(["reminders", "goals", "health"]);
const legacyTabs = new Set(["membership", "account"]);

export default function CanonicalProfileScreen() {
  const { tab, open } = useLocalSearchParams<{ tab?: string; open?: string }>();
  const { user, signOut } = useAuth();
  const { colors, profile, updateProfile, profilePhotoUri, exportData, clearAllData, isClearing, logs, onboardingDraft } = useCalora();
  const { isSubscribed } = useSubscription();
  const [isExporting, setIsExporting] = React.useState(false);
  const exportLockRef = React.useRef(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const legacyRequested = legacyIntents.has(String(open)) || legacyTabs.has(String(tab));
  const hasExportData = deriveExportHasData(profile, logs, onboardingDraft);
  const handleExport = makeExportHandler(
    exportLockRef,
    exportData,
    { cacheDirectory: FileSystem.cacheDirectory, writeAsStringAsync: FileSystem.writeAsStringAsync, deleteAsync: FileSystem.deleteAsync, shareAsync: Sharing.shareAsync },
    { setLoading: setIsExporting, onNoData: () => Alert.alert("No data", "There is no local data to export yet."), onError: () => Alert.alert("Export failed", "Could not prepare the export. Please try again.") },
  );
  const handleClear = () => {
    if (isClearing) return;
    Alert.alert("Clear this device?", "This removes local Calora data and signs this device out. Your remote account is not deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear local data", style: "destructive", onPress: () => {
        void completeDeviceLocalReset(clearAllData, signOut).catch((error) => {
          Alert.alert("Could not clear data", error instanceof ClearAllDataError ? "Your local data was not fully cleared. Please try again." : "Please try again.");
        });
      } },
    ]);
  };

  useEffect(() => {
    if (!legacyRequested) return;
    const params = new URLSearchParams();
    if (tab) params.set("tab", String(tab));
    if (open) params.set("open", String(open));
    router.replace(`/(tabs)/profile${params.toString() ? `?${params.toString()}` : ""}` as never);
  }, [legacyRequested, open, tab]);

  if (legacyRequested) {
    return <View testID="profile-legacy-redirect" style={[styles.page, { backgroundColor: colors.background }]} />;
  }
  const initials = (profile?.name ?? user?.email?.split("@")[0] ?? "Calora").slice(0, 1).toUpperCase();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader back title="Profile" action={<Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push("/settings")}><Feather name="settings" size={20} color={colors.foreground} /></Pressable>} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.identity, { backgroundColor: colors.hero }]}>
          <View style={styles.photoFrame}>
            {profilePhotoUri ? <ProfilePhoto uri={profilePhotoUri} size={68} accessibilityLabel="Your profile photo" fallback={<Text style={styles.initials}>{initials}</Text>} /> : <View style={styles.initialsFallback}><Text style={[styles.initials, { color: colors.hero }]}>{initials}</Text></View>}
          </View>
          <View style={styles.identityCopy}><Text style={[styles.eyebrow, { color: colors.heroMuted }]}>YOUR CALORA PROFILE</Text><Text style={[styles.name, { color: colors.onHero }]}>{profile?.name ?? "Your profile"}</Text><Text style={[styles.email, { color: colors.heroMuted }]}>{user?.email ?? "Complete your profile to personalize Calora"}</Text></View>
        </View>
        <SectionHeader eyebrow="01" title="Personal information" description="The details Calora uses to understand your starting point." theme={colors} />
        <ProfileYouSettings profile={profile} colors={colors} updateProfile={updateProfile} />
        <SectionHeader eyebrow="02" title="Goals & wellness" description="Keep your plan, targets, and health connection aligned." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="target" title="Nutrition goals" description={profile?.goal ? `${profile.goal} · ${profile.calorieTarget} kcal target` : "Set goals after onboarding"} theme={colors} onPress={() => router.push("/(tabs)/profile?tab=you&open=goals" as never)} />
          <SettingRow icon="heart" title="Health connection" description="Manage steps and active-energy access" theme={colors} onPress={() => router.push("/settings" as never)} />
        </View>
        <SectionHeader eyebrow="03" title="Membership" description="Your plan and benefits stay separate from product settings." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><SettingRow icon="award" title={isSubscribed ? `${BRAND.premiumName} is active` : BRAND.premiumName} description={isSubscribed ? "Manage your subscription and benefits" : "Explore premium nutrition support"} theme={colors} onPress={() => router.push("/(tabs)/profile?tab=membership" as never)} /></View>
        <SectionHeader eyebrow="04" title="Account" description="Sign-in and account actions are kept together." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><SettingRow icon="download" title="Export your data" description={hasExportData ? "Share a portable copy of your local wellness data" : "No local data is ready to export yet"} theme={colors} onPress={hasExportData && !isExporting ? () => void handleExport() : undefined} right={isExporting ? <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Preparing…</Text> : <Feather name="chevron-right" size={18} color={hasExportData ? colors.mutedForeground : colors.disabledForeground} />} /><SettingRow icon="trash-2" title="Clear local data" description="Remove this device's data and sign out" theme={colors} onPress={handleClear} destructive /><SettingRow icon="user" title="Account and security" description="Sign out, privacy, and account recovery" theme={colors} onPress={() => router.push("/(tabs)/profile?tab=account" as never)} /><SettingRow icon="sliders" title="App settings" description="Appearance, behavior, privacy, and support" theme={colors} onPress={() => router.push("/settings")} /></View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: typeof import("@/constants/colors").default.light | typeof import("@/constants/colors").default.dark) {
  return StyleSheet.create({ page: { flex: 1 }, content: { padding: 20, paddingBottom: 44, gap: 8 }, identity: { borderRadius: 24, padding: 18, flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 14 }, photoFrame: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center", overflow: "hidden" }, initialsFallback: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#dff2e7", alignItems: "center", justifyContent: "center" }, initials: { fontFamily: "Inter_800ExtraBold", fontSize: 28 }, identityCopy: { flex: 1, minWidth: 0 }, eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 }, name: { fontFamily: "Inter_800ExtraBold", fontSize: 24, letterSpacing: -0.5, marginTop: 4 }, email: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 }, card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12 } });
}
