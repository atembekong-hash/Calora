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
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { useCalora } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { deriveFastingProgress, formatFastingDuration } from "@/lib/fasting";
import { selectProgressWeightSummary } from "@/lib/progressWeightSummary";
import { formatWeight } from "@/lib/weightInput";

const SURFACE = "#10231f";
const SURFACE_RAISED = "#153129";
const BORDER = "rgba(140, 203, 177, 0.16)";
const TEXT = "#f4fbf7";
const MUTED = "#9ab1a7";
const GREEN = "#45e29b";
const ORANGE = "#ff876c";
const PURPLE = "#9d77ff";

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
  const { fasting, fontScale } = useCalora();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = deriveFastingProgress(fasting, now);
  const styles = makeStyles(fontScale);
  const subtitle = progress.active
    ? progress.remainingMs > 0
      ? `${formatFastingDuration(progress.remainingMs)} remaining in your ${progress.plannedHours}-hour window`
      : "Your planned window is complete — end it when you are ready."
    : "Choose a flexible time-restricted schedule that fits your routine.";

  return (
    <View style={styles.fastingCard}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Fasting" onPress={() => router.push("/fasting")} style={styles.fastingMainPressable}>
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
          <Feather name="clock" size={24} color={TEXT} />
        </View>
      </View>
      <View style={styles.fastCopy}>
        <View style={styles.statusPill}>
          <Feather name="sun" size={12} color={GREEN} />
          <Text style={styles.statusText}>{progress.active ? "Fasting in progress" : "Ready when you are"}</Text>
        </View>
        <Text style={styles.fastTitle}>Fasting</Text>
        <Text style={styles.fastMain}>
          {progress.active ? formatFastingDuration(progress.elapsedMs) : "Set your rhythm"}
        </Text>
        <Text style={styles.fastSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.fastAction}>
        <Feather name="chevron-right" size={24} color={TEXT} />
      </View>
      </Pressable>
      <View style={styles.fastingLeaves} pointerEvents="none">
        <Feather name="feather" size={78} color="rgba(69,226,155,.22)" />
      </View>
      <View style={styles.miniStats}>
        <MiniStat icon="calendar" label={fasting.selectedPlanId ?? "12:12"} caption="Current plan" color={GREEN} route="/(tabs)/planner" />
        <MiniStat icon="bar-chart-2" label="History" caption={`${fasting.history.length} completed`} color="#5dd4a5" route="/fasting" />
        <MiniStat icon="bell" label="Reminders" caption="Off" color="#f3b33f" route="/notifications" />
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  label,
  caption,
  color,
  route,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  caption: string;
  color: string;
  route: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open fasting ${label}`} onPress={() => router.push(route as never)} style={styles.miniStat}>
      <Feather name={icon} size={18} color={color} />
      <View style={styles.miniStatCopy}>
        <Text style={styles.miniStatLabel}>{label}</Text>
        <Text style={styles.miniStatCaption}>{caption}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={MUTED} />
    </Pressable>
  );
}

function ProgressCard() {
  const { weights, profile, logs, fontScale } = useCalora();
  const styles = makeStyles(fontScale);
  const latest = selectProgressWeightSummary(weights).latestRecord;
  const todayLogs = logs.filter((log) => log.date === dateKey());
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Progress"
      onPress={() => router.push("/(tabs)/insights")}
      style={[styles.featureCard, styles.progressCard]}
    >
      <IconBox color={ORANGE} icon="bar-chart-2" />
      <Text style={styles.featureTitle}>Progress</Text>
      <Text style={styles.featureSubtitle}>
        {latest ? `${formatWeight(latest.kg, profile?.units ?? "metric")} logged` : todayLogs.length ? `${todayLogs.length} meals logged today` : "Trends, goals & insights"}
      </Text>
      <View style={styles.featureArrow}><Feather name="chevron-right" size={20} color="#fff" /></View>
      <View style={styles.chartBars} pointerEvents="none">
        {[18, 28, 14, 38, 24, 32, 18, 12].map((height, index) => <View key={index} style={[styles.chartBar, { height, opacity: 0.35 + index * 0.07 }]} />)}
      </View>
    </ScalePressable>
  );
}

function LearningCard() {
  const { fontScale } = useCalora();
  const styles = makeStyles(fontScale);
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel="Open Learning"
      onPress={() => router.push("/learning")}
      style={[styles.featureCard, styles.learningCard]}
    >
      <IconBox color={PURPLE} icon="book-open" />
      <Text style={styles.featureTitle}>Learning</Text>
      <Text style={styles.featureSubtitle}>Nutrition guides, recipes and practical tips</Text>
      <View style={styles.featureArrow}><Feather name="chevron-right" size={20} color="#fff" /></View>
      <View style={styles.learningCards} pointerEvents="none"><View /><View /><View /></View>
    </ScalePressable>
  );
}

export default function MoreScreen() {
  const { fontScale, profile, profilePhotoUri } = useCalora();
  const styles = makeStyles(fontScale);
  const quick = useMemo(() => [
    { label: "Saved meals", icon: "bookmark" as const, route: "/saved-meals", tint: GREEN },
    { label: "Coach", icon: "message-circle" as const, route: "/coach", tint: "#5ea4ff" },
    { label: "Reminders", icon: "bell" as const, route: "/profile?tab=you&open=reminders", tint: "#f3b33f" },
    { label: "Calora Pro", icon: "award" as const, route: "/profile?tab=membership", tint: "#f2c04d" },
    { label: "Meal plan", icon: "calendar" as const, route: "/planner", tint: "#a78bfa" },
    { label: "Scan history", icon: "rotate-ccw" as const, route: "/scan", tint: "#62b9ff" },
    { label: "Goals", icon: "target" as const, route: "/profile?tab=you&open=goals", tint: "#ef7868" },
    { label: "Health sync", icon: "heart" as const, route: "/profile?tab=account&open=health", tint: GREEN },
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
            <Feather name="settings" size={22} color={TEXT} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push("/profile")} style={styles.welcome}>
          <ProfilePhoto uri={profilePhotoUri} size={50} accessibilityLabel="Profile photo" fallback={<View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{profile?.name?.charAt(0) ?? "C"}</Text></View>} />
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeTitle}>{profile?.name ? `Hi, ${profile.name.split(" ")[0]}` : "Hi, there"}</Text>
            <Text style={styles.welcomeSub}>Your tools, preferences, and progress in one place</Text>
          </View>
          <Feather name="chevron-right" size={24} color={TEXT} />
        </Pressable>
        <FastingCard />
        <View style={styles.featureRow}><ProgressCard /><LearningCard /></View>
        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Quick access</Text><Text style={styles.sectionCaption}>Shortcuts to the things you use most</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit quick access" onPress={() => router.push("/settings")} style={styles.editButton}><Text style={styles.editText}>Edit</Text><Feather name="edit-2" size={16} color={GREEN} /></Pressable>
        </View>
        <View style={styles.quickGrid}>
          {quick.map((item) => <ScalePressable key={item.label} accessibilityRole="button" accessibilityLabel={`Open ${item.label}`} onPress={() => router.push(item.route as never)} style={styles.quickItem}><IconBox color={item.tint} icon={item.icon} size={38} /><Text style={styles.quickLabel}>{item.label}</Text></ScalePressable>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  iconBox: { borderRadius: 13, alignItems: "center" as const, justifyContent: "center" as const },
  miniStat: { flex: 1, minHeight: 58, borderRadius: 15, paddingHorizontal: 12, flexDirection: "row" as const, alignItems: "center" as const, gap: 8, backgroundColor: "rgba(8, 30, 24, .64)", borderWidth: 1, borderColor: "rgba(140,203,177,.10)" },
  miniStatCopy: { flex: 1 },
  miniStatLabel: { color: TEXT, fontSize: 12, fontWeight: "800" as const },
  miniStatCaption: { color: MUTED, fontSize: 9, marginTop: 2 },
};

function makeStyles(scale: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#081612" },
    content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 38, gap: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { color: TEXT, fontSize: 29 * scale, fontWeight: "800", letterSpacing: -0.8 },
    headerCaption: { color: MUTED, fontSize: 15 * scale, marginTop: 1 },
    gear: { height: 58, width: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
    welcome: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 14 },
    avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
    avatarLetter: { color: "#063523", fontSize: 20 * scale, fontWeight: "800" },
    welcomeCopy: { flex: 1 },
    welcomeTitle: { color: TEXT, fontSize: 23 * scale, fontWeight: "800" },
    welcomeSub: { color: MUTED, fontSize: 14 * scale, marginTop: 2 },
    fastingCard: { minHeight: 270, borderRadius: 23, padding: 18, paddingBottom: 86, backgroundColor: "#0d4638", overflow: "hidden", position: "relative" },
    fastingShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 42, 32, .56)" },
    fastingMainPressable: { position: "absolute", left: 0, right: 0, top: 0, bottom: 70 },
    fastRingOuter: { height: 116, width: 116, borderRadius: 58, backgroundColor: "rgba(255,255,255,.08)", alignItems: "center", justifyContent: "center", position: "absolute", left: 18, top: 34 },
    fastRing: { height: 98, width: 98, borderRadius: 49, borderWidth: 10, borderLeftColor: "#53776b", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-35deg" }] },
    fastCopy: { marginLeft: 138, paddingTop: 2, minHeight: 136 },
    statusPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(69,226,155,.14)" },
    statusText: { color: GREEN, fontSize: 12 * scale, fontWeight: "700" },
    fastTitle: { color: TEXT, fontSize: 18 * scale, fontWeight: "800", marginTop: 12 },
    fastMain: { color: TEXT, fontSize: 36 * scale, fontWeight: "800", letterSpacing: -1 },
    fastSubtitle: { color: "#b8d3c8", fontSize: 13 * scale, lineHeight: 18 * scale, maxWidth: 230 },
    fastAction: { position: "absolute", right: 19, top: 93, height: 52, width: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
    fastingLeaves: { position: "absolute", right: 12, top: 8, opacity: 0.7, transform: [{ rotate: "-25deg" }] },
    miniStats: { position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", gap: 8 },
    featureRow: { flexDirection: "row", gap: 14 },
    featureCard: { flex: 1, minHeight: 196, borderRadius: 21, overflow: "hidden", position: "relative", padding: 16, justifyContent: "flex-start" },
    progressCard: { backgroundColor: "#3b2b22" },
    learningCard: { backgroundColor: "#262148" },
    featureShade: { ...StyleSheet.absoluteFillObject },
    featureTitle: { color: TEXT, fontSize: 22 * scale, fontWeight: "800", marginTop: 18 },
    featureSubtitle: { color: "#d0d8d4", fontSize: 14 * scale, lineHeight: 19 * scale, maxWidth: 145, marginTop: 3 },
    featureArrow: { position: "absolute", right: 16, bottom: 18, height: 42, width: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.20)" },
    chartBars: { position: "absolute", bottom: 14, left: 14, flexDirection: "row", gap: 4, alignItems: "flex-end" },
    chartBar: { width: 7, borderRadius: 4, backgroundColor: ORANGE },
    learningCards: { position: "absolute", right: -12, bottom: 18, width: 84, height: 80, transform: [{ rotate: "15deg" }] },
    sectionHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 3 },
    sectionTitle: { color: TEXT, fontSize: 23 * scale, fontWeight: "800" },
    sectionCaption: { color: MUTED, fontSize: 14 * scale, marginTop: 2 },
    editButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 2 },
    editText: { color: GREEN, fontSize: 14 * scale, fontWeight: "700" },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    quickItem: { width: "23.2%", minHeight: 104, borderRadius: 17, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", gap: 8, padding: 8 },
    quickLabel: { color: TEXT, fontSize: 11 * scale, fontWeight: "700", textAlign: "center" },
    lowerPanel: { borderRadius: 21, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14 },
    lowerRow: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 12 },
    lowerRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
    lowerCopy: { flex: 1 },
    lowerTitle: { color: TEXT, fontSize: 16 * scale, fontWeight: "800" },
    lowerCaption: { color: MUTED, fontSize: 12 * scale, marginTop: 3 },
  });
}
