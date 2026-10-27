export const DASHBOARD_WIDGET_IDS = [
  "calories",
  "steps",
  "water",
  "weight",
  "mealRhythm",
  "nutrients",
  "fasting",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardDensity = "compact" | "expanded";

export type DashboardPreferences = {
  visible: DashboardWidgetId[];
  order: DashboardWidgetId[];
  density: Record<DashboardWidgetId, DashboardDensity>;
};

export const CONFIGURABLE_DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "water",
  "fasting",
  "nutrients",
  "mealRhythm",
];

const DEFAULT_DENSITY: Record<DashboardWidgetId, DashboardDensity> = {
  calories: "expanded",
  steps: "compact",
  water: "compact",
  weight: "compact",
  mealRhythm: "compact",
  nutrients: "expanded",
  fasting: "compact",
};

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  visible: [...DASHBOARD_WIDGET_IDS],
  order: [...DASHBOARD_WIDGET_IDS],
  density: { ...DEFAULT_DENSITY },
};

function isWidgetId(value: unknown): value is DashboardWidgetId {
  return (
    typeof value === "string" &&
    (DASHBOARD_WIDGET_IDS as readonly string[]).includes(value)
  );
}

function uniqueWidgetIds(value: unknown): DashboardWidgetId[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isWidgetId)
    .filter((id, index, list) => list.indexOf(id) === index);
}

export function normalizeDashboardPreferences(
  raw: unknown,
): DashboardPreferences {
  if (!raw || typeof raw !== "object")
    return {
      visible: [...DEFAULT_DASHBOARD_PREFERENCES.visible],
      order: [...DEFAULT_DASHBOARD_PREFERENCES.order],
      density: { ...DEFAULT_DASHBOARD_PREFERENCES.density },
    };
  const candidate = raw as Partial<DashboardPreferences>;
  const requestedVisible = uniqueWidgetIds(candidate.visible);
  const visible: DashboardWidgetId[] = requestedVisible.includes("calories")
    ? requestedVisible
    : ["calories", ...requestedVisible];
  const suppliedOrder = uniqueWidgetIds(candidate.order);
  const order = [
    ...suppliedOrder,
    ...DASHBOARD_WIDGET_IDS.filter((id) => !suppliedOrder.includes(id)),
  ];
  const candidateDensity =
    candidate.density && typeof candidate.density === "object"
      ? candidate.density
      : {};
  const density = { ...DEFAULT_DENSITY };
  for (const id of DASHBOARD_WIDGET_IDS) {
    const value = (
      candidateDensity as Partial<Record<DashboardWidgetId, unknown>>
    )[id];
    if (value === "compact" || value === "expanded") density[id] = value;
  }
  return {
    visible:
      visible.length > 0 ? visible : [...DEFAULT_DASHBOARD_PREFERENCES.visible],
    order,
    density,
  };
}

export function reorderDashboardWidget(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  direction: "up" | "down",
): DashboardPreferences {
  const configurableOrder = preferences.order.filter((id) =>
    CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(id),
  );
  const index = configurableOrder.indexOf(widgetId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= configurableOrder.length)
    return preferences;
  const targetWidget = configurableOrder[target]!;
  const order = [...preferences.order];
  const sourceIndex = order.indexOf(widgetId);
  const targetIndex = order.indexOf(targetWidget);
  [order[sourceIndex], order[targetIndex]] = [
    order[targetIndex]!,
    order[sourceIndex]!,
  ];
  return { ...preferences, order };
}

export function toggleDashboardWidgetVisibility(
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
): DashboardPreferences {
  if (widgetId === "calories") return preferences;
  const visible = preferences.visible.includes(widgetId)
    ? preferences.visible.filter((id) => id !== widgetId)
    : [...preferences.visible, widgetId];
  // At least one dashboard signal remains visible. A user can always restore
  // other cards from the layout editor.
  return {
    ...preferences,
    visible: visible.length > 0 ? visible : preferences.visible,
  };
}
