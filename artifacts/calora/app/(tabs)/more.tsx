import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";
import { dateKey } from "@/lib/dates";
import { deriveFastingProgress, fastingPlanLabel, formatFastingDuration } from "@/lib/fasting";
import { selectProgressWeightSummary } from "@/lib/progressWeightSummary";
import { formatWeight } from "@/lib/weightInput";

const TEXT = "#f4fbf7";
const MUTED = "#9ab1a7";
const ORANGE = "#ff876c";
const PURPLE = "#a477ff";
const FASTING_ART = require("../../assets/images/more/fasting-avocado-citrus.png");
const LEARNING_ART = require("../../assets/images/more/learning-books-leaves.png");
const PRO_ART = require("../../assets/images/more/calora-pro-crown.png");

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
  const { fasting, fontScale, colors, mode } = useCalora();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = deriveFastingProgress(fasting, now);
  const pageStyles = makeStyles(fontScale, colors, mode);
  const subtitle = progress.active
    ? `${formatFastingDuration(progress.remainingMs)} remaining in your ${progress.plannedHours}-hour window`
    : `${fastingPlanLabel(fasting)} · ready to start`;

  return (
    <View style={pageStyles.fastingCard}>
      <LinearGradient
        pointerEvents="none"
        colors={mode === "dark" ? ["#0d3b2d", "#06291f"] : ["#eaf7ee", "#d8eee1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={pageStyles.cardGradient}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Open Fasting" onPress={() => router.push("/fasting")} style={pageStyles.fastingMainPressable}>
        <View style={pageStyles.fastLabelRow}>
          <Text style={pageStyles.fastTitle}>Fasting</Text>
          <View style={pageStyles.statusPill}>
            <Feather name="sun" size={11} color={colors.accentForeground} />
            <Text numberOfLines={1} style={[pageStyles.statusText, { color: colors.accentForeground }]}>{progress.active ? "Fasting in progress" : "Ready when you are"}</Text>
          </View>
        </View>
        <View style={pageStyles.fastTopRow}>
          <View style={pageStyles.fastRingOuter}>
            <View style={[pageStyles.fastRing, {
              borderTopColor: colors.accentForeground,
              borderRightColor: progress.progress > 0.25 ? colors.accentForeground : colors.border,
              borderBottomColor: progress.progress > 0.55 ? colors.accentForeground : colors.border,
            }]}>
              <Feather name="clock" size={22} color={colors.accentForeground} />
            </View>
          </View>
          <View style={pageStyles.fastCopy}>
            <Text style={pageStyles.fastMain} numberOfLines={1}>{progress.active ? formatFastingDuration(progress.elapsedMs) : `${progress.plannedHours}:00 fast`}</Text>
            <Text numberOfLines={1} style={pageStyles.fastSubtitle}>{subtitle}</Text>
          </View>
          <View style={pageStyles.fastAction}><Feather name="chevron-right" size={22} color={colors.accentForeground} /></View>
        </View>
      </Pressable>
      <View style={pageStyles.fastingDecor} pointerEvents="none">
        <Image source={FASTING_ART} contentFit="contain" style={pageStyles.fastingImage} />
        <View style={pageStyles.decorWave} />
      </View>
    </View>
  );
}

function ProgressCard() {
  const { weights, profile, logs, fontScale, colors, mode } = useCalora();
  const pageStyles = makeStyles(fontScale, colors, mode);
  const latest = selectProgressWeightSummary(weights).latestRecord;
  const todayLogs = logs.filter((log) => log.date === dateKey());
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel="Open Progress" onPress={() => router.push("/(tabs)/insights")} style={[pageStyles.featureCard, pageStyles.progressCard]}>
      <LinearGradient pointerEvents="none" colors={mode === "dark" ? ["#4a2414", "#28150f"] : ["#fff1e8", "#f5dfd2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pageStyles.cardGradient} />
      <IconBox color={ORANGE} icon="bar-chart-2" size={30} />
      <View style={pageStyles.featureCopy}>
        <Text style={pageStyles.featureTitle}>Progress</Text>
        <Text numberOfLines={2} style={pageStyles.featureSubtitle}>{latest ? `${formatWeight(latest.kg, profile?.units ?? "metric")} logged` : todayLogs.length ? `${todayLogs.length} meals logged today` : "Trends, goals & insights"}</Text>
      </View>
      <View style={pageStyles.featureArrow}><Feather name="chevron-right" size={20} color={mode === "dark" ? "#fff" : colors.foreground} /></View>
      <View style={pageStyles.chartBars} pointerEvents="none">
        {[18, 28, 14, 38, 24, 32, 18, 12].map((height, index) => <View key={index} style={[pageStyles.chartBar, { height, opacity: 0.35 + index * 0.07 }]} />)}
      </View>
    </ScalePressable>
  );
}

function LearningCard() {
  const { fontScale, colors, mode } = useCalora();
  const pageStyles = makeStyles(fontScale, colors, mode);
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel="Open Learning" onPress={() => router.push("/learning")} style={[pageStyles.featureCard, pageStyles.learningCard]}>
      <LinearGradient pointerEvents="none" colors={mode === "dark" ? ["#34205b", "#191538"] : ["#f3edff", "#e6ddfa"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pageStyles.cardGradient} />
      <IconBox color={PURPLE} icon="book-open" size={30} />
      <View style={pageStyles.featureCopy}>
        <Text style={pageStyles.featureTitle}>Learning</Text>
        <Text numberOfLines={2} style={pageStyles.featureSubtitle}>Guides, Recipes, Tips..</Text>
      </View>
      <View style={pageStyles.featureArrow}><Feather name="chevron-right" size={20} color={mode === "dark" ? "#fff" : colors.foreground} /></View>
      <Image source={LEARNING_ART} contentFit="contain" style={pageStyles.learningImage} pointerEvents="none" />
    </ScalePressable>
  );
}

function CaloraProCard() {
  const { fontScale, colors, mode } = useCalora();
  const pageStyles = makeStyles(fontScale, colors, mode);
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel="Open Calora Pro" onPress={() => router.push("/profile?tab=membership")} style={pageStyles.proCard}>
      <LinearGradient pointerEvents="none" colors={mode === "dark" ? ["#4a2d84", "#21164e"] : ["#efe8ff", "#dce8ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pageStyles.cardGradient} />
      <View style={[pageStyles.proIcon, { backgroundColor: mode === "dark" ? "rgba(242,192,77,.16)" : colors.accent }]}><Feather name="award" size={20} color="#f2c04d" /></View>
      <View style={pageStyles.proCopy}>
        <Text style={pageStyles.proTitle}>Calora Pro</Text>
        <Text numberOfLines={1} style={pageStyles.proSubtitle}>Manage your plan, subscription, and referrals.</Text>
      </View>
      <Image source={PRO_ART} contentFit="contain" style={pageStyles.proImage} pointerEvents="none" />
      <Feather name="chevron-right" size={18} color={mode === "dark" ? TEXT : colors.foreground} />
    </ScalePressable>
  );
}

function BottomRow({
  label,
  icon,
  tint,
  route,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  tint: string;
  route: string;
}) {
  const { fontScale, colors, mode } = useCalora();
  const pageStyles = makeStyles(fontScale, colors, mode);
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={`Open ${label}`} onPress={() => router.push(route as never)} style={pageStyles.bottomRow}>
      <IconBox color={tint} icon={icon} size={36} />
      <Text numberOfLines={1} style={pageStyles.bottomRowLabel}>{label}</Text>
      <Feather name="chevron-right" size={21} color={colors.foreground} />
    </ScalePressable>
  );
}

export default function MoreScreen() {
  const { fontScale, colors, mode } = useCalora();
  const pageStyles = makeStyles(fontScale, colors, mode);
  const quick = useMemo(() => [
    { label: "Insights", icon: "sun" as const, route: "/progress-insights", tint: "#f4c34f" },
    { label: "Saved recipes", icon: "bookmark" as const, route: "/saved-recipes", tint: PURPLE },
    { label: "Coach", icon: "message-circle" as const, route: "/coach", tint: "#63aaf8" },
    { label: "Customize dashboard", icon: "sliders" as const, route: "/dashboard-layout", tint: colors.accentForeground },
    { label: "Goals", icon: "target" as const, route: "/profile?tab=you&open=goals", tint: "#ef7868" },
    { label: "Health sync", icon: "heart" as const, route: "/profile?tab=account&open=health", tint: colors.accentForeground },
    { label: "Hydration", icon: "droplet" as const, route: "/hydration", tint: "#55b8ff" },
    { label: "My steps", icon: "activity" as const, route: "/steps", tint: "#6fd493" },
    { label: "My progress", icon: "bar-chart-2" as const, route: "/(tabs)/insights", tint: ORANGE },
  ], [colors.accentForeground]);

  return (
    <SafeAreaView style={pageStyles.safe} edges={["top"]}>
      <View style={pageStyles.header}>
        <View><Text style={pageStyles.headerTitle}>More</Text><Text style={pageStyles.headerCaption}>Your wellness, insights & tools</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Settings" onPress={() => router.push("/settings")} style={pageStyles.gear}><Feather name="settings" size={18} color={colors.foreground} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={pageStyles.content} showsVerticalScrollIndicator={false}>
        <FastingCard />
        <View style={pageStyles.featureRow}><ProgressCard /><LearningCard /></View>
        <View style={pageStyles.sectionHeading}>
          <Text style={[pageStyles.sectionTitle, { color: colors.foreground }]}>Quick access</Text>
          <Text style={[pageStyles.sectionCaption, { color: colors.mutedForeground }]}>Shortcuts to the things you use most</Text>
        </View>
        <View style={pageStyles.quickGrid}>
          {quick.map((item) => (
            <ScalePressable key={item.label} accessibilityRole="button" accessibilityLabel={`Open ${item.label}`} onPress={() => router.push(item.route as never)} style={pageStyles.quickItem}>
              <LinearGradient pointerEvents="none" colors={mode === "dark" ? ["#1b352d", "#10231e"] : ["#ffffff", "#f4f8f3"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pageStyles.quickGradient} />
              <IconBox color={item.tint} icon={item.icon} size={30} />
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={pageStyles.quickLabel}>{item.label}</Text>
              <View style={pageStyles.quickArrow}><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></View>
            </ScalePressable>
          ))}
        </View>
        <CaloraProCard />
        <View style={pageStyles.bottomRows}>
          <BottomRow label="Living Memory" icon="cloud" tint="#c69242" route="/memory" />
          <BottomRow label="Saved meals" icon="coffee" tint={colors.accentForeground} route="/saved-meals" />
          <BottomRow label="Reminders" icon="bell" tint="#f3b33f" route="/profile?tab=you&open=reminders" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  iconBox: { borderRadius: 13, alignItems: "center" as const, justifyContent: "center" as const },
};

function makeStyles(scale: number, colors: ReturnType<typeof useCalora>["colors"], mode: "light" | "dark") {
  const dark = mode === "dark";
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 152, gap: 13 },
    header: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { color: colors.foreground, fontSize: 18 * scale, fontWeight: "800", letterSpacing: -0.6 },
    headerCaption: { color: colors.mutedForeground, fontSize: 14 * scale, marginTop: 1 },
    gear: { height: 42, width: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    cardGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
    fastingCard: { height: 153.97, marginTop: 18, borderRadius: 18, padding: 10, paddingBottom: 42, backgroundColor: dark ? "#0d3b2d" : "#eaf7ee", overflow: "hidden", position: "relative", borderWidth: 1, borderColor: dark ? "#2f715b" : colors.border },
    fastingMainPressable: { flex: 1, marginHorizontal: -2, marginTop: -2, marginBottom: 5, zIndex: 2 },
    fastTopRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 74 },
    fastLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 },
    fastRingOuter: { height: 62, width: 62, flexShrink: 0, borderRadius: 31, backgroundColor: "rgba(255,255,255,.08)", alignItems: "center", justifyContent: "center" },
    fastRing: { height: 52, width: 52, borderRadius: 26, borderWidth: 6, borderLeftColor: dark ? "#456b5f" : colors.border, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-35deg" }] },
    fastCopy: { flex: 1, minWidth: 0, paddingTop: 0 },
    statusPill: { maxWidth: "62%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: dark ? "rgba(69,226,155,.14)" : colors.successTint },
    statusText: { color: colors.accentForeground, fontSize: 11 * scale, fontWeight: "700" },
    fastTitle: { color: colors.foreground, fontSize: 14 * scale, fontWeight: "800" },
    fastMain: { color: colors.foreground, fontSize: 24 * scale, fontWeight: "800", letterSpacing: -1, transform: [{ translateY: -3 }] },
    fastSubtitle: { color: dark ? "#b8d3c8" : colors.mutedForeground, fontSize: 10 * scale, lineHeight: 12 * scale, flexShrink: 1 },
    fastAction: { height: 32, width: 32, flexShrink: 0, borderRadius: 16, backgroundColor: dark ? "rgba(255,255,255,.10)" : colors.card, borderWidth: 1, borderColor: dark ? "rgba(255,255,255,.14)" : colors.border, alignItems: "center", justifyContent: "center" },
    fastingDecor: { position: "absolute", right: -18, bottom: -20, width: 162, height: 116, opacity: dark ? 0.88 : 0.72 },
    fastingImage: { ...StyleSheet.absoluteFillObject },
    decorWave: { position: "absolute", left: -118, bottom: 8, width: 230, height: 44, borderRadius: 80, borderTopWidth: 1, borderTopColor: dark ? "rgba(69,226,155,.35)" : "rgba(36,96,71,.18)", transform: [{ rotate: "-8deg" }] },
    featureRow: { flexDirection: "row", gap: 14 },
    featureCard: { flex: 1, height: 111.77, borderRadius: 16, overflow: "hidden", position: "relative", padding: 9, justifyContent: "flex-start", borderWidth: 1, borderColor: dark ? "rgba(255,255,255,.16)" : colors.border },
    progressCard: { backgroundColor: dark ? "#32170f" : "#f7e9df" },
    learningCard: { backgroundColor: dark ? "#19183f" : "#eeeafd" },
    featureCopy: { position: "absolute", top: 9, right: 9, left: 46, alignItems: "flex-end" },
    featureTitle: { color: dark ? TEXT : colors.foreground, fontSize: 14.5 * scale, fontWeight: "800", textAlign: "right" },
    featureSubtitle: { color: dark ? "#d0d8d4" : colors.mutedForeground, fontSize: 9.5 * scale, lineHeight: 11 * scale, maxWidth: 116, textAlign: "right", marginTop: 2 },
    featureArrow: { position: "absolute", right: 9, bottom: 9, height: 28, width: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: dark ? "rgba(255,255,255,.20)" : colors.card, borderWidth: 1, borderColor: colors.border },
    chartBars: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", gap: 3, alignItems: "flex-end" },
    chartBar: { width: 7, borderRadius: 4, backgroundColor: dark ? ORANGE : colors.primary },
    learningImage: { position: "absolute", right: -16, bottom: -18, width: 108, height: 92, opacity: dark ? 0.9 : 0.72 },
    sectionHeading: { marginTop: 14 },
    sectionTitle: { fontSize: 17 * scale, fontWeight: "800" },
    sectionCaption: { color: colors.mutedForeground, fontSize: 14 * scale, marginTop: 2 },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
    quickGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 17 },
    quickItem: { width: "31.8%", minHeight: 72, borderRadius: 17, backgroundColor: dark ? "#142a24" : colors.card, borderWidth: 1, borderColor: dark ? "#2f5448" : colors.border, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 17, paddingVertical: 7, position: "relative", shadowColor: "#000", shadowOpacity: dark ? 0.16 : 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    quickLabel: { color: colors.foreground, fontSize: 10.5 * scale, lineHeight: 12 * scale, fontWeight: "700", textAlign: "center" },
    quickArrow: { position: "absolute", right: 7, top: 0, bottom: 0, justifyContent: "center" },
    proCard: { minHeight: 76, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: dark ? "#21154d" : "#dceaff", borderWidth: 1, borderColor: dark ? "rgba(193,137,255,.52)" : colors.border, overflow: "hidden", position: "relative" },
    proIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    proCopy: { flex: 1, minWidth: 0 },
    proTitle: { color: dark ? TEXT : colors.foreground, fontSize: 14 * scale, fontWeight: "800" },
    proSubtitle: { color: dark ? MUTED : colors.mutedForeground, fontSize: 10 * scale, marginTop: 3 },
    proImage: { position: "absolute", right: 10, bottom: -15, width: 84, height: 64, opacity: dark ? 0.92 : 0.68 },
    bottomRows: { gap: 10, marginTop: 1 },
    bottomRow: { minHeight: 58, borderRadius: 17, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: dark ? "#142a24" : colors.card, borderWidth: 1, borderColor: dark ? "#2f5448" : colors.border, shadowColor: "#000", shadowOpacity: dark ? 0.14 : 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
    bottomRowLabel: { flex: 1, color: colors.foreground, fontSize: 14 * scale, fontWeight: "800" },
  });
}
