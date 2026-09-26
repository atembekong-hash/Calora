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
  watchSteps() {
    return { remove() {} };
  },
};
