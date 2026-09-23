import { describe, expect, it, vi } from 'vitest';
import { CoachFactActivationCoordinator } from '../intelligence/coachFactActivationCoordinator';

const currentConsent = {
  purpose: 'coach_fact_context_v1' as const,
  documentVersion: '2026-08-21' as const,
  state: 'consented_current' as const,
  decidedAt: new Date().toISOString(),
  revokedAt: null,
};

describe('CoachFactActivationCoordinator', () => {
  it('selects consented Fact Context for a normal signed-in user without membership, rollout, approval, or feature-gate input', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const getConsent = vi.fn().mockResolvedValue(currentConsent);

    const selection = await coordinator.select({
      accountId: 'ordinary-free-user',
      hydrated: true,
      hydrationGeneration: 1,
      facts: [],
      getConsent,
    });

    expect(selection).toMatchObject({
      kind: 'fact_context',
      accountId: 'ordinary-free-user',
      serverConsent: currentConsent,
    });
    expect(getConsent).toHaveBeenCalledOnce();
  });

  it('requires current server consent rather than local readiness before personal facts are sent', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const getConsent = vi.fn().mockResolvedValue({ ...currentConsent, state: 'revoked', revokedAt: new Date().toISOString() });

    await expect(coordinator.select({
      accountId: 'account-a', hydrated: true, hydrationGeneration: 1, facts: [], getConsent,
    })).resolves.toEqual({ kind: 'unavailable', reason: 'consent_not_current' });
    expect(getConsent).toHaveBeenCalledOnce();
  });

  it('returns a retryable unavailable selection when consent verification fails', async () => {
    const coordinator = new CoachFactActivationCoordinator();

    await expect(coordinator.select({
      accountId: 'account-a', hydrated: true, hydrationGeneration: 1, facts: [],
      getConsent: vi.fn().mockRejectedValue(new Error('offline')),
    })).resolves.toEqual({ kind: 'unavailable', reason: 'consent_unavailable' });
  });

  it('does not dispatch when a selected Fact Context request is unavailable', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const request = vi.fn();

    await expect(coordinator.request({
      selection: { kind: 'unavailable', reason: 'consent_unavailable' },
      messages: [{ role: 'user', content: 'hello' }],
      accountId: 'account-a', hydrationGeneration: 1, request,
    })).resolves.toEqual({ kind: 'unavailable', reason: 'consent_unavailable' });
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects a selected request if account or hydration scope changes before egress', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const selection = await coordinator.select({
      accountId: 'account-a', hydrated: true, hydrationGeneration: 1, facts: [],
      getConsent: async () => currentConsent,
    });
    const request = vi.fn();

    await expect(coordinator.request({
      selection,
      messages: [{ role: 'user', content: 'hello' }],
      accountId: 'account-b', hydrationGeneration: 2, request,
    })).resolves.toEqual({ kind: 'unavailable', reason: 'invalid_scope' });
    expect(request).not.toHaveBeenCalled();
  });
});
