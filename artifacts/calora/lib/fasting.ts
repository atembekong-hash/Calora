export type FastingPlanId = "12:12" | "14:10" | "16:8" | "custom";

export type FastingPlan = {
  id: FastingPlanId;
  fastingHours: number;
  label: string;
  description: string;
};

export const FASTING_PLANS: readonly FastingPlan[] = [
  {
    id: "12:12",
    fastingHours: 12,
    label: "12:12",
    description: "A balanced twelve-hour fasting and eating rhythm.",
  },
  {
    id: "14:10",
    fastingHours: 14,
    label: "14:10",
    description:
      "A fourteen-hour fasting rhythm with a ten-hour eating window.",
  },
  {
    id: "16:8",
    fastingHours: 16,
    label: "16:8",
    description:
      "A sixteen-hour fasting rhythm with an eight-hour eating window.",
  },
  {
    id: "custom",
    fastingHours: 12,
    label: "Custom",
    description: "Choose a time-restricted schedule that fits your routine.",
  },
] as const;

export type FastingHistoryEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  plannedHours: number;
  endedEarly: boolean;
};

export type FastingState = {
  selectedPlanId: FastingPlanId;
  customFastingHours?: number;
  activeStartedAt?: string | null;
  activePlannedHours?: number | null;
  history: FastingHistoryEntry[];
};

export const EMPTY_FASTING_STATE: FastingState = {
  selectedPlanId: "12:12",
  activeStartedAt: null,
  activePlannedHours: null,
  history: [],
};

const MAX_HISTORY_ENTRIES = 60;
const PLAN_IDS = new Set<FastingPlanId>(FASTING_PLANS.map((plan) => plan.id));

export function clampFastingHours(value: unknown, fallback = 12): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(24, Math.max(10, Math.round(numeric * 2) / 2));
}

export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function normalizeFastingState(raw: unknown): FastingState {
  if (!raw || typeof raw !== "object")
    return { ...EMPTY_FASTING_STATE, history: [] };
  const candidate = raw as Partial<FastingState>;
  const selectedPlanId = PLAN_IDS.has(candidate.selectedPlanId as FastingPlanId)
    ? (candidate.selectedPlanId as FastingPlanId)
    : EMPTY_FASTING_STATE.selectedPlanId;
  const customFastingHours =
    candidate.customFastingHours === undefined
      ? undefined
      : clampFastingHours(candidate.customFastingHours);
  const activeStartedAt = isIsoTimestamp(candidate.activeStartedAt)
    ? candidate.activeStartedAt
    : null;
  const activePlannedHours =
    activeStartedAt && candidate.activePlannedHours !== undefined
      ? clampFastingHours(candidate.activePlannedHours)
      : null;
  const history = Array.isArray(candidate.history)
    ? candidate.history
        .filter((entry): entry is FastingHistoryEntry => {
          if (!entry || typeof entry !== "object") return false;
          const record = entry as Partial<FastingHistoryEntry>;
          return (
            typeof record.id === "string" &&
            isIsoTimestamp(record.startedAt) &&
            isIsoTimestamp(record.endedAt) &&
            Date.parse(record.endedAt) >= Date.parse(record.startedAt) &&
            Number.isFinite(record.plannedHours) &&
            typeof record.endedEarly === "boolean"
          );
        })
        .map((entry) => ({
          ...entry,
          plannedHours: clampFastingHours(entry.plannedHours),
        }))
        .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
        .slice(0, MAX_HISTORY_ENTRIES)
    : [];
  return {
    selectedPlanId,
    customFastingHours,
    activeStartedAt,
    activePlannedHours,
    history,
  };
}

export function fastingHoursFor(
  state: Pick<FastingState, "selectedPlanId" | "customFastingHours">,
): number {
  if (state.selectedPlanId === "custom")
    return clampFastingHours(state.customFastingHours, 12);
  return (
    FASTING_PLANS.find((plan) => plan.id === state.selectedPlanId)
      ?.fastingHours ?? 12
  );
}

export type FastingProgress = {
  active: boolean;
  elapsedMs: number;
  remainingMs: number;
  progress: number;
  plannedHours: number;
  endsAt: string | null;
};

export function deriveFastingProgress(
  state: FastingState,
  now = new Date(),
): FastingProgress {
  if (!state.activeStartedAt || !state.activePlannedHours) {
    return {
      active: false,
      elapsedMs: 0,
      remainingMs: 0,
      progress: 0,
      plannedHours: fastingHoursFor(state),
      endsAt: null,
    };
  }
  const startedAtMs = Date.parse(state.activeStartedAt);
  if (!Number.isFinite(startedAtMs)) {
    return {
      active: false,
      elapsedMs: 0,
      remainingMs: 0,
      progress: 0,
      plannedHours: fastingHoursFor(state),
      endsAt: null,
    };
  }
  const plannedMs = state.activePlannedHours * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now.getTime() - startedAtMs);
  const remainingMs = Math.max(0, plannedMs - elapsedMs);
  return {
    active: true,
    elapsedMs,
    remainingMs,
    progress: Math.min(1, elapsedMs / plannedMs),
    plannedHours: state.activePlannedHours,
    endsAt: new Date(startedAtMs + plannedMs).toISOString(),
  };
}

export function formatFastingDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function beginFast(state: FastingState, now = new Date()): FastingState {
  if (state.activeStartedAt) return state;
  return {
    ...state,
    activeStartedAt: now.toISOString(),
    activePlannedHours: fastingHoursFor(state),
  };
}

export function finishFast(
  state: FastingState,
  now = new Date(),
): FastingState {
  if (!state.activeStartedAt || !state.activePlannedHours) return state;
  const startedAtMs = Date.parse(state.activeStartedAt);
  if (!Number.isFinite(startedAtMs))
    return { ...state, activeStartedAt: null, activePlannedHours: null };
  const plannedMs = state.activePlannedHours * 60 * 60 * 1000;
  const endedAt = now.toISOString();
  const entry: FastingHistoryEntry = {
    id: `fast-${startedAtMs}`,
    startedAt: state.activeStartedAt,
    endedAt,
    plannedHours: state.activePlannedHours,
    endedEarly: now.getTime() - startedAtMs < plannedMs,
  };
  return {
    ...state,
    activeStartedAt: null,
    activePlannedHours: null,
    history: [
      entry,
      ...state.history.filter((item) => item.id !== entry.id),
    ].slice(0, MAX_HISTORY_ENTRIES),
  };
}
