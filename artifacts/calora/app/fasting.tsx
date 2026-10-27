import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";
import {
  deriveFastingProgress,
  FASTING_PLANS,
  formatFastingDuration,
  type FastingPlanId,
} from "@/lib/fasting";

function formatClock(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default function FastingScreen() {
  const {
    colors,
    fontScale,
    fasting,
    setFastingPlan,
    startFast,
    endFast,
    notificationPreferences,
  } = useCalora();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = deriveFastingProgress(fasting, now);
  const activePlan =
    FASTING_PLANS.find((plan) => plan.id === fasting.selectedPlanId) ??
    FASTING_PLANS[0]!;
  const completed = useMemo(
    () => fasting.history.slice(0, 4),
    [fasting.history],
  );
  const reminderEnabled = Boolean(
    notificationPreferences.categories.meal?.enabled,
  );
  const styles = makeStyles(colors, fontScale);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        title="Fasting"
        back
        onBack={() => router.back()}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fasting options"
            onPress={() => router.push("/profile")}
            hitSlop={10}
          >
            <Feather name="more-horizontal" size={23} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.ringOuter}>
            <View
              style={[
                styles.ringFill,
                {
                  borderTopColor: colors.success,
                  borderRightColor: colors.success,
                  borderBottomColor:
                    progress.progress > 0.5 ? colors.success : colors.border,
                },
              ]}
            >
              <View style={styles.ringCenter}>
                <View style={styles.flame}>
                  <Feather name="zap" size={18} color="#f08b42" />
                </View>
                <Text style={styles.eyebrow}>
                  {progress.active ? "FASTING" : "READY WHEN YOU ARE"}
                </Text>
                <Text style={styles.timer}>
                  {progress.active
                    ? formatFastingDuration(progress.elapsedMs)
                    : `${activePlan.fastingHours}:00`}
                </Text>
                <Text style={styles.timerCaption}>
                  {progress.active
                    ? `of ${progress.plannedHours} hours`
                    : "selected fasting window"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.statusPill}>
            <Feather
              name={progress.active ? "sun" : "clock"}
              size={14}
              color={colors.success}
            />
            <Text style={styles.statusPillText}>
              {progress.active
                ? progress.remainingMs > 0
                  ? "Your fasting window is active"
                  : "Your planned window is complete"
                : "Start when it feels right for you"}
            </Text>
          </View>
          {progress.active && progress.endsAt ? (
            <View style={styles.timeRow}>
              <View>
                <Text style={styles.timeLabel}>STARTED</Text>
                <Text style={styles.timeValue}>
                  {formatClock(new Date(fasting.activeStartedAt!))}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View>
                <Text style={styles.timeLabel}>ENDS</Text>
                <Text style={styles.timeValue}>
                  {formatClock(new Date(progress.endsAt))}
                </Text>
              </View>
            </View>
          ) : null}
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={progress.active ? "End fast" : "Start fast"}
            style={[styles.primaryButton, progress.active && styles.endButton]}
            onPress={progress.active ? endFast : startFast}
          >
            <Text style={styles.primaryButtonText}>
              {progress.active ? "End fast" : "Start fast"}
            </Text>
            <Feather
              name={progress.active ? "square" : "arrow-right"}
              size={18}
              color="#fff"
            />
          </ScalePressable>
        </View>

        {!progress.active ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose your rhythm</Text>
            <Text style={styles.sectionCaption}>
              A fasting schedule is optional. Pick a window that supports your
              routine.
            </Text>
            <View style={styles.planGrid}>
              {FASTING_PLANS.filter((plan) => plan.id !== "custom").map(
                (plan) => (
                  <Pressable
                    key={plan.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${plan.label} plan`}
                    onPress={() => setFastingPlan(plan.id as FastingPlanId)}
                    style={[
                      styles.planCard,
                      fasting.selectedPlanId === plan.id && styles.planSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.planLabel,
                        fasting.selectedPlanId === plan.id &&
                          styles.planSelectedText,
                      ]}
                    >
                      {plan.label}
                    </Text>
                    <Text
                      style={[
                        styles.planSub,
                        fasting.selectedPlanId === plan.id &&
                          styles.planSelectedText,
                      ]}
                    >
                      {plan.fastingHours} hour fast
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Fasting schedule</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open fasting schedule settings"
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.link}>Manage</Text>
            </Pressable>
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.rowIcon}>
              <Feather name="calendar" size={18} color="#8b5cf6" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{activePlan.label} rhythm</Text>
              <Text style={styles.rowSubtitle}>{activePlan.description}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.rowIcon}>
              <Feather name="bell" size={18} color="#f59e0b" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Meal reminders</Text>
              <Text style={styles.rowSubtitle}>
                {reminderEnabled
                  ? "Using your existing meal reminder settings"
                  : "Off — manage reminders in Settings"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open reminder settings"
              onPress={() => router.push("/profile")}
            >
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Recent fasts</Text>
            <Text style={styles.sectionCaption}>
              {fasting.history.length} completed
            </Text>
          </View>
          {completed.length ? (
            completed.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Feather name="check" size={15} color={colors.success} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    {item.plannedHours}-hour window
                    {item.endedEarly ? " · ended early" : ""}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {new Date(item.endedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {formatFastingDuration(
                      Date.parse(item.endedAt) - Date.parse(item.startedAt),
                    )}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Feather name="clock" size={22} color={colors.muted} />
              <Text style={styles.emptyTitle}>
                Your completed fasts will appear here
              </Text>
              <Text style={styles.emptyCopy}>
                Calora keeps this history on your device and does not make
                fasting a requirement.
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.disclaimer}>
          Fasting tools are for personal routine tracking, not medical advice.
          Check with a qualified clinician if you have a medical condition, are
          pregnant, or have a history of disordered eating.
        </Text>
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
    content: { padding: 20, paddingBottom: 48, gap: 24 },
    hero: {
      borderRadius: 28,
      backgroundColor: colors.card,
      padding: 22,
      alignItems: "center",
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ringOuter: {
      width: 226,
      height: 226,
      borderRadius: 113,
      backgroundColor: "rgba(36, 164, 104, 0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    ringFill: {
      width: 202,
      height: 202,
      borderRadius: 101,
      borderWidth: 10,
      borderLeftColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      transform: [{ rotate: "-42deg" }],
    },
    ringCenter: { alignItems: "center", transform: [{ rotate: "42deg" }] },
    flame: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(240,139,66,0.14)",
      marginBottom: 4,
    },
    eyebrow: {
      color: colors.muted,
      fontWeight: "800",
      fontSize: 10 * scale,
      letterSpacing: 1,
    },
    timer: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 38 * scale,
      marginTop: 3,
    },
    timerCaption: { color: colors.muted, fontSize: 12 * scale },
    statusPill: {
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: "rgba(36,164,104,0.11)",
      borderRadius: 16,
    },
    statusPillText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 12 * scale,
    },
    timeRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 13,
      borderRadius: 16,
    },
    timeDivider: {
      height: 34,
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    timeLabel: {
      color: colors.muted,
      fontWeight: "800",
      fontSize: 10 * scale,
      letterSpacing: 0.7,
      textAlign: "center",
    },
    timeValue: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15 * scale,
      textAlign: "center",
      marginTop: 3,
    },
    primaryButton: {
      width: "100%",
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    endButton: { backgroundColor: "#ef6b4f" },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 15 * scale,
    },
    section: { gap: 10 },
    sectionHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 18 * scale,
    },
    sectionCaption: {
      color: colors.muted,
      fontSize: 12 * scale,
      lineHeight: 18 * scale,
    },
    link: { color: colors.success, fontWeight: "800", fontSize: 13 * scale },
    planGrid: { flexDirection: "row", gap: 9 },
    planCard: {
      flex: 1,
      minHeight: 78,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      backgroundColor: colors.card,
    },
    planSelected: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    planLabel: { color: colors.text, fontSize: 17 * scale, fontWeight: "800" },
    planSub: { color: colors.muted, fontSize: 10 * scale, marginTop: 3 },
    planSelectedText: { color: "#fff" },
    settingsRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
    },
    rowIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    rowCopy: { flex: 1 },
    rowTitle: { color: colors.text, fontWeight: "700", fontSize: 14 * scale },
    rowSubtitle: {
      color: colors.muted,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
      marginTop: 2,
    },
    historyRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      minHeight: 56,
      paddingHorizontal: 3,
    },
    historyIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(36,164,104,0.1)",
    },
    empty: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      borderRadius: 18,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14 * scale,
      textAlign: "center",
    },
    emptyCopy: {
      color: colors.muted,
      fontSize: 12 * scale,
      textAlign: "center",
      lineHeight: 18 * scale,
    },
    disclaimer: {
      color: colors.muted,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
      paddingBottom: 12,
    },
  });
