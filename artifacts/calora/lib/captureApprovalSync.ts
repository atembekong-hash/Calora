import { approveCapture } from '@workspace/api-client-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodLog } from '@/context/CaloraContext';
import { EncryptedStorageAdapter } from './encryptedStorage';
import { secureStoreKeyAdapter } from './secureStoreKeyAdapter';

/**
 * Durable, account-scoped acknowledgement for server-issued capture reviews.
 * Local meal acceptance remains immediate and offline-safe; this coordinator
 * retries the separate, idempotent server approval after connectivity returns.
 */
const CAPTURE_APPROVAL_SETTLED_KEY = '@calora/capture-approval-settled';
const CAPTURE_APPROVAL_BLOCKED_KEY = '@calora/capture-approval-blocked';
const storage = new EncryptedStorageAdapter(AsyncStorage, secureStoreKeyAdapter);

let activeAccountScope = 'guest';
let accountScopeGeneration = 0;
let settledSessionIds: Set<string> | null = null;
let blockedSessionIds: Set<string> | null = null;
let approvalInFlight = false;

function scopedKey(key: string, scope = activeAccountScope): string {
  return scope === 'guest' ? key : `${key}:${encodeURIComponent(scope)}`;
}

async function loadSet(key: string): Promise<Set<string>> {
  try {
    const raw = await storage.getItem(scopedKey(key));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0))
      : new Set();
  } catch {
    return new Set();
  }
}

async function persistSet(key: string, values: Set<string>): Promise<void> {
  await storage.setItem(scopedKey(key), JSON.stringify([...values]));
}

async function ensureApprovalStateLoaded(): Promise<void> {
  if (!settledSessionIds) settledSessionIds = await loadSet(CAPTURE_APPROVAL_SETTLED_KEY);
  if (!blockedSessionIds) blockedSessionIds = await loadSet(CAPTURE_APPROVAL_BLOCKED_KEY);
}

function statusFromError(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.response?.status === 'number') return candidate.response.status;
  return null;
}

/**
 * Switch the encrypted retry namespace whenever the authenticated account changes.
 * Pending approvals are never attempted with another account's credentials.
 */
export function setCaptureApprovalAccountScope(accountId?: string | null): void {
  const nextScope = accountId?.trim() || 'guest';
  if (nextScope === activeAccountScope) return;
  activeAccountScope = nextScope;
  accountScopeGeneration += 1;
  settledSessionIds = null;
  blockedSessionIds = null;
  approvalInFlight = false;
}

/** Clears all durable acknowledgement bookkeeping for an account scope. */
export async function clearCaptureApprovalState(scope = activeAccountScope): Promise<void> {
  await Promise.all([
    storage.removeItem(scopedKey(CAPTURE_APPROVAL_SETTLED_KEY, scope)),
    storage.removeItem(scopedKey(CAPTURE_APPROVAL_BLOCKED_KEY, scope)),
  ]);
  if (scope === activeAccountScope) {
    settledSessionIds = null;
    blockedSessionIds = null;
  }
}

/**
 * Attempts every locally accepted capture review that lacks a durable server
 * acknowledgement. Retryable transport, throttling, and server failures remain
 * eligible for the next reconciliation.  Permanent owner/validation failures are
 * recorded so an obsolete session cannot create an infinite request loop.
 */
export async function syncCaptureApprovals(logs: FoodLog[], accessToken = ''): Promise<void> {
  if (!accessToken || activeAccountScope === 'guest' || approvalInFlight) return;
  const scopeAtStart = accountScopeGeneration;
  await ensureApprovalStateLoaded();
  if (scopeAtStart !== accountScopeGeneration || !settledSessionIds || !blockedSessionIds) return;

  const sessionIds = [...new Set(
    logs
      .map((log) => log.captureSessionId)
      .filter((sessionId): sessionId is string => Boolean(sessionId))
      .filter((sessionId) => !settledSessionIds!.has(sessionId) && !blockedSessionIds!.has(sessionId)),
  )];
  if (sessionIds.length === 0) return;

  approvalInFlight = true;
  let settledChanged = false;
  let blockedChanged = false;
  try {
    for (const sessionId of sessionIds) {
      if (scopeAtStart !== accountScopeGeneration) return;
      try {
        await approveCapture(sessionId, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (scopeAtStart !== accountScopeGeneration) return;
        settledSessionIds.add(sessionId);
        settledChanged = true;
      } catch (error) {
        if (scopeAtStart !== accountScopeGeneration) return;
        const status = statusFromError(error);
        // A malformed, missing, or owner-mismatched session can never become
        // valid via a connectivity retry. Authentication failures are also kept
        // out of the retry loop until a fresh authenticated session creates a
        // new account scope.
        if (status === 400 || status === 401 || status === 403 || status === 409) {
          blockedSessionIds.add(sessionId);
          blockedChanged = true;
        } else {
          console.warn('[capture-approval] background approval will retry', error);
        }
      }
    }
  } finally {
    if (scopeAtStart === accountScopeGeneration) {
      approvalInFlight = false;
      if (settledChanged && settledSessionIds) await persistSet(CAPTURE_APPROVAL_SETTLED_KEY, settledSessionIds);
      if (blockedChanged && blockedSessionIds) await persistSet(CAPTURE_APPROVAL_BLOCKED_KEY, blockedSessionIds);
    }
  }
}
