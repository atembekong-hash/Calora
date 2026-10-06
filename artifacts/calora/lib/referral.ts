import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CODE_KEY = 'calora-pending-invite-code-v2';
const LEGACY_PENDING_CODE_KEY = 'calora-pending-invite-code';
const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

type PendingInviteRecord = {
  code: string;
  /** Undefined only for a legacy record or a guest deep link awaiting explicit redemption. */
  accountId?: string;
};

type ActivationResult = {
  status: 'none' | 'pending' | 'rewarded';
  referredRewarded: boolean;
  referrerRewarded: boolean;
  /** The referrer was deleted, so no provider grant can or should occur. */
  referrerRewardSkipped: boolean;
};

function normalizeCode(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

async function readPendingInviteRecord(): Promise<PendingInviteRecord | null> {
  try {
    const encoded = await AsyncStorage.getItem(PENDING_CODE_KEY);
    if (encoded) {
      const parsed = JSON.parse(encoded) as unknown;
      if (parsed && typeof parsed === 'object') {
        const candidate = parsed as { code?: unknown; accountId?: unknown };
        const code = normalizeCode(candidate.code);
        if (code) {
          return typeof candidate.accountId === 'string' && candidate.accountId.trim()
            ? { code, accountId: candidate.accountId }
            : { code };
        }
      }
    }

    // One-time backward-compatible migration. A legacy code is deliberately
    // guest-scoped: it can be shown to the user but must never auto-redeem into
    // whichever account later signs into this device.
    const legacy = normalizeCode(await AsyncStorage.getItem(LEGACY_PENDING_CODE_KEY));
    if (legacy) {
      const record = { code: legacy };
      await AsyncStorage.setItem(PENDING_CODE_KEY, JSON.stringify(record));
      await AsyncStorage.removeItem(LEGACY_PENDING_CODE_KEY);
      return record;
    }
  } catch {
    // Referral capture is optional and must never block routing or sign-in.
  }
  return null;
}

/**
 * Stores an invite with the account that received the link, when one exists.
 * A guest link remains unbound until that person explicitly applies it after
 * signing in; it is never automatically attached to a different account.
 */
export async function setPendingInviteCode(code: string, accountId?: string | null): Promise<void> {
  const normalized = normalizeCode(code);
  if (!normalized) return;
  try {
    const record: PendingInviteRecord = accountId?.trim()
      ? { code: normalized, accountId }
      : { code: normalized };
    await AsyncStorage.setItem(PENDING_CODE_KEY, JSON.stringify(record));
    await AsyncStorage.removeItem(LEGACY_PENDING_CODE_KEY);
  } catch {
    // Best-effort referral capture must not make a deep link unusable.
  }
}

/** Returns a code only when it is unbound or belongs to the requested account. */
export async function getPendingInviteCode(accountId?: string | null): Promise<string | null> {
  const record = await readPendingInviteRecord();
  if (!record) return null;
  if (record.accountId && record.accountId !== accountId) return null;
  return record.code;
}

/**
 * Returns a code eligible for automatic redemption. Guest/legacy links never
 * qualify: redemption requires a deliberate Apply action after sign-in.
 */
export async function getAccountBoundPendingInviteCode(accountId: string): Promise<string | null> {
  const record = await readPendingInviteRecord();
  return record?.accountId === accountId ? record.code : null;
}

/**
 * Associates an unbound link with the current account only at an explicit
 * redemption boundary. A code that is already owned by another account is not
 * exposed or reassigned.
 */
export async function claimPendingInviteCode(accountId: string, code?: string): Promise<string | null> {
  const record = await readPendingInviteRecord();
  const expectedCode = code ? normalizeCode(code) : null;
  if (!record || (expectedCode && record.code !== expectedCode)) return null;
  if (record.accountId && record.accountId !== accountId) return null;
  if (record.accountId === accountId) return record.code;
  try {
    await AsyncStorage.setItem(PENDING_CODE_KEY, JSON.stringify({ code: record.code, accountId }));
    return record.code;
  } catch {
    return null;
  }
}

/** Removes a code only if it is unbound or belongs to the supplied account. */
export async function clearPendingInviteCode(accountId?: string | null): Promise<void> {
  try {
    const record = await readPendingInviteRecord();
    if (record?.accountId && record.accountId !== accountId) return;
    await AsyncStorage.removeItem(PENDING_CODE_KEY);
    await AsyncStorage.removeItem(LEGACY_PENDING_CODE_KEY);
  } catch {
    // Cleanup is best effort; a terminal server result can safely be retried.
  }
}

const REFERRAL_SETTLED_PREFIX = 'calora.referralActivationSettled:';

export async function markReferralActivationSettled(accountId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${REFERRAL_SETTLED_PREFIX}${accountId}`, '1');
  } catch {
    // The server remains authoritative; this only prevents duplicate local work.
  }
}

export async function isReferralActivationSettled(accountId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`${REFERRAL_SETTLED_PREFIX}${accountId}`)) === '1';
  } catch {
    return false;
  }
}

export async function clearReferralActivationSettled(accountId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${REFERRAL_SETTLED_PREFIX}${accountId}`);
  } catch {
    // Best-effort cleanup for deleted/local-reset account scopes.
  }
}

/** A partial provider failure stays retryable until both grants are confirmed. */
export function isReferralActivationComplete(result: ActivationResult): boolean {
  return result.status === 'none' || (
    result.status === 'rewarded'
      && result.referredRewarded
      && (result.referrerRewarded || result.referrerRewardSkipped)
  );
}
