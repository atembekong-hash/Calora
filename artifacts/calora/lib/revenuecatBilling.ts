import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export interface RevenueCatBillingApi {
  purchasePackage(packageToPurchase: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
}

export class RevenueCatIdentityNotReadyError extends Error {
  constructor() {
    super('RevenueCat billing identity is not synchronized to the active Calora account');
    this.name = 'RevenueCatIdentityNotReadyError';
  }
}

export function isRevenueCatBillingIdentityReady(
  userId: string | null | undefined,
  syncedIdentity: string | undefined,
): boolean {
  return typeof userId === 'string' && userId.length > 0 && syncedIdentity === userId;
}

export function assertRevenueCatBillingIdentityReady(
  userId: string | null | undefined,
  syncedIdentity: string | undefined,
): void {
  if (!isRevenueCatBillingIdentityReady(userId, syncedIdentity)) {
    throw new RevenueCatIdentityNotReadyError();
  }
}

export function hasActiveRevenueCatEntitlement(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId: string,
): boolean {
  return customerInfo?.entitlements.active?.[entitlementId] !== undefined;
}

export async function purchaseForSynchronizedRevenueCatIdentity(
  userId: string | null | undefined,
  syncedIdentity: string | undefined,
  packageToPurchase: PurchasesPackage,
  api: RevenueCatBillingApi,
): Promise<CustomerInfo> {
  assertRevenueCatBillingIdentityReady(userId, syncedIdentity);
  const { customerInfo } = await api.purchasePackage(packageToPurchase);
  return customerInfo;
}

export async function restoreForSynchronizedRevenueCatIdentity(
  userId: string | null | undefined,
  syncedIdentity: string | undefined,
  api: RevenueCatBillingApi,
): Promise<CustomerInfo> {
  assertRevenueCatBillingIdentityReady(userId, syncedIdentity);
  return api.restorePurchases();
}

export function getSubscriptionManagementUrl(
  platform: string,
  providerManagementUrl?: string | null,
): string | null {
  const providerUrl = providerManagementUrl?.trim();
  if (providerUrl && /^(https|itms-apps):\/\//i.test(providerUrl)) return providerUrl;
  if (platform === 'ios') return 'itms-apps://apps.apple.com/account/subscriptions';
  if (platform === 'android') return 'https://play.google.com/store/account/subscriptions';
  return null;
}

export function formatStoreMonthlyEquivalent(
  product: { price?: number; currencyCode?: string } | null | undefined,
): string | null {
  if (!product || typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) {
    return null;
  }

  const monthlyEquivalent = product.price / 12;
  const currencyCode = product.currencyCode?.trim().toUpperCase();
  if (!currencyCode) return monthlyEquivalent.toFixed(2);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monthlyEquivalent);
  } catch {
    return `${monthlyEquivalent.toFixed(2)} ${currencyCode}`;
  }
}

export function formatStoreWeeklyEquivalent(
  product: { price?: number; currencyCode?: string } | null | undefined,
  weeksInBillingPeriod: number,
): string | null {
  if (!Number.isFinite(weeksInBillingPeriod) || weeksInBillingPeriod <= 0) return null;
  if (!product || typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) {
    return null;
  }

  const weeklyEquivalent = product.price / weeksInBillingPeriod;
  const currencyCode = product.currencyCode?.trim().toUpperCase();
  if (!currencyCode) return weeklyEquivalent.toFixed(2);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(weeklyEquivalent);
  } catch {
    return `${weeklyEquivalent.toFixed(2)} ${currencyCode}`;
  }
}

export function formatStoreAnnualSavingsPercent(
  monthlyProduct: { price?: number } | null | undefined,
  annualProduct: { price?: number } | null | undefined,
): string | null {
  if (
    !monthlyProduct ||
    !annualProduct ||
    typeof monthlyProduct.price !== 'number' ||
    typeof annualProduct.price !== 'number' ||
    !Number.isFinite(monthlyProduct.price) ||
    !Number.isFinite(annualProduct.price) ||
    monthlyProduct.price <= 0 ||
    annualProduct.price <= 0
  ) {
    return null;
  }

  const savingsPercent = (1 - annualProduct.price / (monthlyProduct.price * 12)) * 100;
  if (!Number.isFinite(savingsPercent) || savingsPercent <= 0) return null;
  return `${Math.round(savingsPercent)}%`;
}
