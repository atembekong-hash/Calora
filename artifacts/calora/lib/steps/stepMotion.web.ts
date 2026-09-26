import type { StepMotionService } from "./stepMotion.types";

/** Web browsers do not receive Calora's native foreground Pedometer stream. */
export const stepMotionService: StepMotionService = {
  async getCapability() {
    return { available: false, permission: "unavailable" };
  },
  async requestPermission() {
    return { available: false, permission: "unavailable" };
  },
  watchSteps() {
    return { remove() {} };
  },
};
