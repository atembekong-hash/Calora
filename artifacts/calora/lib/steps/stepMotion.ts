import type {
  MotionStepCapability,
  StepMotionService,
} from "./stepMotion.types";

export type {
  MotionStepCapability,
  MotionStepSubscription,
  StepMotionService,
} from "./stepMotion.types";

const unsupported: MotionStepCapability = {
  available: false,
  permission: "unavailable",
};

/**
 * Server/test fallback. Metro resolves stepMotion.native.ts and stepMotion.web.ts
 * for application builds; this module keeps non-native test imports safe.
 */
export const stepMotionService: StepMotionService = {
  async getCapability() {
    return unsupported;
  },
  async requestPermission() {
    return unsupported;
  },
  async openSettings() {
    throw new Error("Motion settings are unavailable in this environment.");
  },
  watchSteps() {
    return { remove() {} };
  },
};
