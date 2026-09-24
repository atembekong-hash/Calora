import { describe, expect, it, vi } from 'vitest';
import {
  assertRevenueCatBillingIdentityReady,
  formatStoreMonthlyEquivalent,
  getSubscriptionManagementUrl,
  hasActiveRevenueCatEntitlement,
  isRevenueCatBillingIdentityReady,
  purchaseForSynchronizedRevenueCatIdentity,
  RevenueCatIdentityNotReadyError,
  restoreForSynchronizedRevenueCatIdentity,
} from '../revenuecatBilling';

const ACTIVE_INFO = {
  entitlements: {
    active: {
      caloraapp_pro: { identifier: 'caloraapp_pro' },
    },
  },
} as any;

describe('RevenueCat billing integrity', () => {
  it('requires the synchronized RevenueCat identity to exactly match the signed-in Calora account', () => {
    expect(isRevenueCatBillingIdentityReady('account-a', 'account-a')).toBe(true);
    expect(isRevenueCatBillingIdentityReady('account-a', undefined)).toBe(false);
    expect(isRevenueCatBillingIdentityReady('account-a', 'account-b')).toBe(false);
    expect(isRevenueCatBillingIdentityReady(null, 'anon')).toBe(false);
  });

  it('fails closed before a financially sensitive action when identity is pending or stale', () => {
    expect(() => assertRevenueCatBillingIdentityReady('account-a', undefined)).toThrow(RevenueCatIdentityNotReadyError);
    expect(() => assertRevenueCatBillingIdentityReady('account-b', 'account-a')).toThrow(RevenueCatIdentityNotReadyError);
    expect(() => assertRevenueCatBillingIdentityReady('account-a', 'account-a')).not.toThrow();
  });

  it('never submits purchase or restore to RevenueCat while identity is pending or switched', async () => {
    const api = {
      purchasePackage: vi.fn(async () => ({ customerInfo: ACTIVE_INFO })),
      restorePurchases: vi.fn(async () => ACTIVE_INFO),
    };
    const packageToPurchase = { identifier: '$rc_annual' } as any;

    await expect(purchaseForSynchronizedRevenueCatIdentity('account-b', 'account-a', packageToPurchase, api as any))
      .rejects.toBeInstanceOf(RevenueCatIdentityNotReadyError);
    await expect(restoreForSynchronizedRevenueCatIdentity('account-b', undefined, api as any))
      .rejects.toBeInstanceOf(RevenueCatIdentityNotReadyError);
    expect(api.purchasePackage).not.toHaveBeenCalled();
    expect(api.restorePurchases).not.toHaveBeenCalled();

    await expect(purchaseForSynchronizedRevenueCatIdentity('account-b', 'account-b', packageToPurchase, api as any))
      .resolves.toBe(ACTIVE_INFO);
    await expect(restoreForSynchronizedRevenueCatIdentity('account-b', 'account-b', api as any))
      .resolves.toBe(ACTIVE_INFO);
    expect(api.purchasePackage).toHaveBeenCalledOnce();
    expect(api.restorePurchases).toHaveBeenCalledOnce();
  });

  it('recognizes only the exact active Calora Pro entitlement', () => {
    expect(hasActiveRevenueCatEntitlement(ACTIVE_INFO, 'caloraapp_pro')).toBe(true);
    expect(hasActiveRevenueCatEntitlement(ACTIVE_INFO, 'other_entitlement')).toBe(false);
    expect(hasActiveRevenueCatEntitlement({ entitlements: { active: {} } } as any, 'caloraapp_pro')).toBe(false);
    expect(hasActiveRevenueCatEntitlement(undefined, 'caloraapp_pro')).toBe(false);
  });

  it('prefers the provider management URL and otherwise uses the correct native store destination', () => {
    expect(getSubscriptionManagementUrl('ios', 'https://apps.apple.com/account/subscriptions?app=calora'))
      .toBe('https://apps.apple.com/account/subscriptions?app=calora');
    expect(getSubscriptionManagementUrl('ios')).toBe('itms-apps://apps.apple.com/account/subscriptions');
    expect(getSubscriptionManagementUrl('android')).toBe('https://play.google.com/store/account/subscriptions');
    expect(getSubscriptionManagementUrl('web')).toBeNull();
    expect(getSubscriptionManagementUrl('android', 'javascript:alert(1)'))
      .toBe('https://play.google.com/store/account/subscriptions');
  });

  it('derives an approximate monthly equivalent from the localized annual store product', () => {
    expect(formatStoreMonthlyEquivalent({ price: 34.99, currencyCode: 'USD' })).toMatch(/\$2\.92|2\.92\s+USD/);
    expect(formatStoreMonthlyEquivalent({ price: 0, currencyCode: 'USD' })).toBeNull();
    expect(formatStoreMonthlyEquivalent(undefined)).toBeNull();
  });
});
