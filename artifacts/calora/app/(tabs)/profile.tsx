import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { BRAND, EMAILS, URLS } from '@/lib/brand';
import { formatQuantity } from '@/lib/formatters';
import { formatGrams, formatWhole } from '@/lib/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { type DietPreference, type Goal, SavedMeal, ThemePreference, useCalora } from '@/context/CaloraContext';
import {
  cancelHydrationReminders,
  formatTime,
  scheduleHydrationReminders,
  type HydrationReminderPrefs,
} from '@/lib/hydrationReminders';
import { cancelMealReminders, scheduleMealReminders, type MealReminderPrefs } from '@/lib/mealReminders';
import { cancelGoalReminder, scheduleGoalReminder, type GoalReminderPrefs } from '@/lib/goalReminder';
import * as FileSystem from 'expo-file-system/legacy';
import { copyProfilePhoto, deleteProfilePhoto } from '@/lib/profilePhotoStorage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { deriveExportHasData, makeExportHandler } from '@/lib/exportUiHandler';
import { SettingRowPressable } from '@/components/SettingRowPressable';
import { AccountSection } from '@/components/auth/AccountSection';
import { AppHeader } from '@/components/AppChrome';
import { ReferralCard } from '@/components/ReferralCard';
import { REVENUECAT_ENTITLEMENT_IDENTIFIER, useSubscription } from '@/lib/revenuecat';

// ─── Static config ────────────────────────────────────────────────────────────

const themes: { key: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'smartphone' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

const dietOptions: DietPreference[] = ['Everything', 'Vegetarian', 'Vegan', 'High protein'];
const goalOptions: { key: Goal; label: string }[] = [
  { key: 'lose', label: 'Lose weight' },
  { key: 'maintain', label: 'Maintain' },
  { key: 'gain', label: 'Build muscle' },
];

const mealConfig: { key: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: keyof typeof Feather.glyphMap; iconBg: string; iconColor: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunrise', iconBg: '#fff0dc', iconColor: '#d7954e' },
  { key: 'lunch', label: 'Lunch', icon: 'sun', iconBg: '#e5f1ff', iconColor: '#5d8edb' },
  { key: 'dinner', label: 'Dinner', icon: 'moon', iconBg: '#f2eafd', iconColor: '#9875c7' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const {
    colors, themePreference, setThemePreference,
    profile, updateProfile,
    healthConnected, setHealthConnected,
    exportRawStorageData, clearAllData, isClearing, syncState,
    savedMeals, saveMeal, deleteSavedMeal,
    hydrationReminders, setHydrationReminders,
    mealReminders, setMealReminders,
    goalReminder, setGoalReminder,
    livingMemory, logs,
    fontSizeScale, setFontSizeScale,
    profilePhotoUri, setProfilePhotoUri, fontScale,
  } = useCalora();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);

  const hasExportData = deriveExportHasData(profile, logs);
  const insets = useSafeAreaInsets();

  // Billing — live RevenueCat offering is the price authority. Reference prices
  // are shown only as expected US pricing when a purchasable store plan is unavailable.
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [billingModal, setBillingModal] = useState<'purchase' | 'restore' | 'manage' | 'confirm' | null>(null);
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
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'denied' | 'scheduled'>('idle');
  const [mealReminderStatus, setMealReminderStatus] = useState<'idle' | 'denied' | 'scheduled'>('idle');
  const [goalReminderStatus, setGoalReminderStatus] = useState<'idle' | 'denied' | 'scheduled'>('idle');

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
  const [editCalories, setEditCalories] = useState('');
  const [editDiet, setEditDiet] = useState<DietPreference>('Everything');
  const [editGoal, setEditGoal] = useState<Goal>('maintain');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);

  // Info sheets (food data / no ads / help)
  const [infoModal, setInfoModal] = useState<null | 'food-data' | 'no-ads' | 'help' | 'health'>(null);

  // ─── OS reminder status sync ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const tags = new Set(scheduled.map((n) => n.content.data?.tag));
        if (hydrationReminders.enabled && tags.has('calora-hydration')) setReminderStatus('scheduled');
        const anyMeal = mealReminders.breakfast || mealReminders.lunch || mealReminders.dinner;
        if (anyMeal && tags.has('calora-meals')) setMealReminderStatus('scheduled');
        if (goalReminder.enabled && tags.has('calora-goal')) setGoalReminderStatus('scheduled');
      } catch {
        // Permission not granted yet — leave statuses at 'idle'
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /** Hydration reminders */
  const applyHydrationPrefs = async (next: HydrationReminderPrefs) => {
    Haptics.selectionAsync();
    setHydrationReminders(next);
    if (!next.enabled) { await cancelHydrationReminders(); setReminderStatus('idle'); return; }
    const count = await scheduleHydrationReminders(next);
    if (count === -1) {
      setReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive hydration reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else {
      setReminderStatus('scheduled');
    }
  };
  const nudgeHydrationHour = (field: 'wakeHour' | 'sleepHour', delta: number) =>
    applyHydrationPrefs({ ...hydrationReminders, [field]: (hydrationReminders[field] + delta + 24) % 24 });
  const nudgeHydrationMinute = (field: 'wakeMinute' | 'sleepMinute', delta: number) =>
    applyHydrationPrefs({ ...hydrationReminders, [field]: (hydrationReminders[field] + delta + 60) % 60 });

  /** Meal reminders */
  const applyMealPrefs = async (next: MealReminderPrefs) => {
    Haptics.selectionAsync();
    setMealReminders(next);
    const granted = await scheduleMealReminders(next);
    if (!granted) {
      setMealReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive meal reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else {
      const anyEnabled = next.breakfast || next.lunch || next.dinner;
      setMealReminderStatus(anyEnabled ? 'scheduled' : 'idle');
    }
  };
  const nudgeMealTime = (meal: 'breakfast' | 'lunch' | 'dinner', field: 'hour' | 'minute', delta: number) => {
    const timeKey = `${meal}Time` as 'breakfastTime' | 'lunchTime' | 'dinnerTime';
    const current = mealReminders[timeKey];
    applyMealPrefs({
      ...mealReminders,
      [timeKey]: field === 'hour'
        ? { ...current, hour: (current.hour + delta + 24) % 24 }
        : { ...current, minute: (current.minute + delta + 60) % 60 },
    });
  };

  /** Goal reminder */
  const applyGoalPrefs = async (next: GoalReminderPrefs) => {
    Haptics.selectionAsync();
    setGoalReminder(next);
    if (!next.enabled) { await cancelGoalReminder(); setGoalReminderStatus('idle'); return; }
    const granted = await scheduleGoalReminder(next);
    if (!granted) {
      setGoalReminderStatus('denied');
      Alert.alert('Notification permission needed', `To receive goal reminders, allow ${BRAND.name} to send notifications in your device settings.`);
    } else {
      setGoalReminderStatus('scheduled');
    }
  };
  const nudgeGoalTime = (field: 'hour' | 'minute', delta: number) =>
    applyGoalPrefs({
      ...goalReminder,
      hour: field === 'hour' ? (goalReminder.hour + delta + 24) % 24 : goalReminder.hour,
      minute: field === 'minute' ? (goalReminder.minute + delta + 60) % 60 : goalReminder.minute,
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

  const handleManage = () => setBillingModal('manage');

  /** Export — locked against concurrent invocations via exportLockRef */
  const handleExport = makeExportHandler(
    exportLockRef,
    exportRawStorageData,
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
    try { await clearAllData(); setPrivacyModal(null); }
    finally { confirmingRef.current = false; }
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
      const copyResult = await copyProfilePhoto(result.assets[0].uri, FileSystem);
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
    setEditCalories(String(profile?.calorieTarget ?? 2000));
    setEditDiet(profile?.diet ?? 'Everything');
    setEditGoal(profile?.goal ?? 'maintain');
    setEditPhotoUri(profilePhotoUri);
    setProfileEditError('');
    setProfileEditModal(true);
  };
  const saveProfileEdit = async () => {
    const calories = Number(editCalories);
    if (!editName.trim() || !Number.isFinite(calories) || calories < 500 || calories > 9999) {
      setProfileEditError('Enter your name and a daily calorie target between 500 and 9,999.');
      return;
    }
    // Strip the cache-bust query param before persisting
    const cleanUri = editPhotoUri ? editPhotoUri.split('?')[0] : null;
    // If the user removed their photo (had one before, now cleared), delete the file from disk.
    // This runs only on save so a remove-then-cancel leaves the file intact.
    if (profilePhotoUri && !cleanUri) {
      const deleteResult = await deleteProfilePhoto(FileSystem);
      if (!deleteResult.ok) {
        console.error('[saveProfileEdit] deleteAsync failed', deleteResult.error);
        Alert.alert('Photo error', 'Could not remove the photo file. Please try again.');
        return;
      }
    }
    updateProfile({ name: editName.trim(), calorieTarget: calories, diet: editDiet, goal: editGoal });
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
      <AppHeader back title="Profile & settings" />
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>

        {/* ── Profile card ── */}
        <Animated.View entering={FadeInDown.springify().damping(20).delay(0)} style={[styles.profileCard, { backgroundColor: colors.hero }]}>
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

        {/* ── Appearance ── */}
        <Animated.View entering={FadeInDown.springify().damping(20).delay(80)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Choose how {BRAND.name} should feel at any hour.</Text>
        <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themes.map((theme) => {
            const selected = themePreference === theme.key;
            return (
              <Pressable key={theme.key} accessibilityLabel={`${theme.label} mode`} testID={`theme-${theme.key}`} onPress={() => setThemePreference(theme.key)} style={[styles.segmentedOption, selected && { backgroundColor: colors.accent }]}>
                <Feather name={theme.icon} size={16} color={selected ? colors.accentForeground : colors.mutedForeground} />
                <Text style={[styles.segmentedLabel, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>{theme.label}</Text>
              </Pressable>
            );
          })}
        </View>
        </Animated.View>

        {/* Text size */}
        <Animated.View entering={FadeInDown.springify().damping(20).delay(140)}>
        <View style={[styles.unitsRow, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
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
                <Pressable key={key} accessibilityLabel={`${key} text size`} onPress={() => setFontSizeScale(key)} style={[styles.unitChip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.border }]}>
                  <Text style={[styles.unitChipText, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Units */}
        <View style={[styles.unitsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="maximize-2" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.settingTitle, { color: colors.foreground, flex: 1 }]}>Measurement units</Text>
          <View style={styles.unitChips}>
            {(['metric', 'imperial'] as const).map((u) => {
              const sel = units === u;
              return (
                <Pressable key={u} accessibilityLabel={`${u} units`} onPress={() => updateProfile({ units: u })} style={[styles.unitChip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.border }]}>
                  <Text style={[styles.unitChipText, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>{u === 'metric' ? 'Metric' : 'Imperial'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </Animated.View>

        {/* ── Reminders ── */}
        <Animated.View entering={FadeInDown.springify().damping(20).delay(200)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4, marginBottom: 4 }]}>Reminders</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>On-device nudges for water intake, meals, and your daily goal.</Text>

        {/* Hydration */}
        <View style={[styles.reminderToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: '#e5f1ff' }]}><Feather name="droplet" size={17} color="#5d8edb" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Hydration reminders</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {hydrationReminders.enabled
                ? reminderStatus === 'denied' ? 'Permission required in device settings'
                  : `Every ${hydrationReminders.intervalHours}h · ${formatTime(hydrationReminders.wakeHour, hydrationReminders.wakeMinute)} – ${formatTime(hydrationReminders.sleepHour, hydrationReminders.sleepMinute)}`
                : 'Off · tap to turn on'}
            </Text>
          </View>
          <Switch accessibilityLabel="Toggle hydration reminders" testID="hydration-reminder-toggle" value={hydrationReminders.enabled} onValueChange={(val) => applyHydrationPrefs({ ...hydrationReminders, enabled: val })} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} />
        </View>

        {hydrationReminders.enabled && (
          <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Wake time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#fff0dc' }]}><Feather name="sun" size={14} color="#d7954e" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WAKE TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminders.wakeHour, hydrationReminders.wakeMinute)}</Text>
              </View>
              <View style={styles.reminderNudgeGroup}>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease wake hour" onPress={() => nudgeHydrationHour('wakeHour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase wake hour" onPress={() => nudgeHydrationHour('wakeHour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease wake minute" onPress={() => nudgeHydrationMinute('wakeMinute', -15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase wake minute" onPress={() => nudgeHydrationMinute('wakeMinute', 15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />

            {/* Sleep time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#f2eafd' }]}><Feather name="moon" size={14} color="#9875c7" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WIND-DOWN TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminders.sleepHour, hydrationReminders.sleepMinute)}</Text>
              </View>
              <View style={styles.reminderNudgeGroup}>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease sleep hour" onPress={() => nudgeHydrationHour('sleepHour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase sleep hour" onPress={() => nudgeHydrationHour('sleepHour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
                <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                <View style={styles.reminderNudge}>
                  <Pressable accessibilityLabel="Decrease sleep minute" onPress={() => nudgeHydrationMinute('sleepMinute', -15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                  <Pressable accessibilityLabel="Increase sleep minute" onPress={() => nudgeHydrationMinute('sleepMinute', 15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />

            {/* Interval */}
            <View style={styles.reminderIntervalRow}>
              <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>REMIND EVERY</Text>
              <View style={styles.intervalChips}>
                {([1, 1.5, 2, 3] as const).map((h) => {
                  const selected = hydrationReminders.intervalHours === h;
                  return (
                    <Pressable key={h} accessibilityLabel={`Remind every ${h} hours`} onPress={() => applyHydrationPrefs({ ...hydrationReminders, intervalHours: h })} style={[styles.intervalChip, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}>
                      <Text style={[styles.intervalChipText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{h}h</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.reminderPrivacy, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.reminderPrivacyText, { color: colors.mutedForeground }]}>Reminders are scheduled on your device. No data is sent anywhere.</Text>
            </View>
          </View>
        )}

        {/* ── Meal reminders ── */}
        <Text style={[styles.reminderSectionLabel, { color: colors.mutedForeground }]}>MEAL REMINDERS</Text>
        <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 8 }]}>
          {mealConfig.map((meal, idx) => {
            const enabled = mealReminders[meal.key];
            const timeKey = `${meal.key}Time` as 'breakfastTime' | 'lunchTime' | 'dinnerTime';
            const time = mealReminders[timeKey];
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
                        <Pressable accessibilityLabel={`Decrease ${meal.label} hour`} onPress={() => nudgeMealTime(meal.key, 'hour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={12} color={colors.foreground} /></Pressable>
                        <Pressable accessibilityLabel={`Increase ${meal.label} hour`} onPress={() => nudgeMealTime(meal.key, 'hour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={12} color={colors.foreground} /></Pressable>
                      </View>
                      <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
                      <View style={styles.reminderNudge}>
                        <Pressable accessibilityLabel={`Decrease ${meal.label} minute`} onPress={() => nudgeMealTime(meal.key, 'minute', -15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={12} color={colors.foreground} /></Pressable>
                        <Pressable accessibilityLabel={`Increase ${meal.label} minute`} onPress={() => nudgeMealTime(meal.key, 'minute', 15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={12} color={colors.foreground} /></Pressable>
                      </View>
                    </View>
                  )}
                  <Switch accessibilityLabel={`Toggle ${meal.label} reminder`} value={enabled} onValueChange={(val) => applyMealPrefs({ ...mealReminders, [meal.key]: val })} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} style={{ marginLeft: 8 }} />
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
        </View>

        {/* ── Daily goal reminder ── */}
        <Text style={[styles.reminderSectionLabel, { color: colors.mutedForeground }]}>DAILY GOAL CHECK-IN</Text>
        <View style={[styles.reminderToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: '#e8f5e9' }]}><Feather name="target" size={17} color="#4caf7d" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]} numberOfLines={1}>Daily goal check-in</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {goalReminder.enabled
                ? goalReminderStatus === 'denied' ? 'Permission required in device settings'
                  : `Daily at ${formatTime(goalReminder.hour, goalReminder.minute)}`
                : 'Off · a reminder to log remaining meals'}
            </Text>
          </View>
          {goalReminder.enabled && (
            <View style={styles.reminderNudgeGroup}>
              <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>HR</Text>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease goal reminder hour" onPress={() => nudgeGoalTime('hour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase goal reminder hour" onPress={() => nudgeGoalTime('hour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
              </View>
              <Text style={[styles.nudgeGroupLabel, { color: colors.mutedForeground }]}>MIN</Text>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease goal reminder minute" onPress={() => nudgeGoalTime('minute', -15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase goal reminder minute" onPress={() => nudgeGoalTime('minute', 15)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
              </View>
            </View>
          )}
          <Switch accessibilityLabel="Toggle daily goal reminder" value={goalReminder.enabled} onValueChange={(val) => applyGoalPrefs({ ...goalReminder, enabled: val })} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.primaryForeground} style={{ marginLeft: 8 }} />
        </View>
        </Animated.View>

        {/* ── CaloraApp Pro ── */}
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{BRAND.premiumName}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>The complete experience, without the noise.</Text>
          </View>
          <View style={[styles.betaPill, { backgroundColor: colors.accent }]}><Text style={[styles.betaText, { color: colors.accentForeground }]}>PRO</Text></View>
        </View>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.planEyebrow, { color: colors.mutedForeground }]}>CHOOSE YOUR PACE</Text>
          <View style={styles.planChoices}>
            <Pressable accessibilityLabel="Choose monthly plan" testID="billing-plan-monthly" onPress={() => setSelectedPlan('monthly')} style={[styles.planChoice, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'monthly' ? colors.accent : colors.card }]}>
              <View style={[styles.radio, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'monthly' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>Cancel anytime</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>{monthlyPriceString ?? 'Store price unavailable'}{monthlyPriceString && <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / mo</Text>}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Choose annual plan" testID="billing-plan-annual" onPress={() => setSelectedPlan('annual')} style={[styles.planChoice, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'annual' ? colors.accent : colors.card }]}>
              <View style={[styles.radio, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'annual' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Annual</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>$2.99 / month billed annually</Text>
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
              Store pricing is unavailable, so this plan cannot be purchased yet. Expected US pricing: $4.99/month or $35.88/year.
            </Text>
          )}
          <View style={styles.featureList}>
            {['Unlimited photo and voice logging', 'Verified food confidence and source history', 'Adaptive calorie targets and deeper insights', 'Ad-free, offline-first diary'].map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="check" size={15} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityLabel={isSelectedPlanAvailable ? 'Continue to billing' : 'Selected store plan is unavailable'} accessibilityState={{ disabled: !isSelectedPlanAvailable }} testID="billing-continue" disabled={!isSelectedPlanAvailable} onPress={handlePurchase} style={({ pressed }) => [styles.planButton, { backgroundColor: colors.primary, opacity: !isSelectedPlanAvailable ? 0.55 : pressed ? 0.8 : 1 }]}>
            <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>
              {isSubscribed ? `${BRAND.premiumName} is active` : isSelectedPlanAvailable ? `Continue with ${selectedPrice} / ${selectedPeriod}` : 'Store plan unavailable'}
            </Text>
            {!isSubscribed && isSelectedPlanAvailable && <Feather name="arrow-right" size={16} color={colors.primaryForeground} />}
          </Pressable>
          <Text style={[styles.billingNote, { color: colors.mutedForeground }]}>After the 7-day free trial, your selected plan renews at the same plan price unless you change or cancel it through the store. Local taxes and currency may affect the store display.</Text>
          <View style={styles.billingLinks}>
            <Pressable accessibilityLabel="Restore purchases" onPress={handleRestore}><Text style={[styles.billingLink, { color: colors.primary }]}>Restore purchases</Text></Pressable>
            <View style={[styles.linkDot, { backgroundColor: colors.border }]} />
            <Pressable accessibilityLabel="Manage subscription" onPress={handleManage}><Text style={[styles.billingLink, { color: colors.primary }]}>Manage subscription</Text></Pressable>
          </View>
        </View>

        {/* ── Invite friends ── */}
        <ReferralCard fontScale={fontScale} />

        {/* ── Saved meals ── */}
        <View style={styles.savedHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved meals</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Keep repeatable meals one tap away.</Text></View>
          <Pressable accessibilityLabel="Create saved meal" onPress={() => setSavedMealModal(true)} style={[styles.connectButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={14} color={colors.primaryForeground} />
            <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>Create</Text>
          </Pressable>
        </View>
        {savedMeals.length === 0
          ? (
            <View style={[styles.emptySaved, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={require('../../assets/images/calora-profile-header.jpg')} contentFit="cover" style={styles.emptySavedImage} />
              <View style={styles.emptySavedCopy}>
                <Text style={[styles.emptySavedTitle, { color: colors.foreground }]}>Your repeatable meals</Text>
                <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Create one for a repeatable lunch, dinner, or recipe.</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 4 }]}>Living memory</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Review the small, confirmed signals {BRAND.name} keeps on this device.</Text>
        <Pressable accessibilityLabel="Review living memory" testID="review-living-memory" onPress={() => router.push('/memory')} style={[styles.memoryShortcut, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name="layers" size={17} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>What {BRAND.name} remembers</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {Object.keys(livingMemory.mealObservations).length + Object.keys(livingMemory.waterObservations).length + Object.keys(livingMemory.moodObservations).length + Object.keys(livingMemory.activityObservations).length + Object.keys(livingMemory.plannerObservations).length > 0
                ? 'Review, correct, or forget individual signals.'
                : 'Nothing remembered yet.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* ── Account ── */}
        <AccountSection fontScale={fontScale} clearAllData={clearAllData} />

        {/* ── Trust & privacy ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>Trust & privacy</Text>
        <View style={[styles.connectionRow, { backgroundColor: colors.accent }]}>
          <View style={[styles.connectionIcon, { backgroundColor: colors.primary }]}><Feather name="activity" size={17} color={colors.primaryForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Health data</Text>
           <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{healthConnected ? 'Connected · steps and weight can sync' : `Not connected · ${BRAND.name} works offline without it`}</Text>
          </View>
           <Pressable
             accessibilityLabel="Learn about health data"
             onPress={() => {
               if (healthConnected) setHealthConnected(false);
               setInfoModal('health');
             }}
             style={[styles.connectButton, { backgroundColor: colors.card }]}
           >
             <Text style={[styles.connectButtonText, { color: colors.primary }]}>{healthConnected ? 'Disconnect' : 'Learn more'}</Text>
          </Pressable>
        </View>
        {[
          { icon: 'download' as const, title: 'Export your data', testID: 'export-data-row', body: `Prepare a portable JSON copy · ${syncState === 'needs-connection' ? 'waiting for connection' : syncState === 'local' ? 'stored locally' : syncState === 'offline' ? 'loading locally' : 'synced'}`, onPress: handleExport, disabled: !hasExportData || isExporting, isLoading: isExporting },
          { icon: 'trash-2' as const, title: 'Delete local data', testID: 'delete-local-data-row', body: 'Remove this device\u2019s diary and profile data.', onPress: handleDelete, disabled: isClearing, isLoading: isClearing },
          { icon: 'shield' as const, title: 'Your food data stays yours', body: 'Local-first logging with export and delete controls.', onPress: () => setInfoModal('food-data'), disabled: false },
          { icon: 'eye-off' as const, title: 'No surveillance ads', body: 'Your meals are never used to target advertisements.', onPress: () => setInfoModal('no-ads'), disabled: false },
          { icon: 'help-circle' as const, title: 'Need a hand?', body: 'Reach a real person when something does not look right.', onPress: () => setInfoModal('help'), disabled: false },
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
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>About</Text>
        {[
          { icon: 'info' as const, title: BRAND.name, body: `${BRAND.descriptor} · v${Constants.expoConfig?.version ?? '1.0.0'}`, url: null },
          { icon: 'globe' as const, title: 'Website', body: BRAND.domain, url: URLS.main },
          { icon: 'shield' as const, title: 'Privacy Policy', body: 'How we handle your data', url: URLS.privacy },
          { icon: 'file-text' as const, title: 'Terms of Use', body: 'Terms governing your use', url: URLS.terms },
          { icon: 'mail' as const, title: 'Help & Support', body: EMAILS.support, url: URLS.support },
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
      </ScrollView>

      {/* ── Billing modal ── */}
      <Modal visible={billingModal !== null} transparent animationType="fade" onRequestClose={() => setBillingModal(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.accent }]}>
              <Feather name={billingModal === 'confirm' ? 'credit-card' : billingModal === 'purchase' ? 'lock' : billingModal === 'restore' ? 'rotate-ccw' : 'external-link'} size={20} color={colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {billingModal === 'confirm' ? 'Confirm your purchase' : billingModal === 'purchase' ? 'Billing is ready for setup' : billingModal === 'restore' ? 'Restore purchases' : 'Manage subscription'}
            </Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              {billingModal === 'confirm'
                ? `Subscribe to ${BRAND.premiumName} (${selectedPlan}) at ${selectedPrice} per ${selectedPeriod}? The store determines 7-day trial eligibility and completes the payment.`
                : billingModal === 'purchase'
                ? `The ${selectedPlan} store plan is unavailable, so no purchase can be started. Please try again when store pricing has loaded.`
                : billingModal === 'restore'
                  ? `This will look up your active ${BRAND.premiumName} entitlement on this device.`
                  : 'This will open the platform subscription settings so cancellation stays one tap away.'}
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
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
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
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
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
      <Modal visible={savedMealModal} transparent animationType="slide" onRequestClose={() => setSavedMealModal(false)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.savedModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Create a saved template</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>Add the numbers from a meal or recipe you make often. It will be stored offline and appear in the add-food sheet.</Text>
            <View style={styles.savedKindRow}>
              <Pressable onPress={() => setSavedMealKind('meal')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'meal' ? colors.primary : colors.card, borderColor: savedMealKind === 'meal' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'meal' ? colors.primaryForeground : colors.mutedForeground }]}>Meal</Text></Pressable>
              <Pressable onPress={() => setSavedMealKind('recipe')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'recipe' ? colors.primary : colors.card, borderColor: savedMealKind === 'recipe' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'recipe' ? colors.primaryForeground : colors.mutedForeground }]}>Recipe</Text></Pressable>
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
            <Pressable accessibilityLabel="Save meal template" onPress={createSavedMeal} style={[styles.dialogButton, { backgroundColor: colors.primary }]}><Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Save template</Text></Pressable>
            <Pressable accessibilityLabel="Cancel saved meal" onPress={() => setSavedMealModal(false)} style={styles.dialogSecondaryButton}><Text style={[styles.dialogSecondaryText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Saved meal deletion confirmation ── */}
      <Modal visible={savedMealPendingDelete !== null} transparent animationType="fade" onRequestClose={() => setSavedMealPendingDelete(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
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

      {/* ── Profile edit modal ── */}
      <Modal visible={profileEditModal} transparent animationType="slide" onRequestClose={() => setProfileEditModal(false)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.savedModal, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>DAILY CALORIE TARGET</Text>
            <TextInput accessibilityLabel="Calorie target" value={editCalories} onChangeText={(value) => { setEditCalories(value); if (profileEditError) setProfileEditError(''); }} keyboardType="number-pad" placeholder="e.g. 2000" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: profileEditError ? colors.destructive : colors.input, marginBottom: 14 }]} />
            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>DIET</Text>
            <View style={styles.editChips}>
              {dietOptions.map((d) => (
                <Pressable key={d} accessibilityLabel={`Diet: ${d}`} onPress={() => setEditDiet(d)} style={[styles.editChip, { backgroundColor: editDiet === d ? colors.primary : colors.card, borderColor: editDiet === d ? colors.primary : colors.border }]}>
                  <Text style={[styles.editChipText, { color: editDiet === d ? colors.primaryForeground : colors.mutedForeground }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.editFieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>GOAL</Text>
            <View style={styles.editChips}>
              {goalOptions.map((g) => (
                <Pressable key={g.key} accessibilityLabel={`Goal: ${g.label}`} onPress={() => setEditGoal(g.key)} style={[styles.editChip, { backgroundColor: editGoal === g.key ? colors.primary : colors.card, borderColor: editGoal === g.key ? colors.primary : colors.border }]}>
                  <Text style={[styles.editChipText, { color: editGoal === g.key ? colors.primaryForeground : colors.mutedForeground }]}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
            {!!profileEditError && <Text accessibilityRole="alert" style={[styles.formError, { color: colors.destructive }]}>{profileEditError}</Text>}
            <Pressable accessibilityLabel="Save profile changes" onPress={saveProfileEdit} style={[styles.dialogButton, { backgroundColor: colors.primary, marginTop: 20 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Save changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Info modals (food data / no ads / help) ── */}
      <Modal visible={infoModal !== null} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.savedModal, { backgroundColor: colors.background }]}>
            <View style={styles.editModalHeader}>
              <View style={[styles.dialogIcon, { backgroundColor: colors.accent, marginBottom: 0 }]}>
                <Feather name={infoModal === 'food-data' ? 'shield' : infoModal === 'no-ads' ? 'eye-off' : infoModal === 'health' ? 'activity' : 'help-circle'} size={18} color={colors.accentForeground} />
              </View>
              <Text style={[styles.dialogTitle, { color: colors.foreground, flex: 1, marginLeft: 12 }]}>
                {infoModal === 'food-data' ? 'Your food data stays yours' : infoModal === 'no-ads' ? 'No surveillance ads' : infoModal === 'health' ? 'Health data is not connected' : 'Need a hand?'}
              </Text>
              <Pressable accessibilityLabel="Close" onPress={() => setInfoModal(null)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {infoModal === 'food-data' && (
              <>
                {[
                  { icon: 'smartphone' as const, title: 'Stays on your device', body: 'Your diary, profile, and food memories live in your phone\'s local storage — not on a remote server.' },
                  { icon: 'download' as const, title: 'You can export any time', body: `Use Export your data to get a complete portable JSON copy of everything ${BRAND.name} has stored.` },
                  { icon: 'trash-2' as const, title: 'You can delete any time', body: 'Delete local data permanently removes every byte from this device immediately.' },
                  { icon: 'lock' as const, title: 'No cloud sync without consent', body: 'Sync is opt-in and never happens silently. You always see the sync state in your diary footer.' },
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
                  { icon: 'eye-off' as const, title: 'No ad tracking', body: `${BRAND.name} does not share your food data, location, or behavior with ad networks.` },
                  { icon: 'bar-chart-2' as const, title: 'No behavioral profiling', body: 'Your meal patterns are used only to personalize your experience — never to build a profile for sale.' },
                  { icon: 'dollar-sign' as const, title: 'Revenue from subscriptions only', body: `${BRAND.name} is funded by ${BRAND.premiumName} subscriptions. There is no ad-supported tier.` },
                  { icon: 'check-circle' as const, title: 'Built on trust', body: 'If that ever changes, we will ask for your explicit consent before anything new is collected.' },
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
                  HealthKit and Health Connect are not connected in this build. {BRAND.name} continues to work locally without health data, and no steps or weight have been read.
                </Text>
                <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
                  <Feather name="lock" size={15} color={colors.primary} />
                  <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>A future connection will ask for explicit device permission first.</Text>
                </View>
              </>
            )}

            {infoModal === 'help' && (
              <>
                {[
                  { q: 'Why does my calorie ring show 0?', a: 'The ring fills as you log meals. Tap the + button on the Home tab to add your first entry.' },
                  { q: 'How do I change my calorie target?', a: 'Tap the pencil icon at the top of this page to edit your profile, including your daily calorie target.' },
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

            <Pressable accessibilityLabel="Close information sheet" onPress={() => setInfoModal(null)} style={[styles.dialogButton, { backgroundColor: colors.muted, marginTop: 16 }]}>
              <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(f: number) {
  return StyleSheet.create({
  page: { flex: 1 },

  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 23, padding: 16, marginBottom: 26 },
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
  segmentedControl: { flexDirection: 'row', gap: 5, borderWidth: 1, padding: 5, borderRadius: 16, marginBottom: 12 },
  segmentedOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  segmentedLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Units row
  unitsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 17, padding: 11, marginBottom: 26 },
  unitChips: { flexDirection: 'row', gap: 6 },
  unitChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  unitChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Reminder elements
  reminderSectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.2, marginTop: 18, marginBottom: 8 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  reminderSettings: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 8, gap: 4 },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  mealReminderRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
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
  planCard: { borderWidth: 1.5, borderRadius: 22, padding: 16 },
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
  savedHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  emptySaved: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 10 },
  emptySavedImage: { width: 58, height: 58, borderRadius: 13 },
  emptySavedCopy: { flex: 1 },
  emptySavedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f, marginBottom: 3 },
  savedList: { gap: 8 },
  savedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 17, padding: 11 },
  deleteMealButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Living memory
  memoryShortcut: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },

  // Trust & privacy
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, padding: 12, marginBottom: 8 },
  connectionIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  connectButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  settingIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  settingBody: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 4 },

  // Version
  version: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, textAlign: 'center', marginTop: 18 },

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
  dialogSecondaryButton: { alignItems: 'center', paddingTop: 14 },
  dialogSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },

  // Saved meal modal
  savedModal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 28, marginTop: 'auto', maxHeight: '92%' },
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
