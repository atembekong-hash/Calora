export const DEFAULT_DAILY_STEP_GOAL = 10_000;
export const MIN_DAILY_STEP_GOAL = 100;
export const MAX_DAILY_STEP_GOAL = 100_000;

export type MotionStepPermission =
  "granted" | "denied" | "undetermined" | "unavailable";
export type LiveStepStatus =
  | "idle"
  | "syncing"
  | "live"
  | "confirmed"
  | "health-only"
  | "permission-required"
  | "denied"
  | "unavailable"
  | "error";

export type LiveStepTrackingState = {
  /** User-local date key; a live session may never cross this boundary. */
  day: string;
  /** Last confirmed Health Connect / Apple Health aggregate. */
  providerSteps: number | null;
  /** Baseline used with the active foreground Pedometer subscription. */
  sessionBaseSteps: number | null;
  /** Pedometer count since the active subscription started. */
  sessionSteps: number | null;
  /** Derived dashboard value. It is never persisted independently. */
  displayedSteps: number | null;
  status: LiveStepStatus;
  motionAvailable: boolean | null;
  motionPermission: MotionStepPermission;
  updatedAt: string | null;
  error: string | null;
};

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return null;
  return Math.floor(value);
}

function greatest(...values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  return numeric.length ? Math.max(...numeric) : null;
}

export function localStepDay(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDailyStepGoal(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return DEFAULT_DAILY_STEP_GOAL;
  return Math.min(
    MAX_DAILY_STEP_GOAL,
    Math.max(MIN_DAILY_STEP_GOAL, Math.round(value)),
  );
}

export function createLiveStepTrackingState(
  day: string,
  providerSteps: number | null = null,
): LiveStepTrackingState {
  const normalizedProvider = nonNegativeInteger(providerSteps);
  return {
    day,
    providerSteps: normalizedProvider,
    sessionBaseSteps: null,
    sessionSteps: null,
    displayedSteps: normalizedProvider,
    status: normalizedProvider === null ? "idle" : "confirmed",
    motionAvailable: null,
    motionPermission: "undetermined",
    updatedAt: null,
    error: null,
  };
}

/**
 * Reconcile the provider's daily aggregate without double counting an active
 * foreground Pedometer session. The provider is durable; the session is only a
 * temporary visual overlay.
 */
export function reconcileProviderSteps(
  state: LiveStepTrackingState,
  providerSteps: number | null,
  updatedAt: string,
): LiveStepTrackingState {
  const normalizedProvider = nonNegativeInteger(providerSteps);
  if (normalizedProvider === null) {
    return { ...state, updatedAt };
  }

  if (state.sessionSteps === null || state.sessionBaseSteps === null) {
    return {
      ...state,
      providerSteps: normalizedProvider,
      displayedSteps: normalizedProvider,
      status: state.status === "live" ? "live" : "confirmed",
      updatedAt,
      error: null,
    };
  }

  const projected = state.sessionBaseSteps + state.sessionSteps;
  if (normalizedProvider >= projected) {
    // Rebase the still-active Pedometer session on the confirmed total. Its
    // callback remains cumulative from subscription start, so subtracting the
    // current session value preserves the next increment exactly once.
    return {
      ...state,
      providerSteps: normalizedProvider,
      sessionBaseSteps: Math.max(0, normalizedProvider - state.sessionSteps),
      displayedSteps: normalizedProvider,
      status: state.status === "live" ? "live" : "confirmed",
      updatedAt,
      error: null,
    };
  }

  // Health providers can batch writes. Preserve the higher provisional motion
  // projection until a bounded later reconciliation catches up.
  return {
    ...state,
    providerSteps: normalizedProvider,
    displayedSteps: projected,
    status: state.status === "live" ? "live" : "syncing",
    updatedAt,
    error: null,
  };
}

/** Starts a new foreground-only Pedometer session from the current projection. */
export function beginLiveStepSession(
  state: LiveStepTrackingState,
  permission: MotionStepPermission,
  updatedAt: string,
): LiveStepTrackingState {
  const base = state.displayedSteps ?? state.providerSteps;
  return {
    ...state,
    sessionBaseSteps: base,
    sessionSteps: 0,
    displayedSteps: base ?? 0,
    status: "live",
    motionAvailable: true,
    motionPermission: permission,
    updatedAt,
    error: null,
  };
}

/** Applies the cumulative count emitted by the active Pedometer subscription. */
export function projectLiveSteps(
  state: LiveStepTrackingState,
  sessionSteps: number,
  updatedAt: string,
): LiveStepTrackingState {
  const normalizedSession = nonNegativeInteger(sessionSteps);
  if (normalizedSession === null || state.sessionBaseSteps === null)
    return state;
  const projection = state.sessionBaseSteps + normalizedSession;
  return {
    ...state,
    sessionSteps: normalizedSession,
    displayedSteps: greatest(state.providerSteps, projection),
    status: "live",
    updatedAt,
    error: null,
  };
}

/** Stops only the native listener; the last projection stays in memory for reconciliation. */
export function suspendLiveStepSession(
  state: LiveStepTrackingState,
): LiveStepTrackingState {
  return {
    ...state,
    status: state.displayedSteps === null ? "idle" : "syncing",
  };
}

export function motionUnavailableState(
  state: LiveStepTrackingState,
  permission: MotionStepPermission,
  available: boolean,
  error: string | null = null,
): LiveStepTrackingState {
  const status: LiveStepStatus = error
    ? "error"
    : available
      ? permission === "denied"
        ? "denied"
        : permission === "undetermined"
          ? "permission-required"
          : state.providerSteps === null
            ? "idle"
            : "health-only"
      : state.providerSteps === null
        ? "unavailable"
        : "health-only";
  return {
    ...state,
    motionAvailable: available,
    motionPermission: permission,
    status,
    error,
  };
}
