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
    description: "Choose a time-based schedule that fits your routine.",
  },
] as const;

export type FastingHistoryEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  plannedHours: number;
  endedEarly: boolean;
};

/**
 * Persisted fasting state. Keep this shape backward compatible: the active
 * window and completed history are derived solely from timestamps, so a timer
 * remains accurate after an app restart without any background work.
 */
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
const MIN_FASTING_HOURS = 10;
const MAX_FASTING_HOURS = 24;
const HALF_HOUR = 0.5;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PLAN_IDS = new Set<FastingPlanId>(FASTING_PLANS.map((plan) => plan.id));

export function clampFastingHours(value: unknown, fallback = 12): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return fallback;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(
    MAX_FASTING_HOURS,
    Math.max(MIN_FASTING_HOURS, Math.round(numeric / HALF_HOUR) * HALF_HOUR),
  );
}

export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isValidHistoryEntry(value: unknown): value is FastingHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FastingHistoryEntry>;
  return (
    typeof record.id === "string" &&
    isIsoTimestamp(record.startedAt) &&
    isIsoTimestamp(record.endedAt) &&
    Date.parse(record.endedAt) >= Date.parse(record.startedAt) &&
    Number.isFinite(record.plannedHours) &&
    typeof record.endedEarly === "boolean"
  );
}

/** Normalizes persisted or imported data without changing the stored contract. */
export function normalizeFastingState(raw: unknown): FastingState {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_FASTING_STATE, history: [] };
  }

  const candidate = raw as Partial<FastingState>;
  const selectedPlanId = PLAN_IDS.has(candidate.selectedPlanId as FastingPlanId)
    ? (candidate.selectedPlanId as FastingPlanId)
    : EMPTY_FASTING_STATE.selectedPlanId;
  const customFastingHours =
    candidate.customFastingHours === undefined ||
    candidate.customFastingHours === null
      ? undefined
      : clampFastingHours(candidate.customFastingHours);
  // Active window fields form one persisted record. A lone timestamp would
  // make the UI look idle while preventing a new timer from starting, so a
  // partial or malformed pair must be cleared atomically.
  const hasActiveWindow =
    isIsoTimestamp(candidate.activeStartedAt) &&
    typeof candidate.activePlannedHours === "number" &&
    Number.isFinite(candidate.activePlannedHours) &&
    candidate.activePlannedHours > 0;
  const activeStartedAt = hasActiveWindow ? candidate.activeStartedAt : null;
  const activePlannedHours = hasActiveWindow
    ? clampFastingHours(candidate.activePlannedHours)
    : null;
  const history = Array.isArray(candidate.history)
    ? candidate.history
        .filter(isValidHistoryEntry)
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
  if (state.selectedPlanId === "custom") {
    return clampFastingHours(state.customFastingHours, 12);
  }
  return (
    FASTING_PLANS.find((plan) => plan.id === state.selectedPlanId)
      ?.fastingHours ?? 12
  );
}

export function formatFastingHours(hours: number): string {
  const normalized = clampFastingHours(hours);
  return Number.isInteger(normalized)
    ? `${normalized} hours`
    : `${normalized.toFixed(1)} hours`;
}

/**
 * Calora's optional fasting timer is intentionally adult-only. Unknown or
 * malformed ages retain the neutral default while a known age below 18 is
 * blocked before any timer state can be created.
 */
export function isFastingTimerEligible(age: unknown): boolean {
  return !(typeof age === "number" && Number.isFinite(age) && age < 18);
}

export function fastingPlanLabel(
  state: Pick<FastingState, "selectedPlanId" | "customFastingHours">,
): string {
  return state.selectedPlanId === "custom"
    ? `Custom · ${formatFastingHours(fastingHoursFor(state))}`
    : (FASTING_PLANS.find((plan) => plan.id === state.selectedPlanId)?.label ??
        "12:12");
}

export type FastingProgress = {
  active: boolean;
  elapsedMs: number;
  remainingMs: number;
  progress: number;
  plannedHours: number;
  endsAt: string | null;
};

/**
 * Derives live display values from persisted timestamps. No interval state is
 * stored, which keeps this correct after a restart or time spent away.
 */
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

  const plannedMs = state.activePlannedHours * HOUR_MS;
  const nowMs = now.getTime();
  const elapsedMs = Math.max(
    0,
    Number.isFinite(nowMs) ? nowMs - startedAtMs : 0,
  );
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

/** Starts a timestamp-derived window without overwriting one already in progress. */
export function beginFast(state: FastingState, now = new Date()): FastingState {
  const hasActiveWindow =
    isIsoTimestamp(state.activeStartedAt) &&
    typeof state.activePlannedHours === "number" &&
    Number.isFinite(state.activePlannedHours) &&
    state.activePlannedHours > 0;
  if (hasActiveWindow) return state;
  return {
    ...state,
    activeStartedAt: now.toISOString(),
    activePlannedHours: fastingHoursFor(state),
  };
}

/**
 * Completes the current window and records a local, timestamp-derived entry.
 * A device clock earlier than the start is safely capped at the start time so
 * persisted history remains valid.
 */
export function finishFast(
  state: FastingState,
  now = new Date(),
): FastingState {
  if (!state.activeStartedAt || !state.activePlannedHours) return state;

  const startedAtMs = Date.parse(state.activeStartedAt);
  if (!Number.isFinite(startedAtMs)) {
    return { ...state, activeStartedAt: null, activePlannedHours: null };
  }

  const plannedMs = state.activePlannedHours * HOUR_MS;
  const currentTime = now.getTime();
  const endedAtMs = Math.max(
    startedAtMs,
    Number.isFinite(currentTime) ? currentTime : startedAtMs,
  );
  const entry: FastingHistoryEntry = {
    id: `fast-${startedAtMs}`,
    startedAt: state.activeStartedAt,
    endedAt: new Date(endedAtMs).toISOString(),
    plannedHours: state.activePlannedHours,
    endedEarly: endedAtMs - startedAtMs < plannedMs,
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

export type FastingCalendarDay = {
  /** ISO calendar date in the selected/local calendar. */
  date: string;
  weekdayLabel: string;
  dayNumber: string;
  completedCount: number;
  totalDurationMs: number;
};

export type FastingHistoryTrend = "more" | "fewer" | "steady" | "new" | "none";

export type FastingHistorySummary = {
  completedCount: number;
  recentCompletedCount: number;
  previousCompletedCount: number;
  recentCompletedDays: number;
  recentAverageDurationMs: number | null;
  trend: FastingHistoryTrend;
};

type CalendarParts = { year: string; month: string; day: string };

function calendarParts(date: Date, timeZone?: string): CalendarParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: keyof CalendarParts) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  return { year: part("year"), month: part("month"), day: part("day") };
}

function calendarDateKey(date: Date, timeZone?: string): string {
  const { year, month, day } = calendarParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

function calendarDateRange(
  now: Date,
  days: number,
  timeZone?: string,
): string[] {
  const safeDays = Math.max(1, Math.floor(days));
  const today = calendarParts(now, timeZone);
  const cursor = new Date(
    Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day)),
  );
  const dates: string[] = [];
  for (let index = safeDays - 1; index >= 0; index -= 1) {
    const date = new Date(cursor.getTime() - index * DAY_MS);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function durationForHistoryEntry(entry: FastingHistoryEntry): number {
  const duration = Date.parse(entry.endedAt) - Date.parse(entry.startedAt);
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

function validHistory(
  history: readonly FastingHistoryEntry[],
): FastingHistoryEntry[] {
  return history.filter(isValidHistoryEntry);
}

/**
 * Builds a calendar from completed-window end timestamps. Pass an explicit
 * time zone for a deterministic shared view; omitting it uses the device's
 * local calendar, which is appropriate for the in-app display.
 */
export function deriveFastingCalendar(
  history: readonly FastingHistoryEntry[],
  now = new Date(),
  days = 7,
  timeZone?: string,
): FastingCalendarDay[] {
  const dates = calendarDateRange(now, days, timeZone);
  const counts = new Map<
    string,
    { completedCount: number; totalDurationMs: number }
  >();

  for (const entry of validHistory(history)) {
    const date = calendarDateKey(new Date(entry.endedAt), timeZone);
    const existing = counts.get(date) ?? {
      completedCount: 0,
      totalDurationMs: 0,
    };
    existing.completedCount += 1;
    existing.totalDurationMs += durationForHistoryEntry(entry);
    counts.set(date, existing);
  }

  return dates.map((date) => {
    const labelDate = new Date(`${date}T12:00:00.000Z`);
    const count = counts.get(date) ?? { completedCount: 0, totalDurationMs: 0 };
    return {
      date,
      weekdayLabel: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(labelDate),
      dayNumber: new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        timeZone: "UTC",
      }).format(labelDate),
      ...count,
    };
  });
}

/**
 * Creates presentation-only statistics from the persisted history. These
 * values describe recorded routine data only; they do not infer health impact.
 */
export function deriveFastingHistorySummary(
  history: readonly FastingHistoryEntry[],
  now = new Date(),
  timeZone?: string,
): FastingHistorySummary {
  const calendar = deriveFastingCalendar(history, now, 14, timeZone);
  const previous = calendar.slice(0, 7);
  const recent = calendar.slice(7);
  const recentCompletedCount = recent.reduce(
    (total, day) => total + day.completedCount,
    0,
  );
  const previousCompletedCount = previous.reduce(
    (total, day) => total + day.completedCount,
    0,
  );
  const recentTotalDurationMs = recent.reduce(
    (total, day) => total + day.totalDurationMs,
    0,
  );
  const completedCount = validHistory(history).length;
  const trend: FastingHistoryTrend =
    recentCompletedCount === 0 && previousCompletedCount === 0
      ? "none"
      : previousCompletedCount === 0
        ? "new"
        : recentCompletedCount > previousCompletedCount
          ? "more"
          : recentCompletedCount < previousCompletedCount
            ? "fewer"
            : "steady";

  return {
    completedCount,
    recentCompletedCount,
    previousCompletedCount,
    recentCompletedDays: recent.filter((day) => day.completedCount > 0).length,
    recentAverageDurationMs:
      recentCompletedCount > 0
        ? Math.floor(recentTotalDurationMs / recentCompletedCount)
        : null,
    trend,
  };
}

/** A neutral, local-only sentence for the history panel. */
export function fastingHistoryInsight(summary: FastingHistorySummary): string {
  if (summary.completedCount === 0) {
    return "No completed windows recorded yet. This optional tracker is ready when you are.";
  }
  if (summary.recentCompletedCount === 0) {
    return "Your completed windows are kept in this on-device history.";
  }
  const windowWord = summary.recentCompletedCount === 1 ? "window" : "windows";
  const dayWord = summary.recentCompletedDays === 1 ? "day" : "days";
  return `${summary.recentCompletedCount} completed ${windowWord} were recorded across ${summary.recentCompletedDays} of the last 7 ${dayWord}.`;
}
