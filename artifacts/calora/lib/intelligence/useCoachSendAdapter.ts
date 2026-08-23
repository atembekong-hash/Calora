/**
 * useCoachSendAdapter — integration adapter that wires CoachFactActivationCoordinator
 * and CoachLifecycleEpoch into the live Coach screen send boundary.
 *
 * Responsibilities:
 *  - Maintains a stable CoachFactActivationCoordinator instance per component mount.
 *  - Maintains a stable CoachLifecycleEpoch that tracks account/hydration/consent axes.
 *  - Exposes `sendWithArchitecture`: exactly one architecture is selected per send.
 *    When the dark client gate denies Fact Context, the legacy path is used and no
 *    second request is ever issued. A Fact Context branch never falls back to legacy
 *    context after egress begins — it fails cleanly with `unavailable`.
 *  - Exposes `invalidateEpoch` as a public rollback hook callable from outside the hook.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { CoachMessage, CoachResponse, CoachFactContextResponse } from '@workspace/api-client-react';
import { CoachFactActivationCoordinator } from './coachFactActivationCoordinator';
import { CoachLifecycleEpoch, registerCoachLifecycleEpoch, type EpochInvalidationReason } from './coachLifecycleEpoch';
import type { IntelligenceFact } from './types';

export type CoachSendAdapterInput = {
  /** Current Calora account id (null = guest). */
  accountId: string | null;
  /**
   * Monotonically-increasing counter that increments on every hydration
   * attempt (from useHydrationEffect / retryHydration).
   */
  hydrationGeneration: number;
  /** True once the first storage read has settled. */
  hydrated: boolean;
  /** Whether the user has accepted the Coach consent. */
  consentAccepted: boolean;
  /** Intelligence facts already computed by the caller (may be empty). */
  facts: readonly IntelligenceFact[];
};

export type CoachSendResult =
  | { kind: 'legacy_response'; response: CoachResponse }
  | { kind: 'fact_context_response'; response: CoachFactContextResponse }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'stale'; reason: 'epoch_advanced' };

export type CoachSendAdapterHook = {
  /**
   * Select exactly one architecture and execute a single request. The caller
   * supplies the legacy send function so the adapter can delegate without
   * importing respondCoach directly.
   *
   * Contract:
   *  - If the dark gate denies Fact Context → calls `legacySend` exactly once,
   *    returns `{ kind: 'legacy_response', response }`.
   *  - If the dark gate approves and consent is met → attempts Fact Context;
   *    NEVER falls back to legacy context, never sends two requests.
   *  - If the epoch advances before the response settles → `{ kind: 'stale' }`.
   *  - On transport failure for Fact Context → `{ kind: 'unavailable' }`.
   */
  sendWithArchitecture: (
    messages: CoachMessage[],
    legacySend: () => Promise<CoachResponse>,
    adapterInput: CoachSendAdapterInput,
  ) => Promise<CoachSendResult>;

  /**
   * Public rollback invalidation hook.  Call from the owning component on
   * consent revoke, client rollback, deletion path, or any other lifecycle
   * event that requires pending work to be discarded.
   */
  invalidateEpoch: (reason?: EpochInvalidationReason) => void;
  /** Synchronize the live render state before any pending response can settle. */
  syncLiveState: (input: Pick<CoachSendAdapterInput, 'accountId' | 'hydrationGeneration' | 'consentAccepted'>) => void;
};

/**
 * Factory that creates a stable pair (coordinator + epoch) shared across
 * the life of the component. Exposed as a plain factory so tests can
 * instantiate it without React.
 */
export type CoachSendAdapterWithCleanup = CoachSendAdapterHook & {
  /** Deregisters the epoch from the global lifecycle set. Call on unmount. */
  cleanup: () => void;
};

export function createCoachSendAdapter(): CoachSendAdapterWithCleanup {
  const coordinator = new CoachFactActivationCoordinator();
  const epoch = new CoachLifecycleEpoch();
  // The global lifecycle uses the same concrete fence as this adapter, so
  // clear-data and account teardown invalidate an in-flight screen request.
  const unregister = registerCoachLifecycleEpoch(epoch);

  const sendWithArchitecture = async (
    messages: CoachMessage[],
    legacySend: () => Promise<CoachResponse>,
    input: CoachSendAdapterInput,
  ): Promise<CoachSendResult> => {
    // Synchronously advance the epoch for any axis that changed since the
    // last call. This ensures that a rapidly-queued second send after a
    // sign-out has the new epoch and will see the stale check fail.
    epoch.onAccountChange(input.accountId);
    epoch.onHydrationChange(input.hydrationGeneration);
    epoch.onConsentChange(input.consentAccepted);

    // Capture epoch snapshot BEFORE any async work.
    const captured = epoch.snapshot();

    // Select architecture — may do a server consent check (async).
    const selection = await coordinator.select({
      accountId: input.accountId,
      hydrated: input.hydrated,
      hydrationGeneration: input.hydrationGeneration,
      facts: input.facts,
    });

    // If epoch advanced while awaiting the selection, discard immediately.
    // Do NOT fall back to legacy: the caller's context may be stale.
    if (!epoch.isValid(captured)) {
      coordinator.invalidate();
      return { kind: 'stale', reason: 'epoch_advanced' };
    }

    if (selection.kind === 'legacy') {
      // Legacy path: exactly one request, no Fact Context egress possible.
      let response: CoachResponse;
      try {
        response = await legacySend();
      } catch (err) {
        // Re-throw so the caller's catch block shows the error UI.
        throw err;
      }
      // Settle using live epoch state, not captured input only.
      if (!epoch.isValid(captured)) {
        return { kind: 'stale', reason: 'epoch_advanced' };
      }
      return { kind: 'legacy_response', response };
    }

    if (selection.kind === 'unavailable') {
      // Fact Context was selected but could not be safely prepared. Never
      // downgrade this send to the legacy provider route.
      return { kind: 'unavailable', reason: selection.reason };
    }

    // Fact Context path: never retries with legacy context, never double-requests.
    const result = await coordinator.request({
      selection,
      messages,
      accountId: input.accountId,
      hydrationGeneration: input.hydrationGeneration,
    });

    // Settle using live epoch state, not captured input only.
    if (!epoch.isValid(captured)) {
      return { kind: 'stale', reason: 'epoch_advanced' };
    }

    if (result.kind === 'response') {
      return { kind: 'fact_context_response', response: result.response };
    }
    if (result.kind === 'legacy') {
      // This branch is unreachable: coordinator.request with a fact_context
      // selection cannot return { kind: 'legacy' }. Guard for type safety.
      return { kind: 'unavailable', reason: 'unexpected_legacy' };
    }
    return { kind: 'unavailable', reason: result.reason };
  };

  const invalidateEpoch = (reason?: EpochInvalidationReason): void => {
    epoch.invalidate(reason);
    coordinator.invalidate();
  };

  const syncLiveState = (input: Pick<CoachSendAdapterInput, 'accountId' | 'hydrationGeneration' | 'consentAccepted'>): void => {
    epoch.onAccountChange(input.accountId);
    epoch.onHydrationChange(input.hydrationGeneration);
    epoch.onConsentChange(input.consentAccepted);
  };

  const cleanup = (): void => {
    // Deregister from the global lifecycle set and fence any in-flight work.
    unregister();
    epoch.invalidate('client_rollback');
    coordinator.invalidate();
  };

  return { sendWithArchitecture, invalidateEpoch, syncLiveState, cleanup };
}

/**
 * React hook wrapper around createCoachSendAdapter.
 * The adapter (coordinator + epoch) is created once per component mount
 * and is stable across re-renders.  The epoch is registered with the global
 * lifecycle on creation and deregistered when the component unmounts so that
 * a mounted Coach screen never receives responses from a prior session.
 */
export function useCoachSendAdapter(): CoachSendAdapterHook {
  const adapterRef = useRef<CoachSendAdapterWithCleanup | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = createCoachSendAdapter();
  }

  // Deregister the epoch from the global lifecycle set on unmount.
  // This ensures that clear-data or account teardown after the screen has
  // already unmounted does not attempt to invalidate a dangling epoch.
  useEffect(() => {
    const adapter = adapterRef.current!;
    return () => {
      adapter.cleanup();
    };
    // Empty dep array: adapter is stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { sendWithArchitecture, invalidateEpoch, syncLiveState } = adapterRef.current;

  const stableSend = useCallback(
    (
      messages: CoachMessage[],
      legacySend: () => Promise<CoachResponse>,
      input: CoachSendAdapterInput,
    ) => sendWithArchitecture(messages, legacySend, input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const stableInvalidate = useCallback(
    (reason?: EpochInvalidationReason) => invalidateEpoch(reason),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { sendWithArchitecture: stableSend, invalidateEpoch: stableInvalidate, syncLiveState };
}
