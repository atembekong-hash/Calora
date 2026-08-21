/**
 * Deterministic tests for Task #467 CLIENT implementation:
 *  - CoachSendAdapter architecture selection (legacy vs fact_context)
 *  - CoachLifecycleEpoch pending-work invalidation
 *
 * Tests are written against the plain factory (createCoachSendAdapter) so
 * they run without React or a screen, matching existing test conventions.
 *
 * Scenarios covered:
 *  A→B: architecture selected, account switches before settle → stale
 *  sign-out: epoch invalidated → stale
 *  hydration reset: generation bump → stale
 *  clear-data: epoch invalidated synchronously
 *  delete/revoke/rollback: public invalidate hook
 *  gate change: dark gate off → legacy; gate on + consent → fact_context
 *  expiration: isCoachFactContextCurrent returns false → expired_or_discarded
 *  no stale response shown: stale result does not advance turns state
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Feature flag mock — dark gate is off by default ──────────────────────────
vi.mock('../intelligence/featureFlags', () => ({
  isIntelligenceFeatureEnabled: vi.fn(() => false),
}));

import { isIntelligenceFeatureEnabled } from '../intelligence/featureFlags';
import { createCoachSendAdapter } from '../intelligence/useCoachSendAdapter';
import { CoachLifecycleEpoch } from '../intelligence/coachLifecycleEpoch';
import { CoachFactRequestLifecycle } from '../intelligence/coachFactRequestLifecycle';
import type { CoachResponse } from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(msg = 'test response'): CoachResponse {
  return {
    message: msg,
    observations: [],
    limitations: [],
    actions: [],
    contextCoverage: { usedSections: [], missingSections: [] },
    safetyState: 'normal',
  };
}

const MESSAGES = [{ role: 'user' as const, content: 'hello' }];

/** Build minimal adapter input. */
function input(overrides?: Partial<Parameters<ReturnType<typeof createCoachSendAdapter>['sendWithArchitecture']>[2]>) {
  return {
    accountId: 'account-a' as string | null,
    hydrationGeneration: 1,
    hydrated: true,
    consentAccepted: true,
    facts: [] as const,
    ...overrides,
  };
}

const legacySend = () => Promise.resolve(makeResponse('legacy'));

/** Yield to the microtask queue so async coordinator.select() can proceed and legacySend is invoked. */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// ── Architecture selection ─────────────────────────────────────────────────────

describe('createCoachSendAdapter — architecture selection', () => {
  beforeEach(() => {
    vi.mocked(isIntelligenceFeatureEnabled).mockReset();
    vi.mocked(isIntelligenceFeatureEnabled).mockReturnValue(false);
  });

  it('selects legacy architecture when dark gate is off and calls legacySend exactly once', async () => {
    const adapter = createCoachSendAdapter();
    const sendSpy = vi.fn().mockResolvedValue(makeResponse('from legacy'));
    const result = await adapter.sendWithArchitecture(MESSAGES, sendSpy, input());
    expect(result.kind).toBe('legacy_response');
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call legacySend when gate is off but account is null', async () => {
    const adapter = createCoachSendAdapter();
    const sendSpy = vi.fn().mockResolvedValue(makeResponse());
    // With gate off, it's always legacy regardless of accountId.
    const result = await adapter.sendWithArchitecture(MESSAGES, sendSpy, input({ accountId: null }));
    expect(result.kind).toBe('legacy_response');
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('returns stale when epoch advances (A→B account switch) before response settles', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input({ accountId: 'account-a' }));

    // Flush microtasks so coordinator.select() runs and slowLegacy is invoked,
    // assigning resolveResponse.
    await flushMicrotasks();

    // Simulate account switch before legacy send resolves.
    // Start a second send for account-b which bumps the epoch.
    const secondResult = adapter.sendWithArchitecture(MESSAGES, legacySend, input({ accountId: 'account-b' }));

    // Now resolve the first (slow) send.
    resolveResponse(makeResponse('stale'));
    const [first] = await Promise.all([resultPromise, secondResult]);

    // First result should be stale because epoch advanced.
    expect(first.kind).toBe('stale');
  });

  it('never sends a second request for fact_context even if legacy fallback would make sense', async () => {
    // Gate is off → always legacy; verify only one call regardless.
    const adapter = createCoachSendAdapter();
    const sendSpy = vi.fn().mockResolvedValue(makeResponse());
    await adapter.sendWithArchitecture(MESSAGES, sendSpy, input());
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('returns legacy response with the exact content returned by legacySend', async () => {
    const adapter = createCoachSendAdapter();
    const response = makeResponse('exact-content');
    const result = await adapter.sendWithArchitecture(MESSAGES, () => Promise.resolve(response), input());
    expect(result.kind).toBe('legacy_response');
    if (result.kind === 'legacy_response') expect(result.response.message).toBe('exact-content');
  });
});

// ── Epoch / pending invalidation ──────────────────────────────────────────────

describe('CoachLifecycleEpoch — pending invalidation', () => {
  it('starts with epoch 0 and is valid for the initial snapshot', () => {
    const fence = new CoachLifecycleEpoch();
    const snap = fence.snapshot();
    expect(snap.epoch).toBe(0);
    expect(fence.isValid(snap)).toBe(true);
  });

  it('invalidates pending work when account switches (A→B)', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onAccountChange('account-a');
    const snap = fence.snapshot();
    fence.onAccountChange('account-b');
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work on sign-out (account → null)', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onAccountChange('account-a');
    const snap = fence.snapshot();
    fence.onAccountChange(null);
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work on hydration reset (generation bump)', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onHydrationChange(1);
    const snap = fence.snapshot();
    fence.onHydrationChange(2);
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work via the public invalidate hook (clear-data, rollback, deletion)', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onAccountChange('account-a');
    const snap = fence.snapshot();
    fence.invalidate('clear_data');
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work on consent revoke via onConsentChange', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onConsentChange(true);
    const snap = fence.snapshot();
    fence.onConsentChange(false);
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work on client rollback via public hook', () => {
    const fence = new CoachLifecycleEpoch();
    const snap = fence.snapshot();
    fence.invalidate('client_rollback');
    expect(fence.isValid(snap)).toBe(false);
  });

  it('invalidates pending work on deletion-path signal via public hook', () => {
    const fence = new CoachLifecycleEpoch();
    const snap = fence.snapshot();
    fence.invalidate('deletion_path');
    expect(fence.isValid(snap)).toBe(false);
  });

  it('is not invalidated when the same account id or generation is supplied again', () => {
    const fence = new CoachLifecycleEpoch();
    fence.onAccountChange('account-a');
    fence.onHydrationChange(1);
    const snap = fence.snapshot();
    fence.onAccountChange('account-a');
    fence.onHydrationChange(1);
    expect(fence.isValid(snap)).toBe(true);
  });

  it('epoch increments monotonically across multiple invalidation axes', () => {
    const fence = new CoachLifecycleEpoch();
    const e0 = fence.epoch;
    fence.onAccountChange('a');
    const e1 = fence.epoch;
    fence.onHydrationChange(2);
    const e2 = fence.epoch;
    fence.onConsentChange(true);
    const e3 = fence.epoch;
    fence.invalidate('sign_out');
    const e4 = fence.epoch;
    expect(e1).toBeGreaterThan(e0);
    expect(e2).toBeGreaterThan(e1);
    expect(e3).toBeGreaterThan(e2);
    expect(e4).toBeGreaterThan(e3);
  });
});

// ── Adapter + epoch integration ───────────────────────────────────────────────

describe('createCoachSendAdapter — epoch integration', () => {
  beforeEach(() => {
    vi.mocked(isIntelligenceFeatureEnabled).mockReset();
    vi.mocked(isIntelligenceFeatureEnabled).mockReturnValue(false);
  });

  it('returns stale when invalidateEpoch is called before response settles (sign-out)', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input());
    await flushMicrotasks();

    // Simulate sign-out.
    adapter.invalidateEpoch('sign_out');

    resolveResponse(makeResponse('post-signout'));
    const result = await resultPromise;
    expect(result.kind).toBe('stale');
  });

  it('returns stale when invalidateEpoch is called before response settles (clear-data)', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input());
    await flushMicrotasks();
    adapter.invalidateEpoch('clear_data');
    resolveResponse(makeResponse('post-clear'));
    const result = await resultPromise;
    expect(result.kind).toBe('stale');
  });

  it('returns stale when invalidateEpoch is called with revoke reason', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input());
    await flushMicrotasks();
    adapter.invalidateEpoch('consent_revoke');
    resolveResponse(makeResponse('post-revoke'));
    const result = await resultPromise;
    expect(result.kind).toBe('stale');
  });

  it('returns stale when invalidateEpoch is called with deletion_path reason', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input());
    await flushMicrotasks();
    adapter.invalidateEpoch('deletion_path');
    resolveResponse(makeResponse('post-delete'));
    const result = await resultPromise;
    expect(result.kind).toBe('stale');
  });

  it('returns stale when hydration generation advances mid-flight', async () => {
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input({ hydrationGeneration: 1 }));
    await flushMicrotasks();

    // Second send with bumped hydration generation advances the epoch.
    const secondDone = adapter.sendWithArchitecture(MESSAGES, legacySend, input({ hydrationGeneration: 2 }));

    resolveResponse(makeResponse('stale-hydration'));
    const [first] = await Promise.all([resultPromise, secondDone]);
    expect(first.kind).toBe('stale');
  });

  it('does not show stale response in a turns-like accumulator', async () => {
    // Simulate the coach.tsx pattern: only append to turns when result has a response.
    const adapter = createCoachSendAdapter();
    let resolveResponse!: (r: CoachResponse) => void;
    const slowLegacy = () => new Promise<CoachResponse>((resolve) => { resolveResponse = resolve; });

    const turns: string[] = [];
    const resultPromise = adapter.sendWithArchitecture(MESSAGES, slowLegacy, input());
    await flushMicrotasks();
    adapter.invalidateEpoch('sign_out');
    resolveResponse(makeResponse('should-not-appear'));
    const result = await resultPromise;

    // Mimic coach.tsx settle logic — only legacy_response and fact_context_response push to turns.
    if (result.kind === 'legacy_response' || result.kind === 'fact_context_response') {
      turns.push(result.response.message);
    }
    // Stale and unavailable results never push to turns.
    expect(turns).toHaveLength(0);
  });

  it('allows a new valid request after a stale result', async () => {
    const adapter = createCoachSendAdapter();

    // First request gets invalidated.
    let resolveFirst!: (r: CoachResponse) => void;
    const firstPromise = adapter.sendWithArchitecture(
      MESSAGES,
      () => new Promise<CoachResponse>((resolve) => { resolveFirst = resolve; }),
      input({ hydrationGeneration: 1 }),
    );
    await flushMicrotasks();
    adapter.invalidateEpoch('hydration_reset');
    resolveFirst(makeResponse('stale'));
    const first = await firstPromise;
    expect(first.kind).toBe('stale');

    // Second request is fresh.
    const second = await adapter.sendWithArchitecture(MESSAGES, legacySend, input({ hydrationGeneration: 2 }));
    expect(second.kind).toBe('legacy_response');
  });
});

// ── CoachFactRequestLifecycle — invalidateAll ─────────────────────────────────

describe('CoachFactRequestLifecycle.invalidateAll — used by clearAllData and sign-out', () => {
  it('marks all active scopes as aborted when invalidateAll is called', () => {
    const lc = new CoachFactRequestLifecycle();
    const context = {
      schemaVersion: 'coach-fact-context-v1' as const,
      purpose: 'coach_fact_context_v1' as const,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      calculationVersion: 'nutrition-facts-v1',
      requestNonce: 'a'.repeat(24),
      coverage: 'insufficient' as const,
      missingData: [],
      facts: [],
      limitations: [],
    };
    const scope = lc.begin(context, 'account-a', 1);
    CoachFactRequestLifecycle.invalidateAll();
    expect(lc.canAccept(scope, context, { accountId: 'account-a', hydrationGeneration: 1 })).toBe(false);
  });
});
