/**
 * Goal-celebration gate — production decision helper.
 *
 * Centralises the logic that decides whether to fire the goal-reached
 * celebration banner, whether to silently mark it seen (fresh-install guard),
 * and whether to reset the seen-flag after the user drifts above their goal.
 * Extracted from InsightsScreen so the behaviour can be tested directly.
 *
 * ## Fresh-install guard
 * When the app launches for the first time (or after a data clear), there is no
 * persisted `goalCelebrationSeenTargetKg`.  If the user's very first weigh-in
 * already satisfies the goal, the gate must NOT show the celebration banner —
 * the user hasn't journeyed toward the target within the app.
 *
 * To distinguish this case from a genuine in-session crossing, InsightsScreen
 * captures `goalReached` at the moment hydration completes (the "hydration
 * baseline").  When `goalReachedAtHydration` is true, the gate returns
 * `'markSeenSilently'` so the caller can persist the flag without showing the
 * banner or triggering haptics.
 */

export type CelebrationDecision = 'show' | 'markSeenSilently' | 'reset' | 'none';

export interface CelebrationGateArgs {
  /** True once AsyncStorage has been read and all state setters have been called. */
  hydrated: boolean;
  /** True when the latest weigh-in has reached or crossed the target. */
  goalReached: boolean;
  /**
   * True when weights.length >= 3 && hasGoal.
   * The banner is only rendered (and the seen-flag only consumed) when this is true.
   */
  showGoalProgress: boolean;
  /** Persisted value: the target (kg) for which the banner was last shown, or null. */
  goalCelebrationSeenTargetKg: number | null;
  /** The current target weight from the user's profile (kg). */
  targetWeight: number;
  /**
   * Whether the goal was already reached at the exact moment hydration completed.
   * When true, the celebration is suppressed (fresh-install guard): the user's
   * weigh-in was already at or below the target before they logged any new data
   * in this session, so there is no genuine in-session crossing to celebrate.
   * Set this by capturing `goalReached && showGoalProgress` during the first
   * render where `hydrated === true`, and pass the same snapshot on every
   * subsequent call within the session.
   */
  goalReachedAtHydration: boolean;
}

/**
 * Returns the action the celebration gate should take:
 *
 * - `'show'`             — genuine in-session crossing: fire the banner, mark seen, trigger haptic
 * - `'markSeenSilently'` — goal already reached at hydration: persist the flag silently, no banner
 * - `'reset'`            — user drifted above goal: call `resetGoalCelebrationSeen`
 * - `'none'`             — do nothing
 */
export function celebrationGate({
  hydrated,
  goalReached,
  showGoalProgress,
  goalCelebrationSeenTargetKg,
  targetWeight,
  goalReachedAtHydration,
}: CelebrationGateArgs): CelebrationDecision {
  // Wait until storage has been read so that goalCelebrationSeenTargetKg reflects the
  // persisted value.  Without this guard the effect fires on the first render with
  // goalCelebrationSeenTargetKg = null, incorrectly re-showing a banner the user
  // already dismissed before the last app close.
  if (!hydrated) return 'none';

  if (goalReached && showGoalProgress && goalCelebrationSeenTargetKg !== targetWeight) {
    if (goalReachedAtHydration) {
      // The goal was already satisfied when the app loaded — the user did not
      // cross it during this session.  Persist the flag silently so a future
      // session does not re-evaluate this crossing, but do not show the banner.
      return 'markSeenSilently';
    }
    // Genuine in-session crossing (or re-crossing after a reset): fire the celebration.
    return 'show';
  }

  if (!goalReached && showGoalProgress && goalCelebrationSeenTargetKg === targetWeight) {
    // User has drifted back above their goal after previously reaching it.
    // Reset the seen flag so the next genuine re-crossing replays the celebration.
    return 'reset';
  }

  return 'none';
}
