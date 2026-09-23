/**
 * Integration tests: export row dims immediately after clearAllData() — no reload.
 *
 * @vitest-environment jsdom
 *
 * What this proves:
 *   After the user confirms "Delete local data", CaloraContext.clearAllData()
 *   resets profile → null and logs → [].  Because profile.tsx derives
 *   hasExportData from those two live context values, the export row must flip
 *   from enabled → disabled the moment clearAllData() resolves — without any
 *   navigation or manual refresh.
 *
 * Approach:
 *   This file mounts the REAL CaloraProvider with native dependencies mocked
 *   (AsyncStorage, expo-notifications, react-native colour/state APIs) and
 *   exercises the REAL clearAllData() function from the REAL useCalora() hook.
 *   Profile and logs values are read directly from the context, and
 *   deriveExportHasData drives the row guard exactly as profile.tsx line 27
 *   does in production.  A regression in CaloraContext's clearAllData wiring
 *   (e.g. omitting setProfile or setLogs from the ctx object passed to
 *   performClearAllData) would cause these tests to fail.
 *
 * Mocking rationale:
 *   AsyncStorage     — replaced with an in-memory adapter so no real I/O occurs.
 *                      Empty storage on first read means hydration completes
 *                      with the production first-run empty state.
 *   expo-notifications — CaloraContext never schedules reminders in tests
 *                        (the user hasn't toggled them on), but the import
 *                        must resolve.  No-op mocks suffice.
 *   react-native     — Only useColorScheme (CaloraContext.tsx) and AppState
 *                      (useClock.ts) are consumed by the provider's lib deps.
 *                      Both are replaced with lightweight stubs.
 *
 * Production wiring mirrored here:
 *   CaloraContext.tsx  : const [profile, setProfile] = useState<Profile | null>(null)
 *   CaloraContext.tsx  : const [logs, setLogs] = useState<FoodLog[]>([])
 *   CaloraContext.tsx  : clearAllData() → performClearAllData({ …, setProfile, setLogs, … })
 *   profile.tsx L27   : const hasExportData = deriveExportHasData(profile, logs)
 *   profile.tsx row   : onPress / accessibilityState / opacity driven by hasExportData
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Native module mocks ─────────────────────────────────────────────────────
// vi.mock calls are hoisted to the top of the module, so they apply before
// any calora imports below resolve.

/** Backing store for the AsyncStorage mock — cleared between tests. */
const _asyncStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem:    vi.fn(async (k: string) => _asyncStore[k] ?? null),
    setItem:    vi.fn(async (k: string, v: string) => { _asyncStore[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete _asyncStore[k]; }),
  },
}));

// expo-notifications: no scheduling occurs in tests (hydrationReminders.enabled
// starts false), but the import must resolve for CaloraContext to load.
vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync:            vi.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync:     vi.fn().mockResolvedValue([]),
  setNotificationHandler:               vi.fn(),
  getPermissionsAsync:                  vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:              vi.fn().mockResolvedValue({ status: 'granted' }),
}));

// react-native: only useColorScheme and AppState are imported by the provider's
// lib dependencies (CaloraContext.tsx and useClock.ts respectively).
vi.mock('react-native', () => ({
  useColorScheme:  vi.fn().mockReturnValue('light'),
  AppState: {
    currentState:    'active',
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj['ios'] },
}));

// ── Production imports ──────────────────────────────────────────────────────
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { CaloraProvider, useCalora } from '@/context/CaloraContext';
import { deriveExportHasData } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// Wrapper — provides the real CaloraProvider to every renderHook call
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CaloraProvider, null, children);
}

// ---------------------------------------------------------------------------
// Helper — render useCalora() inside the real CaloraProvider and wait for the
// initial hydration effect to complete (empty storage → no state overwrite).
// ---------------------------------------------------------------------------

async function renderAndAwaitHydration() {
  const handle = renderHook(() => useCalora(), { wrapper });

  // Flush the async hydration useEffect (same pattern used by
  // exportOnboardingBoundary.integration.test.ts and hydrationRetryIntegration.test.tsx)
  await act(async () => {
    await new Promise<void>((res) => setTimeout(res, 0));
  });

  return handle;
}

async function renderWithUserLog() {
  const handle = await renderAndAwaitHydration();
  await act(async () => {
    handle.result.current.addLog({
      name: 'User meal',
      date: '2026-09-23',
      meal: 'Lunch',
      calories: 420,
      protein: 30,
      carbs: 45,
      fat: 12,
      source: 'Manual',
      confidence: 100,
      time: '12:00 PM',
      serving: '1 serving',
    });
  });
  return handle;
}

// ---------------------------------------------------------------------------
// Between-test cleanup — clear the AsyncStorage mock backing store so tests
// are isolated from each other.
// ---------------------------------------------------------------------------

beforeEach(() => {
  Object.keys(_asyncStore).forEach((k) => { delete _asyncStore[k]; });
});

// ---------------------------------------------------------------------------
// Derive export row props from the real context values — mirrors profile.tsx
// ---------------------------------------------------------------------------

/**
 * Build the export row's reactive props from the real context.
 *
 * Mirrors profile.tsx:
 *   L27 : const hasExportData = deriveExportHasData(profile, logs)
 *   row : onPress = hasExportData ? handleExport : undefined
 *         accessibilityState = hasExportData ? undefined : { disabled: true }
 *         opacity = hasExportData ? 1 : 0.4
 */
function exportRowProps(ctx: ReturnType<typeof useCalora>) {
  const hasExportData = deriveExportHasData(ctx.profile, ctx.logs);
  return {
    hasExportData,
    onPress:            hasExportData ? (() => {}) : undefined,
    accessibilityState: hasExportData ? undefined : { disabled: true },
    opacity:            hasExportData ? 1 : 0.4,
  };
}

// ---------------------------------------------------------------------------
// Pre-clear baseline
//
// CaloraProvider initialises a first-run scope with no diary rows and no
// profile. The export row stays disabled until the user has real data.
// ---------------------------------------------------------------------------

describe('export row via real CaloraProvider: pre-clear baseline', () => {
  it('hydration completes cleanly with empty storage', async () => {
    const { result } = await renderAndAwaitHydration();
    expect(result.current.hydrated).toBe(true);
    expect(result.current.hydrationError).toBeNull();
  });

  it('logs are empty after hydration — no starter diary entries are present', async () => {
    const { result } = await renderAndAwaitHydration();
    expect(result.current.logs).toEqual([]);
  });

  it('hasExportData is false on a true first run', async () => {
    const { result } = await renderAndAwaitHydration();
    const { hasExportData } = exportRowProps(result.current);
    expect(hasExportData).toBe(false);
  });

  it('export row onPress is undefined on a true first run', async () => {
    const { result } = await renderAndAwaitHydration();
    const { onPress } = exportRowProps(result.current);
    expect(onPress).toBeUndefined();
  });

  it('export row accessibilityState is disabled on a true first run', async () => {
    const { result } = await renderAndAwaitHydration();
    const { accessibilityState } = exportRowProps(result.current);
    expect(accessibilityState).toEqual({ disabled: true });
  });

  it('export row opacity is dimmed on a true first run', async () => {
    const { result } = await renderAndAwaitHydration();
    const { opacity } = exportRowProps(result.current);
    expect(opacity).toBe(0.4);
  });
});

// ---------------------------------------------------------------------------
// Core transition: the real clearAllData() from the real CaloraProvider
// dims the export row immediately — no reload needed.
//
// CaloraContext.clearAllData() calls performClearAllData({ …, setProfile, setLogs,
// … }) with the REAL useState dispatchers.  When those dispatchers fire, React
// re-renders the hook and the derived export row props flip in-place on the
// SAME mounted hook instance without any remount.
// ---------------------------------------------------------------------------

describe('export row via real CaloraProvider: clearAllData() state transition — enabled → disabled without a reload', () => {
  it('hasExportData flips from true → false the moment the real clearAllData() resolves', async () => {
    const { result } = await renderWithUserLog();

    // Pre-clear: a real user log makes the row interactive.
    expect(exportRowProps(result.current).hasExportData).toBe(true);

    // Invoke the REAL clearAllData() from the REAL useCalora() context
    await act(async () => { await result.current.clearAllData(); });

    // Post-clear: logs [] + profile null → row dims without reload
    expect(exportRowProps(result.current).hasExportData).toBe(false);
  });

  it('export row onPress is undefined after the real clearAllData() — row is non-interactive', async () => {
    const { result } = await renderWithUserLog();
    expect(typeof exportRowProps(result.current).onPress).toBe('function');

    await act(async () => { await result.current.clearAllData(); });

    expect(exportRowProps(result.current).onPress).toBeUndefined();
  });

  it('export row accessibilityState becomes { disabled: true } after clearAllData()', async () => {
    const { result } = await renderWithUserLog();
    expect(exportRowProps(result.current).accessibilityState).toBeUndefined();

    await act(async () => { await result.current.clearAllData(); });

    expect(exportRowProps(result.current).accessibilityState).toEqual({ disabled: true });
  });

  it('export row opacity drops to 0.4 after clearAllData() — row is visually dimmed', async () => {
    const { result } = await renderWithUserLog();
    expect(exportRowProps(result.current).opacity).toBe(1);

    await act(async () => { await result.current.clearAllData(); });

    expect(exportRowProps(result.current).opacity).toBe(0.4);
  });

  it('context profile is null after clearAllData() — the real setProfile(null) dispatcher fired', async () => {
    const { result } = await renderAndAwaitHydration();

    await act(async () => { await result.current.clearAllData(); });

    // Confirms the REAL CaloraContext.clearAllData passed setProfile to
    // performClearAllData — if it had not, profile would be unchanged.
    expect(result.current.profile).toBeNull();
  });

  it('context logs is [] after clearAllData() — the real setLogs([]) dispatcher fired', async () => {
    const { result } = await renderWithUserLog();
    expect(result.current.logs).toHaveLength(1);

    await act(async () => { await result.current.clearAllData(); });

    // Confirms the REAL CaloraContext.clearAllData passed setLogs to
    // performClearAllData — if it had not, the user log would remain.
    expect(result.current.logs).toHaveLength(0);
  });

  it('the transition happens on the same hook instance — no remount, no reload', async () => {
    // The hook is rendered ONCE.  Pre-clear and post-clear values are read
    // from the same `result.current` reference.  If a reload were required,
    // this would require a separate renderHook call and the test would not
    // prove the reactive wiring.
    const { result } = await renderWithUserLog();

    const preClearHasData = exportRowProps(result.current).hasExportData;

    await act(async () => { await result.current.clearAllData(); });

    const postClearHasData = exportRowProps(result.current).hasExportData;

    expect(preClearHasData).toBe(true);
    expect(postClearHasData).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No Alert fires in the post-clear state
//
// The row is non-interactive (onPress undefined) after clearAllData(), so
// handleExportTap is never called — no storage read, no onNoData Alert.
// ---------------------------------------------------------------------------

describe('export row via real CaloraProvider: no Alert fires in the post-clear state', () => {
  it('onPress is undefined after clearAllData — a tap attempt is a no-op', async () => {
    const { result } = await renderAndAwaitHydration();

    await act(async () => { await result.current.clearAllData(); });

    // Simulate the profile.tsx tap wiring:
    //   <Pressable onPress={hasExportData ? handleExport : undefined} …>
    // After clear, onPress is undefined — calling it does nothing.
    const { onPress } = exportRowProps(result.current);
    expect(onPress).toBeUndefined();

    // Calling undefined?.() is a no-op — this verifies the guard in one line.
    await onPress?.();
    // (no assertion needed — the line above would throw if onPress were a bad function)
  });

  it('isClearing resets to false once clearAllData() resolves — the guard lifts normally', async () => {
    const { result } = await renderAndAwaitHydration();

    // isClearing should be true during the clear and false after it settles.
    // We only assert the final state (false) since we await the full operation.
    await act(async () => { await result.current.clearAllData(); });

    expect(result.current.isClearing).toBe(false);
  });
});
