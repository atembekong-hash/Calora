/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  user: { id: 'account-a' } as { id: string } | null,
  subscription: null as any,
  appStateListener: null as ((state: string) => void) | null,
  customerInfoListener: null as ((info: any) => void) | null,
  synchronizeIdentity: vi.fn(async (_userId: string | null, _purchases?: unknown) => true),
  purchases: {
    LOG_LEVEL: { INFO: 'info' },
    setLogLevel: vi.fn(),
    configure: vi.fn(),
    getCustomerInfo: vi.fn(async () => ({ entitlements: { active: {} } })),
    getOfferings: vi.fn(async () => ({ current: { identifier: 'default', availablePackages: [] } })),
    purchasePackage: vi.fn(async () => ({ customerInfo: { entitlements: { active: { caloraapp_pro: {} } } } })),
    restorePurchases: vi.fn(async () => ({ entitlements: { active: { caloraapp_pro: {} } } })),
    addCustomerInfoUpdateListener: vi.fn((listener: (info: any) => void) => {
      harness.customerInfoListener = listener;
    }),
    removeCustomerInfoUpdateListener: vi.fn((listener: (info: any) => void) => {
      if (harness.customerInfoListener === listener) harness.customerInfoListener = null;
      return true;
    }),
  },
}));

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Platform: { ...actual.Platform, OS: 'web' },
    AppState: {
      addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
        harness.appStateListener = listener;
        return { remove: vi.fn(() => { harness.appStateListener = null; }) };
      }),
    },
  };
});
vi.mock('react-native-purchases', () => ({ default: harness.purchases }));
vi.mock('expo-constants', () => ({ default: { executionEnvironment: 'standalone' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: harness.user }) }));
vi.mock('@/lib/revenuecatIdentity', () => ({
  synchronizeRevenueCatIdentity: harness.synchronizeIdentity,
}));

import { SubscriptionProvider, useSubscription } from '../revenuecat';

function Probe() {
  const subscription = useSubscription();
  harness.subscription = subscription;
  return (
    <div>
      <span data-testid="identity">{subscription.isIdentityReady ? 'ready' : subscription.identitySyncFailed ? 'failed' : 'pending'}</span>
      <span data-testid="entitlement">{subscription.isSubscribed ? 'active' : 'inactive'}</span>
    </div>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider><Probe /></SubscriptionProvider>
    </QueryClientProvider>,
  );
  return {
    ...view,
    rerenderProvider: () => view.rerender(
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider><Probe /></SubscriptionProvider>
      </QueryClientProvider>,
    ),
  };
}

const PACKAGE = { identifier: '$rc_annual' } as any;

describe('SubscriptionProvider billing lifecycle', () => {
  beforeEach(() => {
    harness.user = { id: 'account-a' };
    harness.subscription = null;
    harness.appStateListener = null;
    harness.customerInfoListener = null;
    harness.synchronizeIdentity.mockReset();
    harness.synchronizeIdentity.mockResolvedValue(true);
    for (const method of Object.values(harness.purchases)) {
      if (typeof method === 'function' && 'mockClear' in method) (method as any).mockClear();
    }
    harness.purchases.getCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    harness.purchases.getOfferings.mockResolvedValue({ current: { identifier: 'default', availablePackages: [] } });
    harness.purchases.purchasePackage.mockResolvedValue({ customerInfo: { entitlements: { active: { caloraapp_pro: {} } } } });
    harness.purchases.restorePurchases.mockResolvedValue({ entitlements: { active: { caloraapp_pro: {} } } });
  });

  it('fails purchase and restore closed while a new account identity is still synchronizing', async () => {
    let releaseAccountB!: () => void;
    harness.synchronizeIdentity.mockImplementation(async (userId: string | null, _purchases?: unknown) => {
      if (userId === 'account-b') {
        await new Promise<void>((resolve) => { releaseAccountB = resolve; });
      }
      return true;
    });
    const view = renderProvider();
    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('ready'));

    harness.user = { id: 'account-b' };
    view.rerenderProvider();
    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('pending'));

    await expect(harness.subscription.purchase(PACKAGE)).rejects.toMatchObject({
      name: 'RevenueCatIdentityNotReadyError',
    });
    await expect(harness.subscription.restore()).rejects.toMatchObject({
      name: 'RevenueCatIdentityNotReadyError',
    });
    expect(harness.purchases.purchasePackage).not.toHaveBeenCalled();
    expect(harness.purchases.restorePurchases).not.toHaveBeenCalled();

    releaseAccountB();
    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('ready'));
    await act(async () => {
      await harness.subscription.purchase(PACKAGE);
    });
    expect(harness.purchases.purchasePackage).toHaveBeenCalledOnce();
  });

  it('updates entitlement from purchase, restore, SDK callbacks, and app-resume refresh', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('ready'));

    await act(async () => {
      await harness.subscription.purchase(PACKAGE);
    });
    await waitFor(() => expect(screen.getByTestId('entitlement').textContent).toBe('active'));

    const readsBeforeResume = harness.purchases.getCustomerInfo.mock.calls.length;
    harness.purchases.getCustomerInfo.mockResolvedValueOnce({ entitlements: { active: {} } });
    await act(async () => {
      harness.appStateListener?.('active');
    });
    await waitFor(() => expect(harness.purchases.getCustomerInfo.mock.calls.length).toBeGreaterThan(readsBeforeResume));

    await act(async () => {
      harness.customerInfoListener?.({ entitlements: { active: { caloraapp_pro: {} } } });
    });
    await waitFor(() => expect(screen.getByTestId('entitlement').textContent).toBe('active'));

    harness.purchases.restorePurchases.mockResolvedValueOnce({ entitlements: { active: { caloraapp_pro: {} } } });
    await act(async () => {
      await harness.subscription.restore();
    });
    expect(harness.purchases.restorePurchases).toHaveBeenCalledOnce();
  });
});
