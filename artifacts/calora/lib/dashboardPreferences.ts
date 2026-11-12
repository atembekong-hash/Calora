export const DASHBOARD_WIDGET_IDS = [
  "calories",
  "steps",
  "water",
  "weight",
  "mealRhythm",
  "nutrients",
  "fasting",
  "mood",
  "progressSnapshot",
  "recipes",
  "quickLog",
  "log",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardDensity = "compact" | "expanded";
export type DashboardPlacement = "left" | "right";
export type DashboardPreset = "compact" | "extended";

export type DashboardPreferences = {
  version: number;
  visible: DashboardWidgetId[];
  order: DashboardWidgetId[];
  density: Record<DashboardWidgetId, DashboardDensity>;
  placement: Record<DashboardWidgetId, DashboardPlacement>;
};

const DASHBOARD_PREFERENCES_VERSION = 6;
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
  "progressSnapshot",
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
  "progressSnapshot",
];

/** The four cards that support independent Compact/Expanded rendering and placement. */
export const RESPONSIVE_DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "fasting",
  "steps",
  "nutrients",
  "mood",
];

export const ACTIVE_DASHBOARD_WIDGET_IDS: readonly DashboardWidgetId[] = DASHBOARD_WIDGET_IDS.filter(
  (id) => id !== "mealRhythm" && id !== "weight",
);

const DEFAULT_DENSITY: Record<DashboardWidgetId, DashboardDensity> = {
  calories: "expanded",
  steps: "compact",
  water: "compact",
  weight: "compact",
  mealRhythm: "compact",
  nutrients: "compact",
  fasting: "compact",
  mood: "compact",
  recipes: "expanded",
  quickLog: "compact",
  log: "expanded",
  progressSnapshot: "compact",
};

const DEFAULT_PLACEMENT: Record<DashboardWidgetId, DashboardPlacement> = {
  calories: "left",
  steps: "right",
  water: "left",
  weight: "left",
  mealRhythm: "left",
  nutrients: "left",
  fasting: "left",
  mood: "right",
  recipes: "left",
  quickLog: "left",
  log: "left",
  progressSnapshot: "left",
};

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  version: DASHBOARD_PREFERENCES_VERSION,
  visible: ["calories", "fasting", "steps", "nutrients", "mood", "recipes", "quickLog", "water", "log", "progressSnapshot"],
  order: ["calories", "fasting", "steps", "nutrients", "mood", "water", "quickLog", "log", "progressSnapshot", "recipes"],
  density: { ...DEFAULT_DENSITY },
  placement: { ...DEFAULT_PLACEMENT },
};

function isWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && (DASHBOARD_WIDGET_IDS as readonly string[]).includes(value);
}

function uniqueWidgetIds(value: unknown): DashboardWidgetId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isWidgetId).filter((id, index, list) => list.indexOf(id) === index);
}

function isPlacement(value: unknown): value is DashboardPlacement {
  return value === "left" || value === "right";
}

export function normalizeDashboardPreferences(raw: unknown): DashboardPreferences {
  if (!raw || typeof raw !== "object") {
    return {
      version: DASHBOARD_PREFERENCES_VERSION,
      visible: [...DEFAULT_DASHBOARD_PREFERENCES.visible],
      order: [...DEFAULT_DASHBOARD_PREFERENCES.order],
      density: { ...DEFAULT_DASHBOARD_PREFERENCES.density },
      placement: { ...DEFAULT_PLACEMENT },
    };
  }
  const candidate = raw as Partial<DashboardPreferences> & { placement?: unknown };
  const requestedVisible = uniqueWidgetIds(candidate.visible).filter((id) => ACTIVE_DASHBOARD_WIDGET_IDS.includes(id));
  const migratedVisible = candidate.version === DASHBOARD_PREFERENCES_VERSION
    ? requestedVisible
    : [...requestedVisible, ...NEW_TODAY_WIDGET_IDS.filter((id) => !requestedVisible.includes(id))];
  const visible: DashboardWidgetId[] = migratedVisible.includes("calories") ? migratedVisible : ["calories", ...migratedVisible];
  const suppliedOrder = uniqueWidgetIds(candidate.order).filter((id) => ACTIVE_DASHBOARD_WIDGET_IDS.includes(id));
  const normalizedOrder: DashboardWidgetId[] = candidate.version !== DASHBOARD_PREFERENCES_VERSION
    && suppliedOrder.length === LEGACY_DEFAULT_DASHBOARD_ORDER.length
    && suppliedOrder.every((id, index) => id === LEGACY_DEFAULT_DASHBOARD_ORDER[index])
    ? ["calories", "fasting", "steps", "nutrients", "mood", "water", "quickLog", "log", "progressSnapshot", "recipes"]
    : candidate.version !== DASHBOARD_PREFERENCES_VERSION && suppliedOrder.includes("recipes")
      ? [...suppliedOrder.filter((id) => id !== "recipes" && id !== "progressSnapshot"), "progressSnapshot", "recipes"]
      : suppliedOrder;
  const order = [...normalizedOrder, ...ACTIVE_DASHBOARD_WIDGET_IDS.filter((id) => !normalizedOrder.includes(id))];
  const candidateDensity = candidate.density && typeof candidate.density === "object" ? candidate.density : {};
  const density = { ...DEFAULT_DENSITY };
  for (const id of DASHBOARD_WIDGET_IDS) {
    const value = (candidateDensity as Partial<Record<DashboardWidgetId, unknown>>)[id];
    if (value === "compact" || value === "expanded") density[id] = value;
  }
  if (candidate.version !== DASHBOARD_PREFERENCES_VERSION) {
    for (const id of RESPONSIVE_DASHBOARD_WIDGET_IDS) density[id] = "compact";
  }
  const candidatePlacement = candidate.placement && typeof candidate.placement === "object" ? candidate.placement : {};
  const placement = { ...DEFAULT_PLACEMENT };
  for (const id of DASHBOARD_WIDGET_IDS) {
    const value = (candidatePlacement as Partial<Record<DashboardWidgetId, unknown>>)[id];
    if (isPlacement(value)) placement[id] = value;
  }
  return {
    version: DASHBOARD_PREFERENCES_VERSION,
    visible: visible.length > 0 ? visible : [...DEFAULT_DASHBOARD_PREFERENCES.visible],
    order,
    density,
    placement,
  };
}

const STANDARD_PRESET_ORDER: readonly DashboardWidgetId[] = [
  "calories",
  "fasting",
  "steps",
  "nutrients",
  "mood",
  "water",
  "quickLog",
  "progressSnapshot",
  "recipes",
  "log",
];

export function applyDashboardPreset(
  current: DashboardPreferences,
  preset: DashboardPreset,
): DashboardPreferences {
  const order = [
    ...STANDARD_PRESET_ORDER,
    ...ACTIVE_DASHBOARD_WIDGET_IDS.filter((id) => !STANDARD_PRESET_ORDER.includes(id)),
  ];
  const density = { ...current.density };
  for (const id of RESPONSIVE_DASHBOARD_WIDGET_IDS) density[id] = preset === "compact" ? "compact" : "expanded";
  const placement = { ...current.placement, fasting: "left", steps: "right", nutrients: "left", mood: "right" };
  return normalizeDashboardPreferences({
    version: DASHBOARD_PREFERENCES_VERSION,
    visible: [...ACTIVE_DASHBOARD_WIDGET_IDS],
    order,
    density,
    placement,
  });
}

export function buildDashboardRows(preferences: DashboardPreferences): DashboardWidgetId[][] {
  const rows: DashboardWidgetId[][] = [];
  const visibleResponsive = preferences.order.filter(
    (id) => preferences.visible.includes(id) && RESPONSIVE_DASHBOARD_WIDGET_IDS.includes(id),
  );
  for (const id of visibleResponsive) {
    if (preferences.density[id] === "expanded") {
      rows.push([id]);
      continue;
    }
    const previous = rows[rows.length - 1];
    const previousId = previous?.[0];
    const canPair = Boolean(
      previous && previous.length === 1 && previousId &&
      preferences.density[previousId] === "compact" &&
      preferences.placement[previousId] !== preferences.placement[id] &&
      preferences.placement[previousId] !== undefined &&
      preferences.placement[id] !== undefined,
    );
    if (canPair) {
      if (preferences.placement[id] === "left") previous!.unshift(id);
      else previous!.push(id);
    } else {
      rows.push([id]);
    }
  }
  return rows;
}

export function reorderDashboardWidget(preferences: DashboardPreferences, widgetId: DashboardWidgetId, direction: "up" | "down"): DashboardPreferences {
  const configurableOrder = preferences.order.filter((id) => CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(id));
  const index = configurableOrder.indexOf(widgetId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= configurableOrder.length) return preferences;
  const targetWidget = configurableOrder[target]!;
  const order = [...preferences.order];
  const sourceIndex = order.indexOf(widgetId);
  const targetIndex = order.indexOf(targetWidget);
  [order[sourceIndex], order[targetIndex]] = [order[targetIndex]!, order[sourceIndex]!];
  return { ...preferences, order };
}

export function toggleDashboardWidgetVisibility(preferences: DashboardPreferences, widgetId: DashboardWidgetId): DashboardPreferences {
  if (widgetId === "calories") return preferences;
  const visible = preferences.visible.includes(widgetId)
    ? preferences.visible.filter((id) => id !== widgetId)
    : [...preferences.visible, widgetId];
  return { ...preferences, visible: visible.length > 0 ? visible : preferences.visible };
}
