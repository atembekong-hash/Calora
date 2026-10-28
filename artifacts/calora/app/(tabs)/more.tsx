import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScalePressable } from "@/components/ScalePressable";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { useCalora } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { deriveFastingProgress, formatFastingDuration } from "@/lib/fasting";
import { selectProgressWeightSummary } from "@/lib/progressWeightSummary";
import { formatWeight } from "@/lib/weightInput";

const moreEditorialImages = {
  fasting: require("../../assets/images/learning/articles/fasting-basics-and-boundaries.jpg"),
  progress: require("../../assets/images/calora-insights-header.jpg"),
  learning: require("../../assets/images/learning/articles/balanced-plate-basics.jpg"),
} as const;

function MoreEditorialPhoto({ source }: { source: number }) {
  return (
    <Image
      accessible={false}
      resizeMode="cover"
      source={source}
      style={StyleSheet.absoluteFillObject}
      testID="more-editorial-photo"
    />
  );
}

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
      <MoreEditorialPhoto source={moreEditorialImages.fasting} />
      <View pointerEvents="none" style={styles.fastingPhotoOverlay} />
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
      <MoreEditorialPhoto source={moreEditorialImages.progress} />
      <View pointerEvents="none" style={styles.progressPhotoOverlay} />
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
          <MoreEditorialPhoto source={moreEditorialImages.learning} />
          <View pointerEvents="none" style={styles.learningPhotoOverlay} />
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
      fontSize: 20 * scale,
      fontWeight: "800",
      letterSpacing: -0.55,
    },
    headerCaption: {
      color: colors.mutedForeground,
      fontSize: 10 * scale,
      marginTop: 2,
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
    content: { padding: 18, paddingTop: 0, paddingBottom: 36, gap: 11 },
    welcome: { flexDirection: "row", gap: 11, alignItems: "center" },
    avatarFallback: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: { color: "#fff", fontSize: 14 * scale, fontWeight: "800" },
    welcomeCopy: { flex: 1 },
    welcomeTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14 * scale,
    },
    welcomeSub: {
      color: colors.mutedForeground,
      fontSize: 10 * scale,
      marginTop: 2,
    },
    fastingCard: {
      minHeight: 122,
      borderRadius: 19,
      padding: 14,
      backgroundColor: "#123f33",
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      overflow: "hidden",
      position: "relative",
    },
    fastingPhotoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(10, 50, 38, 0.48)",
    },
    fastRing: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: "rgba(255,255,255,.09)",
      alignItems: "center",
      justifyContent: "center",
    },
    fastRingProgress: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 5,
      borderLeftColor: "rgba(255,255,255,.25)",
      alignItems: "center",
      justifyContent: "center",
      transform: [{ rotate: "-35deg" }],
    },
    fastCopy: { flex: 1 },
    fastTitle: { color: "#d9f1e0", fontSize: 10 * scale, fontWeight: "800" },
    fastMain: {
      color: "#fff",
      fontSize: 15 * scale,
      fontWeight: "800",
      marginTop: 2,
    },
    fastSubtitle: {
      color: "#b3d3bf",
      fontSize: 9 * scale,
      lineHeight: 13 * scale,
      marginTop: 3,
    },
    fastAction: {
      position: "absolute",
      right: 13,
      bottom: 11,
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    fastActionText: { color: "#fff", fontSize: 10 * scale, fontWeight: "800" },
    progressCard: {
      minHeight: 78,
      borderRadius: 18,
      padding: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      overflow: "hidden",
      position: "relative",
    },
    progressPhotoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(244, 250, 247, 0.46)",
    },
    progressIcon: {
      height: 40,
      width: 40,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    progressCopy: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.76)",
      borderRadius: 11,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    progressTitle: {
      color: colors.text,
      fontSize: 13 * scale,
      fontWeight: "800",
    },
    progressSummary: {
      color: colors.mutedForeground,
      fontSize: 10 * scale,
      marginTop: 2,
    },
    progressArrow: {
      height: 30,
      width: 30,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    learningCard: {
      minHeight: 84,
      borderRadius: 18,
      padding: 12,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      overflow: "hidden",
      position: "relative",
    },
    learningPhotoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(224, 243, 233, 0.42)",
    },
    learningIcon: {
      height: 40,
      width: 40,
      borderRadius: 13,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    learningCopy: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.76)",
      borderRadius: 11,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    learningTitle: {
      color: colors.foreground,
      fontWeight: "800",
      fontSize: 13 * scale,
    },
    learningText: {
      color: colors.mutedForeground,
      fontSize: 10 * scale,
      lineHeight: 14 * scale,
      marginTop: 2,
    },
    learningGo: { alignItems: "center", gap: 3 },
    learningGoText: {
      color: colors.link,
      fontWeight: "800",
      fontSize: 10 * scale,
    },
    sectionHeading: { marginTop: 7, gap: 2 },
    sectionTitle: {
      color: colors.text,
      fontSize: 14 * scale,
      fontWeight: "800",
    },
    sectionCaption: { color: colors.mutedForeground, fontSize: 10 * scale },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    quickItem: {
      width: "31.7%",
      minHeight: 76,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: 7,
    },
    quickIcon: {
      height: 30,
      width: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    quickLabel: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 9 * scale,
      textAlign: "center",
    },
  });
