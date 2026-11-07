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
      background: "#fff", foreground: "#17231f", text: "#17231f", card: "#fff", border: "#dfe7e1",
      primary: "#ef6b4f", mutedForeground: "#728078", accent: "#dff2e7", accentForeground: "#246047",
      secondary: "#edf1ed", success: "#5dba7d", successTint: "#e1f4e7", link: "#3677e8",
    },
    fontScale: 1,
    mode: "light" as const,
    profile: { name: "Alex", units: "metric" },
    savedMeals: [],
    fasting: { selectedPlanId: "12:12", activeStartedAt: null as string | null, activePlannedHours: null as number | null, history: [] },
    weights: [] as Array<{ id: string; date: string; kg: number; source: "manual" | "health" }>,
    logs: [] as Array<{ id: string; date: string }>,
  },
}));

vi.mock("react-native", () => {
  const element = (tag: string) => ({ children, onPress, accessibilityLabel, accessibilityRole, style: _style, ...props }: any) => React.createElement(tag, {
    ...props,
    ...(accessibilityLabel ? { "aria-label": accessibilityLabel } : {}),
    ...(accessibilityRole ? { role: accessibilityRole } : {}),
    ...(onPress ? { onClick: onPress } : {}),
  }, children);
  return {
    Pressable: element("button"), ScrollView: element("div"), StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 },
    Text: element("span"), View: element("div"),
  };
});
vi.mock("@expo/vector-icons", () => ({ Feather: () => null }));
vi.mock("expo-router", () => ({ router: harness.router }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/context/CaloraContext", () => ({ useCalora: () => harness.calora }));
vi.mock("@/components/ScalePressable", () => ({ ScalePressable: ({ children, onPress, accessibilityLabel, accessibilityRole }: any) => <button aria-label={accessibilityLabel} onClick={onPress} role={accessibilityRole}>{children}</button> }));

import MoreScreen from "@/app/(tabs)/more";

const source = () => readFileSync(resolve(__dirname, "../../app/(tabs)/more.tsx"), "utf8");

describe("MoreScreen feature hierarchy", () => {
  beforeEach(() => {
    harness.router.push.mockReset();
    harness.calora.fasting.activeStartedAt = null;
    harness.calora.fasting.activePlannedHours = null;
    harness.calora.weights = [];
    harness.calora.logs = [];
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the primary cards and settings destination functional", () => {
    render(<MoreScreen />);
    for (const [label, route] of [["Open Fasting", "/fasting"], ["Open Progress", "/(tabs)/insights"], ["Open Learning", "/learning"]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }
    fireEvent.click(screen.getByRole("button", { name: "Open Settings" }));
    expect(harness.router.push).toHaveBeenLastCalledWith("/settings");
  });

  it("exposes the nine required quick shortcuts in row-major order with distinct destinations", () => {
    render(<MoreScreen />);
    const quickRoutes = [
      ["Open Insights", "/progress-insights"], ["Open Saved recipes", "/saved-recipes"], ["Open Coach", "/coach"],
      ["Open Customize dashboard", "/dashboard-layout"], ["Open Goals", "/profile?tab=you&open=goals"], ["Open Health sync", "/profile?tab=account&open=health"],
      ["Open Hydration", "/hydration"], ["Open My steps", "/steps"], ["Open My progress", "/(tabs)/insights"],
    ] as const;
    for (const [label, route] of quickRoutes) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }
    expect(screen.queryByRole("button", { name: "Open Saved meals" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open Reminders" })).toBeTruthy();
  });

  it("routes the three full-width bottom rows independently from quick access", () => {
    render(<MoreScreen />);
    for (const [label, route] of [["Open Living Memory", "/memory"], ["Open Saved meals", "/saved-meals"], ["Open Reminders", "/profile?tab=you&open=reminders"]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }
  });

  it("keeps live fasting timing and configured pre-start state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));
    harness.calora.fasting.activeStartedAt = "2026-10-29T06:00:00.000Z";
    harness.calora.fasting.activePlannedHours = 12;
    render(<MoreScreen />);
    expect(screen.getByText("06:00 remaining in your 12-hour window")).toBeTruthy();
    expect(screen.queryByText("Window complete — end when ready.")).toBeNull();
  });

  it("uses the configured fasting duration before a window starts and local-day meal fallback", () => {
    render(<MoreScreen />);
    expect(screen.getByText("12:00 fast")).toBeTruthy();
    expect(screen.getByText("12:12 · ready to start")).toBeTruthy();
    expect(source()).toContain("log.date === dateKey()");
    expect(source()).not.toContain("new Date().toISOString().slice(0, 10)");
  });

  it("uses the most recent valid weigh-in and renders its unit once", () => {
    harness.calora.weights = [{ id: "old", date: "2026-10-01", kg: 81, source: "manual" }, { id: "new", date: "2026-10-27", kg: 76, source: "health" }];
    render(<MoreScreen />);
    expect(screen.getByText("76 kg logged")).toBeTruthy();
    expect(screen.queryByText("76 kg kg logged")).toBeNull();
  });

  it("keeps the compact responsive layout and safe bottom inset contracts", () => {
    const text = source();
    expect(text).toContain('quickItem: { width: "31.8%"');
    expect(text).toContain("paddingBottom: 152");
    expect(text).toContain("bottomRows: { gap: 10");
    expect(text).toContain('route: "/progress-insights"');
    expect(text).toContain('route: "/saved-recipes"');
    expect(text).toContain('label="Living Memory"');
    expect(text).toContain('label="Saved meals"');
    expect(text).toContain('label="Reminders"');
    expect(text).toContain('accessibilityLabel="Open Settings"');
  });
});
