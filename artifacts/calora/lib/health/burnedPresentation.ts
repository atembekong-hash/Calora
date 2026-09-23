import type { BurnedStatus } from './burnedStatus';

export type BurnedPresentation = {
  /** A number is rendered only for an evidenced, measured active-energy result. */
  calories: number | null;
  /** Explains an unavailable state without substituting a numeric zero. */
  statusLabel?: string;
  /** Only recovery states should deep-link to the Health Data sheet. */
  canOpenHealthRecovery: boolean;
};

/**
 * Home's Burned slot intentionally has a separate display contract from calorie
 * arithmetic. Missing, stale, denied, or failed data contributes no adjustment
 * internally but must never be presented as a measured 0 kcal result.
 */
export function burnedPresentationForStatus(status: BurnedStatus): BurnedPresentation {
  if (status.kind === 'ready') {
    return { calories: status.calories, canOpenHealthRecovery: false };
  }

  return {
    calories: null,
    statusLabel: status.actionLabel,
    canOpenHealthRecovery: status.kind === 'connect'
      || status.kind === 'permission'
      || status.kind === 'syncing'
      || status.kind === 'failed',
  };
}
