/**
 * @vitest-environment jsdom
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  router: { push: vi.fn() },
  calora: {
    colors: {
      background: "#fff",
      text: "#17231f",
      card: "#fff",
      border: "#dfe7e1",
      primary: "#ef6b4f",
      mutedForeground: "#728078",
      accent: "#dff2e7",
      secondary: "#edf1ed",
      success: "#5dba7d",
      link: "#3677e8",
    },
    fontScale: 1,
    profile: { name: "Alex", units: "metric" },
    profilePhotoUri: null,
    savedMeals: [],
    fasting: {
      selectedPlanId: "12:12",
      activeStartedAt: null as string | null,
      activePlannedHours: null as number | null,
      history: [],
    },
    weights: [] as Array<{
      id: string;
      date: string;
      kg: number;
      source: "manual" | "health";
    }>,
    logs: [] as Array<{ id: string; date: string }>,
  },
}));

vi.mock("react-native", () => {
  const element =
    (tag: string) =>
    ({
      children,
      onPress,
      accessibilityLabel,
      accessibilityRole,
      style: _style,
      ...props
    }: any) =>
      React.createElement(
        tag,
        {
          ...props,
          ...(accessibilityLabel ? { "aria-label": accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  return {
    Image: ({ source: _source, style: _style, testID, ...props }: any) =>
      React.createElement("img", {
        ...props,
        ...(testID ? { "data-testid": testID } : {}),
      }),
    Pressable: element("button"),
    ScrollView: element("div"),
    StyleSheet: { create: (styles: any) => styles, absoluteFillObject: {} },
    Text: element("span"),
    View: element("div"),
  };
});
vi.mock("@expo/vector-icons", () => ({ Feather: () => null }));
vi.mock("expo-router", () => ({ router: harness.router }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/context/CaloraContext", () => ({ useCalora: () => harness.calora }));
vi.mock("@/components/ProfilePhoto", () => ({
  ProfilePhoto: ({ fallback }: { fallback: React.ReactNode }) => (
    <>{fallback}</>
  ),
}));
vi.mock("@/components/ScalePressable", () => ({
  ScalePressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
  }: any) => (
    <button
      aria-label={accessibilityLabel}
      onClick={onPress}
      role={accessibilityRole}
    >
      {children}
    </button>
  ),
}));

import MoreScreen from "@/app/(tabs)/more";

describe("MoreScreen feature hierarchy", () => {
  beforeEach(() => {
    harness.router.push.mockReset();
    harness.calora.fasting.activeStartedAt = null;
    harness.calora.fasting.activePlannedHours = null;
    harness.calora.weights = [];
    harness.calora.logs = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the three feature cards as the unique Fasting, Progress, and Learning routes", () => {
    render(<MoreScreen />);

    expect(screen.queryAllByTestId("more-editorial-photo")).toHaveLength(0);
    const primaryRoutes = [
      ["Open Fasting", "/fasting"],
      ["Open Progress", "/(tabs)/insights"],
      ["Open Learning", "/learning"],
    ] as const;
    for (const [label, route] of primaryRoutes) {
      expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }

    fireEvent.click(screen.getByRole("button", { name: "Open Settings" }));
    expect(harness.router.push).toHaveBeenLastCalledWith("/settings");

    fireEvent.click(screen.getByRole("button", { name: "Open Reminders" }));
    expect(harness.router.push).toHaveBeenLastCalledWith("/profile?tab=you&open=reminders");
  });

  it("keeps the three primary cards photo-free and typography compact", () => {
    const source = readFileSync(
      resolve(__dirname, "../../app/(tabs)/more.tsx"),
      "utf8",
    );

    expect(source).not.toContain("const moreEditorialImages");
    expect(source).not.toContain('testID="more-editorial-photo"');
    expect(source).not.toContain("fasting-basics-and-boundaries.jpg");
    expect(source).not.toContain("calora-insights-header.jpg");
    expect(source).not.toContain("balanced-plate-basics.jpg");
    expect(source).not.toMatch(/https?:\/\//i);
    expect(source).toContain("fastingCard: { height: 153.97");
    expect(source).toContain("marginTop: 18, borderRadius: 18");
    expect(source).toContain("transform: [{ translateY: -3 }]");
    expect(source).toContain('backgroundColor: colors.card, overflow: "hidden"');
    expect(source).toContain('fastTitle: { color: colors.foreground');
    expect(source).toContain('backgroundColor: dark ? "rgba(69,226,155,.14)" : colors.successTint');
    expect(source).toContain('backgroundColor: dark ? "rgba(255,255,255,.10)" : colors.card');
    expect(source).toContain("fastTopRow: { flexDirection: \"row\", alignItems: \"center\"");
    expect(source).toContain("fastRingOuter: { height: 62, width: 62");
    expect(source).toContain("fastCopy: { flex: 1, minWidth: 0");
    expect(source).toContain("fastLabelRow: { flexDirection: \"row\", alignItems: \"center\", justifyContent: \"space-between\"");
    expect(source).toContain("numberOfLines={1} style={styles.fastSubtitle}");
    expect(source).toContain("Fasting in progress");
    expect(source).toContain("featureCard: { flex: 1, height: 111.77");
    expect(source).toContain("featureCopy: { position: \"absolute\", top: 9, right: 9");
    expect(source).toContain('progressCard: { backgroundColor: dark ? "#32170f" : "#f7e9df" }');
    expect(source).toContain('learningCard: { backgroundColor: dark ? "#19183f" : "#eeeafd" }');
    expect(source).toContain('featureTitle: { color: dark ? TEXT : colors.foreground');
    expect(source).toContain('backgroundColor: dark ? "rgba(255,255,255,.20)" : colors.card');
    expect(source).toContain('chartBar: { width: 7, borderRadius: 4, backgroundColor: dark ? ORANGE : colors.primary }');
    expect(source).toContain('safe: { flex: 1, backgroundColor: colors.background }');
    expect(source).toContain('header: { paddingHorizontal: 12');
    expect(source).toContain('backgroundColor: colors.background }');
    expect(source).toContain('gear: { height: 42, width: 42');
    expect(source).toContain('backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border');
    expect(source).toContain('quickItem: { width: "33%", minHeight: 62.4');
    expect(source).toContain('backgroundColor: colors.card, borderWidth: 1');
    expect(source).toContain('IconBox color={item.tint}');
    expect(source).toContain('quickLabel: { color: colors.foreground');
    expect(source).toContain('icon={item.icon} size={30}');
    expect(source).toContain('name="chevron-right" size={18}');
    expect(source).toContain('quickArrow: { position: "absolute", right: 8');
    expect(source).toContain('name="settings" size={15}');
    expect(source).toContain('accessibilityLabel="Open Settings"');
    expect(source).not.toContain("const SURFACE");
    expect(source).not.toContain("const BORDER");
    expect(source).toContain('color: colors.foreground');
    expect(source).toContain('style={[styles.sectionTitle, { color: colors.foreground }]}');
    expect(source).toContain('Guides, Recipes, Tips..');
    expect(source).toContain('headerTitle: { color: colors.foreground, fontSize: 18 * scale');
    expect(source).toContain('sectionTitle: { fontSize: 17 * scale');
    expect(source).toContain("Shortcuts to the things you use most");
    expect(source).toContain('sectionCaption, { color: colors.mutedForeground }');
    expect(source).not.toContain("function MiniStat");
    expect(source).not.toContain("Current plan");
    expect(source).not.toContain("Zero completed");
    expect(source).not.toContain('caption="Off"');
    expect(source).not.toContain("Set your rhythm");
    expect(source).not.toContain("choose your duration");
    expect(source).toContain("fastingPlanLabel(fasting)");
    expect(source).toContain("`${progress.plannedHours}:00 fast`");
    expect(source).toContain("fontSize: 14 * scale");
    expect(source).toContain("sectionHeading: { marginTop: 14 }");
    expect(source).not.toContain("lowerPanel:");
  });

  it("shows the remaining fasting duration while an active window is in progress", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));
    harness.calora.fasting.activeStartedAt = "2026-10-29T06:00:00.000Z";
    harness.calora.fasting.activePlannedHours = 12;

    render(<MoreScreen />);

    expect(
      screen.getByText("06:00 remaining in your 12-hour window"),
    ).toBeTruthy();
    expect(screen.queryByText("Window complete — end when ready.")).toBeNull();
  });

  it("shows the configured fasting duration before a window starts", () => {
    render(<MoreScreen />);

    expect(screen.getByText("12:00 fast")).toBeTruthy();
    expect(screen.getByText("12:12 · ready to start")).toBeTruthy();
    expect(screen.queryByText("Set your rhythm")).toBeNull();
  });

  it("keeps supporting destinations compact and does not duplicate primary routes", () => {
    render(<MoreScreen />);

    const quickRoutes = [
      ["Open Saved meals", "/saved-meals"],
      ["Open Coach", "/coach"],
      ["Open Reminders", "/profile?tab=you&open=reminders"],
      ["Open Customize Today", "/dashboard-layout"],
      ["Open Goals", "/profile?tab=you&open=goals"],
      ["Open Health sync", "/profile?tab=account&open=health"],
      ["Open Recipes", "/recipes"],
    ] as const;
    for (const [label, route] of quickRoutes) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }

    expect(screen.getByRole("button", { name: "Open Settings" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit quick access" })).toBeNull();
    expect(screen.queryByText("Your tools, preferences, and progress in one place")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(14);
    expect(screen.getByRole("button", { name: "Open Calora Pro" })).toBeTruthy();
    expect(screen.queryByText("Your Calora")).toBeNull();
  });

  it("uses the most recent valid weigh-in and renders its unit once", () => {
    harness.calora.weights = [
      { id: "old-manual", date: "2026-10-01", kg: 81, source: "manual" },
      { id: "new-health", date: "2026-10-27", kg: 76, source: "health" },
    ];

    render(<MoreScreen />);

    expect(screen.getByText("76 kg logged")).toBeTruthy();
    expect(screen.queryByText("76 kg kg logged")).toBeNull();
  });

  it("uses Calora's local-day convention for the meal-count fallback", () => {
    const source = readFileSync(
      resolve(__dirname, "../../app/(tabs)/more.tsx"),
      "utf8",
    );

    expect(source).toContain('width: "33%"');
    expect(source).toContain("log.date === dateKey()");
    expect(source).not.toContain("new Date().toISOString().slice(0, 10)");
  });
});
