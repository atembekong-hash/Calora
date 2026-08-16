/**
 * Referral helpers — pending invite code storage and reward activation state.
 *
 * A code arriving via the caloraapp://invite/<code> deep link (or the
 * mycaloraapp.com/invite/<code> universal link) is stored locally until the
 * user signs in and redeems it. Activation ("first saved meal") is
 * tracked per user so the activate endpoint is only retried until it settles.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CODE_KEY = 'calora-pending-invite-code';
const ACTIVATED_KEY_PREFIX = 'calora-referral-activated:';

type ActivationResult = {
  status: 'none' | 'pending' | 'rewarded';
  referredRewarded: boolean;
  referrerRewarded: boolean;
};

/**
 * A partial provider failure must remain retryable. `rewarded` only settles on
 * device once both sides' grants are confirmed; `none` is also terminal.
 */
export function isReferralActivationComplete(result: ActivationResult): boolean {
  return result.status === 'none' || (
    result.status === 'rewarded' &&
    result.referredRewarded &&
    result.referrerRewarded
  );
}

export async function setPendingInviteCode(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 4 || normalized.length > 16) return;
  try {
    await AsyncStorage.setItem(PENDING_CODE_KEY, normalized);
    console.log('[referral] pending invite code stored (length:', normalized.length, ')');
  } catch (err) {
    console.warn('[referral] failed to store pending invite code', err);
  }
}

export async function getPendingInviteCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_CODE_KEY);
    if (code) {
      console.log('[referral] pending invite code found (length:', code.length, ')');
    }
    return code;
  } catch {
    return null;
  }
}

export async function clearPendingInviteCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    // Non-fatal: the card simply keeps prefilling the code.
  }
}

/** Whether the activate endpoint has settled (rewarded or no redemption). */
export async function isReferralActivationSettled(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ACTIVATED_KEY_PREFIX + userId)) === 'true';
  } catch {
    return false;
  }
}

export async function markReferralActivationSettled(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVATED_KEY_PREFIX + userId, 'true');
  } catch (err) {
    console.warn('[referral] failed to persist activation state', err);
  }
}

/** Reset the settled flag — intended for tests and edge-case resets only. */
export async function clearReferralActivationSettled(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVATED_KEY_PREFIX + userId);
  } catch {
    // Non-fatal.
  }
}
