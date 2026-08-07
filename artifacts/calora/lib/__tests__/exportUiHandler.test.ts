/**
 * exportUiHandler — Settings export tap branch tests.
 *
 * These tests confirm the two UI branches that fire when the user taps
 * "Export your data" in the Settings (Profile) screen:
 *
 *   1. exportRawStorageData() returns null  → onNoData() fires (no share sheet)
 *   2. exportRawStorageData() returns a string → onData(raw) fires (share sheet)
 *
 * The handler is extracted into lib/exportUiHandler.ts so both branches are
 * testable without mounting React, mocking AsyncStorage globally, or reaching
 * into a React Native render tree.
 *
 * The production wiring in profile.tsx is:
 *   await handleExportTap({
 *     exportRawStorageData,            // CaloraContext.exportRawStorageData
 *     onNoData: () => Alert.alert('No data', '…'),
 *     onData:   (_raw) => setPrivacyModal('export'),
 *   });
 *
 * These tests verify the decision logic that drives those two callbacks so
 * any future refactor of the export UI that removes the null check will
 * break a test here before it can silently share empty or broken data.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveExportHasData, handleExportTap } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the full JSON string that exportRawStorageData returns for a live session. */
function makeRawExport(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 2,
    profile: { name: 'Alex', goal: 'lose', weightKg: 76 },
    logs: [
      { id: 'log-1', name: 'Overnight oats', date: '2026-08-07', meal: 'Breakfast' },
    ],
    weights: [{ id: 'weight-1', date: '2026-08-07', kg: 76, source: 'manual' }],
    waterLogs: { '2026-08-07': 48 },
    moodLogs: { '2026-08-07': 'good' },
    savedMeals: [],
    localRecipes: [],
    savedRecipeIds: [],
    plannerMeals: [],
    shoppingItems: [],
    foodDrafts: [],
    foodMemories: [],
    repeatPatterns: [],
    memoryCorrections: [],
    consentAccepted: true,
    coachConsentAccepted: true,
    coachMessages: [],
    healthConnected: false,
    ...overrides,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Shared spies — reset before every test
// ---------------------------------------------------------------------------

let onNoData: ReturnType<typeof vi.fn>;
let onData: ReturnType<typeof vi.fn>;

beforeEach(() => {
  onNoData = vi.fn();
  onData   = vi.fn();
});

// ---------------------------------------------------------------------------
// Null path (post-clear / empty storage)
// ---------------------------------------------------------------------------

describe('handleExportTap: null return from exportRawStorageData (post-clear storage)', () => {
  it('calls onNoData and does NOT call onData when storage is empty after a clear', async () => {
    // exportRawStorageData returns null when the storage key is absent —
    // the state after CaloraContext.clearAllData() resolves.
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onNoData).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
  });

  it('does NOT pass null or an empty string to the share-sheet callback', async () => {
    // Regression guard: the share-sheet callback must never be called with
    // null or '' — either would produce a broken or empty share payload.
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onData).not.toHaveBeenCalled();
    // If onData were called, assert it would not carry null/'':
    for (const call of onData.mock.calls) {
      expect(call[0]).not.toBeNull();
      expect(call[0]).not.toBe('');
    }
  });

  it('onNoData fires exactly once — no duplicate alerts on a single tap', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    expect(onNoData).toHaveBeenCalledTimes(1);
  });

  it('the export tap resolves without throwing when storage is empty', async () => {
    // The UI tap handler must not throw — an unhandled rejection here would
    // crash the screen or silence the "No data" alert entirely.
    await expect(
      handleExportTap({
        exportRawStorageData: async () => null,
        onNoData,
        onData,
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Non-null path (live session with data)
// ---------------------------------------------------------------------------

describe('handleExportTap: non-null return from exportRawStorageData (share-sheet path)', () => {
  it('calls onData with the raw string and does NOT call onNoData', async () => {
    const raw = makeRawExport();

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith(raw);
    expect(onNoData).not.toHaveBeenCalled();
  });

  it('onData receives the exact unmodified bytes returned by exportRawStorageData', async () => {
    // The handler must not transform, truncate, or re-encode the raw string —
    // the share sheet needs the exact bytes the context produced.
    const raw = makeRawExport({ profile: { name: 'Jordan', goal: 'maintain', weightKg: 65 } });

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    expect(onData.mock.calls[0][0]).toBe(raw);
    // Confirm it is valid JSON and carries the profile name through unmodified.
    const parsed = JSON.parse(onData.mock.calls[0][0]) as Record<string, unknown>;
    expect((parsed['profile'] as Record<string, unknown>)['name']).toBe('Jordan');
  });

  it('onData fires exactly once — no duplicate share-sheet triggers on a single tap', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    expect(onData).toHaveBeenCalledTimes(1);
  });

  it('the export tap resolves without throwing when data is present', async () => {
    await expect(
      handleExportTap({
        exportRawStorageData: async () => makeRawExport(),
        onNoData,
        onData,
      }),
    ).resolves.toBeUndefined();
  });

  it('onData receives valid JSON — the share payload is parseable', async () => {
    const raw = makeRawExport();

    await handleExportTap({
      exportRawStorageData: async () => raw,
      onNoData,
      onData,
    });

    const received = onData.mock.calls[0][0] as string;
    expect(() => JSON.parse(received)).not.toThrow();
    const parsed = JSON.parse(received) as Record<string, unknown>;
    expect(typeof parsed['schemaVersion']).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Branch exclusivity
// ---------------------------------------------------------------------------

describe('handleExportTap: branches are mutually exclusive', () => {
  it('exactly one callback fires — null path calls only onNoData', async () => {
    await handleExportTap({
      exportRawStorageData: async () => null,
      onNoData,
      onData,
    });

    const totalCalls = onNoData.mock.calls.length + onData.mock.calls.length;
    expect(totalCalls).toBe(1);
    expect(onNoData).toHaveBeenCalledTimes(1);
  });

  it('exactly one callback fires — data path calls only onData', async () => {
    await handleExportTap({
      exportRawStorageData: async () => makeRawExport(),
      onNoData,
      onData,
    });

    const totalCalls = onNoData.mock.calls.length + onData.mock.calls.length;
    expect(totalCalls).toBe(1);
    expect(onData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Post-clear then re-onboard: null → data across two taps
// ---------------------------------------------------------------------------

describe('handleExportTap: across multiple taps, each tap independently reads the current storage state', () => {
  it('first tap returns null (post-clear), second tap returns data (re-onboarded) — each fires the correct branch', async () => {
    // Simulates the user flow:
    //   1. Taps "Clear all data" → storage is wiped
    //   2. Taps "Export" → null → Alert "No data"
    //   3. Completes onboarding again → data written to storage
    //   4. Taps "Export" → non-null → share sheet opens
    let callCount = 0;
    const rawAfterOnboard = makeRawExport({ profile: { name: 'Alex' } });
    const exportRawStorageData = async () => {
      callCount += 1;
      return callCount === 1 ? null : rawAfterOnboard;
    };

    // First tap — post-clear, storage empty
    const onNoData1 = vi.fn();
    const onData1   = vi.fn();
    await handleExportTap({ exportRawStorageData, onNoData: onNoData1, onData: onData1 });
    expect(onNoData1).toHaveBeenCalledTimes(1);
    expect(onData1).not.toHaveBeenCalled();

    // Second tap — re-onboarded, data present
    const onNoData2 = vi.fn();
    const onData2   = vi.fn();
    await handleExportTap({ exportRawStorageData, onNoData: onNoData2, onData: onData2 });
    expect(onData2).toHaveBeenCalledTimes(1);
    expect(onData2).toHaveBeenCalledWith(rawAfterOnboard);
    expect(onNoData2).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deriveExportHasData — export row guard (profile screen)
// ---------------------------------------------------------------------------

/**
 * deriveExportHasData drives the "Export your data" row guard in profile.tsx.
 * When it returns false the row is visually dimmed (opacity 0.4) and its
 * onPress is set to undefined — making it non-interactive without any Alert.
 *
 * These tests pin the three behaviorally-distinct states:
 *   A. profile set, any logs     → true  (full session)
 *   B. profile set, no logs      → true  (just onboarded, no diary yet)
 *   C. profile null, logs exist  → true  (edge: logs without profile)
 *   D. profile null, no logs     → false (post-clear / fresh install)
 */
describe('deriveExportHasData: export row interactive guard', () => {
  const profile = { name: 'Alex' };
  const log = { id: 'log-1' };

  it('returns true when profile is set and logs exist (full session)', () => {
    expect(deriveExportHasData(profile, [log])).toBe(true);
  });

  it('returns true when profile is set but logs array is empty (just onboarded)', () => {
    // Onboarding writes a profile before any meals are logged.
    expect(deriveExportHasData(profile, [])).toBe(true);
  });

  it('returns true when profile is null but logs exist (logs-only edge case)', () => {
    // Should not normally occur, but the guard must not block export
    // when there is diary data even without a profile object.
    expect(deriveExportHasData(null, [log])).toBe(true);
  });

  it('returns false when profile is null and logs array is empty (post-clear / fresh install)', () => {
    // This is the only state where the export row must be non-interactive.
    // After clearAllData both profile and logs reset to null / [].
    expect(deriveExportHasData(null, [])).toBe(false);
  });

  it('the row is non-interactive when hasData is false — onPress must be undefined', () => {
    // Simulate how profile.tsx wires the row:
    //   onPress: item.disabled ? undefined : item.onPress
    const hasData = deriveExportHasData(null, []);
    const handleExportMock = vi.fn();
    const resolvedOnPress = hasData ? handleExportMock : undefined;
    expect(resolvedOnPress).toBeUndefined();
    // Calling it does nothing — no export attempt made
    (resolvedOnPress as (() => void) | undefined)?.();
    expect(handleExportMock).not.toHaveBeenCalled();
  });

  it('the row IS interactive when hasData is true — onPress points to the handler', () => {
    const hasData = deriveExportHasData(profile, []);
    const handleExportMock = vi.fn();
    const resolvedOnPress = hasData ? handleExportMock : undefined;
    expect(typeof resolvedOnPress).toBe('function');
    resolvedOnPress?.();
    expect(handleExportMock).toHaveBeenCalledTimes(1);
  });
});
