import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { BRAND, EMAILS, URLS } from '@/lib/brand';
import { formatQuantity } from '@/lib/formatters';
import { formatGrams, formatWhole } from '@/lib/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SavedMeal, ThemePreference, useCalora } from '@/context/CaloraContext';
import type { HealthSyncOutcome } from '@/context/CaloraContext';
import { ClearAllDataError } from '@/lib/clearAllData';
import {
  formatTime,
  type HydrationReminderPrefs,
} from '@/lib/hydrationReminders';
import { type MealReminderPrefs } from '@/lib/mealReminders';
import { type GoalReminderPrefs } from '@/lib/goalReminder';
import { normalizeNotificationPreferences } from '@/lib/notificationPreferences';
import { reconcileUserNotificationPlan } from '@/lib/notificationLifecycle';
import type { NotificationReconciliationResult } from '@/lib/notificationReconciliation';
import * as FileSystem from 'expo-file-system/legacy';
import { copyProfilePhoto, deleteProfilePhoto } from '@/lib/profilePhotoStorage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { deriveExportHasData, makeExportHandler } from '@/lib/exportUiHandler';
import { SettingRowPressable } from '@/components/SettingRowPressable';
import { AccountSection } from '@/components/auth/AccountSection';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppChrome';
import { SwipeableSectionPager, SwipeableTabList } from '@/components/SwipeableTabList';
import { ReferralCard } from '@/components/ReferralCard';
import { REVENUECAT_ENTITLEMENT_IDENTIFIER, useSubscription } from '@/lib/revenuecat';
import { enterMotion } from '@/lib/motion';
import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ProfileYouSettings } from '@/components/ProfileYouSettings';
import {
  clearNotificationInbox,
  getNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotificationInbox,
  type NotificationInboxItem,
} from '@/lib/notificationInbox';

// ─── Static config ────────────────────────────────────────────────────────────

const themes: { key: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'smartphone' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

const mealConfig: { key: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: keyof typeof Feather.glyphMap; iconBg: string; iconColor: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunrise', iconBg: '#fff0dc', iconColor: '#d7954e' },
  { key: 'lunch', label: 'Lunch', icon: 'sun', iconBg: '#e5f1ff', iconColor: '#5d8edb' },
  { key: 'dinner', label: 'Dinner', icon: 'moon', iconBg: '#f2eafd', iconColor: '#9875c7' },
];

type ProfileTab = 'you' | 'membership' | 'account';
const PROFILE_TABS = ['you', 'membership', 'account'] as const;

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return isToday
    ? `Today · ${time}`
    : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

export function notificationOutcomeMessage(result: NotificationReconciliationResult): string | null {
  if (result.status !== 'failed') return null;
  if (result.failure === 'cancel') return 'Existing reminders could not be cleared. Your preferences were saved; please retry.';
  if (result.failure === 'presented') return 'Older displayed reminders could not be cleared safely. Your preferences were saved; please retry.';
  if (result.failure === 'channels') return 'Reminder channels could not be prepared on this device. Please retry.';
  return 'Not all reminders could be scheduled. Your preferences were saved; please retry.';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { tab, open } = useLocalSearchParams<{ tab?: string; open?: string }>();
  const { user } = useAuth();
  const {
    colors, themePreference, setThemePreference,
    profile, onboardingComplete, onboardingStep, updateProfile,
    healthConnected, healthConnection, connectHealth, syncHealth, disconnectHealth,
    exportData, clearAllData, isClearing, syncState,
    savedMeals, saveMeal, deleteSavedMeal,
    notificationPreferences, updateNotificationPreferences,
    livingMemory, logs,
    fontSizeScale, setFontSizeScale,
    profilePhotoUri, setProfilePhotoUri, fontScale,
  } = useCalora();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);

  const hasExportData = deriveExportHasData(profile, logs);
  const insets = useSafeAreaInsets();

  // Billing — the live RevenueCat offering is the price authority.
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [billingModal, setBillingModal] = useState<'purchase' | 'confirm' | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const { offerings, isSubscribed, purchase, restore, isPurchasing, isRestoring } = useSubscription();
  const currentOffering = offerings?.current ?? null;
  const monthlyPkg = currentOffering?.availablePackages.find((p) => p.identifier === '$rc_monthly') ?? currentOffering?.monthly ?? null;
  const annualPkg = currentOffering?.availablePackages.find((p) => p.identifier === '$rc_annual') ?? currentOffering?.annual ?? null;
  const monthlyPriceString = monthlyPkg?.product.priceString ?? null;
  const annualPriceString = annualPkg?.product.priceString ?? null;
  const selectedPrice = selectedPlan === 'annual' ? annualPriceString : monthlyPriceString;
  const selectedPeriod = selectedPlan === 'annual' ? 'year' : 'month';
  const selectedPackage = selectedPlan === 'annual' ? annualPkg : monthlyPkg;
  const isSelectedPlanAvailable = isSubscribed || !!selectedPackage;

  // Privacy / delete
  const [privacyModal, setPrivacyModal] = useState<'delete' | null>(null);
  const confirmingRef = useRef(false);

  // Export in-progress guard
  // exportLockRef is the synchronous mutex — checked/set before the first await
  // so two rapid taps in the same frame both observe the same value.
  // isExporting is UI-only (spinner, disabled state) and does NOT close the race.
  const exportLockRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  // Reminder statuses
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'denied' | 'scheduled' | 'failed'>('idle');
  const [mealReminderStatus, setMealReminderStatus] = useState<'idle' | 'denied' | 'scheduled' | 'failed'>('idle');
  const [goalReminderStatus, setGoalReminderStatus] = useState<'idle' | 'denied' | 'scheduled' | 'failed'>('idle');
  const [notificationPermissionDenied, setNotificationPermissionDenied] = useState(false);
  const [notificationReconcileError, setNotificationReconcileError] = useState<string | null>(null);
  const [notificationUpdating, setNotificationUpdating] = useState(false);

  // Saved meal creation modal
  const [savedMealModal, setSavedMealModal] = useState(false);
  const [savedMealPendingDelete, setSavedMealPendingDelete] = useState<SavedMeal | null>(null);
  const [savedMealName, setSavedMealName] = useState('');
  const [savedMealKind, setSavedMealKind] = useState<SavedMeal['kind']>('meal');
  const [savedMealCalories, setSavedMealCalories] = useState('');
  const [savedMealProtein, setSavedMealProtein] = useState('');
  const [savedMealCarbs, setSavedMealCarbs] = useState('');
  const [savedMealFat, setSavedMealFat] = useState('');
  const [savedMealError, setSavedMealError] = useState('');

  // Profile edit modal
  const [profileEditModal, setProfileEditModal] = useState(false);
  const [profileEditError, setProfileEditError] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);

  // Info sheets (food data / no ads / help)
  const [infoModal, setInfoModal] = useState<null | 'food-data' | 'no-ads' | 'help' | 'health'>(open === 'health' ? 'health' : null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthSyncFeedback, setHealthSyncFeedback] = useState<HealthSyncOutcome | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>(tab === 'membership' || tab === 'account' ? tab : 'you');
  const [notificationModal, setNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationInboxItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const notificationRequestRef = useRef(0);
  const notificationAccountId = user?.id ?? null;
  // These are the user's desired settings rather than the legacy effective
  // mirrors, which are intentionally off while the master delivery switch is off.
  const hydrationReminderPrefs = notificationPreferences.categories.hydration.preferences;
  const mealReminderPrefs = notificationPreferences.categories.meal.preferences;
  const goalReminderPrefs = notificationPreferences.categories.goal.preferences;

  const refreshNotifications = useCallback(async () => {
    const requestId = ++notificationRequestRef.current;
    setNotificationsLoading(true);
    try {
      const items = await getNotificationInbox(notificationAccountId);
      if (requestId !== notificationRequestRef.current) return;
      setNotifications(items);
      setNotificationsError(null);
    } catch (error) {
      if (requestId !== notificationRequestRef.current) return;
      console.warn('[Calora][notifications] Could not load inbox:', error);
      setNotificationsError('Your notification history could not be loaded.');
    } finally {
      if (requestId === notificationRequestRef.current) setNotificationsLoading(false);
    }
  }, [notificationAccountId]);

  useEffect(() => {
    setNotifications([]);
    setNotificationsError(null);
    void refreshNotifications();
    const unsubscribe = subscribeToNotificationInbox(notificationAccountId, setNotifications);
    return () => {
      notificationRequestRef.current++;
      unsubscribe();
    };
  }, [notificationAccountId, refreshNotifications]);

  const openNotificationCenter = () => {
    setNotificationModal(true);
    void refreshNotifications();
  };

  const handleNotificationPress = async (item: NotificationInboxItem) => {
    if (!item.read) {
      await markNotificationRead(notificationAccountId, item.id);
    }
    setNotificationModal(false);
    if (item.category === 'hydration' || item.category === 'meal' || item.category === 'goal') {
      router.navigate('/');
    }
  };

  const handleMarkAllNotificationsRead = () => {
    void markAllNotificationsRead(notificationAccountId).catch(() => {
      Alert.alert('Could not update notifications', 'Please try again.');
    });
  };

  const handleClearNotifications = () => {
    Alert.alert(
      'Clear notification history?',
      'This removes notifications from this inbox. Your reminder settings will not change.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear history',
          style: 'destructive',
          onPress: () => {
            void clearNotificationInbox(notificationAccountId).catch(() => {
              Alert.alert('Could not clear notifications', 'Please try again.');
            });
          },
        },
      ],
    );
  };

  const unreadNotificationCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (tab !== 'membership' && tab !== 'account' && tab !== 'you') return;
    setProfileTab(tab);
  }, [tab]);

  useEffect(() => {
    if (open === 'health') setInfoModal('health');
  }, [open]);

  useEffect(() => {
    if (infoModal !== 'health') setHealthSyncFeedback(null);
  }, [infoModal]);

  // ─── OS reminder status sync ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status === Notifications.PermissionStatus.DENIED) {
          setNotificationPermissionDenied(true);
        } else {
          setNotificationPermissionDenied(false);
        }
      } catch (error) {
        console.warn('[Calora][notifications] Could not read notification permission:', error);
        // Permission not granted yet — leave statuses at 'idle'
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const applyNotificationPrefs = async (
    updater: (current: typeof notificationPreferences) => typeof notificationPreferences,
  ) => {
    void Haptics.selectionAsync().catch(() => {});
    // Persist first: permission denial controls delivery, never the user's choices.
    const desired = updateNotificationPreferences((current) =>
      normalizeNotificationPreferences(updater(current)));
    setNotificationUpdating(true);
    try {
      const result = await reconcileUserNotificationPlan(desired);
      setNotificationPermissionDenied((wasDenied) => result.status === 'denied'
        ? true
        : result.status === 'scheduled' ? false : wasDenied);
      setNotificationReconcileError(notificationOutcomeMessage(result));
      return { result, desired };
    } catch {
      const result: NotificationReconciliationResult = { status: 'failed', scheduledCount: 0, failure: 'schedule' };
      setNotificationReconcileError(notificationOutcomeMessage(result));
      return { result, desired };
    } finally {
      setNotificationUpdating(false);
    }
  };

  const openNotificationSettings = () => {
    void Linking.openSettings().catch(() => {
      Alert.alert('Unable to open settings', 'Open your device settings and allow notifications for this app.');
    });
  };

  const nudgeQuietTime = (field: 'start' | 'end', delta: number) => {
    void applyNotificationPrefs((current) => {
      const time = current.quietHours[field];
      const minutes = (time.hour * 60 + time.minute + delta + 24 * 60) % (24 * 60);
      return {
        ...current,
        quietHours: { ...current.quietHours, [field]: { hour: Math.floor(minutes / 60), minute: minutes % 60 } },
      };
    });
  };

  /** Hydration reminders */
  const applyHydrationPrefs = async (next: HydrationReminderPrefs) => {
    const { result, desired } = await applyNotificationPrefs((current) => ({
      ...current,
      categories: {
        ...current.categories,
        hydration: { enabled: next.enabled, preferences: next },
      },
    }));
    if (result.status === 'denied') {
      setReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive hydration reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else if (result.status === 'failed') {
      setReminderStatus('failed');
    } else {
      setReminderStatus(result.status === 'scheduled' && desired.masterEnabled && next.enabled ? 'scheduled' : 'idle');
    }
  };
  const nudgeHydrationHour = (field: 'wakeHour' | 'sleepHour', delta: number) =>
    applyNotificationPrefs((current) => {
      const prefs = current.categories.hydration.preferences;
      const next = { ...prefs, [field]: (prefs[field] + delta + 24) % 24 };
      return { ...current, categories: { ...current.categories, hydration: { enabled: next.enabled, preferences: next } } };
    });
  const nudgeHydrationMinute = (field: 'wakeMinute' | 'sleepMinute', delta: number) =>
    applyNotificationPrefs((current) => {
      const prefs = current.categories.hydration.preferences;
      const next = { ...prefs, [field]: (prefs[field] + delta + 60) % 60 };
      return { ...current, categories: { ...current.categories, hydration: { enabled: next.enabled, preferences: next } } };
    });

  /** Meal reminders */
  const applyMealPrefs = async (next: MealReminderPrefs) => {
    const { result, desired } = await applyNotificationPrefs((current) => ({
      ...current,
      categories: {
        ...current.categories,
        meal: { enabled: next.breakfast || next.lunch || next.dinner, preferences: next },
      },
    }));
    if (result.status === 'denied') {
      setMealReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive meal reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else if (result.status === 'failed') {
      setMealReminderStatus('failed');
    } else {
      const anyEnabled = next.breakfast || next.lunch || next.dinner;
      setMealReminderStatus(result.status === 'scheduled' && desired.masterEnabled && anyEnabled ? 'scheduled' : 'idle');
    }
  };
  const nudgeMealTime = (meal: 'breakfast' | 'lunch' | 'dinner', field: 'hour' | 'minute', delta: number) => {
    const timeKey = `${meal}Time` as 'breakfastTime' | 'lunchTime' | 'dinnerTime';
    void applyNotificationPrefs((current) => {
      const prefs = current.categories.meal.preferences;
      const time = prefs[timeKey];
      const next = {
        ...prefs,
        [timeKey]: field === 'hour'
          ? { ...time, hour: (time.hour + delta + 24) % 24 }
          : { ...time, minute: (time.minute + delta + 60) % 60 },
      };
      return {
        ...current,
        categories: {
          ...current.categories,
          meal: { enabled: next.breakfast || next.lunch || next.dinner, preferences: next },
        },
      };
    });
  };

  /** Goal reminder */
  const applyGoalPrefs = async (next: GoalReminderPrefs) => {
    const { result, desired } = await applyNotificationPrefs((current) => ({
      ...current,
      categories: {
        ...current.categories,
        goal: { enabled: next.enabled, preferences: next },
      },
    }));
    if (result.status === 'denied') {
      setGoalReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive goal reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else if (result.status === 'failed') {
      setGoalReminderStatus('failed');
    } else {
      setGoalReminderStatus(result.status === 'scheduled' && desired.masterEnabled && next.enabled ? 'scheduled' : 'idle');
    }
  };
  const nudgeGoalTime = (field: 'hour' | 'minute', delta: number) =>
    applyNotificationPrefs((current) => {
      const prefs = current.categories.goal.preferences;
      const next = {
        ...prefs,
        hour: field === 'hour' ? (prefs.hour + delta + 24) % 24 : prefs.hour,
        minute: field === 'minute' ? (prefs.minute + delta + 60) % 60 : prefs.minute,
      };
      return { ...current, categories: { ...current.categories, goal: { enabled: next.enabled, preferences: next } } };
    });

  /** Billing */
  const handlePurchase = () => {
    if (isSubscribed) {
      setBillingNotice(`${BRAND.premiumName} is already active on this account.`);
      return;
    }
    if (!selectedPackage) {
      // Offerings unavailable (offline / not yet loaded) — informational fallback.
      setBillingModal('purchase');
      return;
    }
    setBillingModal('confirm');
  };

  const confirmPurchase = async () => {
    if (!selectedPackage || isPurchasing) return;
    try {
      await purchase(selectedPackage);
      setBillingModal(null);
      setBillingNotice(`Welcome to ${BRAND.premiumName}! Your subscription is active.`);
    } catch (err) {
      setBillingModal(null);
      const cancelled = !!(err && typeof err === 'object' && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled);
      if (!cancelled) {
        setBillingNotice('The purchase could not be completed. You have not been charged.');
      }
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    try {
      const info = await restore();
      const active = info?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
      setBillingNotice(
        active
          ? `${BRAND.premiumName} has been restored on this device.`
          : 'No previous purchases were found for this account.',
      );
    } catch {
      setBillingNotice('Restore failed. Please check your connection and try again.');
    }
  };

  const handleManage = async () => {
    const managementUrl =
      Platform.OS === 'ios'
        ? 'itms-apps://apps.apple.com/account/subscriptions'
        : Platform.OS === 'android'
          ? 'https://play.google.com/store/account/subscriptions'
          : null;

    if (!managementUrl) {
      setBillingNotice('Open Calora on your iPhone or Android device to manage App Store or Google Play subscriptions.');
      return;
    }

    try {
      await Linking.openURL(managementUrl);
    } catch {
      setBillingNotice('Could not open subscription management. Open your App Store or Google Play account settings to manage or cancel your plan.');
    }
  };

  /** Export — locked against concurrent invocations via exportLockRef */
  const handleExport = makeExportHandler(
    exportLockRef,
    exportData,
    {
      cacheDirectory: FileSystem.cacheDirectory,
      writeAsStringAsync: FileSystem.writeAsStringAsync,
      shareAsync: Sharing.shareAsync,
    },
    {
      setLoading: setIsExporting,
      onNoData: () => Alert.alert('No data', 'There is no local data to export. Log a meal or complete onboarding first.'),
      onError: () => Alert.alert('Export failed', 'Could not open the share sheet. Try again.'),
    },
  );

  /** Delete */
  const handleDelete = () => { if (!isClearing) setPrivacyModal('delete'); };
  const handleConfirmDelete = async () => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    try {
      await clearAllData();
      setPrivacyModal(null);
    } catch (error) {
      if (error instanceof ClearAllDataError && error.kind === 'partial-cleanup') {
        setPrivacyModal(null);
        Alert.alert(
          'Data deleted with cleanup pending',
          `Your personal data was deleted, but ${error.cleanupFailures.join(', ')} could not be fully cleaned up. Please try again.`,
        );
      } else {
        Alert.alert(
          'Delete incomplete',
          'Your main local data could not be fully deleted. Some device cleanup may still have occurred. Please try again.',
        );
      }
    }
    finally { confirmingRef.current = false; }
  };

  const handleHealthConnect = async () => {
    if (healthBusy) return;
    setHealthBusy(true);
    try {
      await connectHealth();
    } catch (err) {
      Alert.alert('Health access unavailable', err instanceof Error ? err.message : 'Could not open health permissions.');
    }
    finally { setHealthBusy(false); }
  };
  const handleHealthSync = async () => {
    if (healthBusy) return;
    setHealthBusy(true);
    setHealthSyncFeedback(null);
    try {
      const outcome = await syncHealth();
      setHealthSyncFeedback(outcome);
      if (outcome.status === 'synced') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      const outcome: HealthSyncOutcome = {
        status: 'failed',
        message: err instanceof Error ? err.message : 'Could not read health data.',
      };
      setHealthSyncFeedback(outcome);
    } finally {
      setHealthBusy(false);
    }
  };

  /** Profile edit */
  const pickPhoto = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Camera access is needed to take a photo.'); return; }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Photo library access is needed to choose a photo.'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    }
    if (!result.canceled && result.assets[0]) {
      const copyResult = await copyProfilePhoto(result.assets[0].uri, FileSystem, user?.id);
      if (!copyResult.ok) {
        if (copyResult.reason === 'no-directory') {
          Alert.alert('Storage unavailable', 'Could not locate the app documents folder. Please try again.');
        } else {
          console.error('[pickPhoto] copyAsync failed', copyResult.error);
          Alert.alert('Photo error', 'Could not save the photo. Please try again.');
        }
        return;
      }
      setEditPhotoUri(copyResult.dest + '?t=' + Date.now());
    }
  };

  const handlePhotoTap = () => {
    Alert.alert('Profile photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickPhoto('camera') },
      { text: 'Photo Library', onPress: () => pickPhoto('library') },
      ...(editPhotoUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setEditPhotoUri(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const openProfileEdit = () => {
    setEditName(profile?.name ?? '');
    setEditPhotoUri(profilePhotoUri);
    setProfileEditError('');
    setProfileEditModal(true);
  };
  const saveProfileEdit = async () => {
    if (!editName.trim()) {
      setProfileEditError('Enter your name.');
      return;
    }
    // Strip the cache-bust query param before persisting
    const cleanUri = editPhotoUri ? editPhotoUri.split('?')[0] : null;
    // If the user removed their photo (had one before, now cleared), delete the file from disk.
    // This runs only on save so a remove-then-cancel leaves the file intact.
    if (profilePhotoUri && !cleanUri) {
      const deleteResult = await deleteProfilePhoto(FileSystem, user?.id);
      if (!deleteResult.ok) {
        console.error('[saveProfileEdit] deleteAsync failed', deleteResult.error);
        Alert.alert('Photo error', 'Could not remove the photo file. Please try again.');
        return;
      }
    }
    updateProfile({ name: editName.trim() });
    setProfilePhotoUri(cleanUri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProfileEditError('');
    setProfileEditModal(false);
  };

  /** Saved meal creation */
  const createSavedMeal = () => {
    const calories = Number(savedMealCalories);
    if (!savedMealName.trim() || !Number.isFinite(calories) || calories <= 0) {
      setSavedMealError('Add a meal name and a positive calorie value.');
      return;
    }
    saveMeal({ name: savedMealName.trim(), kind: savedMealKind, foodIds: [], calories, protein: Number(savedMealProtein) || 0, carbs: Number(savedMealCarbs) || 0, fat: Number(savedMealFat) || 0 });
    setSavedMealName(''); setSavedMealCalories(''); setSavedMealProtein(''); setSavedMealCarbs(''); setSavedMealFat('');
    setSavedMealError('');
    setSavedMealModal(false);
  };

  const confirmSavedMealDelete = () => {
    if (!savedMealPendingDelete) return;
    deleteSavedMeal(savedMealPendingDelete.id);
    setSavedMealPendingDelete(null);
  };

  // Derived
  const units = profile?.units ?? 'metric';
  const displayWeight = profile
    ? units === 'imperial'
      ? `${Math.round(profile.weightKg * 2.20462)} lbs`
      : `${formatQuantity(profile.weightKg)} kg`
    : null;

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        back
        leftAlignTitle
        title="Settings and profile"
        action={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
            testID="profile-notifications-button"
            onPress={openNotificationCenter}
            hitSlop={8}
            style={[styles.notificationButton, { backgroundColor: colors.muted }]}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            {unreadNotificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[styles.notificationBadgeText, { color: colors.destructiveForeground }]}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      />
      <ScrollView contentContainerStyle={[styles.profileContent, { paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>

        {/* ── Profile card ── */}
        <Animated.View entering={enterMotion('screen', 0)} style={[styles.profileCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.largeAvatar, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
            {profilePhotoUri
              ? <Image source={{ uri: profilePhotoUri }} style={{ width: 47, height: 47 }} contentFit="cover" />
              : <Text style={[styles.largeAvatarText, { color: colors.primaryForeground }]}>{profile?.name?.charAt(0) ?? 'A'}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.onHero }]}>{profile?.name ?? 'Your profile'}</Text>
            <Text style={[styles.profileSub, { color: colors.heroMuted }]}>
              {profile
                ? `${formatWhole(profile.calorieTarget)} kcal · ${profile.diet}${displayWeight ? ` · ${displayWeight}` : ''}`
                : `Finish onboarding to personalize ${BRAND.name}`}
            </Text>
          </View>
          <Pressable accessibilityLabel="Edit profile" onPress={openProfileEdit} hitSlop={10}>
            <Feather name="edit-2" size={17} color={colors.heroMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={enterMotion('screen', 1)} style={[styles.onboardingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.onboardingIcon, { backgroundColor: colors.accent }]}>
            <Feather name="compass" size={18} color={colors.primary} />
          </View>
          <View style={styles.onboardingCopy}>
            <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>Onboarding</Text>
            <Text style={[styles.onboardingBody, { color: colors.mutedForeground }]}>
              {onboardingComplete
                ? 'Your starting preferences are saved. Review them anytime.'
                : onboardingStep > 0
                  ? `Continue from step ${onboardingStep + 1} of 7.`
                  : 'Finish setup to personalize your plan.'}
            </Text>
          </View>
          {!onboardingComplete && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume onboarding"
              testID="resume-onboarding"
              onPress={() => router.push({ pathname: '/', params: { mode: 'resume' } })}
              style={[styles.onboardingButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.onboardingButtonText, { color: colors.primaryForeground }]}>Resume</Text>
            </Pressable>
          )}
          {onboardingComplete && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review onboarding"
              testID="review-onboarding"
              onPress={() => router.push({ pathname: '/', params: { mode: 'review' } })}
              style={[styles.onboardingButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.onboardingButtonText, { color: colors.primaryForeground }]}>Review</Text>
            </Pressable>
          )}
        </Animated.View>

        <SwipeableTabList
          items={PROFILE_TABS}
          activeItem={profileTab}
          onChange={setProfileTab}
          accessibilityLabel="Profile sections"
          testID="profile-section-tabs"
          style={[styles.profileTabs, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          {([
            { key: 'you' as const, label: 'You' },
            { key: 'membership' as const, label: 'Membership' },
            { key: 'account' as const, label: 'Account' },
          ]).map((tab) => {
            const selected = profileTab === tab.key;
            return (
              <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={`${tab.label} profile tab`} onPress={() => setProfileTab(tab.key)} style={[styles.profileTab, selected && { backgroundColor: colors.card }]}>
                <Text style={[styles.profileTabText, { color: selected ? colors.foreground : colors.mutedForeground }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </SwipeableTabList>

        <SwipeableSectionPager
          items={PROFILE_TABS}
          activeItem={profileTab}
          onChange={setProfileTab}
          accessibilityLabel="Profile section content"
          testID="profile-section-content"
        >
        <View style={profileTab === 'you' ? undefined : styles.hiddenSection}>
        <ProfileYouSettings profile={profile} colors={colors} updateProfile={updateProfile} />
        {/* ── Appearance ── */}
        <Animated.View entering={enterMotion('screen', 2)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themes.map((theme) => {
            const selected = themePreference === theme.key;
            return (
              <Pressable key={theme.key} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${theme.label} mode`} testID={`theme-${theme.key}`} onPress={() => setThemePreference(theme.key)} style={[styles.segmentedOption, selected && { backgroundColor: colors.accent }]}>
                <Feather name={theme.icon} size={16} color={selected ? colors.accentForeground : colors.mutedForeground} />
                <Text style={[styles.segmentedLabel, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>{theme.label}</Text>
              </Pressable>
            );
          })}
        </View>
        </Animated.View>

        {/* Text size */}
        <Animated.View entering={enterMotion('screen', 3)}>
        <View style={[styles.unitsRow, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="type" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Text size</Text>
            <Text style={{ fontSize: 13 * fontScale, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 3 }} numberOfLines={1}>Grilled chicken salad · 510 kcal</Text>
          </View>
          <View style={styles.unitChips}>
            {(['small', 'default', 'large'] as const).map((key) => {
              const label = { small: 'A−', default: 'A', large: 'A+' }[key];
              const sel = fontSizeScale === key;
              return (
                <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={`${key} text size`} onPress={() => setFontSizeScale(key)} style={[styles.unitChip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.border }]}>
                  <Text style={[styles.unitChipText, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Units */}
        <View style={[styles.unitsRow, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="maximize-2" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.settingTitle, { color: colors.foreground, flex: 1 }]}>Measurement units</Text>
          <View style={styles.unitChips}>
            {(['metric', 'imperial'] as const).map((u) => {
              const sel = units === u;
              return (
                <Pressable key={u} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={`${u} units`} onPress={() => updateProfile({ units: u })} style={[styles.unitChip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.border }]}>
                  <Text style={[styles.unitChipText, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>{u === 'metric' ? 'Metric' : 'Imperial'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </Animated.View>

        </View>

        <View style={profileTab === 'you' ? undefined : styles.hiddenSection}>
        {/* ── Reminders ── */}
        <Animated.View entering={enterMotion('screen', 4)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16, marginBottom: 6 }]}>Reminders</Text>

        {/* Delivery controls keep each category's desired settings intact while paused. */}
        <View style={[styles.notificationMasterCard, { backgroundColor: colors.card, borderColor: notificationPreferences.masterEnabled ? colors.primary : colors.border }]}>
          <View style={[styles.notificationMasterIcon, { backgroundColor: notificationPreferences.masterEnabled ? colors.accent : colors.muted }]}>
            <Feather name={notificationPreferences.masterEnabled ? 'bell' : 'bell-off'} size={18} color={notificationPreferences.masterEnabled ? colors.primary : colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Notifications</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
               {notificationUpdating ? 'Saving reminder settings…' : notificationPreferences.masterEnabled ? 'On this device' : 'Paused · choices saved'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle all notifications"
            testID="notification-master-toggle"
            value={notificationPreferences.masterEnabled}
            onValueChange={(masterEnabled) => void applyNotificationPrefs((current) => ({ ...current, masterEnabled }))}
            disabled={notificationUpdating}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>

        <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
          <View style={styles.reminderTimeRow}>
            <View style={[styles.reminderTimeIcon, { backgroundColor: colors.muted }]}><Feather name="moon" size={14} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Quiet hours</Text>
              <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
                {notificationPreferences.quietHours.enabled
                  ? `Pause delivery ${formatTime(notificationPreferences.quietHours.start.hour, notificationPreferences.quietHours.start.minute)} – ${formatTime(notificationPreferences.quietHours.end.hour, notificationPreferences.quietHours.end.minute)}`
                   : 'Reminders allowed all day'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Toggle quiet hours"
              testID="quiet-hours-toggle"
              value={notificationPreferences.quietHours.enabled}
              onValueChange={(enabled) => void applyNotificationPrefs((current) => ({ ...current, quietHours: { ...current.quietHours, enabled } }))}
              disabled={notificationUpdating}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
          </View>
          {notificationPreferences.quietHours.enabled && (
            <>
              <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />
              {(['start', 'end'] as const).map((field) => {
                const time = notificationPreferences.quietHours[field];
                const label = field === 'start' ? 'START QUIET HOURS' : 'END QUIET HOURS';
                return (
                  <View key={field} style={styles.reminderTimeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>{label}</Text>
                      <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(time.hour, time.minute)}</Text>
                    </View>
                    <View style={styles.reminderNudge}>
                      <Pressable accessibilityLabel={`Decrease quiet hours ${field} time by 15 minutes`} testID={`quiet-hours-${field}-decrease`} onPress={() => nudgeQuietTime(field, -15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                      <Pressable accessibilityLabel={`Increase quiet hours ${field} time by 15 minutes`} testID={`quiet-hours-${field}-increase`} onPress={() => nudgeQuietTime(field, 15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {notificationPermissionDenied && (
          <Pressable accessibilityLabel="Open notification settings" testID="open-notification-settings" onPress={openNotificationSettings} style={[styles.notificationSettingsButton, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="settings" size={14} color={colors.foreground} />
            <Text style={[styles.notificationSettingsButtonText, { color: colors.foreground }]}>Notifications are off in device settings</Text>
            <Text style={[styles.notificationSettingsLink, { color: colors.primary }]}>Open settings</Text>
          </Pressable>
        )}
        {notificationReconcileError && (
          <Pressable
            accessibilityLabel="Retry notification setup"
            testID="retry-notification-setup"
            onPress={() => { void applyNotificationPrefs((current) => current); }}
            disabled={notificationUpdating}
            style={[styles.notificationSettingsButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Feather name="alert-circle" size={14} color={colors.foreground} />
            <Text style={[styles.notificationSettingsButtonText, { color: colors.foreground }]}>{notificationReconcileError}</Text>
            <Text style={[styles.notificationSettingsLink, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        )}

        {/* Hydration */}
        <View style={[styles.reminderToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: '#e5f1ff' }]}><Feather name="droplet" size={17} color="#5d8edb" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Hydration reminders</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {hydrationReminderPrefs.enabled
                ? reminderStatus === 'denied' ? 'Permission required in device settings'
                   : reminderStatus === 'failed' ? 'Setup incomplete · retry above'
                  : `Every ${hydrationReminderPrefs.intervalHours}h · ${formatTime(hydrationReminderPrefs.wakeHour, hydrationReminderPrefs.wakeMinute)} – ${formatTime(hydrationReminderPrefs.sleepHour, hydrationReminderPrefs.sleepMinute)}`
                 : 'Off'}
            </Text>
          </View>
           <Switch accessibilityLabel="Toggle hydration reminders" testID="hydration-reminder-toggle" value={hydrationReminderPrefs.enabled} onValueChange={(val) => applyHydrationPrefs({ ...hydrationReminderPrefs, enabled: val })} disabled={notificationUpdating} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} />
        </View>

        {hydrationReminderPrefs.enabled && (
          <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Wake time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#fff0dc' }]}><Feather name="sun" size={14} color="#d7954e" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WAKE TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminderPrefs.wakeHour, hydrationReminderPrefs.wakeMinute)}</Text>
              </View>
              <View style={styles.reminderNudgeGroup}>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease wake hour" onPress={() => nudgeHydrationHour('wakeHour', -1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase wake hour" onPress={() => nudgeHydrationHour('wakeHour', 1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease wake minute" onPress={() => nudgeHydrationMinute('wakeMinute', -15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase wake minute" onPress={() => nudgeHydrationMinute('wakeMinute', 15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />

            {/* Sleep time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#f2eafd' }]}><Feather name="moon" size={14} color="#9875c7" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WIND-DOWN TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminderPrefs.sleepHour, hydrationReminderPrefs.sleepMinute)}</Text>
              </View>
              <View style={styles.reminderNudgeGroup}>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease sleep hour" onPress={() => nudgeHydrationHour('sleepHour', -1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase sleep hour" onPress={() => nudgeHydrationHour('sleepHour', 1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease sleep minute" onPress={() => nudgeHydrationMinute('sleepMinute', -15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase sleep minute" onPress={() => nudgeHydrationMinute('sleepMinute', 15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />

            {/* Interval */}
            <View style={styles.reminderIntervalRow}>
              <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>REMIND EVERY</Text>
              <View style={styles.intervalChips}>
                {([1, 1.5, 2, 3] as const).map((h) => {
                  const selected = hydrationReminderPrefs.intervalHours === h;
                  return (
                    <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`Remind every ${h} hours`} onPress={() => applyHydrationPrefs({ ...hydrationReminderPrefs, intervalHours: h })} disabled={notificationUpdating} style={[styles.intervalChip, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}>
                      <Text style={[styles.intervalChipText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{h}h</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.reminderPrivacy, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.reminderPrivacyText, { color: colors.mutedForeground }]}>Scheduled on your device. No data is sent.</Text>
            </View>
          </View>
        )}

        {/* ── Meal reminders ── */}
        <Text style={[styles.reminderSectionLabel, { color: colors.mutedForeground }]}>MEAL REMINDERS</Text>
        <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
          {mealConfig.map((meal, idx) => {
            const enabled = mealReminderPrefs[meal.key];
            const timeKey = `${meal.key}Time` as 'breakfastTime' | 'lunchTime' | 'dinnerTime';
            const time = mealReminderPrefs[timeKey];
            return (
              <View key={meal.key}>
                {idx > 0 && <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />}
                <View style={styles.mealReminderRow}>
                  <View style={[styles.reminderTimeIcon, { backgroundColor: meal.iconBg }]}><Feather name={meal.icon} size={14} color={meal.iconColor} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.foreground }]} numberOfLines={1}>{meal.label}</Text>
                    <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
                      {enabled ? formatTime(time.hour, time.minute) : 'Off'}
                    </Text>
                  </View>
                  {enabled && (
                    <View style={styles.reminderNudgeGroup}>
                      <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
                      <View style={styles.reminderNudge}>
                        <Pressable accessibilityLabel={`Decrease ${meal.label} hour`} onPress={() => nudgeMealTime(meal.key, 'hour', -1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={12} color={colors.foreground} /></Pressable>
                        <Pressable accessibilityLabel={`Increase ${meal.label} hour`} onPress={() => nudgeMealTime(meal.key, 'hour', 1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={12} color={colors.foreground} /></Pressable>
                      </View>
                      <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                      <View style={styles.reminderNudge}>
                        <Pressable accessibilityLabel={`Decrease ${meal.label} minute`} onPress={() => nudgeMealTime(meal.key, 'minute', -15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={12} color={colors.foreground} /></Pressable>
                        <Pressable accessibilityLabel={`Increase ${meal.label} minute`} onPress={() => nudgeMealTime(meal.key, 'minute', 15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={12} color={colors.foreground} /></Pressable>
                      </View>
                    </View>
                  )}
                  <Switch accessibilityLabel={`Toggle ${meal.label} reminder`} value={enabled} onValueChange={(val) => applyMealPrefs({ ...mealReminderPrefs, [meal.key]: val })} disabled={notificationUpdating} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} style={{ marginLeft: 8 }} />
                </View>
              </View>
            );
          })}
          {mealReminderStatus === 'denied' && (
            <View style={[styles.reminderPrivacy, { backgroundColor: colors.muted, marginTop: 6 }]}>
              <Feather name="alert-circle" size={12} color={colors.warning} />
              <Text style={[styles.reminderPrivacyText, { color: colors.mutedForeground }]}>Notification permission required — enable in device settings.</Text>
            </View>
          )}
          {mealReminderStatus === 'failed' && (
            <View style={[styles.reminderPrivacy, { backgroundColor: colors.muted, marginTop: 6 }]}>
              <Feather name="alert-circle" size={12} color={colors.warning} />
              <Text style={[styles.reminderPrivacyText, { color: colors.mutedForeground }]}>Setup incomplete — retry notification setup above.</Text>
            </View>
          )}
        </View>

        {/* ── Daily goal reminder ── */}
         <Text style={[styles.reminderSectionLabel, { color: colors.mutedForeground }]}>DAILY GOAL CHECK-IN</Text>
        <View style={[styles.reminderToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: '#e8f5e9' }]}><Feather name="target" size={17} color="#4caf7d" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]} numberOfLines={1}>Daily goal check-in</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {goalReminderPrefs.enabled
                ? goalReminderStatus === 'denied' ? 'Permission required in device settings'
                  : goalReminderStatus === 'failed' ? 'Setup incomplete · retry above'
                  : `Daily at ${formatTime(goalReminderPrefs.hour, goalReminderPrefs.minute)}`
                 : 'Off'}
            </Text>
          </View>
          {goalReminderPrefs.enabled && (
            <View style={styles.reminderNudgeGroup}>
              <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease goal reminder hour" onPress={() => nudgeGoalTime('hour', -1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase goal reminder hour" onPress={() => nudgeGoalTime('hour', 1)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
              </View>
              <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease goal reminder minute" onPress={() => nudgeGoalTime('minute', -15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase goal reminder minute" onPress={() => nudgeGoalTime('minute', 15)} disabled={notificationUpdating} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
              </View>
            </View>
          )}
          <Switch accessibilityLabel="Toggle daily goal reminder" value={goalReminderPrefs.enabled} onValueChange={(val) => applyGoalPrefs({ ...goalReminderPrefs, enabled: val })} disabled={notificationUpdating} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} style={{ marginLeft: 8 }} />
        </View>
        </Animated.View>

        </View>

        <View style={profileTab === 'membership' ? undefined : styles.hiddenSection}>
        {/* ── CaloraApp Pro ── */}
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{BRAND.premiumName}</Text>
          </View>
          <View style={[styles.betaPill, { backgroundColor: colors.accent }]}><Text style={[styles.betaText, { color: colors.accentForeground }]}>PRO</Text></View>
        </View>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.planEyebrow, { color: colors.mutedForeground }]}>CHOOSE A PLAN</Text>
          <View style={styles.planChoices}>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: selectedPlan === 'monthly' }} accessibilityLabel="Choose monthly plan" testID="billing-plan-monthly" onPress={() => setSelectedPlan('monthly')} style={[styles.planChoice, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'monthly' ? colors.accent : colors.card }]}>
              <View style={[styles.radio, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'monthly' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>Cancel anytime</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>{monthlyPriceString ?? 'Store price unavailable'}{monthlyPriceString && <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / mo</Text>}</Text>
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: selectedPlan === 'annual' }} accessibilityLabel="Choose annual plan" testID="billing-plan-annual" onPress={() => setSelectedPlan('annual')} style={[styles.planChoice, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'annual' ? colors.accent : colors.card }]}>
              <View style={[styles.radio, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'annual' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Annual</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>Billed annually</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>{annualPriceString ?? 'Store price unavailable'}{annualPriceString && <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / yr</Text>}</Text>
            </Pressable>
          </View>
          <View style={[styles.valueLine, { backgroundColor: colors.muted }]}>
            <Feather name="check-circle" size={15} color={colors.success} />
            <Text style={[styles.valueLineText, { color: colors.foreground }]}>7-day free trial. Store eligibility and localized prices apply.</Text>
          </View>
          {!selectedPackage && !isSubscribed && (
            <Text style={[styles.billingNote, { color: colors.mutedForeground }]}>
              Store pricing is unavailable, so this plan cannot be purchased yet.
            </Text>
          )}
          <View style={styles.featureList}>
            {['Photo and voice logging', 'Food sources and confidence', 'Calorie targets and insights', 'Ad-free offline diary'].map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="check" size={15} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={isSelectedPlanAvailable ? 'Continue to billing' : 'Selected store plan is unavailable'} accessibilityState={{ disabled: !isSelectedPlanAvailable }} testID="billing-continue" disabled={!isSelectedPlanAvailable} onPress={handlePurchase} style={({ pressed }) => [styles.planButton, { backgroundColor: colors.primary, opacity: !isSelectedPlanAvailable ? 0.55 : pressed ? 0.8 : 1 }]}>
            <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>
              {isSubscribed ? `${BRAND.premiumName} is active` : isSelectedPlanAvailable ? `Continue with ${selectedPrice} / ${selectedPeriod}` : 'Store plan unavailable'}
            </Text>
            {!isSubscribed && isSelectedPlanAvailable && <Feather name="arrow-right" size={16} color={colors.primaryForeground} />}
          </Pressable>
          <Text style={[styles.billingNote, { color: colors.mutedForeground }]}>After the 7-day trial, your plan renews at its plan price unless changed or canceled in the store. Local taxes and currency may affect the store display.</Text>
          <View style={styles.billingLinks}>
            <Pressable accessibilityLabel="Restore purchases" onPress={handleRestore}><Text style={[styles.billingLink, { color: colors.primary }]}>Restore purchases</Text></Pressable>
            <View style={[styles.linkDot, { backgroundColor: colors.border }]} />
            <Pressable accessibilityLabel="Manage subscription" onPress={handleManage}><Text style={[styles.billingLink, { color: colors.primary }]}>Manage subscription</Text></Pressable>
          </View>
        </View>

        {/* ── Invite friends ── */}
        <ReferralCard fontScale={fontScale} />

        </View>

        <View style={profileTab === 'membership' ? undefined : styles.hiddenSection}>
        {/* ── Saved meals ── */}
        <View style={styles.savedHeader}>
           <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved meals</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Create saved meal" onPress={() => setSavedMealModal(true)} style={[styles.connectButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={14} color={colors.primaryForeground} />
            <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>Create</Text>
          </Pressable>
        </View>
        {savedMeals.length === 0
          ? (
            <View style={[styles.emptySaved, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={require('../../assets/images/calora-profile-header.jpg')} contentFit="cover" style={styles.emptySavedImage} />
              <View style={styles.emptySavedCopy}>
                <Text style={[styles.emptySavedTitle, { color: colors.foreground }]}>No saved meals</Text>
                <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Save a meal or recipe to reuse it.</Text>
              </View>
            </View>
          )
          : (
            <View style={styles.savedList}>
              {savedMeals.map((meal) => (
                <View key={meal.id} style={[styles.savedItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={meal.kind === 'recipe' ? 'book-open' : 'bookmark'} size={16} color={colors.accentForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingTitle, { color: colors.foreground }]}>{meal.name}</Text>
                    <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{formatWhole(meal.calories)} kcal · {formatGrams(meal.protein)} protein · {meal.kind}</Text>
                  </View>
                   <Pressable
                     accessibilityLabel={`Delete ${meal.name}`}
                     onPress={() => setSavedMealPendingDelete(meal)}
                    style={[styles.deleteMealButton, { backgroundColor: colors.muted }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

        {/* ── Living memory ── */}
         <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 30, marginBottom: 14 }]}>Living memory</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Review living memory" testID="review-living-memory" onPress={() => router.push('/memory')} style={[styles.memoryShortcut, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name="layers" size={17} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Saved signals</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {Object.keys(livingMemory.mealObservations).length + Object.keys(livingMemory.waterObservations).length + Object.keys(livingMemory.moodObservations).length + Object.keys(livingMemory.activityObservations).length + Object.keys(livingMemory.plannerObservations).length > 0
                ? 'Review, correct, or forget signals.'
                : 'Nothing remembered yet.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        </View>

        <View style={profileTab === 'account' ? undefined : styles.hiddenSection}>
        {/* ── Account ── */}
        <AccountSection fontScale={fontScale} clearAllData={clearAllData} />

        {/* ── Trust & privacy ── */}
         <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 30, marginBottom: 14 }]}>Trust & privacy</Text>
        <View style={[styles.connectionRow, { backgroundColor: colors.accent }]}>
          <View style={[styles.connectionIcon, { backgroundColor: colors.primary }]}><Feather name="activity" size={17} color={colors.primaryForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Health data</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {healthConnection.authorization === 'requested' ? 'Apple Health access requested · local data only' : healthConnection.authorization === 'partial' ? 'Partial access · local health data only' : healthConnected ? 'Connected · local health data only' : healthConnection.authorization === 'error' ? 'Health connection needs attention' : healthConnection.authorization === 'denied' ? 'Permission not granted · Calora still works locally' : healthConnection.authorization === 'unavailable' ? 'Unavailable on this device' : `Not connected · ${BRAND.name} works offline without it`}
            </Text>
          </View>
           <Pressable
              accessibilityLabel="Manage health data"
              onPress={() => setInfoModal('health')}
             style={[styles.connectButton, { backgroundColor: colors.card }]}
           >
              <Text style={[styles.connectButtonText, { color: colors.primary }]}>{healthConnected ? 'Manage' : 'Connect'}</Text>
          </Pressable>
        </View>
        {[
          { icon: 'download' as const, title: 'Export your data', testID: 'export-data-row', body: `Portable JSON · ${syncState === 'needs-connection' ? 'waiting for connection' : syncState === 'local' ? 'stored locally' : syncState === 'offline' ? 'loading locally' : 'synced'}`, onPress: handleExport, disabled: !hasExportData || isExporting, isLoading: isExporting },
           { icon: 'trash-2' as const, title: 'Delete local data', testID: 'delete-local-data-row', body: 'Remove diary and profile from this device.', onPress: handleDelete, disabled: isClearing, isLoading: isClearing },
          { icon: 'shield' as const, title: 'Your food data', body: 'Export and delete controls.', onPress: () => setInfoModal('food-data'), disabled: false },
          { icon: 'eye-off' as const, title: 'No ad tracking', body: 'Meals are not used for ads.', onPress: () => setInfoModal('no-ads'), disabled: false },
           { icon: 'help-circle' as const, title: 'Help', body: 'Support and answers.', onPress: () => setInfoModal('help'), disabled: false },
        ].map((item) => (
          <SettingRowPressable
            key={item.title}
            testID={'testID' in item ? item.testID : undefined}
            onPress={item.onPress}
            disabled={item.disabled}
            style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.disabled ? 0.4 : 1 }]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon} size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
            {'isLoading' in item && item.isLoading
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
          </SettingRowPressable>
        ))}

        {/* ── About CaloraApp ── */}
         <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 30, marginBottom: 14 }]}>About</Text>
        {[
          { icon: 'info' as const, title: BRAND.name, body: `${BRAND.descriptor} · v${Constants.expoConfig?.version ?? '1.0.0'}`, url: null },
          { icon: 'globe' as const, title: 'Website', body: BRAND.domain, url: URLS.main },
           { icon: 'shield' as const, title: 'Privacy Policy', body: 'How data is handled', url: URLS.privacy },
           { icon: 'file-text' as const, title: 'Terms of Use', body: 'Terms of use', url: URLS.terms },
           { icon: 'mail' as const, title: 'Help & Support', body: 'Contact support', url: URLS.support },
        ].map((item) => (
          <SettingRowPressable
            key={item.title}
            onPress={item.url ? () => Linking.openURL(item.url!) : () => {}}
            disabled={!item.url}
            style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.url ? 1 : 0.75 }]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon} size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
            {item.url && <Feather name="external-link" size={15} color={colors.mutedForeground} />}
          </SettingRowPressable>
        ))}
        <Text style={[styles.version, { color: colors.mutedForeground }]}>{BRAND.copyright} · {BRAND.name} 1.0 · Made for steadier days</Text>
        </View>
        </SwipeableSectionPager>
      </ScrollView>

      {/* ── Billing modal ── */}
      <Modal visible={billingModal !== null} transparent animationType="fade" onRequestClose={() => setBillingModal(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View accessibilityViewIsModal style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.accent }]}>
              <Feather name={billingModal === 'confirm' ? 'credit-card' : 'lock'} size={20} color={colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {billingModal === 'confirm' ? 'Confirm your purchase' : 'Billing is ready for setup'}
            </Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              {billingModal === 'confirm'
                ? `Subscribe to ${BRAND.premiumName} (${selectedPlan}) at ${selectedPrice} per ${selectedPeriod}? The store determines 7-day trial eligibility and completes the payment.`
                : `The ${selectedPlan} store plan is unavailable, so no purchase can be started. Please try again when store pricing has loaded.`}
            </Text>
            {billingModal !== 'confirm' && (
              <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
                <Feather name="info" size={15} color={colors.primary} />
                <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>No payment has been taken.</Text>
              </View>
            )}
            {billingModal === 'confirm' ? (
              <Pressable accessibilityLabel="Confirm purchase" testID="billing-confirm-purchase" onPress={confirmPurchase} disabled={isPurchasing} style={[styles.dialogButton, { backgroundColor: colors.primary, opacity: isPurchasing ? 0.6 : 1 }]}>
                {isPurchasing
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Confirm purchase</Text>}
              </Pressable>
            ) : (
              <Pressable accessibilityLabel="Close billing dialog" onPress={() => setBillingModal(null)} style={[styles.dialogButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Got it</Text>
              </Pressable>
            )}
            {billingModal === 'confirm' && (
              <Pressable accessibilityLabel="Cancel purchase" onPress={() => setBillingModal(null)} style={styles.dialogSecondaryButton}>
                <Text style={[styles.dialogSecondaryText, { color: colors.primary }]}>Cancel</Text>
              </Pressable>
            )}
            <Pressable accessibilityLabel="View billing help" onPress={() => { setBillingModal(null); Alert.alert('Billing help', `${BRAND.name} will support App Store and Google Play subscriptions. Your plan, renewal date, and cancellation path will always be visible here.`); }} style={styles.dialogSecondaryButton}>
              <Text style={[styles.dialogSecondaryText, { color: colors.primary }]}>How billing works</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Billing notice modal ── */}
      <Modal visible={billingNotice !== null} transparent animationType="fade" onRequestClose={() => setBillingNotice(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View accessibilityViewIsModal style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.accent }]}>
              <Feather name="info" size={20} color={colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Billing</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>{billingNotice}</Text>
            <Pressable accessibilityLabel="Close billing notice" testID="billing-notice-close" onPress={() => setBillingNotice(null)} style={[styles.dialogButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Delete confirmation modal ── */}
      <Modal visible={privacyModal !== null} transparent animationType="fade" onRequestClose={() => { if (!isClearing) setPrivacyModal(null); }}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View accessibilityViewIsModal style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.warning }]}>
              <Feather name="trash-2" size={20} color={colors.foreground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Delete local data?</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>This removes your diary, profile, weights, and saved meals from this device. This cannot be undone.</Text>
            <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
              <Feather name="alert-triangle" size={15} color={colors.warning} />
              <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>This action is permanent.</Text>
            </View>
            <Pressable accessibilityLabel="Delete everything" disabled={isClearing} onPress={handleConfirmDelete} style={[styles.dialogButton, { backgroundColor: colors.warning, opacity: isClearing ? 0.6 : 1 }]}>
              {isClearing ? <ActivityIndicator size="small" color={colors.foreground} /> : <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Delete everything</Text>}
            </Pressable>
            <Pressable accessibilityLabel="Close privacy dialog" disabled={isClearing} onPress={() => setPrivacyModal(null)} style={[styles.dialogButton, { backgroundColor: colors.muted, opacity: isClearing ? 0.4 : 1, marginTop: 8 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Keep my data</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Saved meal creation modal ── */}
      <BottomSheet visible={savedMealModal} onRequestClose={() => setSavedMealModal(false)} sheetStyle={{ backgroundColor: colors.background }}>
          <KeyboardAwareScrollViewCompat style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} bottomOffset={72}>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Create a saved template</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>Add the numbers from a meal or recipe you make often. It will be stored offline and appear in the add-food sheet.</Text>
            <View style={styles.savedKindRow}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: savedMealKind === 'meal' }} accessibilityLabel="Saved meal type: meal" onPress={() => setSavedMealKind('meal')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'meal' ? colors.primary : colors.card, borderColor: savedMealKind === 'meal' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'meal' ? colors.primaryForeground : colors.mutedForeground }]}>Meal</Text></Pressable>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: savedMealKind === 'recipe' }} accessibilityLabel="Saved meal type: recipe" onPress={() => setSavedMealKind('recipe')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'recipe' ? colors.primary : colors.card, borderColor: savedMealKind === 'recipe' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'recipe' ? colors.primaryForeground : colors.mutedForeground }]}>Recipe</Text></Pressable>
            </View>
            <TextInput accessibilityLabel="Saved meal name" value={savedMealName} onChangeText={(value) => { setSavedMealName(value); if (savedMealError) setSavedMealError(''); }} placeholder="Name, e.g. Sunday chili" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: savedMealError ? colors.destructive : colors.input }]} />
            <View style={styles.savedNumbers}>
              {([['Calories', savedMealCalories, setSavedMealCalories], ['Protein g', savedMealProtein, setSavedMealProtein], ['Carbs g', savedMealCarbs, setSavedMealCarbs], ['Fat g', savedMealFat, setSavedMealFat]] as const).map(([label, value, setter]) => (
                <View key={label} style={styles.savedNumber}>
                  <Text style={[styles.savedNumberLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput accessibilityLabel={label} value={value} onChangeText={(nextValue) => { (setter as (v: string) => void)(nextValue); if (savedMealError) setSavedMealError(''); }} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: savedMealError && label === 'Calories' ? colors.destructive : colors.input }]} />
                </View>
              ))}
            </View>
            {!!savedMealError && <Text accessibilityRole="alert" style={[styles.formError, { color: colors.destructive }]}>{savedMealError}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel="Save meal template" onPress={createSavedMeal} style={[styles.dialogButton, { backgroundColor: colors.primary }]}><Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Save template</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel saved meal" onPress={() => setSavedMealModal(false)} style={styles.dialogSecondaryButton}><Text style={[styles.dialogSecondaryText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          </KeyboardAwareScrollViewCompat>
      </BottomSheet>

      {/* ── Saved meal deletion confirmation ── */}
      <Modal visible={savedMealPendingDelete !== null} transparent animationType="fade" onRequestClose={() => setSavedMealPendingDelete(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View accessibilityViewIsModal style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.warning }]}>
              <Feather name="trash-2" size={20} color={colors.foreground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Delete saved meal?</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              Remove “{savedMealPendingDelete?.name}” from your saved templates? This will not change any diary entries.
            </Text>
            <Pressable accessibilityLabel="Confirm saved meal deletion" onPress={confirmSavedMealDelete} style={[styles.dialogButton, { backgroundColor: colors.warning }]}>
              <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Delete template</Text>
            </Pressable>
            <Pressable accessibilityLabel="Cancel saved meal deletion" onPress={() => setSavedMealPendingDelete(null)} style={[styles.dialogButton, { backgroundColor: colors.muted, marginTop: 8 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Keep template</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Notification center ── */}
      <BottomSheet
        visible={notificationModal}
        onRequestClose={() => setNotificationModal(false)}
        onBackdropPress={() => setNotificationModal(false)}
        overlayColor="rgba(0,0,0,0.5)"
        maxHeight="88%"
        sheetStyle={{ backgroundColor: colors.background }}
      >
        <View style={styles.notificationSheet}>
          <View style={styles.notificationSheetHeader}>
            <View style={styles.notificationSheetTitleGroup}>
              <View style={[styles.notificationSheetIcon, { backgroundColor: colors.accent }]}>
                <Feather name="bell" size={18} color={colors.accentForeground} />
              </View>
              <View>
                <Text style={[styles.notificationSheetTitle, { color: colors.foreground }]}>Notifications</Text>
                <Text style={[styles.notificationSheetSubtitle, { color: colors.mutedForeground }]}>
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread update${unreadNotificationCount === 1 ? '' : 's'}` : 'You’re all caught up'}
                </Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Close notifications" onPress={() => setNotificationModal(false)} hitSlop={10} style={styles.notificationClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {notificationsLoading ? (
            <View style={styles.notificationEmpty}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.notificationEmptyBody, { color: colors.mutedForeground }]}>Loading your updates…</Text>
            </View>
          ) : notificationsError ? (
            <View style={[styles.notificationEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.notificationEmptyIcon, { backgroundColor: colors.accent }]}>
                <Feather name="alert-circle" size={22} color={colors.accentForeground} />
              </View>
              <Text style={[styles.notificationEmptyTitle, { color: colors.foreground }]}>Couldn’t load your inbox</Text>
              <Text style={[styles.notificationEmptyBody, { color: colors.mutedForeground }]}>{notificationsError}</Text>
              <Pressable
                accessibilityLabel="Retry loading notifications"
                onPress={() => { void refreshNotifications(); }}
                style={[styles.notificationActionButton, { backgroundColor: colors.muted, marginTop: 16 }]}
              >
                <Feather name="refresh-cw" size={15} color={colors.primary} />
                <Text style={[styles.notificationActionText, { color: colors.foreground }]}>Try again</Text>
              </Pressable>
            </View>
          ) : notifications.length === 0 ? (
            <View style={[styles.notificationEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.notificationEmptyIcon, { backgroundColor: colors.accent }]}>
                <Feather name="inbox" size={22} color={colors.accentForeground} />
              </View>
              <Text style={[styles.notificationEmptyTitle, { color: colors.foreground }]}>Your inbox is clear</Text>
              <Text style={[styles.notificationEmptyBody, { color: colors.mutedForeground }]}>
                New reminder updates will appear here when they arrive.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.notificationList}
              contentContainerStyle={styles.notificationListContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((item) => {
                const icon = item.category === 'hydration' ? 'droplet' : item.category === 'meal' ? 'coffee' : item.category === 'goal' ? 'target' : 'bell';
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item.id}
                    accessibilityLabel={`${item.read ? '' : 'Unread '}${item.title}. ${item.body}`}
                    accessibilityState={{ selected: !item.read }}
                    onPress={() => {
                      void handleNotificationPress(item).catch(() => {
                        Alert.alert('Could not update notification', 'Please try again.');
                      });
                    }}
                    style={[styles.notificationRow, { backgroundColor: item.read ? colors.card : colors.accent, borderColor: colors.border }]}
                  >
                    <View style={[styles.notificationItemIcon, { backgroundColor: item.read ? colors.muted : colors.card }]}>
                      <Feather name={icon as keyof typeof Feather.glyphMap} size={17} color={colors.primary} />
                    </View>
                    <View style={styles.notificationItemCopy}>
                      <View style={styles.notificationItemTopline}>
                        <Text style={[styles.notificationItemTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                        {!item.read && <View style={[styles.notificationUnreadDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={[styles.notificationItemBody, { color: colors.mutedForeground }]} numberOfLines={3}>{item.body}</Text>
                      <Text style={[styles.notificationItemTime, { color: colors.mutedForeground }]}>{formatNotificationDate(item.receivedAt)}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {notifications.length > 0 && (
            <View style={[styles.notificationActions, { borderTopColor: colors.border }]}>
              {unreadNotificationCount > 0 && (
                <Pressable accessibilityLabel="Mark all notifications as read" onPress={handleMarkAllNotificationsRead} style={[styles.notificationActionButton, { backgroundColor: colors.muted }]}>
                  <Feather name="check-circle" size={15} color={colors.primary} />
                  <Text style={[styles.notificationActionText, { color: colors.foreground }]}>Mark all read</Text>
                </Pressable>
              )}
              <Pressable accessibilityLabel="Clear notification history" onPress={handleClearNotifications} style={styles.notificationClearButton}>
                <Text style={[styles.notificationClearText, { color: colors.mutedForeground }]}>Clear history</Text>
              </Pressable>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* ── Profile edit modal ── */}
      <BottomSheet visible={profileEditModal} onRequestClose={() => setProfileEditModal(false)} overlayColor="rgba(0,0,0,0.5)" sheetStyle={{ backgroundColor: colors.background }}>
          <KeyboardAwareScrollViewCompat style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} bottomOffset={72}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Edit profile</Text>
              <Pressable accessibilityLabel="Close profile edit" onPress={() => setProfileEditModal(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {/* Photo picker */}
            <Pressable accessibilityLabel="Change profile photo" onPress={handlePhotoTap} style={styles.editAvatarWrap}>
              <View style={[styles.editAvatar, { backgroundColor: colors.muted, overflow: 'hidden' }]}>
                {editPhotoUri
                  ? <Image source={{ uri: editPhotoUri }} style={{ width: 72, height: 72 }} contentFit="cover" />
                  : <Feather name="user" size={30} color={colors.mutedForeground} />}
              </View>
              <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={11} color={colors.primaryForeground} />
              </View>
            </Pressable>

            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>YOUR NAME</Text>
            <TextInput accessibilityLabel="Name" value={editName} onChangeText={(value) => { setEditName(value); if (profileEditError) setProfileEditError(''); }} placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: profileEditError ? colors.destructive : colors.input, marginBottom: 14 }]} />
            <Pressable
              accessibilityLabel="Open Your plan settings"
              onPress={() => {
                setProfileEditModal(false);
                setProfileTab('you');
              }}
              style={[styles.profileEditPlanLink, { backgroundColor: colors.muted }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileEditPlanTitle, { color: colors.foreground }]}>Edit your plan</Text>
                <Text style={[styles.profileEditPlanNote, { color: colors.mutedForeground }]}>Nutrition, diet, and goal settings are managed in Your plan.</Text>
              </View>
              <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
            </Pressable>
            {!!profileEditError && <Text accessibilityRole="alert" style={[styles.formError, { color: colors.destructive }]}>{profileEditError}</Text>}
            <Pressable accessibilityLabel="Save profile changes" onPress={saveProfileEdit} style={[styles.dialogButton, { backgroundColor: colors.primary, marginTop: 20 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Save changes</Text>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
      </BottomSheet>

      {/* ── Info modals (food data / no ads / help) ── */}
      <BottomSheet visible={infoModal !== null} onRequestClose={() => setInfoModal(null)} overlayColor="rgba(0,0,0,0.5)" sheetStyle={{ backgroundColor: colors.background }}>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.editModalHeader}>
              <View style={[styles.dialogIcon, { backgroundColor: colors.accent, marginBottom: 0 }]}>
                <Feather name={infoModal === 'food-data' ? 'shield' : infoModal === 'no-ads' ? 'eye-off' : infoModal === 'health' ? 'activity' : 'help-circle'} size={18} color={colors.accentForeground} />
              </View>
              <Text style={[styles.dialogTitle, { color: colors.foreground, flex: 1, marginLeft: 12 }]}>
                {infoModal === 'food-data' ? 'Your food data' : infoModal === 'no-ads' ? 'No ad tracking' : infoModal === 'health' ? 'Health data' : 'Help'}
              </Text>
              <Pressable accessibilityLabel="Close" onPress={() => setInfoModal(null)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {infoModal === 'food-data' && (
              <>
                {[
                  { icon: 'smartphone' as const, title: user ? 'Diary sync' : 'On this device', body: user ? 'Diary entries stay local for offline use and sync securely to your account for another device.' : 'Your diary, profile, and food memories stay in this device\'s local storage.' },
                  { icon: 'download' as const, title: 'Export data', body: `Get a portable JSON copy of everything ${BRAND.name} stores.` },
                  { icon: 'trash-2' as const, title: 'Delete data', body: 'Delete local data permanently removes it from this device.' },
                  { icon: 'lock' as const, title: 'Account sync', body: user ? 'Only your authenticated account can access its synced diary. Local edits retry when connected.' : 'Sign in for account-backed diary continuity across devices.' },
                ].map((item) => (
                  <View key={item.title} style={[styles.infoRow, { borderColor: colors.border }]}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name={item.icon} size={15} color={colors.accentForeground} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {infoModal === 'no-ads' && (
              <>
                {[
                  { icon: 'eye-off' as const, title: 'No ad tracking', body: `${BRAND.name} does not share food, location, or behavior with ad networks.` },
                  { icon: 'bar-chart-2' as const, title: 'No profiling for sale', body: 'Meal patterns only personalize your experience.' },
                  { icon: 'dollar-sign' as const, title: 'Subscription funded', body: `${BRAND.name} has no ad-supported tier.` },
                  { icon: 'check-circle' as const, title: 'Your consent', body: 'We will ask before collecting anything new.' },
                ].map((item) => (
                  <View key={item.title} style={[styles.infoRow, { borderColor: colors.border }]}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name={item.icon} size={15} color={colors.accentForeground} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {infoModal === 'health' && (
              <>
                <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
                  {healthConnection.authorization === 'unavailable'
                    ? 'Health data is unavailable on this device. Calora will continue to work locally without it.'
                    : healthConnection.authorization === 'error'
                      ? healthConnection.syncError ?? 'Health access could not be completed. Try connecting again.'
                    : healthConnection.authorization === 'denied'
                      ? 'Health access was not granted. Calora continues to work normally, and no health data has been read.'
                    : healthConnection.authorization === 'requested'
                      ? 'Apple does not reveal whether individual read categories were allowed. Calora shows Apple Health values only when HealthKit returns a measured result; empty or denied reads remain unavailable rather than becoming zero. To change access, open Health, tap your profile picture, then Apps and Services, and choose CaloraApp.'
                      : healthConnected
                      ? `Your ${healthConnection.provider === 'healthkit' ? 'Apple Health' : 'Health Connect'} data stays on this device. ${healthConnection.authorization === 'partial' ? 'Some requested categories are not available.' : 'Steps, active energy, workouts, and weight can be read when you sync.'}`
                      : `Connect ${healthConnection.provider === 'healthkit' ? 'Apple Health' : 'Health Connect'} only when you are ready. Calora reads selected data locally and never writes health records.`}
                </Text>
                <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
                  <Feather name={healthConnection.syncError ? 'alert-triangle' : 'lock'} size={15} color={colors.primary} />
                  <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>
                    {healthConnection.syncError ?? (healthConnection.lastSyncedAt ? `Last synced ${new Date(healthConnection.lastSyncedAt).toLocaleString()}` : 'Permission is requested only after you press Connect.')}
                  </Text>
                </View>
                {healthConnection.authorization !== 'unavailable' && !healthConnected && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Connect health data" onPress={handleHealthConnect} disabled={healthBusy} style={[styles.dialogButton, { backgroundColor: colors.primary, marginTop: 16, opacity: healthBusy ? 0.6 : 1 }]}>
                    {healthBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>{healthConnected ? 'Update access' : 'Connect'}</Text>}
                  </Pressable>
                )}
                {healthConnected && (
                  <>
                    <Pressable accessibilityRole="button" accessibilityLabel="Sync health data now" onPress={handleHealthSync} disabled={healthBusy} style={[styles.dialogButton, { backgroundColor: colors.primary, marginTop: 16, opacity: healthBusy ? 0.6 : 1 }]}>
                      {healthBusy ? (
                        <View style={styles.healthSyncButtonContent}>
                          <ActivityIndicator color={colors.primaryForeground} />
                          <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Syncing…</Text>
                        </View>
                      ) : <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Sync now</Text>}
                    </Pressable>
                    {!!healthSyncFeedback && (
                      <Animated.View
                        entering={enterMotion('component', 0)}
                        accessibilityLiveRegion="polite"
                        accessibilityRole={healthSyncFeedback.status === 'failed' ? 'alert' : undefined}
                        style={[
                          styles.healthSyncFeedback,
                          {
                            backgroundColor: healthSyncFeedback.status === 'synced' ? colors.accent : colors.muted,
                            borderColor: healthSyncFeedback.status === 'failed' ? colors.warning : colors.accent,
                          },
                        ]}
                      >
                        <Feather
                          name={healthSyncFeedback.status === 'synced' ? 'check-circle' : 'alert-circle'}
                          size={15}
                          color={healthSyncFeedback.status === 'synced' ? colors.success : colors.warning}
                        />
                        <Text style={[styles.healthSyncFeedbackText, { color: colors.foreground }]}>
                          {healthSyncFeedback.status === 'synced' ? 'Health data synced just now.' : healthSyncFeedback.message}
                        </Text>
                      </Animated.View>
                    )}
                    <Pressable accessibilityRole="button" accessibilityLabel="Disconnect health data" onPress={disconnectHealth} style={[styles.dialogButton, { backgroundColor: colors.muted, marginTop: 10 }]}>
                      <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Disconnect</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            {infoModal === 'help' && (
              <>
                {[
                  { q: 'Why does my calorie ring show 0?', a: 'The ring fills as you log meals. Tap the + button on the Home tab to add your first entry.' },
                  { q: 'How do I change my calorie target?', a: 'Open the You tab, tap Nutrition goals, then choose Automatic or Custom targets.' },
                  { q: 'Are my notifications actually sent?', a: 'All reminders are scheduled locally on your device. Nothing is transmitted — they fire even in airplane mode.' },
                  { q: 'Can I undo a deleted log entry?', a: 'Deletions from the diary can be undone for a few seconds with the Undo button that appears at the bottom of the screen.' },
                  { q: 'How do I report a problem?', a: 'Use Export your data to capture your local state, then reach out via the feedback channel in the app store listing.' },
                ].map((item) => (
                  <View key={item.q} style={[styles.faqRow, { borderColor: colors.border }]}>
                    <Text style={[styles.faqQuestion, { color: colors.foreground }]}>{item.q}</Text>
                    <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>{item.a}</Text>
                  </View>
                ))}
              </>
            )}

            <Pressable accessibilityRole="button" accessibilityLabel="Close information sheet" onPress={() => setInfoModal(null)} style={[styles.dialogButton, { backgroundColor: colors.muted, marginTop: 16 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Got it</Text>
            </Pressable>
          </ScrollView>
      </BottomSheet>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(f: number) {
  return StyleSheet.create({
  page: { flex: 1 },
  hiddenSection: { display: 'none' },
  notificationButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationBadge: { position: 'absolute', top: -3, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2 },
  notificationBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8, lineHeight: 10 },
  notificationSheet: { minHeight: 260, paddingTop: 8 },
  notificationSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 18 },
  notificationSheetTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  notificationSheetIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  notificationSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, letterSpacing: -0.3 },
  notificationSheetSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 3 },
  notificationClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  notificationList: { maxHeight: 430, paddingHorizontal: 20 },
  notificationListContent: { gap: 8, paddingBottom: 4 },
  notificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12 },
  notificationItemIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationItemCopy: { flex: 1, minWidth: 0 },
  notificationItemTopline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  notificationItemTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 13 * f },
  notificationUnreadDot: { width: 7, height: 7, borderRadius: 4 },
  notificationItemBody: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16 * f, marginTop: 4 },
  notificationItemTime: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginTop: 7 },
  notificationEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 19, marginHorizontal: 20, paddingHorizontal: 24, paddingVertical: 30 },
  notificationEmptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  notificationEmptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 * f },
  notificationEmptyBody: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 17 * f, textAlign: 'center', marginTop: 6, maxWidth: 270 },
  notificationActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingHorizontal: 20, paddingTop: 14 },
  notificationActionButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  notificationActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  notificationClearButton: { paddingHorizontal: 8, paddingVertical: 9 },
  notificationClearText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  profileContent: { paddingTop: 22, paddingHorizontal: 20 },
  profileTabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 15, padding: 4, gap: 4, marginBottom: 18 },
  profileTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 11, paddingHorizontal: 6 },
  profileTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 23, padding: 16, marginBottom: 30 },
  onboardingCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 18, padding: 13, marginTop: -16, marginBottom: 26 },
  onboardingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  onboardingCopy: { flex: 1 },
  onboardingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  onboardingBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  onboardingButton: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  onboardingButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  largeAvatar: { width: 47, height: 47, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  largeAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 19 * f },
  editAvatarWrap: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  editAvatar: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 16 * f },
  profileSub: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 4, maxWidth: 230 },

  // Section headings
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 4, marginBottom: 12 },

  // Segmented controls (theme + units)
  segmentedControl: { flexDirection: 'row', gap: 5, borderWidth: StyleSheet.hairlineWidth, padding: 5, borderRadius: 16, marginBottom: 14 },
  segmentedOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  segmentedLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Units row
  unitsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 17, padding: 11, marginBottom: 26 },
  unitChips: { flexDirection: 'row', gap: 6 },
  unitChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  unitChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Reminder elements
  reminderSectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  notificationMasterCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.5, borderRadius: 18, padding: 13, marginBottom: 12 },
  notificationMasterIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationSettingsButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, marginBottom: 4 },
  notificationSettingsButtonText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10 * f },
  notificationSettingsLink: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 12 },
  reminderSettings: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 12, gap: 4 },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  mealReminderRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  reminderTimeIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reminderTimeLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1, marginBottom: 3 },
  reminderTimeValue: { fontFamily: 'Inter_700Bold', fontSize: 15 * f, letterSpacing: -0.3 },
  reminderNudgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nudgeGroupLabel: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 0.8 },
  reminderNudge: { flexDirection: 'row', gap: 4 },
  nudgeButton: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  reminderDivider: { height: 1, marginVertical: 2 },
  reminderIntervalRow: { paddingVertical: 6 },
  intervalChips: { flexDirection: 'row', gap: 7 },
  intervalChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 9 },
  intervalChipText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  reminderPrivacy: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  reminderPrivacyText: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, flex: 1 },

  // Billing
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 11, marginTop: 20 },
  betaPill: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  betaText: { fontFamily: 'Inter_700Bold', fontSize: 8 * f, letterSpacing: 1 },
  planCard: { borderWidth: 1, borderRadius: 22, padding: 16 },
  planEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, letterSpacing: 1.1, marginBottom: 8 },
  planChoices: { gap: 8 },
  planChoice: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, padding: 11, gap: 9 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { width: 9, height: 9, borderRadius: 5 },
  planChoiceCopy: { flex: 1 },
  planName: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  planHint: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 5 },
  planPrice: { fontFamily: 'Inter_700Bold', fontSize: 19 * f },
  planPeriod: { fontFamily: 'Inter_400Regular', fontSize: 10 * f },
  savePill: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, paddingHorizontal: 5 },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  valueLineText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  featureList: { gap: 9, paddingVertical: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Inter_500Medium', fontSize: 11 * f },
  planButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  planButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  billingNote: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, lineHeight: 14, textAlign: 'center', marginTop: 12 },
  billingLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 13 },
  billingLink: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  linkDot: { width: 3, height: 3, borderRadius: 2 },

  // Saved meals
  savedHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 30, marginBottom: 14 },
  emptySaved: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 10 },
  emptySavedImage: { width: 58, height: 58, borderRadius: 13 },
  emptySavedCopy: { flex: 1 },
  emptySavedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, marginBottom: 3 },
  savedList: { gap: 10 },
  savedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 13 },
  deleteMealButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Living memory
  memoryShortcut: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 13, marginBottom: 12 },

  // Trust & privacy
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, padding: 13, marginBottom: 12 },
  connectionIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  connectButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 14, marginBottom: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  settingBody: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 4 },

  // Version
  version: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, textAlign: 'center', marginTop: 24 },

  // Dialogs / modals
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', borderRadius: 24, padding: 20 },
  dialogIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 * f, letterSpacing: -0.4 },
  dialogBody: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18, marginTop: 8 },
  dialogStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, padding: 10, marginTop: 15 },
  dialogStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  dialogButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  dialogButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  healthSyncButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  healthSyncFeedback: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, padding: 10, marginTop: 10 },
  healthSyncFeedbackText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, lineHeight: 16 * f },
  dialogSecondaryButton: { alignItems: 'center', paddingTop: 14 },
  dialogSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Bottom sheet content; the shared frame owns anchoring, radius, size, and bottom inset.
  sheetScroll: { flexShrink: 1, minHeight: 0 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  savedKindRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  savedKind: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  savedKindText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  savedInput: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  formError: { fontFamily: 'Inter_500Medium', fontSize: 12 * f, lineHeight: 17 * f, marginTop: 10 },
  savedNumbers: { flexDirection: 'row', gap: 7, marginTop: 8 },
  savedNumber: { flex: 1 },
  savedNumberLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginBottom: 5 },

  // Profile edit modal
  editModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  profileEditPlanLink: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, padding: 12 },
  profileEditPlanTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  profileEditPlanNote: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 * f, marginTop: 3 },
  editFieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1, marginBottom: 6 },
  editChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  editChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Info modal rows
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderBottomWidth: 1, paddingVertical: 12 },
  faqRow: { borderBottomWidth: 1, paddingVertical: 12 },
  faqQuestion: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f, marginBottom: 5 },
  faqAnswer: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18 },
  });
}
const styles = makeStyles(1.0);
