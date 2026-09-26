import type { MotionStepPermission } from "./stepTracking";

export type MotionStepSubscription = { remove: () => void };

export type MotionStepCapability = {
  available: boolean;
  permission: MotionStepPermission;
};

export type StepMotionService = {
  getCapability: () => Promise<MotionStepCapability>;
  requestPermission: () => Promise<MotionStepCapability>;
  watchSteps: (onSteps: (steps: number) => void) => MotionStepSubscription;
};
