/**
 * Goal-celebration gate — integration behaviour tests.
 *
 * These tests exercise the production `celebrationGate` helper extracted from
 * InsightsScreen.  The helper encodes the conditions under which the goal-reached
 * banner fires, is silently suppressed, or the seen-flag resets.  Testing it
 * directly ensures a future refactor of the effect cannot silently break the guard.
 *
 * Scenarios covered:
 *   1. Fresh-install suppression: goal already satisfied at hydration →
 *      banner must NOT appear; seen-flag marked silently.
 *   2. App restart with persisted seen-flag → banner must NOT appear.
 *   3. Genuine in-session crossing (goal not reached at hydration, then
 *      user logs a weigh-in that crosses it) → banner MUST appear and
 *      markGoalCelebrationSeen is called exactly once.
 *   4. Drift above goal then re-crossing → banner replays.
 */

import { describe, expect, it, vi } from 'vitest';
import { celebrationGate, type CelebrationGateArgs } from '@/lib/goalCelebration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate running the celebration useEffect against the production gate. */
function runEffect(args: CelebrationGateArgs) {
  const setShowGoalCelebration = vi.fn();
  const markGoalCelebrationSeen = vi.fn();
  const resetGoalCelebrationSeen = vi.fn();

  const decision = celebrationGate(args);
  if (decision === 'show') {
    setShowGoalCelebration(true);
    markGoalCelebrationSeen(args.targetWeight);
    // (haptics omitted from test helper — not testable in this environment)
  } else if (decision === 'markSeenSilently') {
    markGoalCelebrationSeen(args.targetWeight);
    // No banner, no haptic.
  } else if (decision === 'reset') {
    resetGoalCelebrationSeen();
  }

  return { setShowGoalCelebration, markGoalCelebrationSeen, resetGoalCelebrationSeen, decision };
}

// ---------------------------------------------------------------------------
// 1. Fresh-install suppression
//    Goal was already satisfied at the moment hydration completed —
//    the banner must NOT appear, but the seen-flag IS persisted silently.
// ---------------------------------------------------------------------------

describe('goal celebration — fresh-install suppression (goal already reached at hydration)', () => {
  it('returns markSeenSilently when goal was reached before any in-session weigh-in', () => {
    // Simulates: user installs, profile target = 68, first weigh-in already 67 kg.
    // goalReachedAtHydration = true because the goal is satisfied the instant hydration completes.
    const result = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null, // no prior history
      targetWeight: 68,
      goalReachedAtHydration: true,
    });

    expect(result.decision).toBe('markSeenSilently');
    // Seen-flag MUST be persisted so the next session skips evaluation.
    expect(result.markGoalCelebrationSeen).toHaveBeenCalledTimes(1);
    expect(result.markGoalCelebrationSeen).toHaveBeenCalledWith(68);
    // Banner must NOT appear.
    expect(result.setShowGoalCelebration).not.toHaveBeenCalled();
  });

  it('does not show the banner when showGoalProgress is false at hydration', () => {
    const result = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: false, // < 3 weigh-ins
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('none');
    expect(result.setShowGoalCelebration).not.toHaveBeenCalled();
    expect(result.markGoalCelebrationSeen).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. App-restart guard
//    The stored seen-flag matches the current target → banner must NOT appear.
// ---------------------------------------------------------------------------

describe('goal celebration — app restart with persisted seen-flag', () => {
  it('returns none when the seen-flag matches the current target (banner stays gone on reload)', () => {
    const result = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: 68, // matches targetWeight
      targetWeight: 68,
      goalReachedAtHydration: true,
    });

    expect(result.decision).toBe('none');
    expect(result.setShowGoalCelebration).not.toHaveBeenCalled();
    expect(result.markGoalCelebrationSeen).not.toHaveBeenCalled();
  });

  it('returns none before hydration even when the goal is reached (pre-hydration guard)', () => {
    // hydrated = false simulates the first render before AsyncStorage resolves.
    const result = runEffect({
      hydrated: false,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('none');
    expect(result.setShowGoalCelebration).not.toHaveBeenCalled();
    expect(result.markGoalCelebrationSeen).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Genuine in-session crossing
//    Goal was NOT reached at hydration, then a new weigh-in crosses it.
//    Banner MUST appear and markGoalCelebrationSeen called exactly once.
// ---------------------------------------------------------------------------

describe('goal celebration — genuine in-session crossing', () => {
  it('returns show on a genuine in-session crossing (goal not reached at hydration)', () => {
    // Simulates: user had weigh-ins at 75, 72, 70 kg (above target of 68).
    // goalReachedAtHydration = false.  Then they log 67 kg → goal reached.
    const result = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false, // key: goal was NOT reached at hydration
    });

    expect(result.decision).toBe('show');
    expect(result.setShowGoalCelebration).toHaveBeenCalledTimes(1);
    expect(result.setShowGoalCelebration).toHaveBeenCalledWith(true);
    expect(result.markGoalCelebrationSeen).toHaveBeenCalledTimes(1);
    expect(result.markGoalCelebrationSeen).toHaveBeenCalledWith(68);
  });

  it('returns none on a subsequent run once the seen-flag has been updated (no duplicate fires)', () => {
    // After the first run, context updates goalCelebrationSeenTargetKg → 68.
    const first = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });
    expect(first.decision).toBe('show');

    // Subsequent run: seen-flag now matches.
    const second = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: 68,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });
    expect(second.decision).toBe('none');
    expect(second.markGoalCelebrationSeen).not.toHaveBeenCalled();
  });

  it('returns show when the seen-flag records a different (old) target', () => {
    // User previously hit goal 70, then changed goal to 68 and just crossed it.
    const result = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: 70, // old goal's seen-flag
      targetWeight: 68,                // new goal just reached
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('show');
    expect(result.markGoalCelebrationSeen).toHaveBeenCalledWith(68);
  });
});

// ---------------------------------------------------------------------------
// 4. Drift above goal then re-crossing
//    Reset fires when user goes above goal; celebration replays on next crossing.
// ---------------------------------------------------------------------------

describe('goal celebration — drift above goal then re-crossing', () => {
  it('returns reset when the user drifts above their goal after reaching it', () => {
    // goalReached is now false but the seen-flag still equals the current target.
    const result = runEffect({
      hydrated: true,
      goalReached: false,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: 68,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('reset');
    expect(result.resetGoalCelebrationSeen).toHaveBeenCalledTimes(1);
    expect(result.markGoalCelebrationSeen).not.toHaveBeenCalled();
  });

  it('returns show when the user re-crosses after drifting above goal', () => {
    // Step 1: drift — seen-flag is reset (goalCelebrationSeenTargetKg → null).
    const drift = runEffect({
      hydrated: true,
      goalReached: false,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: 68,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });
    expect(drift.decision).toBe('reset');

    // Step 2: re-cross — seen-flag is null again, goal not reached at hydration.
    const recross = runEffect({
      hydrated: true,
      goalReached: true,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(recross.decision).toBe('show');
    expect(recross.setShowGoalCelebration).toHaveBeenCalledWith(true);
    expect(recross.markGoalCelebrationSeen).toHaveBeenCalledWith(68);
  });

  it('returns none (not reset) when the goal is not reached and no seen-flag is stored', () => {
    // The reset branch requires seenTargetKg === targetWeight; null never matches.
    const result = runEffect({
      hydrated: true,
      goalReached: false,
      showGoalProgress: true,
      goalCelebrationSeenTargetKg: null,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('none');
    expect(result.resetGoalCelebrationSeen).not.toHaveBeenCalled();
  });

  it('returns none (not reset) when showGoalProgress is false', () => {
    const result = runEffect({
      hydrated: true,
      goalReached: false,
      showGoalProgress: false,
      goalCelebrationSeenTargetKg: 68,
      targetWeight: 68,
      goalReachedAtHydration: false,
    });

    expect(result.decision).toBe('none');
    expect(result.resetGoalCelebrationSeen).not.toHaveBeenCalled();
  });
});
