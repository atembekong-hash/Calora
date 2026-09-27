import type { MotionStepPermission } from "./stepTracking";

export type MotionStepSubscription = { remove: () => void };

/**
 * The native Android bridge can report a negative cumulative value after its
 * hardware baseline resets. It is a lifecycle signal, not a step total.
 */
export type MotionStepEvent =
  { type: "steps"; steps: number } | { type: "counter-reset" };

/** Convert an Expo Pedometer bridge value into the explicit service contract. */
export function normalizeMotionStepEvent(
  steps: unknown,
): MotionStepEvent | null {
  if (typeof steps !== "number" || !Number.isFinite(steps)) return null;
  if (steps < 0) return { type: "counter-reset" };
  return { type: "steps", steps: Math.floor(steps) };
}

export type MotionStepCapability = {
  available: boolean;
  permission: MotionStepPermission;
};

export type StepMotionService = {
  getCapability: () => Promise<MotionStepCapability>;
  requestPermission: () => Promise<MotionStepCapability>;
  /** Opens this app's native settings page after a permanent permission denial. */
  openSettings: () => Promise<void>;
  watchSteps: (
    onEvent: (event: MotionStepEvent) => void,
  ) => MotionStepSubscription;
};
