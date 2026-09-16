import { describe, expect, it } from 'vitest';
import { requestDarkCoachFactContext } from '@/lib/intelligence/coachFactContextClient';
import { CoachFactRequestLifecycle } from '@/lib/intelligence/coachFactRequestLifecycle';
import type { CoachFactContextV1 } from '@/lib/intelligence/coachFactContext';

const now = Date.now();
const context: CoachFactContextV1 = {
  schemaVersion: 'coach-fact-context-v1',
  purpose: 'coach_fact_context_v1',
  generatedAt: new Date(now - 1_000).toISOString(),
  expiresAt: new Date(now + 59_000).toISOString(),
  calculationVersion: 'nutrition-facts-v1',
  requestNonce: '0123456789abcdef01234567',
  coverage: 'available',
  missingData: [],
  facts: [],
  limitations: [],
};

const validResponse = {
  message: 'Your logged calories are on track today.',
  observations: [{
    text: 'Logged calories are within the app target.',
    confidence: 'high' as const,
    factKeys: ['daily.calorie_status' as const],
  }],
  actions: [],
  safetyState: 'normal' as const,
  limitations: [],
  contextCoverage: { usedSections: ['daily nutrition'], missingSections: [] },
  requestNonce: context.requestNonce,
};

describe('dark Coach fact-context client', () => {
  it('validates the provider response before returning it', async () => {
    const result = await requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'How am I doing?' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      request: async () => validResponse,
    });

    expect(result).toEqual({ kind: 'response', response: validResponse });
  });

  it('rejects malformed provider responses without exposing them to Coach', async () => {
    const result = await requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'How am I doing?' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      request: async () => ({ requestNonce: context.requestNonce }) as never,
    });

    expect(result).toEqual({
      kind: 'failure',
      error: { kind: 'malformed_response', retryable: false },
    });
  });

  it('classifies a bounded provider timeout as retryable', async () => {
    const result = await requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'How am I doing?' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      timeoutMs: 5,
      request: async (_request, options) => new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
    });

    expect(result).toEqual({ kind: 'failure', error: { kind: 'timeout', retryable: true } });
  });
});