// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeNutritionDetails } from "@/components/RecipeNutritionDetails";

const colors = {
  foreground: "#122",
  mutedForeground: "#567",
  card: "#fff",
  border: "#ddd",
  primary: "#090",
};

const nutrition = {
  calories: 420,
  proteinG: 25,
  carbsG: 46,
  fatG: 16,
  sodiumMg: 680,
  vitaminCMg: 18,
};

describe("RecipeNutritionDetails interaction", () => {
  it("exposes an accessible expand/collapse control and serving-scaled details", () => {
    const { rerender } = render(
      <RecipeNutritionDetails
        nutrition={nutrition}
        servingCount={1}
        primaryNutritionAvailable
        colors={colors}
      />,
    );

    const control = screen.getByRole("button", {
      name: "Show full nutrition information",
    });
    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("NUTRIENT")).toBeNull();

    fireEvent.click(control);
    expect(
      screen
        .getByRole("button", { name: "Show less nutrition information" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getAllByText("NUTRIENT")).not.toHaveLength(0);
    expect(screen.getByText("680 mg")).toBeTruthy();

    rerender(
      <RecipeNutritionDetails
        nutrition={nutrition}
        servingCount={1.5}
        primaryNutritionAvailable
        colors={colors}
      />,
    );
    expect(screen.getByText("Values shown for 1.5 servings")).toBeTruthy();
    expect(screen.getByText("1,020 mg")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Show less nutrition information" }),
    );
    expect(screen.queryByText("NUTRIENT")).toBeNull();
  });

  it("honestly reports unavailable additional facts without an empty control", () => {
    render(
      <RecipeNutritionDetails
        nutrition={{ calories: 250, proteinG: 12, carbsG: 30, fatG: 8 }}
        servingCount={1}
        primaryNutritionAvailable
        colors={colors}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /nutrition information/i }),
    ).toBeNull();
    expect(
      screen.getByText(
        "This recipe source has not provided additional nutrient facts beyond the nutrition summary.",
      ),
    ).toBeTruthy();
  });
});
