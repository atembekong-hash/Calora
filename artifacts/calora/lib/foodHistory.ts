import type { FoodLog } from "@/context/CaloraContext";

export type FoodHistoryFilters = {
  query?: string;
  meal?: FoodLog["meal"] | "All";
};

export type FoodHistoryTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function filterFoodHistory(
  logs: FoodLog[],
  date: string,
  filters: FoodHistoryFilters = {},
): FoodLog[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  const meal = filters.meal ?? "All";
  return logs
    .filter((log) => log.date === date)
    .filter((log) => meal === "All" || log.meal === meal)
    .filter((log) => {
      if (!query) return true;
      return `${log.name} ${log.serving} ${log.notes ?? ""}`
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort((a, b) => `${b.time}-${b.id}`.localeCompare(`${a.time}-${a.id}`));
}

export function summarizeFoodHistory(logs: FoodLog[]): FoodHistoryTotals {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + Math.max(0, Number(log.calories) || 0),
      protein: totals.protein + Math.max(0, Number(log.protein) || 0),
      carbs: totals.carbs + Math.max(0, Number(log.carbs) || 0),
      fat: totals.fat + Math.max(0, Number(log.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function shiftHistoryDate(date: string, offsetDays: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}
