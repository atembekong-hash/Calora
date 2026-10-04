/**
 * Referral code persistence — force-quit survival, account isolation, and
 * explicit redemption ownership. AsyncStorage survives a process kill while
 * account binding prevents a shared-device link from silently following a
 * different signed-in user.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const _store: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => _store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { _store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete _store[key]; }),
  },
}));

import {
  claimPendingInviteCode,
  clearPendingInviteCode,
  clearReferralActivationSettled,
  getAccountBoundPendingInviteCode,
  getPendingInviteCode,
  isReferralActivationComplete,
  isReferralActivationSettled,
  markReferralActivationSettled,
  setPendingInviteCode,
} from '../referral';

beforeEach(() => {
  Object.keys(_store).forEach((key) => delete _store[key]);
});

describe('pending referral codes', () => {
  it('normalizes a valid guest code and rejects invalid values', async () => {
    await setPendingInviteCode(' abc123 ');
    expect(await getPendingInviteCode()).toBe('ABC123');

    await setPendingInviteCode('AB');
    expect(await getPendingInviteCode()).toBe('ABC123');
    await setPendingInviteCode('A'.repeat(17));
    expect(await getPendingInviteCode()).toBe('ABC123');
  });

  it('survives a force-quit without relying on in-memory state', async () => {
    await setPendingInviteCode('7KDQ2MNP');
    expect(await getPendingInviteCode()).toBe('7KDQ2MNP');
  });

  it('keeps a signed-in deep link scoped to the account that received it', async () => {
    await setPendingInviteCode('OWNER123', 'account-a');
    expect(await getPendingInviteCode('account-a')).toBe('OWNER123');
    expect(await getPendingInviteCode('account-b')).toBeNull();
    expect(await getAccountBoundPendingInviteCode('account-a')).toBe('OWNER123');
    expect(await getAccountBoundPendingInviteCode('account-b')).toBeNull();
  });

  it('does not silently attach a guest link to a later signed-in account', async () => {
    await setPendingInviteCode('GUEST001');
    // The guest may deliberately Apply it after sign-in, but activation cannot
    // redeem it automatically for the next account on the device.
    expect(await getPendingInviteCode('account-b')).toBe('GUEST001');
    expect(await getAccountBoundPendingInviteCode('account-b')).toBeNull();
  });
});

describe('explicit referral claims and cleanup', () => {
  it('requires an explicit claim before a guest code becomes auto-redeemable', async () => {
    await setPendingInviteCode('GUEST001');
    expect(await claimPendingInviteCode('account-a', 'GUEST001')).toBe('GUEST001');
    expect(await getAccountBoundPendingInviteCode('account-a')).toBe('GUEST001');
  });

  it('refuses to reassign a code that belongs to another account', async () => {
    await setPendingInviteCode('OWNER123', 'account-a');
    expect(await claimPendingInviteCode('account-b', 'OWNER123')).toBeNull();
    expect(await getAccountBoundPendingInviteCode('account-a')).toBe('OWNER123');
  });

  it('does not allow one account to clear another account’s bound code', async () => {
    await setPendingInviteCode('OWNER123', 'account-a');
    await clearPendingInviteCode('account-b');
    expect(await getPendingInviteCode('account-a')).toBe('OWNER123');
  });

  it('clears an owned code after terminal redemption', async () => {
    await setPendingInviteCode('OWNER123', 'account-a');
    await clearPendingInviteCode('account-a');
    expect(await getPendingInviteCode('account-a')).toBeNull();
  });
});

describe('referral activation settled state', () => {
  it('is scoped per account and survives a relaunch', async () => {
    expect(await isReferralActivationSettled('user-one')).toBe(false);
    await markReferralActivationSettled('user-one');
    expect(await isReferralActivationSettled('user-one')).toBe(true);
    expect(await isReferralActivationSettled('user-two')).toBe(false);
    await clearReferralActivationSettled('user-one');
    expect(await isReferralActivationSettled('user-one')).toBe(false);
  });
});

describe('isReferralActivationComplete', () => {
  it('settles only complete referral outcomes', () => {
    expect(isReferralActivationComplete({ status: 'none', referredRewarded: false, referrerRewarded: false })).toBe(true);
    expect(isReferralActivationComplete({ status: 'rewarded', referredRewarded: true, referrerRewarded: true })).toBe(true);
    expect(isReferralActivationComplete({ status: 'rewarded', referredRewarded: true, referrerRewarded: false })).toBe(false);
    expect(isReferralActivationComplete({ status: 'pending', referredRewarded: false, referrerRewarded: false })).toBe(false);
  });
});
