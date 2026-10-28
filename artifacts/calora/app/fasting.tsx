import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";
import {
  clampFastingHours,
  deriveFastingCalendar,
  deriveFastingHistorySummary,
  deriveFastingProgress,
  FASTING_PLANS,
  fastingHistoryInsight,
  fastingHoursFor,
  fastingPlanLabel,
  formatFastingDuration,
  formatFastingHours,
  isFastingTimerEligible,
  type FastingPlanId,
} from "@/lib/fasting";

function formatClock(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function trendLabel(
  trend: ReturnType<typeof deriveFastingHistorySummary>["trend"],
): string {
  switch (trend) {
    case "more":
      return "More windows than the prior 7 days";
    case "fewer":
      return "Fewer windows than the prior 7 days";
    case "steady":
      return "Similar to the prior 7 days";
    case "new":
      return "First recorded week";
    default:
      return "History will appear as you use this optional tracker";
  }
}

export default function FastingScreen() {
  const {
    colors,
    fontScale,
    profile,
    fasting,
    setFastingPlan,
    startFast,
    endFast,
    notificationPreferences,
  } = useCalora();
  const [now, setNow] = useState(() => new Date());
  const [customHoursInput, setCustomHoursInput] = useState(() =>
    String(fasting.customFastingHours ?? 12),
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (fasting.selectedPlanId === "custom") {
      setCustomHoursInput(String(fastingHoursFor(fasting)));
    }
  }, [fasting.customFastingHours, fasting.selectedPlanId]);

  const progress = deriveFastingProgress(fasting, now);
  const selectedHours = fastingHoursFor(fasting);
  const completed = useMemo(
    () => fasting.history.slice(0, 4),
    [fasting.history],
  );
  const summary = useMemo(
    () => deriveFastingHistorySummary(fasting.history, now),
    [fasting.history, now],
  );
  const calendar = useMemo(
    () => deriveFastingCalendar(fasting.history, now),
    [fasting.history, now],
  );
  const remindersEnabled = Boolean(
    notificationPreferences.categories.meal?.enabled,
  );
  const targetComplete = progress.active && progress.remainingMs === 0;
  const styles = makeStyles(colors, fontScale);

  const choosePlan = (planId: FastingPlanId) => {
    if (planId === "custom") {
      const hours = fasting.customFastingHours ?? 12;
      setCustomHoursInput(String(hours));
      setFastingPlan("custom", hours);
      return;
    }
    setFastingPlan(planId);
  };

  const saveCustomPlan = () => {
    const hours = clampFastingHours(customHoursInput, selectedHours);
    setCustomHoursInput(String(hours));
    setFastingPlan("custom", hours);
  };

  const adjustCustomPlan = (delta: number) => {
    const hours = clampFastingHours(selectedHours + delta);
    setCustomHoursInput(String(hours));
    setFastingPlan("custom", hours);
  };

  const requestStart = () => {
    if (!isFastingTimerEligible(profile?.age)) {
      Alert.alert(
        "Fasting tracker is for adults",
        "Calora keeps this optional timer unavailable for people under 18. Talk with a parent, guardian, or qualified health professional before changing eating routines.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Read safety guidance",
            onPress: () =>
              router.push({
                pathname: "/learning/[lessonId]",
                params: { lessonId: "fasting-basics-and-boundaries" },
              } as never),
          },
        ],
      );
      return;
    }
    Alert.alert(
      "Start optional fasting window?",
      `Calora will record a ${formatFastingHours(selectedHours)} time-based window on this device. You can end it whenever you choose.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Start window", onPress: startFast },
      ],
    );
  };

  const requestEnd = () => {
    Alert.alert(
      targetComplete ? "Save completed window?" : "End this window early?",
      targetComplete
        ? "Your selected time target is complete. Save it to your local history?"
        : "This will stop the current window and save the elapsed time to your local history.",
      [
        { text: "Keep tracking", style: "cancel" },
        {
          text: targetComplete ? "Save to history" : "End and save",
          style: targetComplete ? "default" : "destructive",
          onPress: endFast,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        title="Fasting"
        back
        onBack={() => router.back()}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open fasting options"
            accessibilityHint="Opens your profile settings"
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
                  borderRightColor:
                    progress.progress > 0.25 ? colors.success : colors.border,
                  borderBottomColor:
                    progress.progress > 0.5 ? colors.success : colors.border,
                },
              ]}
            >
              <View style={styles.ringCenter}>
                <View style={styles.flame}>
                  <Feather name="clock" size={18} color={colors.warning} />
                </View>
                <Text style={styles.eyebrow}>
                  {targetComplete
                    ? "TARGET COMPLETE"
                    : progress.active
                      ? "WINDOW IN PROGRESS"
                      : "READY WHEN YOU ARE"}
                </Text>
                <Text style={styles.timer} accessibilityLiveRegion="polite">
                  {progress.active
                    ? formatFastingDuration(progress.elapsedMs)
                    : formatFastingDuration(selectedHours * 60 * 60 * 1_000)}
                </Text>
                <Text style={styles.timerCaption}>
                  {progress.active
                    ? targetComplete
                      ? `${formatFastingHours(progress.plannedHours)} target reached`
                      : `${formatFastingDuration(progress.remainingMs)} remaining`
                    : `${formatFastingHours(selectedHours)} selected window`}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[styles.statusPill, targetComplete && styles.completePill]}
          >
            <Feather
              name={
                targetComplete ? "check" : progress.active ? "sun" : "heart"
              }
              size={14}
              color={colors.successForeground}
            />
            <Text style={styles.statusPillText}>
              {targetComplete
                ? "Your selected time target is complete"
                : progress.active
                  ? "Your optional window is active"
                  : "Start when it feels right for you"}
            </Text>
          </View>
          {progress.active && progress.endsAt ? (
            <View style={styles.timeRow}>
              <View style={styles.timeCell}>
                <Text style={styles.timeLabel}>STARTED</Text>
                <Text style={styles.timeValue}>
                  {formatClock(new Date(fasting.activeStartedAt!))}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeCell}>
                <Text style={styles.timeLabel}>TARGET TIME</Text>
                <Text style={styles.timeValue}>
                  {formatClock(new Date(progress.endsAt))}
                </Text>
              </View>
            </View>
          ) : null}
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={
              progress.active
                ? targetComplete
                  ? "Save completed fasting window"
                  : "End fasting window early"
                : "Start fasting window"
            }
            accessibilityHint={
              progress.active
                ? "Asks before saving this window to your on-device history"
                : "Asks before starting the selected optional time window"
            }
            style={[styles.primaryButton, progress.active && styles.endButton]}
            onPress={progress.active ? requestEnd : requestStart}
          >
            <Text style={styles.primaryButtonText}>
              {progress.active
                ? targetComplete
                  ? "Save completed window"
                  : "End window"
                : "Start window"}
            </Text>
            <Feather
              name={progress.active ? "square" : "arrow-right"}
              size={18}
              color={colors.onHero}
            />
          </ScalePressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Choose your rhythm</Text>
            <Text style={styles.sectionCaption}>
              {fastingPlanLabel(fasting)}
            </Text>
          </View>
          <Text style={styles.sectionCaption}>
            Fasting is optional. Choose a time-based routine that fits your day,
            or skip it entirely.
          </Text>
          {progress.active ? (
            <Text style={styles.selectionNotice}>
              Finish or end the current window before changing your next rhythm.
            </Text>
          ) : null}
          <View style={styles.planGrid}>
            {FASTING_PLANS.map((plan) => {
              const selected = fasting.selectedPlanId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${plan.label} plan`}
                  accessibilityHint={
                    progress.active
                      ? "Unavailable while a fasting window is active"
                      : plan.id === "custom"
                        ? "Opens the custom duration editor below"
                        : plan.description
                  }
                  accessibilityState={{ selected, disabled: progress.active }}
                  disabled={progress.active}
                  onPress={() => choosePlan(plan.id)}
                  style={[
                    styles.planCard,
                    selected && styles.planSelected,
                    progress.active && styles.planDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.planLabel,
                      selected && styles.planSelectedText,
                    ]}
                  >
                    {plan.label}
                  </Text>
                  <Text
                    style={[
                      styles.planSub,
                      selected && styles.planSelectedText,
                    ]}
                  >
                    {plan.id === "custom" && selected
                      ? formatFastingHours(selectedHours)
                      : `${plan.fastingHours} hour fast`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fasting.selectedPlanId === "custom" ? (
            <View style={styles.customEditor}>
              <View style={styles.customEditorHeading}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>Custom fasting duration</Text>
                  <Text style={styles.rowSubtitle}>
                    Choose 10 to 24 hours in half-hour steps. This only changes
                    your selected timer.
                  </Text>
                </View>
                <Text style={styles.customValue}>
                  {formatFastingHours(selectedHours)}
                </Text>
              </View>
              <View style={styles.customControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease custom fasting duration by thirty minutes"
                  accessibilityHint="Minimum is 10 hours"
                  disabled={progress.active || selectedHours <= 10}
                  onPress={() => adjustCustomPlan(-0.5)}
                  style={styles.durationButton}
                >
                  <Feather name="minus" size={19} color={colors.text} />
                </Pressable>
                <View style={styles.durationInputWrap}>
                  <TextInput
                    testID="fasting-custom-hours-input"
                    accessibilityLabel="Custom fasting duration in hours"
                    accessibilityHint="Enter a number from 10 to 24. Half-hour increments are used."
                    accessibilityValue={{
                      text: `${clampFastingHours(customHoursInput, selectedHours)} hours`,
                    }}
                    editable={!progress.active}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    maxLength={4}
                    selectTextOnFocus
                    value={customHoursInput}
                    onChangeText={setCustomHoursInput}
                    onEndEditing={saveCustomPlan}
                    style={styles.durationInput}
                  />
                  <Text style={styles.durationUnit}>hours</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase custom fasting duration by thirty minutes"
                  accessibilityHint="Maximum is 24 hours"
                  disabled={progress.active || selectedHours >= 24}
                  onPress={() => adjustCustomPlan(0.5)}
                  style={styles.durationButton}
                >
                  <Feather name="plus" size={19} color={colors.text} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save custom fasting duration"
                accessibilityHint="Saves your custom time window"
                disabled={progress.active}
                onPress={saveCustomPlan}
                style={styles.saveCustomButton}
              >
                <Text style={styles.saveCustomButtonText}>
                  Save custom rhythm
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Your local history</Text>
            <Text style={styles.sectionCaption}>
              {summary.completedCount} completed
            </Text>
          </View>
          <Text style={styles.sectionCaption}>
            {fastingHistoryInsight(summary)}
          </Text>
          <View
            testID="fasting-calendar"
            accessibilityLabel="Completed fasting windows across the last 7 days"
            style={styles.calendar}
          >
            {calendar.map((day) => (
              <View
                key={day.date}
                accessibilityLabel={`${day.weekdayLabel} ${day.dayNumber}: ${day.completedCount} completed fasting ${day.completedCount === 1 ? "window" : "windows"}`}
                style={styles.calendarDay}
              >
                <Text style={styles.calendarWeekday}>{day.weekdayLabel}</Text>
                <View
                  style={[
                    styles.calendarDate,
                    day.completedCount > 0 && styles.calendarDateComplete,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarNumber,
                      day.completedCount > 0 && styles.calendarNumberComplete,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
                <Text style={styles.calendarCount}>
                  {day.completedCount > 0 ? day.completedCount : "–"}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.trendCard}>
            <View style={styles.rowIcon}>
              <Feather name="bar-chart-2" size={18} color={colors.success} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>7-day routine view</Text>
              <Text style={styles.rowSubtitle}>
                {trendLabel(summary.trend)}
              </Text>
              {summary.recentAverageDurationMs !== null ? (
                <Text style={styles.trendDetail}>
                  Average recorded duration:{" "}
                  {formatFastingDuration(summary.recentAverageDurationMs)}
                </Text>
              ) : null}
            </View>
          </View>
          {completed.length ? (
            <View style={styles.historyList}>
              {completed.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Feather
                      name="check"
                      size={15}
                      color={colors.successForeground}
                    />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>
                      {formatFastingHours(item.plannedHours)} window
                      {item.endedEarly ? " · ended early" : ""}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      {formatShortDate(item.endedAt)} ·{" "}
                      {formatFastingDuration(
                        Date.parse(item.endedAt) - Date.parse(item.startedAt),
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="clock" size={22} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>
                Your completed windows will appear here
              </Text>
              <Text style={styles.emptyCopy}>
                Calora keeps this optional history on your device. It is not a
                score or a requirement.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support your routine</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open fasting learning guide"
            accessibilityHint="Opens Calora's fasting patterns lesson"
            onPress={() =>
              router.push({
                pathname: "/learning/[lessonId]",
                params: { lessonId: "fasting-basics-and-boundaries" },
              } as never)
            }
            style={styles.settingsRow}
          >
            <View style={styles.rowIcon}>
              <Feather name="book-open" size={18} color={colors.link} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Understand fasting patterns</Text>
              <Text style={styles.rowSubtitle}>
                Explore the optional guide and its safety notes.
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open meal reminder settings"
            accessibilityHint="Opens your existing reminder settings"
            onPress={() => router.push("/profile?tab=you&open=reminders")}
            style={styles.settingsRow}
          >
            <View style={styles.rowIcon}>
              <Feather name="bell" size={18} color={colors.warning} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Meal reminders</Text>
              <Text style={styles.rowSubtitle}>
                {remindersEnabled
                  ? "Using your existing meal reminder settings"
                  : "Off — manage your existing reminders in Settings"}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        <View style={styles.safetyCard}>
          <Feather name="shield" size={18} color={colors.warning} />
          <View style={styles.rowCopy}>
            <Text style={styles.safetyTitle}>
              A personal routine tool, not medical advice
            </Text>
            <Text style={styles.safetyCopy}>
              Fasting is optional and not right for everyone. Stop if it does
              not feel right, and check with a qualified clinician before
              fasting if you have a medical condition, are pregnant or
              breastfeeding, take medication that affects meals, or have a
              history of disordered eating.
            </Text>
          </View>
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
      backgroundColor: colors.warningTint,
      marginBottom: 4,
    },
    eyebrow: {
      color: colors.mutedForeground,
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
    timerCaption: { color: colors.mutedForeground, fontSize: 12 * scale },
    statusPill: {
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.successTint,
      borderRadius: 16,
    },
    completePill: { borderWidth: 1, borderColor: colors.success },
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
    timeCell: { flex: 1 },
    timeDivider: {
      height: 34,
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    timeLabel: {
      color: colors.mutedForeground,
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
      backgroundColor: colors.hero,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    endButton: { backgroundColor: colors.primary },
    primaryButtonText: {
      color: colors.onHero,
      fontWeight: "800",
      fontSize: 15 * scale,
    },
    section: { gap: 10 },
    sectionHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 18 * scale,
      flexShrink: 1,
    },
    sectionCaption: {
      color: colors.mutedForeground,
      fontSize: 12 * scale,
      lineHeight: 18 * scale,
      flexShrink: 1,
    },
    selectionNotice: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
      backgroundColor: colors.warningTint,
      padding: 10,
      borderRadius: 12,
    },
    planGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    planCard: {
      width: "48.6%",
      minHeight: 78,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      backgroundColor: colors.card,
      paddingHorizontal: 8,
    },
    planSelected: { backgroundColor: colors.hero, borderColor: colors.success },
    planDisabled: { opacity: 0.55 },
    planLabel: { color: colors.text, fontSize: 17 * scale, fontWeight: "800" },
    planSub: {
      color: colors.mutedForeground,
      fontSize: 10 * scale,
      marginTop: 3,
      textAlign: "center",
    },
    planSelectedText: { color: colors.onHero },
    customEditor: {
      gap: 12,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    customEditorHeading: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    customValue: {
      color: colors.success,
      fontWeight: "800",
      fontSize: 13 * scale,
    },
    customControls: { flexDirection: "row", gap: 10, alignItems: "center" },
    durationButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    durationInputWrap: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
    },
    durationInput: {
      flex: 1,
      color: colors.text,
      fontWeight: "800",
      fontSize: 16 * scale,
      paddingVertical: 8,
    },
    durationUnit: { color: colors.mutedForeground, fontSize: 12 * scale },
    saveCustomButton: {
      minHeight: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.successTint,
    },
    saveCustomButtonText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 13 * scale,
    },
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
    trendCard: {
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
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 16 * scale,
      marginTop: 2,
    },
    trendDetail: {
      color: colors.text,
      fontSize: 11 * scale,
      fontWeight: "700",
      marginTop: 5,
    },
    calendar: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderColor: colors.border,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    calendarDay: { flex: 1, alignItems: "center", gap: 5 },
    calendarWeekday: {
      color: colors.mutedForeground,
      fontWeight: "700",
      fontSize: 10 * scale,
    },
    calendarDate: {
      width: 29,
      height: 29,
      borderRadius: 14.5,
      alignItems: "center",
      justifyContent: "center",
    },
    calendarDateComplete: { backgroundColor: colors.success },
    calendarNumber: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 12 * scale,
    },
    calendarNumberComplete: { color: colors.successForeground },
    calendarCount: { color: colors.mutedForeground, fontSize: 10 * scale },
    historyList: { gap: 4 },
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
      color: colors.mutedForeground,
      fontSize: 12 * scale,
      textAlign: "center",
      lineHeight: 18 * scale,
    },
    safetyCard: {
      flexDirection: "row",
      gap: 12,
      padding: 15,
      borderRadius: 18,
      backgroundColor: colors.warningTint,
      borderWidth: 1,
      borderColor: colors.border,
    },
    safetyTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 13 * scale,
    },
    safetyCopy: {
      color: colors.mutedForeground,
      fontSize: 11 * scale,
      lineHeight: 17 * scale,
      marginTop: 4,
    },
  });
