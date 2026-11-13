import { describe, expect, it } from "vitest";
import { filterFoodHistory, shiftHistoryDate, summarizeFoodHistory } from "@/lib/foodHistory";
import type { FoodLog } from "@/context/CaloraContext";

const logs: FoodLog[] = [
  { id: "b", name: "Oatmeal", date: "2026-11-13", meal: "Breakfast", calories: 300, protein: 10, carbs: 45, fat: 8, source: "Manual", confidence: 100, time: "08:00", serving: "1 bowl" },
  { id: "a", name: "Chicken salad", date: "2026-11-13", meal: "Lunch", calories: 450, protein: 35, carbs: 20, fat: 22, source: "Photo estimate", confidence: 80, time: "12:30", serving: "1 plate", notes: "No dressing" },
  { id: "old", name: "Soup", date: "2026-11-12", meal: "Dinner", calories: 200, protein: 8, carbs: 25, fat: 6, source: "Manual", confidence: 100, time: "19:00", serving: "1 bowl" },
];

describe("Food History", () => {
  it("filters by date, meal, and case-insensitive search", () => {
    expect(filterFoodHistory(logs, "2026-11-13").map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(filterFoodHistory(logs, "2026-11-13", { meal: "Lunch" }).map((entry) => entry.id)).toEqual(["a"]);
    expect(filterFoodHistory(logs, "2026-11-13", { query: "DRESSING" }).map((entry) => entry.id)).toEqual(["a"]);
    expect(filterFoodHistory(logs, "2026-11-12")).toHaveLength(1);
  });

  it("sums nutrition without allowing invalid values to poison totals", () => {
    expect(summarizeFoodHistory(logs.slice(0, 2))).toEqual({ calories: 750, protein: 45, carbs: 65, fat: 30 });
    expect(summarizeFoodHistory([{ ...logs[0], calories: Number.NaN, protein: -2 }])).toEqual({ calories: 0, protein: 0, carbs: 45, fat: 8 });
  });

  it("moves across month and year boundaries using stable UTC dates", () => {
    expect(shiftHistoryDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftHistoryDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
