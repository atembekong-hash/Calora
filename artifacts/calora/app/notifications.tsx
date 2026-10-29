import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppChrome";
import { PermissionBanner, SectionHeader, SettingRow } from "@/components/ProfileSettingsPrimitives";
import { useCalora } from "@/context/CaloraContext";
import { useAuth } from "@/context/AuthContext";
import { normalizeNotificationPreferences } from "@/lib/notificationPreferences";
import { reconcileUserNotificationPlan } from "@/lib/notificationLifecycle";
import { clearNotificationInbox, getNotificationInbox, markAllNotificationsRead, type NotificationInboxItem } from "@/lib/notificationInbox";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, notificationPreferences, updateNotificationPreferences } = useCalora();
  const [permissionGranted, setPermissionGranted] = useState(Platform.OS === "web");
  const [updating, setUpdating] = useState(false);
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const supported = Platform.OS !== "web";
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const accountId = user?.id ?? null;
  const refreshInbox = useCallback(async () => {
    setInboxLoading(true);
    try { setItems(await getNotificationInbox(accountId)); }
    catch { setItems([]); }
    finally { setInboxLoading(false); }
  }, [accountId]);
  useEffect(() => { void refreshInbox(); }, [refreshInbox]);
  useEffect(() => {
    if (!supported) return;
    void Notifications.getPermissionsAsync().then((result) => setPermissionGranted(result.granted)).catch(() => setPermissionGranted(false));
  }, [supported]);
  const apply = async (updater: (current: typeof notificationPreferences) => typeof notificationPreferences) => {
    const desired = normalizeNotificationPreferences(updater(notificationPreferences));
    updateNotificationPreferences(() => desired);
    setUpdating(true);
    try {
      const result = await reconcileUserNotificationPlan(desired);
      if (result.status === "denied") setPermissionGranted(false);
      if (result.status === "failed") Alert.alert("Reminders need attention", "Your preference was saved, but the device could not finish scheduling reminders. Please retry.");
    } catch { Alert.alert("Reminders need attention", "Your preference was saved, but scheduling could not be completed."); }
    finally { setUpdating(false); }
  };
  const openDeviceSettings = () => { void Linking.openSettings().catch(() => Alert.alert("Unable to open settings", "Open your device settings and allow notifications for Calora.")); };
  const unread = items.filter((item) => !item.read).length;
  const category = (key: "hydration" | "meal" | "goal") => notificationPreferences.categories[key];
  const toggleMaster = () => void apply((current) => ({ ...current, masterEnabled: !current.masterEnabled }));
  const toggleQuiet = () => void apply((current) => ({ ...current, quietHours: { ...current.quietHours, enabled: !current.quietHours.enabled } }));
  const toggleCategory = (key: "hydration" | "meal" | "goal") => void apply((current) => {
    const next = !current.categories[key].enabled;
    return { ...current, categories: { ...current.categories, [key]: { ...current.categories[key], enabled: next, preferences: { ...current.categories[key].preferences, enabled: key === "hydration" || key === "goal" ? next : undefined, ...(key === "meal" ? { breakfast: next, lunch: next, dinner: next } : {}) } } } } as typeof current;
  });
  const markAll = () => { void markAllNotificationsRead(accountId).then(refreshInbox).catch(() => Alert.alert("Could not update notifications", "Please try again.")); };
  const clearInbox = () => { Alert.alert("Clear notification history?", "Reminder preferences will not change.", [{ text: "Cancel", style: "cancel" }, { text: "Clear history", style: "destructive", onPress: () => void clearNotificationInbox(accountId).then(refreshInbox) }]); };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader back leftAlignTitle title="Notifications" action={<Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push("/settings")}><Feather name="settings" size={20} color={colors.foreground} /></Pressable>} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.hero }]}><View style={styles.heroIcon}><Feather name="bell" size={21} color={colors.hero} /></View><View style={styles.heroCopy}><Text style={[styles.heroEyebrow, { color: colors.heroMuted }]}>COMMUNICATION CENTER</Text><Text style={[styles.heroTitle, { color: colors.onHero }]}>Stay in the loop, your way.</Text><Text style={[styles.heroBody, { color: colors.heroMuted }]}>Choose what Calora sends and when it stays quiet.</Text></View></View>
        <PermissionBanner allowed={permissionGranted} supported={supported} theme={colors} onPress={openDeviceSettings} />
        <SectionHeader eyebrow="01" title="Permission status" description="Device permission controls delivery. Your choices are preserved if permission is off." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><SettingRow icon="bell" title="All notifications" description={notificationPreferences.masterEnabled ? "Calora can deliver enabled reminders" : "All local delivery is paused"} theme={colors} right={<Switch accessibilityLabel="Toggle all notifications" value={notificationPreferences.masterEnabled} onValueChange={toggleMaster} disabled={updating} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={notificationPreferences.masterEnabled ? colors.primary : colors.mutedForeground} />} /></View>
        <SectionHeader eyebrow="02" title="Reminders" description="Small, useful nudges for the routines you choose." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="droplet" title="Hydration reminders" description="Periodic water check-ins" theme={colors} right={<Switch accessibilityLabel="Toggle hydration reminders" value={category("hydration").enabled} onValueChange={() => toggleCategory("hydration")} disabled={updating} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={category("hydration").enabled ? colors.primary : colors.mutedForeground} />} />
          <SettingRow icon="coffee" title="Meal reminders" description="Breakfast, lunch, and dinner check-ins" theme={colors} right={<Switch accessibilityLabel="Toggle meal reminders" value={category("meal").enabled} onValueChange={() => toggleCategory("meal")} disabled={updating} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={category("meal").enabled ? colors.primary : colors.mutedForeground} />} />
          <SettingRow icon="target" title="Progress updates" description="A daily goal check-in" theme={colors} right={<Switch accessibilityLabel="Toggle progress updates" value={category("goal").enabled} onValueChange={() => toggleCategory("goal")} disabled={updating} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={category("goal").enabled ? colors.primary : colors.mutedForeground} />} />
          <SettingRow icon="moon" title="Quiet hours" description={notificationPreferences.quietHours.enabled ? "Reminders pause from 10:00 PM to 7:00 AM" : "Reminders can arrive throughout the day"} theme={colors} right={<Switch accessibilityLabel="Toggle quiet hours" value={notificationPreferences.quietHours.enabled} onValueChange={toggleQuiet} disabled={updating} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={notificationPreferences.quietHours.enabled ? colors.primary : colors.mutedForeground} />} />
        </View>
        <SectionHeader eyebrow="03" title="Calora communication" description="Review updates delivered to your in-app inbox." theme={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="inbox" title="Notification inbox" description={inboxLoading ? "Loading your updates…" : unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : items.length ? `${items.length} saved update${items.length === 1 ? "" : "s"}` : "No updates yet"} theme={colors} onPress={refreshInbox} />
          {items.length ? <View style={styles.inboxActions}><Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications read" onPress={markAll}><Text style={[styles.actionText, { color: colors.primary }]}>Mark all read</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Clear notification history" onPress={clearInbox}><Text style={[styles.actionText, { color: colors.destructive }]}>Clear history</Text></Pressable></View> : null}
        </View>
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>You can change these choices anytime. Calora never changes your saved preferences just because device permission is unavailable.</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: typeof import("@/constants/colors").default.light | typeof import("@/constants/colors").default.dark) {
  return StyleSheet.create({ page: { flex: 1 }, content: { padding: 20, paddingBottom: 42, gap: 10 }, hero: { borderRadius: 24, padding: 18, flexDirection: "row", gap: 14, marginBottom: 14 }, heroIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#dff2e7", alignItems: "center", justifyContent: "center" }, heroCopy: { flex: 1 }, heroEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 }, heroTitle: { fontFamily: "Inter_800ExtraBold", fontSize: 22, letterSpacing: -0.4, marginTop: 4 }, heroBody: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 4 }, card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12 }, inboxActions: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 }, actionText: { fontFamily: "Inter_700Bold", fontSize: 11 }, footer: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, paddingHorizontal: 8, marginTop: 2 } });
}
