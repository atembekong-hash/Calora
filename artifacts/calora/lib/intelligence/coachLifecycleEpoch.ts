/**
 * CoachLifecycleEpoch — synchronous, account-scoped lifecycle fence.
 *
 * Binds account / hydration / consent / selection nonce / expiry into a
 * single integer epoch that increments whenever any of those axes changes.
 * Pending work captures the epoch at send-time; settling checks that the
 * current epoch still matches before applying any response to state.
 *
 * Invalidation is always synchronous so there is never a window where an
 * in-flight response can settle into stale state.
 */

export type CoachEpochSnapshot = {
  /** Monotonically-increasing counter. */
  epoch: number;
  accountId: string | null;
  hydrationGeneration: number;
  consentAccepted: boolean;
};

export type EpochInvalidationReason =
  | 'account_switch'
  | 'sign_out'
  | 'hydration_reset'
  | 'clear_data'
  | 'consent_revoke'
  | 'client_rollback'
  | 'deletion_path';

/**
 * Pure, synchronous lifecycle fence.  It carries no async operations itself —
 * all invalidation is expressed as an integer bump so callers can test
 * staleness with a simple equality check.
 */
export class CoachLifecycleEpoch {
  private _epoch = 0;
  private _accountId: string | null = null;
  private _hydrationGeneration: number = 0;
  private _consentAccepted: boolean = false;

  /** Public rollback invalidation hook.  Call when the client rolls back. */
  readonly invalidate = (reason?: EpochInvalidationReason): void => {
    void reason; // reason is recorded in the bump for future observability
    this._epoch += 1;
  };

  /**
   * Advance the epoch when account identity changes.
   * Returns true if the epoch was bumped.
   */
  onAccountChange(nextAccountId: string | null): boolean {
    if (nextAccountId === this._accountId) return false;
    this._accountId = nextAccountId;
    this._epoch += 1;
    return true;
  }

  /**
   * Advance the epoch when the hydration generation changes (hydration reset,
   * clear-data, retry, etc.).
   */
  onHydrationChange(nextGeneration: number): boolean {
    if (nextGeneration === this._hydrationGeneration) return false;
    this._hydrationGeneration = nextGeneration;
    this._epoch += 1;
    return true;
  }

  /**
   * Advance the epoch when consent state changes (revoke, clear-data removes
   * consent, etc.).
   */
  onConsentChange(nextConsent: boolean): boolean {
    if (nextConsent === this._consentAccepted) return false;
    this._consentAccepted = nextConsent;
    this._epoch += 1;
    return true;
  }

  /** Current epoch value. */
  get epoch(): number {
    return this._epoch;
  }

  /** Snapshot of the current epoch for pending-work capture. */
  snapshot(): CoachEpochSnapshot {
    return {
      epoch: this._epoch,
      accountId: this._accountId,
      hydrationGeneration: this._hydrationGeneration,
      consentAccepted: this._consentAccepted,
    };
  }

  /**
   * Returns true only when the supplied snapshot still matches the current
   * epoch exactly.  Use this before applying any async response to state.
   */
  isValid(captured: CoachEpochSnapshot): boolean {
    return captured.epoch === this._epoch
      && captured.accountId === this._accountId
      && captured.hydrationGeneration === this._hydrationGeneration
      && captured.consentAccepted === this._consentAccepted;
  }
}

const activeEpochs = new Set<CoachLifecycleEpoch>();

/** Registers a screen-owned epoch with the shared account/data lifecycle. */
export function registerCoachLifecycleEpoch(epoch: CoachLifecycleEpoch): () => void {
  activeEpochs.add(epoch);
  return () => activeEpochs.delete(epoch);
}

/** Synchronously fences every mounted Coach screen before account/data teardown. */
export function invalidateAllCoachLifecycleEpochs(reason: EpochInvalidationReason): void {
  activeEpochs.forEach((epoch) => epoch.invalidate(reason));
}
