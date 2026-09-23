import {
  getCoachFactContextConsent,
  type CoachFactConsentStatus,
  type CoachMessage,
  type CoachFactContextResponse,
} from '@workspace/api-client-react';
import { buildCoachFactContext, COACH_FACT_CONTEXT_PURPOSE, type CoachFactContextV1 } from './coachFactContext';
import { CoachFactRequestLifecycle } from './coachFactRequestLifecycle';
import { requestDarkCoachFactContext, type DarkCoachRequestResult } from './coachFactContextClient';
import type { IntelligenceFact } from './types';

type FactContextUnavailableReason =
  | 'missing_account_or_hydration'
  | 'consent_unavailable'
  | 'consent_not_current'
  | 'context_unavailable';

export type CoachArchitectureSelection =
  | { kind: 'unavailable'; reason: FactContextUnavailableReason }
  | {
    kind: 'fact_context';
    context: CoachFactContextV1;
    serverConsent: CoachFactConsentStatus;
    accountId: string;
    hydrationGeneration: number;
  };

export type CoordinatorRequestResult =
  | { kind: 'unavailable'; reason: FactContextUnavailableReason }
  | DarkCoachRequestResult;

/**
 * Selects the consented Coach Fact Context path for every signed-in user. It
 * deliberately has no local-cache authorization path: every request obtains
 * current server consent before any personal nutrition data can be sent.
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
    // Missing prerequisites must not downgrade this send to broader legacy
    // context. They only prevent egress until the user can consent or retry.
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
