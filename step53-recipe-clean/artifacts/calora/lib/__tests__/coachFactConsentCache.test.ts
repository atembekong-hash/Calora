import { describe, expect, it, vi } from 'vitest';
import { CoachFactConsentCache } from '../intelligence/coachFactConsentCache';
import { CoachFactRequestLifecycle } from '../intelligence/coachFactRequestLifecycle';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
}

const current = { purpose: 'coach_fact_context_v1' as const, documentVersion: '2026-08-21' as const, state: 'consented_current' as const, decidedAt: '2026-08-21T00:00:00.000Z', revokedAt: null };

describe('CoachFactConsentCache', () => {
  it('keeps statuses account scoped and clears a single scope without authorizing anything', async () => {
    const storage = memoryStorage();
    const cache = new CoachFactConsentCache(storage);
    await cache.write('account-a', current);
    expect((await cache.read('account-a'))?.state).toBe('consented_current');
    expect(await cache.read('account-b')).toBeNull();
    await cache.clear('account-a');
    expect(await cache.read('account-a')).toBeNull();
  });

  it('treats malformed or unknown cache data as unavailable and invalidates active work', async () => {
    const storage = memoryStorage();
    const cache = new CoachFactConsentCache(storage);
    storage.getItem.mockResolvedValueOnce('{"purpose":"coach_fact_context_v1","state":"forged"}');
    expect(await cache.read('account-a')).toBeNull();
    const lifecycle = new CoachFactRequestLifecycle();
    const context = { schemaVersion: 'coach-fact-context-v1' as const, purpose: 'coach_fact_context_v1' as const, generatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(), calculationVersion: 'nutrition-facts-v1', requestNonce: 'a'.repeat(24), coverage: 'insufficient' as const, missingData: [], facts: [], limitations: [] };
    const scope = lifecycle.begin(context, 'account-a', 1);
    CoachFactRequestLifecycle.invalidateAll();
    expect(lifecycle.canAccept(scope, context, { accountId: 'account-a', hydrationGeneration: 1 })).toBe(false);
  });
});