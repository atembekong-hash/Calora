/**
 * RevenueCat client wiring — subscription state, offerings, purchases.
 *
 * In Expo Go / web preview the SDK runs in Preview API Mode against the
 * RevenueCat Test Store, so the full purchase flow is testable without a
 * native build. Never hardcode prices — always read them from `offerings`.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from 'react-native-purchases';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { SUBSCRIPTION } from '@/lib/brand';
import { useAuth } from '@/context/AuthContext';
import {
  hasActiveRevenueCatEntitlement,
  isRevenueCatBillingIdentityReady,
  purchaseForSynchronizedRevenueCatIdentity,
  restoreForSynchronizedRevenueCatIdentity,
} from '@/lib/revenuecatBilling';
import { synchronizeRevenueCatIdentity } from '@/lib/revenuecatIdentity';

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = SUBSCRIPTION.entitlementId;
let revenueCatConfigured = false;

function getRevenueCatApiKey(): string {
  // Only the key for the current runtime context is required — a missing
  // store key must not disable billing in dev/web preview (and vice versa).
  let key: string | undefined;
  if (__DEV__ || Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') {
    key = REVENUECAT_TEST_API_KEY;
  } else if (Platform.OS === 'ios') {
    key = REVENUECAT_IOS_API_KEY;
  } else if (Platform.OS === 'android') {
    key = REVENUECAT_ANDROID_API_KEY;
  } else {
    key = REVENUECAT_TEST_API_KEY;
  }
  if (!key) throw new Error('RevenueCat Public API Key not found for this platform');
  return key;
}

export function initializeRevenueCat() {
  if (revenueCatConfigured) return;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error('RevenueCat Public API Key not found');

  Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
  Purchases.configure({ apiKey });
  // configure is synchronous in the native SDK. Guarding it as a single
  // transition ensures identity effects cannot trigger a second configure
  // during a provider remount or Expo hot reload.
  revenueCatConfigured = true;
}

function useSubscriptionContext() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const identityGenerationRef = useRef(0);
  const [identitySyncAttempt, setIdentitySyncAttempt] = React.useState(0);
  const [identitySyncFailed, setIdentitySyncFailed] = React.useState(false);
  // Identity the SDK is currently synced to ('anon' or a user id); undefined
  // until the first sync settles. Customer-info reads and financial actions
  // wait for it so state is never read or written for the wrong subscriber.
  const [syncedIdentity, setSyncedIdentity] = React.useState<string | undefined>(undefined);

  useEffect(() => {
    const targetId = userId;
    const generation = ++identityGenerationRef.current;
    setSyncedIdentity(undefined);
    setIdentitySyncFailed(false);

    (async () => {
      try {
        const applied = await synchronizeRevenueCatIdentity(targetId, Purchases);
        if (!applied || generation !== identityGenerationRef.current) return;
        setSyncedIdentity(targetId ?? 'anon');
        queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
      } catch (err) {
        if (generation !== identityGenerationRef.current) return;
        console.warn('[revenuecat] identity sync failed', err);
        setIdentitySyncFailed(true);
      }
    })();
  }, [userId, identitySyncAttempt, queryClient]);

  const isIdentityReady = isRevenueCatBillingIdentityReady(userId, syncedIdentity);
  const readyIdentityRef = useRef<string | null>(null);
  readyIdentityRef.current = isIdentityReady ? userId : null;

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat', 'customer-info', syncedIdentity ?? 'pending'],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    enabled: syncedIdentity !== undefined,
  });

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
  });

  useEffect(() => {
    const listener: CustomerInfoUpdateListener = (customerInfo: CustomerInfo) => {
      const readyIdentity = readyIdentityRef.current;
      if (!readyIdentity) return;
      queryClient.setQueryData(
        ['revenuecat', 'customer-info', readyIdentity],
        customerInfo,
      );
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && readyIdentityRef.current) {
        void customerInfoQuery.refetch();
      }
    });
    return () => subscription.remove();
  }, [customerInfoQuery.refetch]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const readyIdentity = userId as string;
      const customerInfo = await purchaseForSynchronizedRevenueCatIdentity(
        userId,
        syncedIdentity,
        packageToPurchase,
        Purchases,
      );
      queryClient.setQueryData(['revenuecat', 'customer-info', readyIdentity], customerInfo);
      return customerInfo;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const readyIdentity = userId as string;
      const customerInfo = await restoreForSynchronizedRevenueCatIdentity(
        userId,
        syncedIdentity,
        Purchases,
      );
      queryClient.setQueryData(['revenuecat', 'customer-info', readyIdentity], customerInfo);
      return customerInfo;
    },
  });

  const isSubscribed = isIdentityReady && hasActiveRevenueCatEntitlement(
    customerInfoQuery.data,
    REVENUECAT_ENTITLEMENT_IDENTIFIER,
  );

  const retryIdentitySync = useCallback(() => {
    setIdentitySyncAttempt((attempt) => attempt + 1);
  }, []);

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isIdentityReady,
    identitySyncFailed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading || (userId !== null && !isIdentityReady && !identitySyncFailed),
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refreshCustomerInfo: () => customerInfoQuery.refetch(),
    retryIdentitySync,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}
