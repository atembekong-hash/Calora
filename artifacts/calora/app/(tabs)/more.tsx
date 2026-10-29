import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { deriveFastingProgress, formatFastingDuration } from "@/lib/fasting";
import { selectProgressWeightSummary } from "@/lib/progressWeightSummary";
import { formatWeight } from "@/lib/weightInput";

const SURFACE = "#10231f";
const BORDER = "rgba(140, 203, 177, 0.16)";
const TEXT = "#f4fbf7";
const MUTED = "#9ab1a7";
const GREEN = "#177a52";
const ORANGE = "#ff876c";

function IconBox({
  color,
  icon,
  size = 42,
}: {
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  size?: number;
}) {
  return (
    <View style={[styles.iconBox, { width: size, height: size, backgroundColor: `${color}20` }]}>
      <Feather name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

function FastingCard() {
  const { fasting, fontScale, colors } = useCalora();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = deriveFastingProgress(fasting, now);
  const styles = makeStyles(fontScale, colors);
  const subtitle = progress.active
    ? progress.remainingMs > 0
      ? `${formatFastingDuration(progress.remainingMs)} left in your ${progress.plannedHours}-hour window`
      : "Window complete — end when ready."
    : "Choose a flexible fasting schedule.";

  return (
    <View style={styles.fastingCard}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Fasting" onPress={() => router.push("/fasting")} style={styles.fastingMainPressable}>
        <View style={styles.fastTopRow}>
          <View style={styles.fastRingOuter}>
            <View
              style={[
                styles.fastRing,
                {
                  borderTopColor: GREEN,
                  borderRightColor: progress.progress > 0.25 ? GREEN : "#53776b",
                  borderBottomColor: progress.progress > 0.55 ? GREEN : "#53776b",
                },
              ]}
            >
              <Feather name="clock" size={22} color={TEXT} />
            </View>
          </View>
          <View style={styles.fastCopy}>
            <View style={styles.statusPill}>
              <Feather name="sun" size={11} color={GREEN} />
              <Text numberOfLines={1} style={styles.statusText}>{progress.active ? "Fasting in progress" : "Ready when you are"}</Text>
            </View>
            <Text style={styles.fastTitle}>Fasting</Text>
            <Text style={styles.fastMain} numberOfLines={1}>
              {progress.active ? formatFastingDuration(progress.elapsedMs) : "Set your rhythm"}
            </Text>
            <Text numberOfLines={2} style={styles.fastSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.fastAction}>
            <Feather name="chevron-right" size={22} color={TEXT} />
          </View>
        </View>
      </Pressable>
      <View style={styles.fastingLeaves} pointerEvents="none">
        <Feather name="feather" size={44} color="rgba(69,226,155,.16)" />
      </View>
      <View style={styles.miniStats}>
        <MiniStat colors={colors} icon="calendar" label={fasting.selectedPlanId ?? "12:12"} caption="Current plan" color={GREEN} route="/(tabs)/planner" />
        <MiniStat colors={colors} icon="bar-chart-2" label="History" caption={`${fasting.history.length} completed`} color="#5dd4a5" route="/fasting" />
        <MiniStat colors={colors} icon="bell" label="Reminders" caption="Off" color="#f3b33f" route="/profile?tab=you&open=reminders" />
      </View>
    </View>
  );
}

function MiniStat({
  colors,
  icon,
  label,
  caption,
  color,
  route,
}: {
  colors: ReturnType<typeof useCalora>["colors"];
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  caption: string;
  color: string;
  route: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open fasting ${label}`} onPress={() => router.push(route as never)} style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={18} color={color} />
      <View style={styles.miniStatCopy}>
        <Text numberOfLines={1} style={[styles.miniStatLabel, { color: colors.foreground }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.miniStatCaption, { color: colors.mutedForeground }]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function ProgressCard() {
  const { weights, profile, logs, fontScale, colors } = useCalora();
  const styles = makeStyles(fontScale, colors);
  const latest = selectProgressWeightSummary(weights).latestRecord;
  const todayLogs = logs.filter((log) => log.date === dateKey());
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Progress"
      onPress={() => router.push("/(tabs)/insights")}
      style={[styles.featureCard, styles.progressCard]}
    >
      <IconBox color={ORANGE} icon="bar-chart-2" size={30} />
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>Progress</Text>
        <Text numberOfLines={2} style={styles.featureSubtitle}>
          {latest ? `${formatWeight(latest.kg, profile?.units ?? "metric")} logged` : todayLogs.length ? `${todayLogs.length} meals logged today` : "Trends, goals & insights"}
        </Text>
      </View>
      <View style={styles.featureArrow}><Feather name="chevron-right" size={20} color="#fff" /></View>
      <View style={styles.chartBars} pointerEvents="none">
        {[18, 28, 14, 38, 24, 32, 18, 12].map((height, index) => <View key={index} style={[styles.chartBar, { height, opacity: 0.35 + index * 0.07 }]} />)}
      </View>
    </ScalePressable>
  );
}

function LearningCard() {
  const { fontScale, colors } = useCalora();
  const styles = makeStyles(fontScale, colors);
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Learning"
      onPress={() => router.push("/learning")}
      style={[styles.featureCard, styles.learningCard]}
    >
      <IconBox color="#9d77ff" icon="book-open" size={30} />
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>Learning</Text>
        <Text numberOfLines={2} style={styles.featureSubtitle}>Guides, Recipes, Tips..</Text>
      </View>
      <View style={styles.featureArrow}><Feather name="chevron-right" size={20} color="#fff" /></View>
      <View style={styles.learningCards} pointerEvents="none"><View /><View /><View /></View>
    </ScalePressable>
  );
}

export default function MoreScreen() {
  const { fontScale, colors } = useCalora();
  const styles = makeStyles(fontScale, colors);
  const quick = useMemo(() => [
    { label: "Saved meals", icon: "bookmark" as const, route: "/saved-meals", tint: GREEN },
    { label: "Coach", icon: "message-circle" as const, route: "/coach", tint: "#5ea4ff" },
    { label: "Reminders", icon: "bell" as const, route: "/profile?tab=you&open=reminders", tint: "#f3b33f" },
    { label: "Calora Pro", icon: "award" as const, route: "/profile?tab=membership", tint: "#f2c04d" },
    { label: "Meal plan", icon: "calendar" as const, route: "/planner", tint: "#a78bfa" },
    { label: "Scan history", icon: "rotate-ccw" as const, route: "/scan", tint: "#62b9ff" },
    { label: "Goals", icon: "target" as const, route: "/profile?tab=you&open=goals", tint: "#ef7868" },
    { label: "Health sync", icon: "heart" as const, route: "/profile?tab=account&open=health", tint: GREEN },
    { label: "Recipes", icon: "book-open" as const, route: "/recipes", tint: ORANGE },
  ], []);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>More</Text>
            <Text style={styles.headerCaption}>Your wellness, insights & tools</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open settings and profile" onPress={() => router.push("/profile")} style={styles.gear}>
            <Feather name="settings" size={15} color={TEXT} />
          </Pressable>
        </View>
        <FastingCard />
        <View style={styles.featureRow}><ProgressCard /><LearningCard /></View>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Quick access</Text>
        </View>
        <View style={styles.quickGrid}>
          {quick.map((item) => <ScalePressable key={item.label} accessibilityRole="button" accessibilityLabel={`Open ${item.label}`} onPress={() => router.push(item.route as never)} style={styles.quickItem}><IconBox color={item.tint} icon={item.icon} size={26} /><Text style={styles.quickLabel}>{item.label}</Text></ScalePressable>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  iconBox: { borderRadius: 13, alignItems: "center" as const, justifyContent: "center" as const },
  miniStat: { flex: 1, minHeight: 40, borderRadius: 12, paddingHorizontal: 6, flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "rgba(8, 30, 24, .64)", borderWidth: 1, borderColor: "rgba(140,203,177,.10)" },
  miniStatCopy: { flex: 1 },
  miniStatLabel: { color: TEXT, fontSize: 10, fontWeight: "800" as const },
  miniStatCaption: { color: MUTED, fontSize: 8, marginTop: 1 },
};

function makeStyles(scale: number, colors: ReturnType<typeof useCalora>["colors"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 124, gap: 13 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { color: colors.foreground, fontSize: 21 * scale, fontWeight: "800", letterSpacing: -0.6 },
    headerCaption: { color: colors.mutedForeground, fontSize: 14 * scale, marginTop: 1 },
    gear: { height: 42, width: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    fastingCard: { height: 153.97, borderRadius: 18, padding: 10, paddingBottom: 42, backgroundColor: "#0a352b", overflow: "hidden", position: "relative" },
    fastingMainPressable: { flex: 1, marginHorizontal: -2, marginTop: -2, marginBottom: 5 },
    fastTopRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 74 },
    fastRingOuter: { height: 62, width: 62, flexShrink: 0, borderRadius: 31, backgroundColor: "rgba(255,255,255,.08)", alignItems: "center", justifyContent: "center" },
    fastRing: { height: 52, width: 52, borderRadius: 26, borderWidth: 6, borderLeftColor: "#456b5f", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-35deg" }] },
    fastCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
    statusPill: { alignSelf: "flex-start", maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(69,226,155,.14)" },
    statusText: { color: GREEN, fontSize: 11 * scale, fontWeight: "700" },
    fastTitle: { color: TEXT, fontSize: 14 * scale, fontWeight: "800", marginTop: 3 },
    fastMain: { color: TEXT, fontSize: 24 * scale, fontWeight: "800", letterSpacing: -1 },
    fastSubtitle: { color: "#b8d3c8", fontSize: 10 * scale, lineHeight: 12 * scale, maxWidth: 145 },
    fastAction: { height: 32, width: 32, flexShrink: 0, borderRadius: 16, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
    fastingLeaves: { position: "absolute", right: 20, top: 14, opacity: 0.4, transform: [{ rotate: "-25deg" }] },
    miniStats: { position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", gap: 4 },
    featureRow: { flexDirection: "row", gap: 14 },
    featureCard: { flex: 1, height: 111.77, borderRadius: 16, overflow: "hidden", position: "relative", padding: 9, justifyContent: "flex-start" },
    progressCard: { backgroundColor: "#3b2b22" },
    learningCard: { backgroundColor: "#262148" },
    featureCopy: { position: "absolute", top: 9, right: 9, left: 46, alignItems: "flex-end" },
    featureTitle: { color: TEXT, fontSize: 14.5 * scale, fontWeight: "800", textAlign: "right" },
    featureSubtitle: { color: "#d0d8d4", fontSize: 9.5 * scale, lineHeight: 11 * scale, maxWidth: 116, textAlign: "right", marginTop: 2 },
    featureArrow: { position: "absolute", right: 9, bottom: 9, height: 28, width: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.20)" },
    chartBars: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", gap: 3, alignItems: "flex-end" },
    chartBar: { width: 7, borderRadius: 4, backgroundColor: ORANGE },
    learningCards: { position: "absolute", right: -12, bottom: 18, width: 84, height: 80, transform: [{ rotate: "15deg" }] },
    sectionHeading: { marginTop: 3 },
    sectionTitle: { color: TEXT, fontSize: 17 * scale, fontWeight: "800" },
    sectionCaption: { color: MUTED, fontSize: 14 * scale, marginTop: 2 },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
    quickItem: { width: "33%", minHeight: 62.4, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4, paddingVertical: 6 },
    quickLabel: { color: colors.foreground, fontSize: 10.5 * scale, fontWeight: "700", textAlign: "center" },
  });
}
