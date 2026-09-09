import { describe, expect, it, vi } from 'vitest';

vi.mock('../intelligence/featureFlags', () => ({
  isIntelligenceFeatureEnabled: vi.fn(() => true),
}));

import {
  classifyCoachFactRequestError,
  requestDarkCoachFactContext,
} from '../intelligence/coachFactContextClient';
import { CoachFactRequestLifecycle } from '../intelligence/coachFactRequestLifecycle';
import type { CoachFactContextV1 } from '../intelligence/coachFactContext';

const nonce = 'a'.repeat(24);
const context: CoachFactContextV1 = {
  schemaVersion: 'coach-fact-context-v1',
  purpose: 'coach_fact_context_v1',
  generatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
  calculationVersion: 'nutrition-facts-v1',
  requestNonce: nonce,
  coverage: 'insufficient',
  missingData: ['no_logged_food_today'],
  facts: [],
  limitations: [],
};

describe('Coach Fact Context response boundary', () => {
  it('rejects a malformed response before it can be rendered', async () => {
    const result = await requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'safe question' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      request: async () => ({ message: '<script>unsafe</script>', requestNonce: nonce }) as never,
    });

    expect(result).toEqual({ kind: 'failure', error: { kind: 'malformed_response', retryable: false } });
  });

  it('does not let an older completion cancel a newer nonce', () => {
    const lifecycle = new CoachFactRequestLifecycle();
    const first = lifecycle.begin(context, 'account-a', 1);
    const newerContext = { ...context, requestNonce: 'b'.repeat(24) };
    const second = lifecycle.begin(newerContext, 'account-a', 1);

    lifecycle.complete(first);

    expect(lifecycle.canAccept(second, newerContext, { accountId: 'account-a', hydrationGeneration: 1 })).toBe(true);
  });

  it('aborts a never-settling transport at the bound and reports a retryable timeout', async () => {
    const request = vi.fn((_request: unknown, options?: { signal?: AbortSignal }) => new Promise<never>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    }));

    await expect(requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'safe question' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      timeoutMs: 1,
      request,
    })).resolves.toEqual({ kind: 'failure', error: { kind: 'timeout', retryable: true } });
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('preserves an explicit caller abort instead of relabeling it as a timeout', async () => {
    const caller = new AbortController();
    const abort = Object.assign(new Error('caller cancelled'), { name: 'AbortError' });
    const pending = requestDarkCoachFactContext({
      context,
      messages: [{ role: 'user', content: 'safe question' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      lifecycle: new CoachFactRequestLifecycle(),
      signal: caller.signal,
      request: async (_request, options) => new Promise<never>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(abort), { once: true });
      }),
    });

    caller.abort();

    await expect(pending).rejects.toBe(abort);
  });

  it.each([
    [{ status: 401 }, 'auth', false],
    [{ status: 403 }, 'auth', false],
    [{ status: 429 }, 'rate_limited', true],
    [{ status: 503 }, 'server', true],
    [Object.assign(new Error('Network request failed'), { name: 'TypeError' }), 'offline', true],
    [Object.assign(new Error('request timeout'), { name: 'AbortError' }), 'timeout', true],
    [new Error('unknown transport'), 'transport', true],
  ] as const)('classifies %o without retaining server text', (error, kind, retryable) => {
    expect(classifyCoachFactRequestError(error)).toEqual({ kind, retryable });
  });
});