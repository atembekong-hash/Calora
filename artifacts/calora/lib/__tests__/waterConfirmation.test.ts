/**
 * waterConfirmation — module-level deadline helpers
 *
 * Verifies that the confirmation window logic is correct, including:
 *  - isWaterConfirmed() returns true immediately after recording
 *  - isWaterConfirmed() returns false after the window elapses
 *  - getWaterConfirmationRemaining() decreases over time
 *  - clearWaterConfirmation() resets state
 *  - Module-level state survives a simulated remount (no re-initialisation)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIRMATION_WINDOW_MS,
  clearWaterConfirmation,
  getWaterConfirmationRemaining,
  isWaterConfirmed,
  recordWaterConfirmation,
} from '../waterConfirmation';

beforeEach(() => {
  vi.useFakeTimers();
  clearWaterConfirmation();
});

afterEach(() => {
  vi.useRealTimers();
  clearWaterConfirmation();
});

describe('recordWaterConfirmation + isWaterConfirmed', () => {
  it('returns false before any confirmation is recorded', () => {
    expect(isWaterConfirmed()).toBe(false);
  });

  it('returns true immediately after recording', () => {
    recordWaterConfirmation();
    expect(isWaterConfirmed()).toBe(true);
  });

  it('returns false after the full window has elapsed', () => {
    recordWaterConfirmation();
    vi.advanceTimersByTime(CONFIRMATION_WINDOW_MS);
    expect(isWaterConfirmed()).toBe(false);
  });

  it('returns true 1 ms before the window closes', () => {
    recordWaterConfirmation();
    vi.advanceTimersByTime(CONFIRMATION_WINDOW_MS - 1);
    expect(isWaterConfirmed()).toBe(true);
  });
});

describe('getWaterConfirmationRemaining', () => {
  it('returns 0 when no confirmation is active', () => {
    expect(getWaterConfirmationRemaining()).toBe(0);
  });

  it('returns approximately CONFIRMATION_WINDOW_MS immediately after recording', () => {
    recordWaterConfirmation();
    const remaining = getWaterConfirmationRemaining();
    // Allow 1 ms of execution drift
    expect(remaining).toBeGreaterThanOrEqual(CONFIRMATION_WINDOW_MS - 1);
    expect(remaining).toBeLessThanOrEqual(CONFIRMATION_WINDOW_MS);
  });

  it('decreases as time passes', () => {
    recordWaterConfirmation();
    vi.advanceTimersByTime(500);
    const remaining = getWaterConfirmationRemaining();
    expect(remaining).toBeLessThanOrEqual(CONFIRMATION_WINDOW_MS - 500);
    expect(remaining).toBeGreaterThan(0);
  });

  it('returns 0 once the window has elapsed', () => {
    recordWaterConfirmation();
    vi.advanceTimersByTime(CONFIRMATION_WINDOW_MS);
    expect(getWaterConfirmationRemaining()).toBe(0);
  });
});

describe('clearWaterConfirmation', () => {
  it('resets isWaterConfirmed to false', () => {
    recordWaterConfirmation();
    clearWaterConfirmation();
    expect(isWaterConfirmed()).toBe(false);
  });

  it('resets getWaterConfirmationRemaining to 0', () => {
    recordWaterConfirmation();
    clearWaterConfirmation();
    expect(getWaterConfirmationRemaining()).toBe(0);
  });
});

describe('module-level persistence (simulated remount)', () => {
  it('remains active partway through the window when "remounted" after 700 ms', () => {
    // Simulate: user taps button (component A mounts and records)
    recordWaterConfirmation();

    // Simulate: user switches tabs — component unmounts (but module state persists)
    vi.advanceTimersByTime(700);

    // Simulate: user returns — component remounts and checks module state
    expect(isWaterConfirmed()).toBe(true);
    const remaining = getWaterConfirmationRemaining();
    // Roughly 800 ms left (allow 2 ms drift)
    expect(remaining).toBeGreaterThanOrEqual(CONFIRMATION_WINDOW_MS - 700 - 2);
    expect(remaining).toBeLessThanOrEqual(CONFIRMATION_WINDOW_MS - 700 + 2);
  });

  it('is expired when the user returns after the full window', () => {
    recordWaterConfirmation();
    vi.advanceTimersByTime(CONFIRMATION_WINDOW_MS + 50);
    expect(isWaterConfirmed()).toBe(false);
    expect(getWaterConfirmationRemaining()).toBe(0);
  });
});
