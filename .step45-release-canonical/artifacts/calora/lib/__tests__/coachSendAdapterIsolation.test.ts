import { describe, expect, it, vi } from 'vitest';
import type { CoachResponse } from '@workspace/api-client-react';

const coordinatorSpies = vi.hoisted(() => ({
  select: vi.fn(),
  request: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('../intelligence/coachFactActivationCoordinator', () => ({
  CoachFactActivationCoordinator: class {
    select = coordinatorSpies.select;
    request = coordinatorSpies.request;
    invalidate = coordinatorSpies.invalidate;
  },
}));

import { createCoachSendAdapter } from '../intelligence/useCoachSendAdapter';

function response(): CoachResponse {
  return {
    message: 'legacy response',
    observations: [],
    limitations: [],
    actions: [],
    contextCoverage: { usedSections: [], missingSections: [] },
    safetyState: 'normal',
  };
}

describe('Coach Fact Context / Legacy Coach isolation', () => {
  it('never falls through to Legacy Coach when selected Fact Context is unavailable', async () => {
    coordinatorSpies.select.mockResolvedValueOnce({ kind: 'unavailable', reason: 'consent_unavailable' });
    const legacySend = vi.fn().mockResolvedValue(response());
    const adapter = createCoachSendAdapter();

    const result = await adapter.sendWithArchitecture(
      [{ role: 'user', content: 'hello' }],
      legacySend,
      {
        accountId: 'account-a',
        hydrationGeneration: 1,
        hydrated: true,
        consentAccepted: true,
        facts: [],
      },
    );

    expect(result).toEqual({ kind: 'unavailable', reason: 'consent_unavailable' });
    expect(legacySend).not.toHaveBeenCalled();
    expect(coordinatorSpies.request).not.toHaveBeenCalled();
    adapter.cleanup();
  });
});