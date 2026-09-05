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
    notifications: [] as Array<{ id: string; category: string; title: string; body: string; receivedAt: string; read: boolean }>,
    savedMeals: [] as Array<{ id: string; name: string; kind: 'meal' | 'recipe'; calories: number; protein: number; carbs: number; fat: number }>,
  };
  const updateNotificationPreferences = vi.fn((updater: any) => updater(notificationPreferences));
  const calora = {
     colors, themePreference: 'system', setThemePreference: vi.fn(), profile, onboardingComplete: true, updateProfile: vi.fn(),
    healthConnected: true, healthConnection: { provider: 'health-connect', authorization: 'partial', granted: ['steps'] },
    connectHealth: vi.fn(async () => undefined),
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
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'profile-test-account' } }) }));
vi.mock('@/lib/revenuecat', () => ({
  REVENUECAT_ENTITLEMENT_IDENTIFIER: 'calora_pro',
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
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: '/tmp/', getInfoAsync: vi.fn(), readAsStringAsync: vi.fn(), writeAsStringAsync: vi.fn() }));
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

beforeEach(() => {
  harness.state.tab = undefined;
  harness.state.open = undefined;
  harness.state.notifications = [];
  harness.state.savedMeals = [{
    id: 'saved-1', name: 'Test oats', kind: 'meal', calories: 320, protein: 12, carbs: 44, fat: 9,
  }];
  harness.calora.savedMeals = harness.state.savedMeals;
  harness.calora.healthConnected = true;
  harness.calora.healthConnection = { provider: 'health-connect', authorization: 'partial', granted: ['steps'] };
  harness.useSubscription.mockReturnValue({
    offerings: {
      current: {
        availablePackages: [
          { identifier: '$rc_monthly', product: { priceString: '$4.99' } },
          { identifier: '$rc_annual', product: { priceString: '$39.99' } },
        ],
      },
    },
    isSubscribed: false,
    purchase: vi.fn(async () => undefined),
    restore: vi.fn(async () => ({ entitlements: { active: {} } })),
    isPurchasing: false,
    isRestoring: false,
  });
  vi.clearAllMocks();
});

describe('Profile rendered interactions', () => {
  it('offers a review path for completed onboarding without changing data first', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Your starting preferences are saved. Review them anytime.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review onboarding' }));
    expect(harness.router.push).toHaveBeenCalledWith({ pathname: '/', params: { mode: 'review' } });
  });

  it('switches between You, Membership, and Account tabs', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Your plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByText('CaloraApp Pro')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Account profile tab' }));
    expect(screen.getByText('Your plan').closest('[class*="r-display"]')).toBeTruthy();
  });

  it('uses the store purchase flow and labels plan choices as radio controls', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Membership profile tab' }));
    expect(screen.getByRole('radio', { name: 'Choose monthly plan' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Choose annual plan' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to billing' }));
    expect(screen.getByText('Confirm your purchase')).toBeTruthy();
  });

  it('shows recovery controls for partial Health Connect and reacts to a health deep link after mount', async () => {
    render(<ProfileScreen />);
    harness.state.open = 'health';
    await waitFor(() => expect(screen.getByText(/Some requested categories are not available/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Sync health data now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect health data' })).toBeTruthy();
  });

  it('runs health sync and confirms success or failure in the health sheet', async () => {
    render(<ProfileScreen />);
    harness.state.open = 'health';
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync health data now' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Sync health data now' }));
    await waitFor(() => expect(harness.calora.syncHealth).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Health data synced just now.')).toBeTruthy();

  });

  it('shows the native sync error instead of reporting a false success', async () => {
    harness.calora.syncHealth.mockResolvedValueOnce({ status: 'failed', message: 'Health Connect could not be read.' });
    render(<ProfileScreen />);
    harness.state.open = 'health';
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