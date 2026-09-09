import { respondCoachFactContext, type CoachMessage } from '@workspace/api-client-react';
import { RespondCoachFactContextResponse } from '@workspace/api-zod';
import { isIntelligenceFeatureEnabled } from './featureFlags';
import type { CoachFactContextV1 } from './coachFactContext';
import { CoachFactRequestLifecycle, type CoachFactRequestScope } from './coachFactRequestLifecycle';

export type CoachFactRequestError =
  | { kind: 'auth'; retryable: false }
  | { kind: 'rate_limited'; retryable: true }
  | { kind: 'offline'; retryable: true }
  | { kind: 'timeout'; retryable: true }
  | { kind: 'server'; retryable: true }
  | { kind: 'malformed_response'; retryable: false }
  | { kind: 'transport'; retryable: true };

export type DarkCoachRequestResult =
  | { kind: 'unavailable'; reason: 'client_gate_off' | 'invalid_scope' | 'expired_or_discarded' | 'transport_failure' }
  | { kind: 'failure'; error: CoachFactRequestError }
  | { kind: 'response'; response: Awaited<ReturnType<typeof respondCoachFactContext>> };

/** Never allow a Coach transport to occupy the UI indefinitely. */
export const COACH_FACT_CONTEXT_TIMEOUT_MS = 15_000;

/** Convert transport details to a small, safe, user-actionable error vocabulary. */
export function classifyCoachFactRequestError(error: unknown, timedOut = false): CoachFactRequestError {
  if (timedOut) return { kind: 'timeout', retryable: true };
  const status = typeof error === 'object' && error !== null && 'status' in error
    && typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : null;
  if (status === 401 || status === 403) return { kind: 'auth', retryable: false };
  if (status === 429) return { kind: 'rate_limited', retryable: true };
  if (status !== null && status >= 500) return { kind: 'server', retryable: true };

  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (name === 'AbortError' || message.includes('timeout')) return { kind: 'timeout', retryable: true };
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('offline')) {
    return { kind: 'offline', retryable: true };
  }
  return { kind: 'transport', retryable: true };
}

/**
 * Dark-only request coordinator. It has no AsyncStorage, no retries, and no
 * legacy context parameter, making mixed legacy/new payloads impossible here.
 */
export async function requestDarkCoachFactContext(input: {
  context: CoachFactContextV1;
  messages: CoachMessage[];
  accountId: string | null;
  hydrationGeneration: number;
  lifecycle: CoachFactRequestLifecycle;
  /** Optional caller cancellation remains observable as an AbortError. */
  signal?: AbortSignal;
  /** Test/internal override only; production requests can never exceed the default bound. */
  timeoutMs?: number;
  request?: (
    request: { factContext: CoachFactContextV1; messages: CoachMessage[]; currentScreen: string },
    options?: { signal?: AbortSignal },
  ) => Promise<Awaited<ReturnType<typeof respondCoachFactContext>>>;
}): Promise<DarkCoachRequestResult> {
  if (!isIntelligenceFeatureEnabled('intelligence.coach.fact_context')) return { kind: 'unavailable', reason: 'client_gate_off' };
  if (!input.accountId) return { kind: 'unavailable', reason: 'invalid_scope' };
  const scope: CoachFactRequestScope = input.lifecycle.begin(input.context, input.accountId, input.hydrationGeneration);
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  input.signal?.addEventListener('abort', onCallerAbort, { once: true });
  if (input.signal?.aborted) onCallerAbort();
  // Clamp overrides so this remains a bounded transport even if a future caller
  // supplies an invalid or overly long value.
  const timeoutMs = Math.max(1, Math.min(input.timeoutMs ?? COACH_FACT_CONTEXT_TIMEOUT_MS, COACH_FACT_CONTEXT_TIMEOUT_MS));
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await (input.request ?? respondCoachFactContext)({
      factContext: input.context,
      messages: input.messages,
      currentScreen: 'progress-coach',
    }, { signal: controller.signal });
    // Generated clients are typed but do not validate a runtime response.
    // Validate at this trust boundary before response text/actions reach UI.
    const parsed = RespondCoachFactContextResponse.safeParse(response);
    if (!parsed.success) return { kind: 'failure', error: { kind: 'malformed_response', retryable: false } };
    if (parsed.data.requestNonce !== input.context.requestNonce
      || !input.lifecycle.canAccept(scope, input.context, { accountId: input.accountId, hydrationGeneration: input.hydrationGeneration })) {
      return { kind: 'unavailable', reason: 'expired_or_discarded' };
    }
    return { kind: 'response', response: parsed.data };
  } catch (error) {
    // A supplied caller signal is not converted into a Coach failure; callers
    // retain cancellation semantics and can distinguish their own abort.
    if (input.signal?.aborted && !timedOut) throw error;
    return { kind: 'failure', error: classifyCoachFactRequestError(error, timedOut) };
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener('abort', onCallerAbort);
    // An older completion must not invalidate a newer request's nonce.
    input.lifecycle.complete(scope);
  }
}