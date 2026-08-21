import { respondCoachFactContext, type CoachMessage } from '@workspace/api-client-react';
import { isIntelligenceFeatureEnabled } from './featureFlags';
import type { CoachFactContextV1 } from './coachFactContext';
import { CoachFactRequestLifecycle, type CoachFactRequestScope } from './coachFactRequestLifecycle';

export type DarkCoachRequestResult =
  | { kind: 'unavailable'; reason: 'client_gate_off' | 'invalid_scope' | 'expired_or_discarded' | 'transport_failure' }
  | { kind: 'response'; response: Awaited<ReturnType<typeof respondCoachFactContext>> };

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
  request?: typeof respondCoachFactContext;
}): Promise<DarkCoachRequestResult> {
  if (!isIntelligenceFeatureEnabled('intelligence.coach.fact_context')) return { kind: 'unavailable', reason: 'client_gate_off' };
  if (!input.accountId) return { kind: 'unavailable', reason: 'invalid_scope' };
  const scope: CoachFactRequestScope = input.lifecycle.begin(input.context, input.accountId, input.hydrationGeneration);
  try {
    const response = await (input.request ?? respondCoachFactContext)({
      factContext: input.context,
      messages: input.messages,
      currentScreen: 'progress-coach',
    });
    if (response.requestNonce !== input.context.requestNonce
      || !input.lifecycle.canAccept(scope, input.context, { accountId: input.accountId, hydrationGeneration: input.hydrationGeneration })) {
      return { kind: 'unavailable', reason: 'expired_or_discarded' };
    }
    return { kind: 'response', response };
  } catch {
    return { kind: 'unavailable', reason: 'transport_failure' };
  } finally {
    input.lifecycle.invalidate();
  }
}