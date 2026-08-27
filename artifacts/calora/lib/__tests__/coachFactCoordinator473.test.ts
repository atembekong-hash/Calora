import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachFactContextResponse, CoachResponse } from '@workspace/api-client-react';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('returns a validated Fact Context response to the live Coach screen adapter', async () => {
    const response: CoachFactContextResponse = {
      message: 'Your logged nutrition is available for a calm review.',
      observations: [],
      limitations: [],
      actions: [],
      contextCoverage: { usedSections: [], missingSections: [] },
      safetyState: 'normal',
      requestNonce: 'a'.repeat(24),
    };
    spies.select.mockResolvedValueOnce({
      kind: 'fact_context',
      context: { requestNonce: response.requestNonce },
      accountId: input.accountId,
      hydrationGeneration: input.hydrationGeneration,
    });
    spies.request.mockResolvedValueOnce({ kind: 'response', response });

    const adapter = createCoachSendAdapter();
    const result = await adapter.sendWithArchitecture(
      [{ role: 'user', content: 'Give me a calm nutrition review.' }],
      legacy,
      input,
    );

    expect(result).toEqual({ kind: 'fact_context_response', response });
    expect(spies.request).toHaveBeenCalledOnce();
    expect(legacy).not.toHaveBeenCalled();
    adapter.cleanup();
  });
});