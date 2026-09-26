import type { MotionStepPermission } from "./stepTracking";

export type MotionStepSubscription = { remove: () => void };

export type MotionStepCapability = {
  available: boolean;
  permission: MotionStepPermission;
};

export type StepMotionService = {
  getCapability: () => Promise<MotionStepCapability>;
  requestPermission: () => Promise<MotionStepCapability>;
  /** Opens this app's native settings page after a permanent permission denial. */
  openSettings: () => Promise<void>;
  watchSteps: (onSteps: (steps: number) => void) => MotionStepSubscription;
};
