import {
  getCoachFactContextConsent,
  type CoachFactConsentStatus,
  type CoachMessage,
  type CoachFactContextResponse,
} from '@workspace/api-client-react';
import { buildCoachFactContext, COACH_FACT_CONTEXT_PURPOSE, type CoachFactContextV1 } from './coachFactContext';
import { isIntelligenceFeatureEnabled } from './featureFlags';
import { CoachFactRequestLifecycle } from './coachFactRequestLifecycle';
import { requestDarkCoachFactContext, type DarkCoachRequestResult } from './coachFactContextClient';
import type { IntelligenceFact } from './types';

type FactContextUnavailableReason =
  | 'missing_account_or_hydration'
  | 'consent_unavailable'
  | 'consent_not_current'
  | 'context_unavailable';

export type CoachArchitectureSelection =
  | { kind: 'legacy' }
  | { kind: 'unavailable'; reason: FactContextUnavailableReason }
  | {
    kind: 'fact_context';
    context: CoachFactContextV1;
    serverConsent: CoachFactConsentStatus;
    accountId: string;
    hydrationGeneration: number;
  };

export type CoordinatorRequestResult =
  | { kind: 'legacy' }
  | { kind: 'unavailable'; reason: FactContextUnavailableReason }
  | DarkCoachRequestResult;

/**
 * The only dormant selector for Coach Fact Context. It deliberately has no
 * local-cache read path: each Fact Context request first obtains current
 * server consent and then chooses exactly one architecture.
 */
export class CoachFactActivationCoordinator {
  private readonly lifecycle = new CoachFactRequestLifecycle();

  invalidate() {
    this.lifecycle.invalidate();
  }

  async select(input: {
    accountId: string | null;
    hydrated: boolean;
    hydrationGeneration: number;
    facts: readonly IntelligenceFact[];
    getConsent?: typeof getCoachFactContextConsent;
  }): Promise<CoachArchitectureSelection> {
    if (!isIntelligenceFeatureEnabled('intelligence.coach.fact_context')) {
      return { kind: 'legacy' };
    }
    // Once Fact Context is selected, it is a terminal architecture. A missing
    // prerequisite must not downgrade this send to the broader legacy provider.
    if (!input.accountId || !input.hydrated) {
      return { kind: 'unavailable', reason: 'missing_account_or_hydration' };
    }
    let serverConsent: CoachFactConsentStatus;
    try {
      serverConsent = await (input.getConsent ?? getCoachFactContextConsent)();
    } catch {
      return { kind: 'unavailable', reason: 'consent_unavailable' };
    }
    if (serverConsent.purpose !== COACH_FACT_CONTEXT_PURPOSE || serverConsent.state !== 'consented_current') {
      return { kind: 'unavailable', reason: 'consent_not_current' };
    }
    const context = buildCoachFactContext({
      hydrated: input.hydrated,
      consent: { state: 'consented_current', purpose: COACH_FACT_CONTEXT_PURPOSE },
      facts: input.facts,
    });
    return context ? {
      kind: 'fact_context',
      context,
      serverConsent,
      accountId: input.accountId,
      hydrationGeneration: input.hydrationGeneration,
    } : { kind: 'unavailable', reason: 'context_unavailable' };
  }

  async request(input: {
    selection: CoachArchitectureSelection;
    messages: CoachMessage[];
    accountId: string | null;
    hydrationGeneration: number;
    request?: (input: { factContext: CoachFactContextV1; messages: CoachMessage[]; currentScreen: string }) => Promise<CoachFactContextResponse>;
  }): Promise<CoordinatorRequestResult> {
    if (input.selection.kind === 'legacy') return { kind: 'legacy' };
    if (input.selection.kind === 'unavailable') {
      return { kind: 'unavailable', reason: input.selection.reason };
    }
    if (input.selection.accountId !== input.accountId
      || input.selection.hydrationGeneration !== input.hydrationGeneration) {
      this.lifecycle.invalidate();
      return { kind: 'unavailable', reason: 'invalid_scope' };
    }
    return requestDarkCoachFactContext({
      context: input.selection.context,
      messages: input.messages,
      accountId: input.accountId,
      hydrationGeneration: input.hydrationGeneration,
      lifecycle: this.lifecycle,
      request: input.request,
    });
  }
}