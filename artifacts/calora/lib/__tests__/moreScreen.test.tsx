/**
 * @vitest-environment jsdom
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      activeStartedAt: null,
      activePlannedHours: null,
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
    harness.calora.weights = [];
    harness.calora.logs = [];
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
    expect(source).toContain("fastingCard: { minHeight: 216");
    const miniStatSource = source.slice(source.indexOf("function MiniStat"), source.indexOf("function ProgressCard"));
    expect(miniStatSource).not.toContain('name="chevron-right"');
    expect(source).toContain("fontSize: 15 * scale");
  });

  it("keeps supporting destinations compact and does not duplicate primary routes", () => {
    render(<MoreScreen />);

    const quickRoutes = [
      ["Open Saved meals", "/saved-meals"],
      ["Open Coach", "/coach"],
      ["Open Reminders", "/profile?tab=you&open=reminders"],
      ["Open Calora Pro", "/profile?tab=membership"],
      ["Open Goals", "/profile?tab=you&open=goals"],
      ["Open Health sync", "/profile?tab=account&open=health"],
      ["Open Recipes", "/recipes"],
    ] as const;
    for (const [label, route] of quickRoutes) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(harness.router.push).toHaveBeenLastCalledWith(route);
    }

    expect(screen.queryByRole("button", { name: "Open profile" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit quick access" })).toBeNull();
    expect(screen.queryByText("Your tools, preferences, and progress in one place")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(16);
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

    expect(source).toContain('width: "31.5%"');
    expect(source).toContain("log.date === dateKey()");
    expect(source).not.toContain("new Date().toISOString().slice(0, 10)");
  });
});
