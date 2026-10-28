/**
 * @vitest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_LEARNING_READER_STATE,
  markLearningLessonCompleted,
  toggleSavedLearningLesson,
} from "@/lib/learning";

const harness = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  lessonId: "fasting-basics-and-boundaries" as string | undefined,
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
    Image: ({ source: _source, style: _style, testID, ...props }: any) =>
      React.createElement("img", {
        ...props,
        ...(testID ? { "data-testid": testID } : {}),
      }),
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
vi.mock("expo-router", () => ({
  router: harness.router,
  useLocalSearchParams: () => ({ lessonId: harness.lessonId }),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("@/context/CaloraContext", () => ({
  useCalora: () => {
    const [learningReaderState, setLearningReaderState] = React.useState(
      EMPTY_LEARNING_READER_STATE,
    );
    return {
      colors: harness.colors,
      fontScale: 1,
      learningReaderState,
      toggleSavedLearningLesson: (lessonId: string) =>
        setLearningReaderState((current) =>
          toggleSavedLearningLesson(current, lessonId),
        ),
      markLearningLessonCompleted: (lessonId: string) =>
        setLearningReaderState((current) =>
          markLearningLessonCompleted(
            current,
            lessonId,
            "2026-10-27T19:00:00.000Z",
          ),
        ),
    };
  },
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
    style: _style,
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
import LearningLessonScreen from "@/app/learning/[lessonId]";

describe("LearningScreen", () => {
  beforeEach(() => {
    harness.router.push.mockReset();
    harness.router.replace.mockReset();
    harness.lessonId = "fasting-basics-and-boundaries";
  });

  it("offers an editorial library that filters by topic and search query", () => {
    render(<LearningScreen />);

    expect(
      screen.getAllByText("Build a balanced plate").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Fasting basics and boundaries").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByTestId("learning-lesson-editorial-photo").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByTestId("learning-featured-editorial-photo").length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("tab", { name: "Fasting learning topic" }),
    );
    expect(
      screen.getByLabelText("Open lesson: Fasting basics and boundaries"),
    ).toBeTruthy();
    expect(screen.queryByText("Build a balanced plate")).toBeNull();

    fireEvent.change(screen.getByLabelText("Search learning topics"), {
      target: { value: "not-present" },
    });
    expect(screen.getByText("No lessons found")).toBeTruthy();
  });

  it("opens the canonical lesson route and exposes a local save hook", () => {
    render(<LearningScreen />);

    fireEvent.click(
      screen.getByLabelText("Open lesson: Build a balanced plate"),
    );
    expect(harness.router.push).toHaveBeenCalledWith({
      pathname: "/learning/[lessonId]",
      params: { lessonId: "balanced-plate-basics" },
    });

    fireEvent.click(screen.getByLabelText("Save Build a balanced plate"));
    expect(screen.getByLabelText("Remove Build a balanced plate")).toBeTruthy();
  });
});

describe("LearningLessonScreen route", () => {
  beforeEach(() => {
    harness.router.push.mockReset();
    harness.router.replace.mockReset();
    harness.lessonId = "fasting-basics-and-boundaries";
  });

  it("renders safety framing and opens the existing Fasting feature", () => {
    render(<LearningLessonScreen />);

    expect(screen.getByText("Consider safety first")).toBeTruthy();
    expect(
      screen.getByText(/does not replace individualized medical advice/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Fasting" }));
    expect(harness.router.push).toHaveBeenCalledWith("/fasting");
  });

  it("recovers from an unknown deep link by returning to the Learning library", () => {
    harness.lessonId = "not-a-lesson";
    render(<LearningLessonScreen />);

    expect(screen.getByText("Lesson unavailable")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Browse Learning library" }),
    );
    expect(harness.router.replace).toHaveBeenCalledWith("/learning");
  });
});
