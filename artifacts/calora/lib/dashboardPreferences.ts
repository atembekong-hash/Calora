export const DASHBOARD_WIDGET_IDS = [
  "calories",
  "steps",
  "water",
  "weight",
  "mealRhythm",
  "nutrients",
  "fasting",
  "mood",
  "recipes",
  "quickLog",
  "log",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardDensity = "compact" | "expanded";

export type DashboardPreferences = {
  version: number;
  visible: DashboardWidgetId[];
  order: DashboardWidgetId[];
  density: Record<DashboardWidgetId, DashboardDensity>;
};

const DASHBOARD_PREFERENCES_VERSION = 3;
const LEGACY_DEFAULT_DASHBOARD_ORDER: readonly DashboardWidgetId[] = [
  "calories",
  "fasting",
  "steps",
  "nutrients",
  "mood",
  "recipes",
  "quickLog",
  "water",
  "log",
];
const NEW_TODAY_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "mood",
  "recipes",
  "quickLog",
  "log",
];

export const CONFIGURABLE_DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "water",
  "fasting",
  "nutrients",
  "steps",
  "mood",
  "recipes",
  "quickLog",
  "log",
];

const ACTIVE_DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = DASHBOARD_WIDGET_IDS.filter(
  (id) => id !== "mealRhythm" && id !== "weight",
);

const DEFAULT_DENSITY: Record<DashboardWidgetId, DashboardDensity> = {
  calories: "expanded",
  steps: "compact",
  water: "compact",
  weight: "compact",
  mealRhythm: "compact",
  nutrients: "expanded",
  fasting: "compact",
  mood: "compact",
  recipes: "expanded",
  quickLog: "compact",
  log: "expanded",
};

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  version: DASHBOARD_PREFERENCES_VERSION,
  visible: ["calories", "fasting", "steps", "nutrients", "mood", "recipes", "quickLog", "water", "log"],
  order: ["calories", "fasting", "steps", "nutrients", "mood", "water", "recipes", "quickLog", "log"],
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
      version: DASHBOARD_PREFERENCES_VERSION,
      visible: [...DEFAULT_DASHBOARD_PREFERENCES.visible],
      order: [...DEFAULT_DASHBOARD_PREFERENCES.order],
      density: { ...DEFAULT_DASHBOARD_PREFERENCES.density },
    };
  const candidate = raw as Partial<DashboardPreferences>;
  const requestedVisible = uniqueWidgetIds(candidate.visible).filter((id) =>
    ACTIVE_DASHBOARD_WIDGET_IDS.includes(id),
  );
  const migratedVisible = candidate.version === DASHBOARD_PREFERENCES_VERSION
    ? requestedVisible
    : [...requestedVisible, ...NEW_TODAY_WIDGET_IDS.filter((id) => !requestedVisible.includes(id))];
  const visible: DashboardWidgetId[] = migratedVisible.includes("calories")
    ? migratedVisible
    : ["calories", ...migratedVisible];
  const suppliedOrder = uniqueWidgetIds(candidate.order).filter((id) =>
    ACTIVE_DASHBOARD_WIDGET_IDS.includes(id),
  );
  const normalizedOrder = candidate.version !== DASHBOARD_PREFERENCES_VERSION
    && suppliedOrder.length === LEGACY_DEFAULT_DASHBOARD_ORDER.length
    && suppliedOrder.every((id, index) => id === LEGACY_DEFAULT_DASHBOARD_ORDER[index])
    ? ["calories", "fasting", "steps", "nutrients", "mood", "water", "recipes", "quickLog", "log"] as DashboardWidgetId[]
    : suppliedOrder;
  const order = [
    ...normalizedOrder,
    ...ACTIVE_DASHBOARD_WIDGET_IDS.filter((id) => !normalizedOrder.includes(id)),
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
    version: DASHBOARD_PREFERENCES_VERSION,
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
