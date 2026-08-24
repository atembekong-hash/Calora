import { describe, expect, it, vi } from 'vitest';
import type { CoachResponse } from '@workspace/api-client-react';

const spies = vi.hoisted(() => ({ select: vi.fn(), request: vi.fn(), invalidate: vi.fn() }));
vi.mock('../intelligence/coachFactActivationCoordinator', () => ({
  CoachFactActivationCoordinator: class {
    select = spies.select;
    request = spies.request;
    invalidate = spies.invalidate;
  },
}));

import { createCoachSendAdapter } from '../intelligence/useCoachSendAdapter';

const input = {
  accountId: 'account-a',
  hydrationGeneration: 1,
  hydrated: true,
  consentAccepted: true,
  facts: [],
};
const legacy = vi.fn<() => Promise<CoachResponse>>();

describe('retired Coach fallback compatibility', () => {
  it('does not restore a legacy provider call if a future coordinator returns legacy', async () => {
    spies.select.mockResolvedValueOnce({ kind: 'legacy' });
    legacy.mockResolvedValueOnce({ message: 'legacy', observations: [], limitations: [], actions: [], contextCoverage: { usedSections: [], missingSections: [] }, safetyState: 'normal' });
    const adapter = createCoachSendAdapter();
    const result = await adapter.sendWithArchitecture([{ role: 'user', content: 'hello' }], legacy, input);
    expect(result).toEqual({ kind: 'unavailable', reason: 'legacy_coach_retired' });
    expect(legacy).not.toHaveBeenCalled();
    expect(spies.request).not.toHaveBeenCalled();
    adapter.cleanup();
  });
});