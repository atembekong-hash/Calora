/**
 * RevenueCat client wiring — subscription state, offerings, purchases.
 *
 * In Expo Go / web preview the SDK runs in Preview API Mode against the
 * RevenueCat Test Store, so the full purchase flow is testable without a
 * native build. Never hardcode prices — always read them from `offerings`.
 */
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { SUBSCRIPTION } from '@/lib/brand';
import { useAuth } from '@/context/AuthContext';

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = SUBSCRIPTION.entitlementId;

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
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error('RevenueCat Public API Key not found');

  Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
  Purchases.configure({ apiKey });
}

function useSubscriptionContext() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const lastIdentityRef = useRef<string | null>(null);
  // Identity the SDK is currently synced to ('anon' or a user id); undefined
  // until the first sync settles. Customer-info queries wait for it so state
  // is never read for the wrong (e.g. still-anonymous) subscriber.
  const [syncedIdentity, setSyncedIdentity] = React.useState<string | undefined>(undefined);

  // Keep the RevenueCat identity aligned with the Supabase user so
  // server-side referral rewards land on the right subscriber.
  useEffect(() => {
    const targetId = user?.id ?? null;
    if (targetId === lastIdentityRef.current) return;
    lastIdentityRef.current = targetId;

    (async () => {
      try {
        if (targetId) {
          await Purchases.logIn(targetId);
        } else {
          const isAnonymous = await Purchases.isAnonymous();
          if (!isAnonymous) await Purchases.logOut();
        }
      } catch (err) {
        console.warn('[revenuecat] identity sync failed', err);
      } finally {
        setSyncedIdentity(targetId ?? 'anon');
        queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
      }
    })();
  }, [user?.id, queryClient]);

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

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refreshCustomerInfo: () => customerInfoQuery.refetch(),
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
