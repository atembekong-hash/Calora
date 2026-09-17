import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../intelligence/featureFlags', () => ({
  isIntelligenceFeatureEnabled: vi.fn(() => false),
}));

import { isIntelligenceFeatureEnabled } from '../intelligence/featureFlags';
import { createCoachSendAdapter } from '../intelligence/useCoachSendAdapter';
import type { CoachResponse } from '@workspace/api-client-react';

const messages = [{ role: 'user' as const, content: 'hello' }];
const input = (overrides = {}) => ({
  accountId: 'account-a' as string | null,
  hydrationGeneration: 1,
  hydrated: true,
  consentAccepted: true,
  facts: [] as const,
  ...overrides,
});
const legacyResponse = (): CoachResponse => ({
  message: 'legacy',
  observations: [],
  limitations: [],
  actions: [],
  contextCoverage: { usedSections: [], missingSections: [] },
  safetyState: 'normal',
});

describe('Coach provider routing', () => {
  beforeEach(() => {
    vi.mocked(isIntelligenceFeatureEnabled).mockReset();
    vi.mocked(isIntelligenceFeatureEnabled).mockReturnValue(false);
  });

  it('does not invoke Legacy Coach when a disabled feature flag selects legacy', async () => {
    const adapter = createCoachSendAdapter();
    const legacySend = vi.fn().mockResolvedValue(legacyResponse());
    const result = await adapter.sendWithArchitecture(messages, legacySend, input());
    expect(result).toEqual({ kind: 'unavailable', reason: 'legacy_coach_retired' });
    expect(legacySend).not.toHaveBeenCalled();
    adapter.cleanup();
  });

  it('also blocks a legacy selection for a missing account or malformed client state', async () => {
    const adapter = createCoachSendAdapter();
    const legacySend = vi.fn().mockResolvedValue(legacyResponse());
    const result = await adapter.sendWithArchitecture(messages, legacySend, input({ accountId: null, hydrated: false }));
    expect(result).toEqual({ kind: 'unavailable', reason: 'legacy_coach_retired' });
    expect(legacySend).not.toHaveBeenCalled();
    adapter.cleanup();
  });
});