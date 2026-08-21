import { describe, expect, it, vi } from 'vitest';

vi.mock('../intelligence/featureFlags', () => ({
  isIntelligenceFeatureEnabled: vi.fn(() => false),
}));

import { CoachFactActivationCoordinator } from '../intelligence/coachFactActivationCoordinator';
import { isIntelligenceFeatureEnabled } from '../intelligence/featureFlags';

describe('CoachFactActivationCoordinator', () => {
  it('keeps the legacy architecture when the dark client gate is off without reading cache or server consent', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const getConsent = vi.fn();
    await expect(coordinator.select({
      accountId: 'account-a',
      hydrated: true,
      hydrationGeneration: 1,
      facts: [],
      getConsent,
    })).resolves.toEqual({ kind: 'legacy' });
    expect(getConsent).not.toHaveBeenCalled();
  });

  it('never sends a request when the selected architecture is legacy', async () => {
    const coordinator = new CoachFactActivationCoordinator();
    const request = vi.fn();
    await expect(coordinator.request({
      selection: { kind: 'legacy' },
      messages: [{ role: 'user', content: 'hello' }],
      accountId: 'account-a',
      hydrationGeneration: 1,
      request,
    })).resolves.toEqual({ kind: 'legacy' });
    expect(request).not.toHaveBeenCalled();
    expect(isIntelligenceFeatureEnabled).toHaveBeenCalledWith('intelligence.coach.fact_context');
  });

  it('requires current server-confirmed consent even if the client gate is later approved', async () => {
    vi.mocked(isIntelligenceFeatureEnabled).mockReturnValueOnce(true);
    const coordinator = new CoachFactActivationCoordinator();
    const getConsent = vi.fn().mockResolvedValue({
      purpose: 'coach_fact_context_v1',
      documentVersion: '2026-08-21',
      state: 'revoked',
      decidedAt: null,
      revokedAt: new Date().toISOString(),
    });
    await expect(coordinator.select({
      accountId: 'account-a',
      hydrated: true,
      hydrationGeneration: 1,
      facts: [],
      getConsent,
    })).resolves.toEqual({ kind: 'legacy' });
    expect(getConsent).toHaveBeenCalledTimes(1);
  });

  it('rejects a selection if the account or hydration generation changes before egress', async () => {
    vi.mocked(isIntelligenceFeatureEnabled).mockReturnValueOnce(true);
    const coordinator = new CoachFactActivationCoordinator();
    const selection = await coordinator.select({
      accountId: 'account-a',
      hydrated: true,
      hydrationGeneration: 1,
      facts: [],
      getConsent: async () => ({
        purpose: 'coach_fact_context_v1',
        documentVersion: '2026-08-21',
        state: 'consented_current',
        decidedAt: new Date().toISOString(),
        revokedAt: null,
      }),
    });
    const request = vi.fn();
    await expect(coordinator.request({
      selection,
      messages: [{ role: 'user', content: 'hello' }],
      accountId: 'account-b',
      hydrationGeneration: 2,
      request,
    })).resolves.toEqual({ kind: 'unavailable', reason: 'invalid_scope' });
    expect(request).not.toHaveBeenCalled();
  });
});