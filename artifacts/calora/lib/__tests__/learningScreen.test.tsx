/**
 * @vitest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  router: { push: vi.fn() },
  colors: {
    background: "#fff",
    foreground: "#17231f",
    card: "#fff",
    border: "#dfe7e1",
    primary: "#ef6b4f",
    primaryForeground: "#fff",
    muted: "#edf1ed",
    mutedForeground: "#728078",
    accent: "#dff2e7",
    accentForeground: "#246047",
    hero: "#143f34",
    heroMuted: "#9dd7bd",
    onHero: "#f7fff9",
    success: "#5dba7d",
    warning: "#e5ad55",
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
      accessibilityState,
      style: _style,
      ...props
    }: any) =>
      React.createElement(
        tag,
        {
          ...props,
          ...(accessibilityLabel ? { "aria-label": accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
          ...(accessibilityState?.selected !== undefined
            ? { "aria-selected": accessibilityState.selected }
            : {}),
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  return {
    Modal: ({ visible, children }: any) =>
      visible ? React.createElement("div", { role: "dialog" }, children) : null,
    Pressable: element("button"),
    ScrollView: element("div"),
    StyleSheet: {
      create: (styles: any) => styles,
      absoluteFillObject: {},
      hairlineWidth: 1,
    },
    Text: element("span"),
    TextInput: ({
      onChangeText,
      accessibilityLabel,
      style: _style,
      ...props
    }: any) =>
      React.createElement("input", {
        ...props,
        "aria-label": accessibilityLabel,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeText(event.target.value),
      }),
    View: element("div"),
  };
});
vi.mock("@expo/vector-icons", () => ({ Feather: () => null }));
vi.mock("expo-router", () => ({ router: harness.router }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("@/context/CaloraContext", () => ({
  useCalora: () => ({ colors: harness.colors, fontScale: 1 }),
}));
vi.mock("@/components/AppChrome", () => ({
  AppHeader: ({ title }: { title: string }) => <header>{title}</header>,
}));
vi.mock("@/components/ScalePressable", () => ({
  ScalePressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    ...props
  }: any) => (
    <button
      {...props}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected}
      onClick={onPress}
      role={accessibilityRole}
    >
      {children}
    </button>
  ),
}));

import LearningScreen from "@/app/learning";

describe("LearningScreen", () => {
  beforeEach(() => {
    harness.router.push.mockReset();
  });

  it("filters original lesson content by topic and search query", () => {
    render(<LearningScreen />);

    expect(screen.getByText("Build a balanced plate")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("tab", { name: "Fasting learning topic" }),
    );
    expect(screen.getByText("Understand fasting patterns")).toBeTruthy();
    expect(screen.queryByText("Build a balanced plate")).toBeNull();

    fireEvent.change(screen.getByLabelText("Search learning topics"), {
      target: { value: "not-present" },
    });
    expect(screen.getByText("No lessons found")).toBeTruthy();
  });

  it("shows safety context for fasting and opens the existing fasting destination", () => {
    render(<LearningScreen />);

    fireEvent.click(
      screen.getByLabelText("Open lesson: Understand fasting patterns"),
    );
    expect(screen.getByText("A note about fasting")).toBeTruthy();
    expect(
      screen.getByText(/does not replace individualized medical advice/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open Fasting" }));
    expect(harness.router.push).toHaveBeenCalledWith("/fasting");
  });
});
