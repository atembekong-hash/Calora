import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { addDays, dateFromKey, dateKey, type DateRange } from "@/lib/dates";

type Colors = {
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  muted: string;
  border: string;
  primary: string;
  primaryForeground: string;
};

type Preset = { key: string; label: string; days: number };
const PRESETS: Preset[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "14 days", days: 14 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "6m", label: "6 months", days: 182 },
  { key: "1y", label: "1 year", days: 365 },
];

function monthKey(key: string): string {
  return key.slice(0, 7);
}
function shiftMonth(key: string, amount: number): string {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
function monthDays(key: string): Array<string | null> {
  const [year, month] = key.split("-").map(Number);
  const offset = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  const cells = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= count
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  });
}
function prettyDate(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateFromKey(key));
}
function prettyRange(range: DateRange): string {
  return range.start === range.end
    ? prettyDate(range.end)
    : `${prettyDate(range.start)} – ${prettyDate(range.end)}`;
}

export function rangeLabel(range: DateRange, today = dateKey()): string {
  const days =
    Math.round(
      (dateFromKey(today).getTime() - dateFromKey(range.start).getTime()) /
        86400000,
    ) + 1;
  const preset = PRESETS.find(
    (item) => item.days === days && range.end === today,
  );
  return preset?.label ?? prettyRange(range);
}

export function GraphDateRangePicker({
  range,
  colors,
  onChange,
}: {
  range: DateRange;
  colors: Colors;
  onChange: (range: DateRange) => void;
}) {
  const today = dateKey();
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(monthKey(range.end));
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);
  const draftRange = useMemo(
    () => ({ start: draftStart, end: draftEnd }),
    [draftEnd, draftStart],
  );
  const days = monthDays(month);

  const open = () => {
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setMonth(monthKey(range.end));
    setVisible(true);
  };
  const chooseDay = (day: string) => {
    if (day > today) return;
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day);
      setDraftEnd("");
      return;
    }
    if (day < draftStart) {
      setDraftStart(day);
      setDraftEnd(draftStart);
    } else {
      setDraftEnd(day);
    }
  };
  const apply = () => {
    if (!draftStart) return;
    const end = draftEnd || draftStart;
    onChange({
      start: draftStart <= end ? draftStart : end,
      end: draftStart <= end ? end : draftStart,
    });
    setVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose graph date range, ${prettyRange(range)}`}
        testID="graph-date-range-button"
        onPress={open}
        style={[
          styles.trigger,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Feather name="calendar" size={15} color={colors.primary} />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.triggerText, { color: colors.foreground }]}
        >
          {rangeLabel(range, today)}
        </Text>
        <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
      </Pressable>
      <BottomSheet
        visible={visible}
        onRequestClose={() => setVisible(false)}

        sheetStyle={[styles.sheet, { backgroundColor: colors.background }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Choose graph period
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Select a preset or any custom date range.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close graph date range"
              onPress={() => setVisible(false)}
              style={[styles.close, { backgroundColor: colors.muted }]}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const active =
                preset.days ===
                  Math.round(
                    (dateFromKey(today).getTime() -
                      dateFromKey(range.start).getTime()) /
                      86400000,
                  ) +
                    1 && range.end === today;
              return (
                <Pressable
                  key={preset.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  testID={`graph-range-${preset.key}`}
                  onPress={() => {
                    onChange({
                      start: addDays(today, -(preset.days - 1)),
                      end: today,
                    });
                    setVisible(false);
                  }}
                  style={[
                    styles.preset,
                    {
                      backgroundColor: active ? colors.primary : colors.muted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        color: active
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityLabel="Previous graph calendar month"
              onPress={() => setMonth(shiftMonth(month, -1))}
              style={[styles.monthButton, { backgroundColor: colors.muted }]}
            >
              <Feather
                name="chevron-left"
                size={17}
                color={colors.foreground}
              />
            </Pressable>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(dateFromKey(`${month}-01`))}
            </Text>
            <Pressable
              accessibilityLabel="Next graph calendar month"
              onPress={() => setMonth(shiftMonth(month, 1))}
              style={[styles.monthButton, { backgroundColor: colors.muted }]}
            >
              <Feather
                name="chevron-right"
                size={17}
                color={colors.foreground}
              />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <Text
                key={`${day}-${i}`}
                style={[styles.weekday, { color: colors.mutedForeground }]}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day)
                return <View key={`empty-${index}`} style={styles.day} />;
              const selected = day === draftStart || day === draftEnd;
              const inRange =
                draftStart && draftEnd && day > draftStart && day < draftEnd;
              const disabled = day > today;
              return (
                <Pressable
                  key={day}
                  accessibilityLabel={`Select ${prettyDate(day)}`}
                  testID={`graph-calendar-day-${day}`}
                  disabled={disabled}
                  onPress={() => chooseDay(day)}
                  style={[
                    styles.day,
                    selected && { backgroundColor: colors.primary },
                    inRange && { backgroundColor: colors.muted },
                    disabled && { opacity: 0.3 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: selected
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {Number(day.slice(-2))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.selection, { color: colors.mutedForeground }]}>
            {draftStart
              ? draftEnd
                ? prettyRange(draftRange)
                : `${prettyDate(draftStart)} · choose an end date`
              : "Choose a start date"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply graph date range"
            testID="apply-graph-date-range"
            disabled={!draftStart}
            onPress={apply}
            style={[
              styles.apply,
              {
                backgroundColor: colors.primary,
                opacity: draftStart ? 1 : 0.5,
              },
            ]}
          >
            <Text
              style={[styles.applyText, { color: colors.primaryForeground }]}
            >
              Apply range
            </Text>
          </Pressable>
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 1,
    maxWidth: "100%",
  },
  triggerText: { flexShrink: 1, fontSize: 12, fontWeight: "700" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: { padding: 18, paddingBottom: 30 },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9da3ad",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 13 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  preset: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  presetText: { fontSize: 12, fontWeight: "700" },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 15, fontWeight: "800" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  dayText: { fontSize: 13, fontWeight: "700" },
  selection: { textAlign: "center", marginVertical: 14, fontSize: 13 },
  apply: { alignItems: "center", borderRadius: 14, paddingVertical: 13 },
  applyText: { fontSize: 14, fontWeight: "800" },
});
