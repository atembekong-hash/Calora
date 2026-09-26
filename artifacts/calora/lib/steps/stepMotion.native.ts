import { Pedometer } from "expo-sensors";
import { Linking } from "react-native";
import type { MotionStepPermission } from "./stepTracking";
import type {
  MotionStepCapability,
  StepMotionService,
} from "./stepMotion.types";

function permissionFrom(response: {
  granted?: boolean;
  status?: string;
}): MotionStepPermission {
  if (response.granted || response.status === "granted") return "granted";
  if (response.status === "denied") return "denied";
  return "undetermined";
}

async function getCapability(): Promise<MotionStepCapability> {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return { available: false, permission: "unavailable" };
  const permission = await Pedometer.getPermissionsAsync();
  return { available: true, permission: permissionFrom(permission) };
}

/**
 * Foreground-only native Pedometer bridge. Expo delivers its callback from the
 * platform sensor/Core Motion and stops it when the app backgrounds; provider
 * reconciliation remains owned by CaloraContext.
 */
export const stepMotionService: StepMotionService = {
  getCapability,
  async requestPermission() {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return { available: false, permission: "unavailable" };
    const permission = await Pedometer.requestPermissionsAsync();
    return { available: true, permission: permissionFrom(permission) };
  },
  async openSettings() {
    await Linking.openSettings();
  },
  watchSteps(onSteps) {
    return Pedometer.watchStepCount((result) => {
      if (
        typeof result.steps === "number" &&
        Number.isFinite(result.steps) &&
        result.steps >= 0
      ) {
        onSteps(Math.floor(result.steps));
      }
    });
  },
};
