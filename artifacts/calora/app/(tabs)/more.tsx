import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScalePressable } from "@/components/ScalePressable";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { useCalora } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { deriveFastingProgress, formatFastingDuration } from "@/lib/fasting";
import { selectProgressWeightSummary } from "@/lib/progressWeightSummary";
import { formatWeight } from "@/lib/weightInput";

function FastingCard() {
  const { fasting, colors, fontScale } = useCalora();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = deriveFastingProgress(fasting, now);
  const styles = makeStyles(colors, fontScale);
  const subtitle = progress.active
    ? progress.remainingMs > 0
      ? `${formatFastingDuration(progress.remainingMs)} remaining in your ${progress.plannedHours}-hour window`
      : "Your planned window is complete — end it when you are ready."
    : "Choose a flexible time-restricted schedule that fits your routine.";
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Fasting"
      onPress={() => router.push("/fasting")}
      style={styles.fastingCard}
    >
      <View style={styles.fastRing}>
        <View
          style={[
            styles.fastRingProgress,
            {
              borderTopColor: colors.success,
              borderRightColor:
                progress.progress > 0.25
                  ? colors.success
                  : "rgba(255,255,255,.25)",
              borderBottomColor:
                progress.progress > 0.55
                  ? colors.success
                  : "rgba(255,255,255,.25)",
            },
          ]}
        >
          <Feather name="clock" size={22} color="#fff" />
        </View>
      </View>
      <View style={styles.fastCopy}>
        <Text style={styles.fastTitle}>Fasting</Text>
        <Text style={styles.fastMain}>
          {progress.active
            ? formatFastingDuration(progress.elapsedMs)
            : "Set your rhythm"}
        </Text>
        <Text style={styles.fastSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.fastAction}>
        <Text style={styles.fastActionText}>
          {progress.active ? "View" : "Start"}
        </Text>
        <Feather name="arrow-right" size={15} color="#fff" />
      </View>
    </ScalePressable>
  );
}

function ProgressCard() {
  const { weights, profile, colors, fontScale, logs } = useCalora();
  const styles = makeStyles(colors, fontScale);
  const latest = selectProgressWeightSummary(weights).latestRecord;
  const todayLogs = logs.filter((log) => log.date === dateKey());
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Progress"
      onPress={() => router.push("/(tabs)/insights")}
      style={styles.progressCard}
    >
      <View style={styles.progressIcon}>
        <Feather name="bar-chart-2" size={21} color={colors.primary} />
      </View>
      <View style={styles.progressCopy}>
        <Text style={styles.progressTitle}>Progress</Text>
        <Text style={styles.progressSummary}>
          {latest
            ? `${formatWeight(latest.kg, profile?.units ?? "metric")} logged`
            : todayLogs.length
              ? `${todayLogs.length} meals logged today`
              : "Start with a first check-in"}
        </Text>
      </View>
      <View style={styles.progressArrow}>
        <Feather name="arrow-up-right" size={18} color={colors.primary} />
      </View>
    </ScalePressable>
  );
}

export default function MoreScreen() {
  const { colors, fontScale, profile, profilePhotoUri, savedMeals } =
    useCalora();
  const styles = makeStyles(colors, fontScale);
  const quick = [
    {
      label: "Saved meals",
      icon: "bookmark" as const,
      route: "/saved-meals",
      tint: "#159957",
    },
    {
      label: "Coach",
      icon: "message-circle" as const,
      route: "/coach",
      tint: "#3677e8",
    },
    {
      label: "Reminders",
      icon: "bell" as const,
      route: "/profile?tab=you&open=reminders",
      tint: "#ec9b21",
    },
    {
      label: "Calora Pro",
      icon: "award" as const,
      route: "/profile?tab=membership",
      tint: "#d28b1d",
    },
    {
      label: "Goals",
      icon: "target" as const,
      route: "/profile?tab=you&open=goals",
      tint: "#276fdd",
    },
    {
      label: "Health sync",
      icon: "heart" as const,
      route: "/profile?tab=account&open=health",
      tint: "#159957",
    },
  ];
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>More</Text>
          <Text style={styles.headerCaption}>
            Tools to support a healthier you.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings and profile"
          onPress={() => router.push("/profile")}
          style={styles.gear}
        >
          <Feather name="settings" size={20} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcome}>
          <ProfilePhoto
            uri={profilePhotoUri}
            size={42}
            accessibilityLabel="Profile photo"
            fallback={
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {profile?.name?.charAt(0) ?? "C"}
                </Text>
              </View>
            }
          />
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeTitle}>
              {profile?.name
                ? `Hi, ${profile.name.split(" ")[0]}`
                : "Your Calora space"}
            </Text>
            <Text style={styles.welcomeSub}>
              {savedMeals.length
                ? `${savedMeals.length} saved meal${savedMeals.length === 1 ? "" : "s"} ready to reuse`
                : "Your tools, preferences, and progress in one place"}
            </Text>
          </View>
        </View>
        <FastingCard />
        <ProgressCard />
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel="Open Learning"
          onPress={() => router.push("/learning")}
          style={styles.learningCard}
        >
          <View style={styles.learningIcon}>
            <Feather name="book-open" size={22} color={colors.link} />
          </View>
          <View style={styles.learningCopy}>
            <Text style={styles.learningTitle}>Learning</Text>
            <Text style={styles.learningText}>
              Simple guides for fasting, nutrition, recipes, and meal planning.
            </Text>
          </View>
          <View style={styles.learningGo}>
            <Text style={styles.learningGoText}>Explore</Text>
            <Feather name="arrow-right" size={14} color={colors.link} />
          </View>
        </ScalePressable>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <Text style={styles.sectionCaption}>
            Settings and supporting tools
          </Text>
        </View>
        <View style={styles.quickGrid}>
          {quick.map((item) => (
            <ScalePressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
              onPress={() => router.push(item.route as never)}
              style={styles.quickItem}
            >
              <View
                style={[
                  styles.quickIcon,
                  { backgroundColor: `${item.tint}18` },
                ]}
              >
                <Feather name={item.icon} size={20} color={item.tint} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </ScalePressable>
          ))}
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 7,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 28 * scale,
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    headerCaption: {
      color: colors.mutedForeground,
      fontSize: 12 * scale,
      marginTop: 3,
    },
    gear: {
      height: 42,
      width: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    content: { padding: 20, paddingTop: 0, paddingBottom: 42, gap: 14 },
    welcome: { flexDirection: "row", gap: 11, alignItems: "center" },
    avatarFallback: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: { color: "#fff", fontSize: 16 * scale, fontWeight: "800" },
    welcomeCopy: { flex: 1 },
    welcomeTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15 * scale,
    },
    welcomeSub: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      marginTop: 2,
    },
    fastingCard: {
      minHeight: 139,
      borderRadius: 22,
      padding: 17,
      backgroundColor: "#123f33",
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      overflow: "hidden",
    },
    fastRing: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: "rgba(255,255,255,.09)",
      alignItems: "center",
      justifyContent: "center",
    },
    fastRingProgress: {
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 6,
      borderLeftColor: "rgba(255,255,255,.25)",
      alignItems: "center",
      justifyContent: "center",
      transform: [{ rotate: "-35deg" }],
    },
    fastCopy: { flex: 1 },
    fastTitle: { color: "#d9f1e0", fontSize: 12 * scale, fontWeight: "800" },
    fastMain: {
      color: "#fff",
      fontSize: 21 * scale,
      fontWeight: "800",
      marginTop: 2,
    },
    fastSubtitle: {
      color: "#b3d3bf",
      fontSize: 10 * scale,
      lineHeight: 15 * scale,
      marginTop: 5,
    },
    fastAction: {
      position: "absolute",
      right: 15,
      bottom: 14,
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    fastActionText: { color: "#fff", fontSize: 11 * scale, fontWeight: "800" },
    progressCard: {
      minHeight: 86,
      borderRadius: 20,
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    progressIcon: {
      height: 45,
      width: 45,
      borderRadius: 15,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    progressCopy: { flex: 1 },
    progressTitle: {
      color: colors.text,
      fontSize: 16 * scale,
      fontWeight: "800",
    },
    progressSummary: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      marginTop: 3,
    },
    progressArrow: {
      height: 33,
      width: 33,
      borderRadius: 11,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    learningCard: {
      minHeight: 94,
      borderRadius: 20,
      padding: 15,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    learningIcon: {
      height: 45,
      width: 45,
      borderRadius: 15,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    learningCopy: { flex: 1 },
    learningTitle: {
      color: colors.foreground,
      fontWeight: "800",
      fontSize: 16 * scale,
    },
    learningText: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
      marginTop: 3,
    },
    learningGo: { alignItems: "center", gap: 3 },
    learningGoText: {
      color: colors.link,
      fontWeight: "800",
      fontSize: 11 * scale,
    },
    sectionHeading: { marginTop: 8, gap: 2 },
    sectionTitle: {
      color: colors.text,
      fontSize: 17 * scale,
      fontWeight: "800",
    },
    sectionCaption: { color: colors.mutedForeground, fontSize: 11 * scale },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    quickItem: {
      width: "31.7%",
      minHeight: 82,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      padding: 7,
    },
    quickIcon: {
      height: 32,
      width: 32,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    quickLabel: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 10 * scale,
      textAlign: "center",
    },
  });
