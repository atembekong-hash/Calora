/**
 * @vitest-environment jsdom
 *
 * These tests mount the real CaloraProvider while replacing only device I/O.
 * They prove the foreground Pedometer lifecycle and permanent-denial recovery
 * that pure step arithmetic tests cannot cover.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const asyncStore = vi.hoisted(() => ({ values: {} as Record<string, string> }));
const motion = vi.hoisted(() => {
  let listeners: Array<
    (
      event: { type: "steps"; steps: number } | { type: "counter-reset" },
    ) => void
  > = [];
  const remove = vi.fn();
  return {
    capability: {
      available: true,
      permission: "granted" as "granted" | "denied",
    },
    requestCapability: {
      available: true,
      permission: "granted" as "granted" | "denied",
    },
    remove,
    openSettings: vi.fn(async () => undefined),
    emit(steps: number) {
      listeners.at(-1)?.({ type: "steps", steps });
    },
    emitCounterReset() {
      listeners.at(-1)?.({ type: "counter-reset" });
    },
    emitStale(steps: number) {
      listeners[0]?.({ type: "steps", steps });
    },
    reset() {
      listeners = [];
      remove.mockReset();
      this.openSettings.mockReset();
      this.openSettings.mockResolvedValue(undefined);
      this.capability = { available: true, permission: "granted" };
      this.requestCapability = { available: true, permission: "granted" };
    },
    service: {
      getCapability: vi.fn(async () => motion.capability),
      requestPermission: vi.fn(async () => motion.requestCapability),
      openSettings: vi.fn(async () => motion.openSettings()),
      watchSteps: vi.fn(
        (
          callback: (
            event: { type: "steps"; steps: number } | { type: "counter-reset" },
          ) => void,
        ) => {
          listeners.push(callback);
          return { remove };
        },
      ),
    },
  };
});
const native = vi.hoisted(() => {
  const listeners = new Set<(state: string) => void>();
  return {
    emit(state: string) {
      listeners.forEach((listener) => listener(state));
    },
    reset() {
      listeners.clear();
    },
    appState: {
      currentState: "active",
      addEventListener: vi.fn(
        (_event: string, listener: (state: string) => void) => {
          listeners.add(listener);
          return { remove: vi.fn(() => listeners.delete(listener)) };
        },
      ),
    },
  };
});
const health = vi.hoisted(() => {
  const emptyConnection = {
    provider: "unsupported",
    authorization: "unavailable",
    granted: [],
  };
  return {
    connection: emptyConnection as {
      provider: string;
      authorization: string;
      granted: string[];
    },
    snapshot: {
      syncedAt: "2026-09-26T09:00:00.000Z",
      steps: 0,
      activeEnergyKcal: null,
      workouts: [],
      weights: [],
    },
    reset() {
      this.connection = emptyConnection;
      this.snapshot = {
        syncedAt: "2026-09-26T09:00:00.000Z",
        steps: 0,
        activeEnergyKcal: null,
        workouts: [],
        weights: [],
      };
      this.service.getConnection.mockClear();
      this.service.requestConnection.mockClear();
      this.service.sync.mockClear();
    },
    service: {
      getConnection: vi.fn(async () => health.connection),
      requestConnection: vi.fn(async () => health.connection),
      sync: vi.fn(async () => health.snapshot),
    },
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStore.values[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStore.values[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete asyncStore.values[key];
    }),
  },
}));

vi.mock("expo-notifications", () => ({
  scheduleNotificationAsync: vi.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
}));

vi.mock("react-native", () => ({
  useColorScheme: vi.fn().mockReturnValue("light"),
  AppState: native.appState,
  Platform: {
    OS: "ios",
    select: (values: Record<string, unknown>) => values.ios,
  },
}));

vi.mock("@/lib/steps/stepMotion", () => ({
  stepMotionService: motion.service,
}));

vi.mock("@/lib/health/healthService", () => ({
  healthService: health.service,
}));

import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { CaloraProvider, useCalora } from "@/context/CaloraContext";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CaloraProvider, null, children);
}

async function renderAndAwaitHydration() {
  const handle = renderHook(() => useCalora(), { wrapper });
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  return handle;
}

async function focusDashboard(
  handle: Awaited<ReturnType<typeof renderAndAwaitHydration>>,
) {
  await act(async () => {
    handle.result.current.setLiveStepsDashboardFocused(true);
    await Promise.resolve();
  });
}

beforeEach(() => {
  Object.keys(asyncStore.values).forEach(
    (key) => delete asyncStore.values[key],
  );
  motion.reset();
  motion.service.getCapability.mockClear();
  motion.service.requestPermission.mockClear();
  motion.service.watchSteps.mockClear();
  native.reset();
  native.appState.currentState = "active";
  health.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("foreground live-step lifecycle", () => {
  it("counts a no-Health foreground session, then removes the listener on background", async () => {
    const handle = await renderAndAwaitHydration();

    await focusDashboard(handle);
    expect(motion.service.getCapability).toHaveBeenCalledTimes(1);
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(1);

    await act(async () => {
      motion.emit(5);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(5);
    expect(handle.result.current.liveStepTracking.providerSteps).toBeNull();
    expect(handle.result.current.liveStepTracking.status).toBe("live");

    await act(async () => {
      native.emit("background");
    });
    expect(motion.remove).toHaveBeenCalledTimes(1);
    expect(handle.result.current.liveStepTracking.status).toBe("syncing");
  });

  it("opens app settings after permanent motion denial instead of requesting permission again", async () => {
    motion.capability = { available: true, permission: "denied" };
    const handle = await renderAndAwaitHydration();

    await act(async () => {
      handle.result.current.setLiveStepsDashboardFocused(true);
      await handle.result.current.startLiveStepTracking();
    });
    expect(handle.result.current.liveStepTracking.status).toBe("denied");
    expect(motion.service.requestPermission).not.toHaveBeenCalled();

    await act(async () => {
      await handle.result.current.openMotionSettings();
    });
    expect(motion.openSettings).toHaveBeenCalledTimes(1);
    expect(motion.service.watchSteps).not.toHaveBeenCalled();
  });

  it("restarts the foreground listener when a native counter resets", async () => {
    const handle = await renderAndAwaitHydration();

    await act(async () => {
      handle.result.current.setLiveStepsDashboardFocused(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      motion.emit(5);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(5);

    await act(async () => {
      motion.emitCounterReset();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(motion.remove).toHaveBeenCalledTimes(1);
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(2);
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(5);

    await act(async () => {
      motion.emit(3);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(8);
  });

  it("reconciles a lagging provider aggregate through the first bounded retry", async () => {
    health.connection = {
      provider: "healthkit",
      authorization: "authorized",
      granted: ["steps"],
    };
    health.snapshot = {
      syncedAt: "2026-09-26T09:00:00.000Z",
      steps: 1_000,
      activeEnergyKcal: null,
      workouts: [],
      weights: [],
    };
    const handle = await renderAndAwaitHydration();
    vi.useFakeTimers();

    await act(async () => {
      handle.result.current.setLiveStepsDashboardFocused(true);
      await vi.advanceTimersByTimeAsync(0);
      motion.emit(5);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(1_005);
    expect(handle.result.current.liveStepTracking.providerSteps).toBe(1_000);

    health.snapshot = {
      ...health.snapshot,
      syncedAt: "2026-09-26T09:01:00.000Z",
      steps: 1_005,
    };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(health.service.sync).toHaveBeenCalled();
    expect(handle.result.current.liveStepTracking.providerSteps).toBe(1_005);
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(1_005);
  });

  it("starts one fresh stream after repeated background-to-active transitions and ignores stale callbacks", async () => {
    const handle = await renderAndAwaitHydration();
    await focusDashboard(handle);
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(1);

    await act(async () => {
      native.emit("background");
      native.emit("active");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(2);

    await act(async () => {
      motion.emitStale(99);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).not.toBe(99);

    await act(async () => {
      motion.emit(2);
    });
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(2);

    await act(async () => {
      native.emit("background");
      native.emit("active");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(3);
    expect(motion.remove).toHaveBeenCalledTimes(2);
  });

  it("replaces the foreground subscription at the next local-day boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 26, 23, 59, 59));
    const handle = renderHook(() => useCalora(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await focusDashboard(handle);
    await act(async () => {
      motion.emit(5);
    });
    expect(handle.result.current.liveStepTracking.day).toBe("2026-09-26");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(motion.remove).toHaveBeenCalledTimes(1);
    expect(motion.service.watchSteps).toHaveBeenCalledTimes(2);
    expect(handle.result.current.liveStepTracking.day).toBe("2026-09-27");
    expect(handle.result.current.liveStepTracking.displayedSteps).toBe(0);
  });
});
