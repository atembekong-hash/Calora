import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoachFactConsentStatus } from '@workspace/api-client-react';

const CACHE_PREFIX = '@calora/coach-fact-context-consent-status-v1';

export type CoachFactConsentCacheStatus = Pick<CoachFactConsentStatus, 'purpose' | 'documentVersion' | 'state' | 'decidedAt' | 'revokedAt'> & {
  refreshedAt: string;
};

export type CoachFactConsentCacheStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

function keyFor(accountId: string) {
  return `${CACHE_PREFIX}:${encodeURIComponent(accountId)}`;
}

/**
 * Device-local state exists only to explain the last server decision in the
 * dormant UI. It intentionally exposes no "may send" operation: server
 * consent, server cohort, and the endpoint gate remain authoritative.
 */
export class CoachFactConsentCache {
  constructor(private readonly storage: CoachFactConsentCacheStorage = AsyncStorage) {}

  async read(accountId: string | null): Promise<CoachFactConsentCacheStatus | null> {
    if (!accountId?.trim()) return null;
    try {
      const raw = await this.storage.getItem(keyFor(accountId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CoachFactConsentCacheStatus>;
      if (parsed.purpose !== 'coach_fact_context_v1'
        || !['not_consented', 'consented_current', 'revoked', 'stale_version'].includes(parsed.state ?? '')
        || typeof parsed.documentVersion !== 'string' || typeof parsed.refreshedAt !== 'string') return null;
      return parsed as CoachFactConsentCacheStatus;
    } catch {
      return null;
    }
  }

  async write(accountId: string | null, status: CoachFactConsentStatus): Promise<void> {
    if (!accountId?.trim()) return;
    const cached: CoachFactConsentCacheStatus = { ...status, refreshedAt: new Date().toISOString() };
    try {
      // This is display-only cache state; server-side consent remains
      // authoritative. A local storage failure must not surface as an
      // unhandled promise rejection or alter that authority.
      await this.storage.setItem(keyFor(accountId), JSON.stringify(cached));
    } catch {
      // Best-effort cache only.
    }
  }

  async clear(accountId: string | null): Promise<void> {
    if (!accountId?.trim()) return;
    try {
      await this.storage.removeItem(keyFor(accountId));
    } catch {
      // Best-effort cache only; no consent state is inferred locally.
    }
  }
}

export const coachFactConsentCache = new CoachFactConsentCache();
