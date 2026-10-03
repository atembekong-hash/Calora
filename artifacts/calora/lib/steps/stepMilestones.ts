export const STEP_MILESTONE_INTERVAL = 1_000;

function normalizedStepCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * Returns each thousand-step boundary crossed by a live foreground motion
 * update. Provider reconciliation deliberately does not use this helper: a
 * batched Health aggregate must never replay celebrations for past movement.
 */
export function crossedStepMilestones(
  previousSteps: unknown,
  nextSteps: unknown,
): number[] {
  const previous = normalizedStepCount(previousSteps);
  const next = normalizedStepCount(nextSteps);
  if (next <= previous) return [];

  const first = Math.floor(previous / STEP_MILESTONE_INTERVAL) + 1;
  const last = Math.floor(next / STEP_MILESTONE_INTERVAL);
  if (first > last) return [];

  return Array.from(
    { length: last - first + 1 },
    (_, index) => (first + index) * STEP_MILESTONE_INTERVAL,
  );
}

export function nextStepMilestone(steps: unknown): number {
  const normalized = normalizedStepCount(steps);
  return (Math.floor(normalized / STEP_MILESTONE_INTERVAL) + 1)
    * STEP_MILESTONE_INTERVAL;
}
