// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMutate, mockReset, state } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockReset: vi.fn(),
  state: {
    data: undefined as Record<string, unknown> | undefined,
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock("@workspace/api-client-react", () => ({
  useEstimateRecipeNutrition: () => ({
    ...state,
    mutate: mockMutate,
    reset: mockReset,
  }),
}));

import { RecipeAiNutritionWidget } from "@/components/RecipeAiNutritionWidget";

const colors = {
  foreground: "#122",
  mutedForeground: "#567",
  card: "#fff",
  border: "#ddd",
  primary: "#090",
};

const baseProps = {
  recipeId: "meal-1",
  title: "Test pasta",
  ingredients: ["200 g pasta", "1 tbsp olive oil"],
  sourceYield: 2,
  servingCount: 1,
  colors,
};

describe("RecipeAiNutritionWidget", () => {
  beforeEach(() => {
    state.data = undefined;
    state.isPending = false;
    state.error = null;
    mockMutate.mockReset();
    mockReset.mockReset();
  });

  it("defers the AI request until the user expands Show More", () => {
    render(<RecipeAiNutritionWidget {...baseProps} />);

    const control = screen.getByRole("button", {
      name: "Show more AI nutrition information",
    });
    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(control);

    expect(mockMutate).toHaveBeenCalledWith({
      data: {
        recipeId: "meal-1",
        title: "Test pasta",
        ingredients: ["200 g pasta", "1 tbsp olive oil"],
        sourceYield: 2,
      },
    });
    expect(
      screen.getByRole("button", {
        name: "Show less AI nutrition information",
      }),
    ).toBeTruthy();
  });

  it("renders openly visible estimate details and scales them with selected portions", () => {
    state.data = {
      calories: 420,
      proteinG: 25,
      carbsG: 46,
      fatG: 16,
      sodiumMg: 680,
      nutritionConfidence: "estimated",
      nutritionNote:
        "AI-generated ingredient estimate per serving; confirm ingredients and portions for your needs.",
      servingBasis: "Per source serving (recipe yield: 2)",
    };

    render(<RecipeAiNutritionWidget {...baseProps} servingCount={2} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Show more AI nutrition information",
      }),
    );

    expect(screen.getAllByText("NUTRIENT")).not.toHaveLength(0);
    expect(
      screen.getByText(
        "Per source serving (recipe yield: 2) · shown for 2 portions",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("1,360 mg")).not.toHaveLength(0);
    expect(
      screen.getByText(/AI-generated ingredient estimate per serving/),
    ).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
