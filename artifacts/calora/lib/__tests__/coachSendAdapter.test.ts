import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCoachFactContextConsent = vi.hoisted(() => vi.fn());
const respondCoachFactContext = vi.hoisted(() => vi.fn());
vi.mock('@workspace/api-client-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workspace/api-client-react')>();
  return {
    ...actual,
    getCoachFactContextConsent: (...args: unknown[]) => getCoachFactContextConsent(...args),
    respondCoachFactContext: (...args: unknown[]) => respondCoachFactContext(...args),
  };
});

import { createCoachSendAdapter } from '../intelligence/useCoachSendAdapter';

const messages = [{ role: 'user' as const, content: 'hello' }];
const input = (overrides = {}) => ({
  accountId: 'account-a' as string | null,
  hydrationGeneration: 1,
  hydrated: true,
  consentAccepted: true,
  facts: [] as const,
  ...overrides,
});

describe('Coach provider routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoachFactContextConsent.mockResolvedValue({
      purpose: 'coach_fact_context_v1',
      documentVersion: '2026-08-21',
      state: 'not_consented',
      decidedAt: null,
      revokedAt: null,
    });
  });

  it('requires current server consent and never invokes the retired Legacy Coach fallback', async () => {
    const adapter = createCoachSendAdapter();
    const legacySend = vi.fn();

    const result = await adapter.sendWithArchitecture(messages, legacySend, input());

    expect(result).toEqual({ kind: 'unavailable', reason: 'consent_not_current' });
    expect(legacySend).not.toHaveBeenCalled();
    expect(respondCoachFactContext).not.toHaveBeenCalled();
    adapter.cleanup();
  });

  it('fails closed on missing account or hydration and never invokes Legacy Coach', async () => {
    const adapter = createCoachSendAdapter();
    const legacySend = vi.fn();

    const result = await adapter.sendWithArchitecture(
      messages,
      legacySend,
      input({ accountId: null, hydrated: false }),
    );

    expect(result).toEqual({ kind: 'unavailable', reason: 'missing_account_or_hydration' });
    expect(getCoachFactContextConsent).not.toHaveBeenCalled();
    expect(legacySend).not.toHaveBeenCalled();
    adapter.cleanup();
  });
});
