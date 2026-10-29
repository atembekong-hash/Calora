import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type colors from "@/constants/colors";

type ThemeColors = typeof colors.light | typeof colors.dark;

export function SectionHeader({
  eyebrow,
  title,
  description,
  theme,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.mutedForeground }]}>{description}</Text> : null}
    </View>
  );
}

export function SettingRow({
  icon,
  title,
  description,
  theme,
  onPress,
  right,
  destructive = false,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  theme: ThemeColors;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  testID?: string;
}) {
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: destructive ? theme.destructiveTint : theme.muted }]}>
        <Feather name={icon} size={17} color={destructive ? theme.destructive : theme.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, { color: destructive ? theme.destructive : theme.foreground }]}>{title}</Text>
        {description ? <Text style={[styles.rowDescription, { color: theme.mutedForeground }]}>{description}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={theme.mutedForeground} /> : null)}
    </>
  );
  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.72 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View testID={testID} style={[styles.row, { borderBottomColor: theme.border }]}>{content}</View>
  );
}

export function PermissionBanner({
  allowed,
  supported,
  theme,
  onPress,
}: {
  allowed: boolean;
  supported: boolean;
  theme: ThemeColors;
  onPress: () => void;
}) {
  const tone = !supported || allowed ? theme.successTint : theme.warningTint;
  const color = !supported || allowed ? theme.success : theme.warning;
  const title = !supported ? "Notifications are unavailable here" : allowed ? "Notifications are enabled" : "Permission needed";
  const body = !supported
    ? "This preview cannot schedule device reminders. Your choices will still be saved."
    : allowed
      ? "Calora can deliver reminders and progress updates on this device."
      : "Allow notifications in device settings to receive scheduled reminders.";
  return (
    <View testID="notification-permission-banner" style={[styles.banner, { backgroundColor: tone, borderColor: color }]}> 
      <View style={[styles.bannerIcon, { backgroundColor: `${color}22` }]}><Feather name={allowed ? "check-circle" : "bell"} size={18} color={color} /></View>
      <View style={styles.copy}>
        <Text style={[styles.bannerTitle, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: theme.mutedForeground }]}>{body}</Text>
      </View>
      {!allowed && supported ? <Pressable accessibilityRole="button" accessibilityLabel="Open notification settings" onPress={onPress} style={[styles.bannerButton, { backgroundColor: color }]}><Text style={{ color: theme.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>Open</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 12 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.3, textTransform: "uppercase" },
  title: { fontFamily: "Inter_800ExtraBold", fontSize: 24, letterSpacing: -0.5 },
  description: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowDescription: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 12, marginBottom: 22 },
  bannerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  bannerBody: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  bannerButton: { minHeight: 34, borderRadius: 10, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
});

export const primitiveStyles = styles;
