/**
 * Rendered Profile route coverage for the audit-critical interactions.
 *
 * @vitest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthSyncOutcome } from '@/context/CaloraContext';

const harness = vi.hoisted(() => {
  const notificationPreferences = {
    version: 1 as const,
    delivery: 'local' as const,
    scopeToken: 'scope_profile_test_123',
    masterEnabled: true,
    quietHours: { enabled: false, start: { hour: 22, minute: 0 }, end: { hour: 7, minute: 0 } },
    categories: {
      hydration: { enabled: false, preferences: { enabled: false, wakeHour: 7, wakeMinute: 0, sleepHour: 22, sleepMinute: 0, intervalHours: 2 } },
      meal: { enabled: false, preferences: { breakfast: false, breakfastTime: { hour: 8, minute: 0 }, lunch: false, lunchTime: { hour: 12, minute: 30 }, dinner: false, dinnerTime: { hour: 18, minute: 30 } } },
      goal: { enabled: false, preferences: { enabled: false, hour: 20, minute: 0 } },
    },
  };
  const colors = {
    background: '#fff', foreground: '#111', card: '#fff', border: '#ddd', primary: '#337ab7',
    primaryForeground: '#fff', muted: '#f2f2f2', mutedForeground: '#666', accent: '#e5f1ff',
    accentForeground: '#17324d', destructive: '#c33', warning: '#d7954e', input: '#ccc',
  };
  const profile = {
    name: 'Alex', age: 30, heightCm: 170, weightKg: 70, targetWeightKg: 68,
    activity: 'moderate', diet: 'Everything', goal: 'maintain', units: 'metric',
    calorieTarget: 2000, targetMode: 'automatic',
  };
  const state = {
    tab: undefined as string | undefined,
    open: undefined as string | undefined,
    user: { id: 'profile-test-account' } as { id: string } | null,
    notifications: [] as Array<{ id: string; category: string; title: string; body: string; receivedAt: string; read: boolean }>,
    savedMeals: [] as Array<{ id: string; name: string; kind: 'meal' | 'recipe'; calories: number; protein: number; carbs: number; fat: number }>,
  };
  const updateNotificationPreferences = vi.fn((updater: any) => updater(notificationPreferences));
  const calora = {
     colors, themePreference: 'system', setThemePreference: vi.fn(), setOnboardingStep: vi.fn(), profile, onboardingComplete: true, onboardingStep: 0, updateProfile: vi.fn(),
    healthConnected: true, healthConnection: { provider: 'health-connect', authorization: 'partial', granted: ['steps'] },
    connectHealth: vi.fn(async () => undefined),
    openHealthSettings: vi.fn(async () => undefined),
    syncHealth: vi.fn(async (): Promise<HealthSyncOutcome> => ({ status: 'synced', syncedAt: '2026-09-04T05:00:00.000Z' })),
    disconnectHealth: vi.fn(),
    exportData: vi.fn(async () => '{}'), clearAllData: vi.fn(async () => undefined), isClearing: false, syncState: 'local',
    savedMeals: state.savedMeals, saveMeal: vi.fn(), deleteSavedMeal: vi.fn(),
    notificationPreferences, updateNotificationPreferences, livingMemory: { mealObservations: {}, waterObservations: {}, moodObservations: {}, activityObservations: {}, plannerObservations: {} },
    logs: [], fontSizeScale: 'default', setFontSizeScale: vi.fn(), profilePhotoUri: null, setProfilePhotoUri: vi.fn(), fontScale: 1,
  };
  return { state, calora, notificationPreferences, colors, router: { push: vi.fn(), navigate: vi.fn() }, useSubscription: vi.fn() };
});

vi.mock('expo-router', () => ({
  router: harness.router,
  useLocalSearchParams: () => ({ tab: harness.state.tab, open: harness.state.open }),
}));
vi.mock('@/context/CaloraContext', () => ({ useCalora: () => harness.calora }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: harness.state.user }) }));
vi.mock('@/lib/revenuecat', () => ({
  REVENUECAT_ENTITLEMENT_IDENTIFIER: 'caloraapp_pro',
  useSubscription: () => harness.useSubscription(),
}));
vi.mock('@/lib/notificationLifecycle', () => ({
  reconcileUserNotificationPlan: vi.fn(async () => ({ status: 'scheduled', scheduledCount: 1 })),
}));
vi.mock('@/lib/notificationInbox', () => ({
  getNotificationInbox: vi.fn(async () => harness.state.notifications),
  subscribeToNotificationInbox: vi.fn(() => () => undefined),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  clearNotificationInbox: vi.fn(async () => undefined),
}));
vi.mock('@/lib/profilePhotoStorage', () => ({ copyProfilePhoto: vi.fn(), deleteProfilePhoto: vi.fn() }));
vi.mock('@/lib/clearAllData', () => ({ ClearAllDataError: class ClearAllDataError extends Error {} }));
vi.mock('expo-notifications', () => ({ PermissionStatus: { DENIED: 'denied' }, getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })) }));
vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success' },
}));
vi.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: vi.fn(), launchImageLibraryAsync: vi.fn() }));
vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(async () => undefined),
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: vi.fn(async () => false), shareAsync: vi.fn() }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('@expo/vector-icons', () => ({ Feather: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('react-native-reanimated', () => {
  const animation = { duration: () => animation, delay: () => animation, reduceMotion: () => animation };
  return { default: { View: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }, FadeInDown: animation, ReduceMotion: { System: 'system' } };
});
vi.mock('@/components/AppChrome', () => ({ AppHeader: ({ action }: { action?: React.ReactNode }) => <div>{action}</div> }));
vi.mock('@/components/ReferralCard', () => ({ ReferralCard: () => null }));
vi.mock('@/components/auth/AccountSection', () => ({ AccountSection: () => null }));
vi.mock('@/components/KeyboardAwareScrollViewCompat', () => ({ KeyboardAwareScrollViewCompat: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/BottomSheet', () => ({ BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <div role="dialog">{children}</div> : null }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('@/components/SwipeableTabList', () => ({
  SwipeableSectionPager: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwipeableTabList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ProfileScreen from '@/app/(tabs)/profile';

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    customerInfo: { entitlements: { active: {} }, managementURL: null },
    offerings: {
      current: {
        identifier: 'default',
        availablePackages: [
          { identifier: '$rc_monthly', product: { priceString: '$4.99', price: 4.99, currencyCode: 'USD' } },
          { identifier: '$rc_annual', product: { priceString: '$34.99', price: 34.99, currencyCode: 'USD' } },
        ],
      },
    },
    isSubscribed: false,
    isIdentityReady: true,
    identitySyncFailed: false,
    purchase: vi.fn(async () => ({ entitlements: { active: { caloraapp_pro: {} } } })),
    restore: vi.fn(async () => ({ entitlements: { active: {} } })),
    isPurchasing: false,
    isRestoring: false,
    refreshCustomerInfo: vi.fn(async () => undefined),
    retryIdentitySync: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  harness.state.tab = undefined;
  harness.state.open = undefined;
  harness.state.user = { id: 'profile-test-account' };
  harness.state.notifications = [];
  harness.state.savedMeals = [{
    id: 'saved-1', name: 'Test oats', kind: 'meal', calories: 320, protein: 12, carbs: 44, fat: 9,
  }];
  harness.calora.savedMeals = harness.state.savedMeals;
  harness.calora.healthConnected = true;
  harness.calora.healthConnection = { provider: 'health-connect', authorization: 'partial', granted: ['steps'] };
  harness.calora.onboardingComplete = true;
  harness.calora.onboardingStep = 0;
  harness.useSubscription.mockReturnValue(makeSubscription());
  vi.clearAllMocks();
});

describe('Profile rendered interactions', () => {
  it('offers a review path for completed onboarding without changing data first', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByText('Your starting preferences are saved. Review them anytime.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review onboarding' }));
    expect(harness.router.push).toHaveBeenCalledWith({ pathname: '/', params: { mode: 'review' } });
  });

  it('offers a resume path with the saved onboarding step when setup is incomplete', () => {
    harness.calora.onboardingComplete = false;
    harness.calora.onboardingStep = 3;
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByText('Continue from step 4 of 7.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Resume onboarding' }));
    expect(harness.router.push).toHaveBeenCalledWith({ pathname: '/', params: { mode: 'resume' } });
  });

  it('switches between You, Membership, and Account tabs', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Your plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByText('Calora Pro')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Account profile tab' }));
    expect(screen.getByText('Your plan').closest('[class*="r-display"]')).toBeTruthy();
  });

  it('uses the approved store prices and only reports purchase success with the expected entitlement', async () => {
    const subscription = makeSubscription();
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByRole('radio', { name: 'Choose monthly plan' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Choose annual plan' }).textContent).toContain('$34.99');
    expect(screen.getByText(/\$4\.99/)).toBeTruthy();
    expect(screen.getByText(/Approx\. \$2\.92 \/ mo · billed annually/)).toBeTruthy();
    expect(screen.getByText(/7-day free trial/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to billing' }));
    expect(screen.getByText('Confirm your purchase')).toBeTruthy();
    expect(screen.getByText(/at \$34\.99 per year/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Confirm purchase'));
    await waitFor(() => expect(subscription.purchase).toHaveBeenCalledOnce());
    expect(screen.getByText(/Your subscription is active/)).toBeTruthy();
  });

  it('does not claim active access when a completed purchase lacks the expected entitlement', async () => {
    const subscription = makeSubscription({
      purchase: vi.fn(async () => ({ entitlements: { active: {} } })),
    });
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to billing' }));
    fireEvent.click(screen.getByLabelText('Confirm purchase'));

    await waitFor(() => expect(subscription.refreshCustomerInfo).toHaveBeenCalledOnce());
    expect(screen.getByText(/still confirming access with the store/)).toBeTruthy();
    expect(screen.queryByText(/Your subscription is active/)).toBeNull();
  });

  it('reports an active restore only when the expected Calora Pro entitlement is returned', async () => {
    const subscription = makeSubscription({
      restore: vi.fn(async () => ({ entitlements: { active: { caloraapp_pro: {} } } })),
    });
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByLabelText('Restore purchases'));

    await waitFor(() => expect(subscription.restore).toHaveBeenCalledOnce());
    expect(screen.getByText(/Calora Pro has been restored on this device/)).toBeTruthy();
  });

  it('reports an empty restore honestly instead of granting access', async () => {
    const subscription = makeSubscription();
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByLabelText('Restore purchases'));

    await waitFor(() => expect(subscription.restore).toHaveBeenCalledOnce());
    expect(screen.getByText(/No previous purchases were found for this account/)).toBeTruthy();
  });

  it('closes a user-cancelled purchase without displaying a false failure or success', async () => {
    const subscription = makeSubscription({
      purchase: vi.fn(async () => { throw { userCancelled: true }; }),
    });
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to billing' }));
    fireEvent.click(screen.getByLabelText('Confirm purchase'));

    await waitFor(() => expect(subscription.purchase).toHaveBeenCalledOnce());
    expect(screen.queryByText('Confirm your purchase')).toBeNull();
    expect(screen.queryByText(/Your subscription is active/)).toBeNull();
    expect(screen.queryByText(/could not be completed/)).toBeNull();
  });

  it('reports a provider purchase failure and confirms that no charge was claimed', async () => {
    const subscription = makeSubscription({
      purchase: vi.fn(async () => { throw new Error('provider unavailable'); }),
    });
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to billing' }));
    fireEvent.click(screen.getByLabelText('Confirm purchase'));

    await waitFor(() => expect(subscription.purchase).toHaveBeenCalledOnce());
    expect(screen.getByText(/could not be completed. You have not been charged/)).toBeTruthy();
  });

  it('keeps subscription management native-only on web instead of opening an unrelated destination', async () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByLabelText('Manage subscription'));

    await waitFor(() => {
      expect(screen.getByText(/Open Calora on your iPhone or Android device to manage/)).toBeTruthy();
    });
  });

  it('blocks purchase and restore until the current signed-in identity is synchronized', () => {
    harness.useSubscription.mockReturnValue(makeSubscription({ isIdentityReady: false }));
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));

    const purchase = screen.getByRole('button', { name: 'Billing account setup is not ready' });
    const restore = screen.getByLabelText('Restore purchases');
    expect(purchase.getAttribute('aria-disabled')).toBe('true');
    expect(restore.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(/Billing account setup is still finishing/)).toBeTruthy();
  });

  it('offers an explicit retry after billing identity synchronization fails', () => {
    const subscription = makeSubscription({ isIdentityReady: false, identitySyncFailed: true });
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry billing account setup' }));
    expect(subscription.retryIdentitySync).toHaveBeenCalledOnce();
  });

  it('requires sign-in before financial actions', () => {
    harness.state.user = null;
    harness.useSubscription.mockReturnValue(makeSubscription({ isIdentityReady: false }));
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));

    expect(screen.getByText(/Sign in to your Calora account before purchasing or restoring/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in required before billing' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByLabelText('Restore purchases').getAttribute('aria-disabled')).toBe('true');
  });

  it('rejects an unexpected current RevenueCat offering instead of silently selling it', () => {
    const subscription = makeSubscription();
    subscription.offerings.current.identifier = 'unexpected-offering';
    harness.useSubscription.mockReturnValue(subscription);
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));

    expect(screen.getByText(/does not match Calora's approved billing configuration/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Selected store plan is unavailable' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('shows recovery controls for partial Health Connect and reacts to a health deep link after mount', async () => {
    const view = render(<ProfileScreen />);
    harness.state.open = 'health';
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText(/Active calories are not allowed yet/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Update Health Connect access' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Health Connect settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sync health data now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect health data' })).toBeTruthy();
  });

  it('re-requests missing Active Calories access from a partial Health Connect grant', async () => {
    const view = render(<ProfileScreen />);
    harness.state.open = 'health';
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Update Health Connect access' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Update Health Connect access' }));
    await waitFor(() => expect(harness.calora.connectHealth).toHaveBeenCalledTimes(1));
  });

  it('opens native Health Connect settings from the partial-access recovery path', async () => {
    const view = render(<ProfileScreen />);
    harness.state.open = 'health';
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open Health Connect settings' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Open Health Connect settings' }));
    await waitFor(() => expect(harness.calora.openHealthSettings).toHaveBeenCalledTimes(1));
  });

  it('runs health sync and confirms success or failure in the health sheet', async () => {
    const view = render(<ProfileScreen />);
    harness.state.open = 'health';
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync health data now' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Sync health data now' }));
    await waitFor(() => expect(harness.calora.syncHealth).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Health data synced just now.')).toBeTruthy();

  });

  it('shows the native sync error instead of reporting a false success', async () => {
    harness.calora.syncHealth.mockResolvedValueOnce({ status: 'failed', message: 'Health Connect could not be read.' });
    const view = render(<ProfileScreen />);
    harness.state.open = 'health';
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync health data now' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Sync health data now' }));
    await waitFor(() => expect(screen.getByText('Health Connect could not be read.')).toBeTruthy());
  });

  it('opens saved-meal creation and routes living memory to its screen', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create saved meal' }));
    expect(screen.getByText('Create a saved template')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel saved meal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review living memory' }));
    expect(harness.router.push).toHaveBeenCalledWith('/memory');
  });

  it('opens the account-scoped notification inbox and exposes unread state', async () => {
    harness.state.notifications = [{ id: 'n1', category: 'goal', title: 'Goal check-in', body: 'Nice work', receivedAt: '2026-09-03T12:00:00.000Z', read: false }];
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Open notifications/ }));
    await waitFor(() => expect(screen.getByText('Goal check-in')).toBeTruthy());
    expect(screen.getByText('1 unread update')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Unread Goal check-in/ })).toBeTruthy();
  });
});
