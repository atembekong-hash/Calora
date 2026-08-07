import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SavedMeal, ThemePreference, useCalora } from '@/context/CaloraContext';
import {
  cancelHydrationReminders,
  formatTime,
  scheduleHydrationReminders,
  type HydrationReminderPrefs,
} from '@/lib/hydrationReminders';
import { deriveExportHasData, handleExportTap } from '@/lib/exportUiHandler';

const themes: { key: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'smartphone' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

export default function ProfileScreen() {
  const { colors, themePreference, setThemePreference, profile, healthConnected, setHealthConnected, exportRawStorageData, clearAllData, isClearing, syncState, savedMeals, saveMeal, hydrationReminders, setHydrationReminders, livingMemory, logs } = useCalora();
  const hasExportData = deriveExportHasData(profile, logs);
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [billingModal, setBillingModal] = useState<'purchase' | 'restore' | 'manage' | null>(null);
  const [privacyModal, setPrivacyModal] = useState<'export' | 'delete' | null>(null);
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'denied' | 'scheduled'>('idle');
  const [savedMealModal, setSavedMealModal] = useState(false);
  const [savedMealName, setSavedMealName] = useState('');
  const [savedMealKind, setSavedMealKind] = useState<SavedMeal['kind']>('meal');
  const [savedMealCalories, setSavedMealCalories] = useState('');
  const [savedMealProtein, setSavedMealProtein] = useState('');
  const [savedMealCarbs, setSavedMealCarbs] = useState('');
  const [savedMealFat, setSavedMealFat] = useState('');
  const annualMonthlyEquivalent = (69.99 / 12).toFixed(2);
  const annualSavings = (9.99 * 12 - 69.99).toFixed(2);
  const selectedPrice = selectedPlan === 'annual' ? '$69.99' : '$9.99';
  const selectedPeriod = selectedPlan === 'annual' ? 'year' : 'month';

  const applyReminderPrefs = async (next: HydrationReminderPrefs) => {
    setHydrationReminders(next);
    if (!next.enabled) {
      await cancelHydrationReminders();
      setReminderStatus('idle');
      return;
    }
    const count = await scheduleHydrationReminders(next);
    if (count === -1) {
      setReminderStatus('denied');
      Alert.alert(
        'Notification permission needed',
        'To receive hydration reminders, allow Calora to send notifications in your device settings.',
      );
    } else {
      setReminderStatus('scheduled');
    }
  };

  const nudgeHour = (field: 'wakeHour' | 'sleepHour', delta: number) => {
    const next: HydrationReminderPrefs = {
      ...hydrationReminders,
      [field]: (hydrationReminders[field] + delta + 24) % 24,
    };
    applyReminderPrefs(next);
  };

  const handlePurchase = () => setBillingModal('purchase');
  const handleRestore = () => setBillingModal('restore');
  const handleManage = () => setBillingModal('manage');
  const handleExport = async () => {
    await handleExportTap({
      exportRawStorageData,
      onNoData: () =>
        Alert.alert(
          'No data',
          'There is no local data to export. Log a meal or complete onboarding first.',
        ),
      onData: () => setPrivacyModal('export'),
    });
  };
  const handleDelete = () => { if (!isClearing) setPrivacyModal('delete'); };
  /** Synchronous ref so a second press event delivered before React commits
   *  isClearing=true cannot race past the guard and close the modal early. */
  const confirmingRef = useRef(false);
  const handleConfirmDelete = async () => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    try {
      await clearAllData();
      setPrivacyModal(null);
    } finally {
      confirmingRef.current = false;
    }
  };
  const createSavedMeal = () => {
    const calories = Number(savedMealCalories);
    if (!savedMealName.trim() || !Number.isFinite(calories) || calories <= 0) return;
    saveMeal({
      name: savedMealName.trim(),
      kind: savedMealKind,
      foodIds: [],
      calories,
      protein: Number(savedMealProtein) || 0,
      carbs: Number(savedMealCarbs) || 0,
      fat: Number(savedMealFat) || 0,
    });
    setSavedMealName('');
    setSavedMealCalories('');
    setSavedMealProtein('');
    setSavedMealCarbs('');
    setSavedMealFat('');
    setSavedMealModal(false);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Image source={require('../../assets/images/calora-profile-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.72)', 'rgba(18,34,24,0.16)']}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.profileHeaderContent}>
            <View style={styles.profileHeaderBadge}>
              <Feather name="user" size={12} color="#d4eadc" />
              <Text style={styles.profileHeaderBadgeText}>YOUR SPACE</Text>
            </View>
            <Text style={styles.profileHeaderEyebrow}>CALORA, YOUR WAY</Text>
            <Text style={styles.profileHeaderTitle}>Profile & settings</Text>
            <Text style={styles.profileHeaderSubtitle}>A quieter place to shape the experience around you.</Text>
          </View>
        </View>
        <View style={[styles.profileCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.largeAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.largeAvatarText, { color: colors.primaryForeground }]}>{profile?.name?.charAt(0) ?? 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.onHero }]}>{profile?.name ?? 'Your profile'}</Text>
            <Text style={[styles.profileSub, { color: colors.heroMuted }]}>{profile ? `${profile.calorieTarget.toLocaleString()} kcal target · ${profile.diet}` : 'Finish onboarding to personalize Calora'}</Text>
          </View>
          <Feather name="edit-2" size={17} color={colors.heroMuted} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Choose how Calora should feel at any hour.</Text>
        <View style={[styles.themePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themes.map((theme) => {
            const selected = themePreference === theme.key;
            return (
              <Pressable key={theme.key} accessibilityLabel={`${theme.label} mode`} testID={`theme-${theme.key}`} onPress={() => setThemePreference(theme.key)} style={[styles.themeOption, selected && { backgroundColor: colors.accent }]}>
                <Feather name={theme.icon} size={16} color={selected ? colors.accentForeground : colors.mutedForeground} />
                <Text style={[styles.themeLabel, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>{theme.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Hydration Reminders ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4, marginBottom: 4 }]}>Reminders</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Optional nudges to keep your water intake steady.</Text>

        <View style={[styles.reminderToggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: '#e5f1ff' }]}>
            <Feather name="bell" size={17} color="#5d8edb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Hydration reminders</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {hydrationReminders.enabled
                ? reminderStatus === 'denied'
                  ? 'Permission required in device settings'
                  : `Every ${hydrationReminders.intervalHours}h · ${formatTime(hydrationReminders.wakeHour, hydrationReminders.wakeMinute)} – ${formatTime(hydrationReminders.sleepHour, hydrationReminders.sleepMinute)}`
                : 'Off · tap to turn on'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle hydration reminders"
            testID="hydration-reminder-toggle"
            value={hydrationReminders.enabled}
            onValueChange={(val) => applyReminderPrefs({ ...hydrationReminders, enabled: val })}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
        </View>

        {hydrationReminders.enabled && (
          <View style={[styles.reminderSettings, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Wake time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#fff0dc' }]}>
                <Feather name="sun" size={14} color="#d7954e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WAKE TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminders.wakeHour, hydrationReminders.wakeMinute)}</Text>
              </View>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease wake hour" onPress={() => nudgeHour('wakeHour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase wake hour" onPress={() => nudgeHour('wakeHour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
              </View>
            </View>

            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />

            {/* Sleep time */}
            <View style={styles.reminderTimeRow}>
              <View style={[styles.reminderTimeIcon, { backgroundColor: '#f2eafd' }]}>
                <Feather name="moon" size={14} color="#9875c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTimeLabel, { color: colors.mutedForeground }]}>WIND-DOWN TIME</Text>
                <Text style={[styles.reminderTimeValue, { color: colors.foreground }]}>{formatTime(hydrationReminders.sleepHour, hydrationReminders.sleepMinute)}</Text>
              </View>
              <View style={styles.reminderNudge}>
                <Pressable accessibilityLabel="Decrease sleep hour" onPress={() => nudgeHour('sleepHour', -1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={13} color={colors.foreground} /></Pressable>
                <Pressable accessibilityLabel="Increase sleep hour" onPress={() => nudgeHour('sleepHour', 1)} style={[styles.nudgeButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={13} color={colors.foreground} /></Pressable>
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
                    <Pressable
                      key={h}
                      accessibilityLabel={`Remind every ${h} hours`}
                      onPress={() => applyReminderPrefs({ ...hydrationReminders, intervalHours: h })}
                      style={[styles.intervalChip, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.intervalChipText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{h}h</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Privacy note */}
            <View style={[styles.reminderPrivacy, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.reminderPrivacyText, { color: colors.mutedForeground }]}>Reminders are scheduled on your device. No data is sent anywhere.</Text>
            </View>
          </View>
        )}

        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calora Plus</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>The complete experience, without the noise.</Text>
          </View>
          <View style={[styles.betaPill, { backgroundColor: colors.accent }]}><Text style={[styles.betaText, { color: colors.accentForeground }]}>PLUS</Text></View>
        </View>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.planEyebrow, { color: colors.mutedForeground }]}>CHOOSE YOUR PACE</Text>
          <View style={styles.planChoices}>
            <Pressable
              accessibilityLabel="Choose monthly plan"
              testID="billing-plan-monthly"
              onPress={() => setSelectedPlan('monthly')}
              style={[styles.planChoice, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'monthly' ? colors.accent : colors.card }]}
            >
              <View style={[styles.radio, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'monthly' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>Cancel anytime</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$9.99<Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / mo</Text></Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Choose annual plan"
              testID="billing-plan-annual"
              onPress={() => setSelectedPlan('annual')}
              style={[styles.planChoice, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'annual' ? colors.accent : colors.card }]}
            >
              <View style={[styles.radio, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'annual' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Annual <Text style={[styles.savePill, { color: colors.accentForeground, backgroundColor: colors.accent }]}>SAVE 42%</Text></Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>${annualMonthlyEquivalent} / month equivalent</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$69.99<Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / yr</Text></Text>
            </Pressable>
          </View>
          <View style={[styles.valueLine, { backgroundColor: colors.muted }]}>
            <Feather name="check-circle" size={15} color={colors.success} />
            <Text style={[styles.valueLineText, { color: colors.foreground }]}>You save ${annualSavings} with annual billing.</Text>
          </View>
          <View style={styles.featureList}>
            {['Unlimited photo and voice logging', 'Verified food confidence and source history', 'Adaptive calorie targets and deeper insights', 'Ad-free, offline-first diary'].map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="check" size={15} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityLabel="Continue to billing" testID="billing-continue" onPress={handlePurchase} style={({ pressed }) => [styles.planButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>Continue with {selectedPrice} / {selectedPeriod}</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </Pressable>
          <Text style={[styles.billingNote, { color: colors.mutedForeground }]}>Subscription renews automatically unless canceled at least 24 hours before the renewal date. Final price may vary by local taxes and currency.</Text>
          <View style={styles.billingLinks}>
            <Pressable accessibilityLabel="Restore purchases" onPress={handleRestore}><Text style={[styles.billingLink, { color: colors.primary }]}>Restore purchases</Text></Pressable>
            <View style={[styles.linkDot, { backgroundColor: colors.border }]} />
            <Pressable accessibilityLabel="Manage subscription" onPress={handleManage}><Text style={[styles.billingLink, { color: colors.primary }]}>Manage subscription</Text></Pressable>
          </View>
        </View>

        <View style={styles.savedHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved meals</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Keep repeatable meals one tap away.</Text></View>
          <Pressable accessibilityLabel="Create saved meal" onPress={() => setSavedMealModal(true)} style={[styles.connectButton, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>Create</Text></Pressable>
        </View>
        {savedMeals.length === 0 ? <View style={[styles.emptySaved, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={require('../../assets/images/calora-profile-header.jpg')} contentFit="cover" style={styles.emptySavedImage} /><View style={styles.emptySavedCopy}><Text style={[styles.emptySavedTitle, { color: colors.foreground }]}>Your repeatable meals</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Create one for a repeatable lunch, dinner, or recipe.</Text></View></View> : <View style={styles.savedList}>{savedMeals.map((meal) => <View key={meal.id} style={[styles.savedItem, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name={meal.kind === 'recipe' ? 'book-open' : 'bookmark'} size={16} color={colors.accentForeground} /></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{meal.name}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{meal.calories} kcal · {meal.protein}g protein · {meal.kind}</Text></View></View>)}</View>}

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 4 }]}>Living memory</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Review the small, confirmed signals Calora keeps on this device.</Text>
        <Pressable
          accessibilityLabel="Review living memory"
          testID="review-living-memory"
          onPress={() => router.push('/memory')}
          style={[styles.memoryShortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
            <Feather name="layers" size={17} color={colors.accentForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>What Calora remembers</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
              {Object.keys(livingMemory.mealObservations).length + Object.keys(livingMemory.waterObservations).length + Object.keys(livingMemory.moodObservations).length + Object.keys(livingMemory.activityObservations).length + Object.keys(livingMemory.plannerObservations).length > 0 ? 'Review, correct, or forget individual signals.' : 'Nothing remembered yet.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>Trust & privacy</Text>
        <View style={[styles.connectionRow, { backgroundColor: colors.accent }]}>
          <View style={[styles.connectionIcon, { backgroundColor: colors.primary }]}><Feather name="activity" size={17} color={colors.primaryForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Health data</Text>
            <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{healthConnected ? 'Connected · steps and weight can sync' : 'Not connected · Calora works offline without it'}</Text>
          </View>
          <Pressable accessibilityLabel={healthConnected ? 'Disconnect health data' : 'Connect health data'} onPress={() => {
            setHealthConnected(!healthConnected);
            Alert.alert(healthConnected ? 'Health disconnected' : 'Health connection ready', healthConnected ? 'Calora will stop reading health data.' : 'Native HealthKit and Health Connect permissions are required before live data can sync. No data has been read.');
          }} style={[styles.connectButton, { backgroundColor: colors.card }]}><Text style={[styles.connectButtonText, { color: colors.primary }]}>{healthConnected ? 'Disconnect' : 'Connect'}</Text></Pressable>
        </View>
        {[
          { icon: 'download', title: 'Export your data', testID: 'export-data-row', body: `Prepare a portable JSON copy · ${syncState === 'needs-connection' ? 'waiting for connection' : syncState === 'local' ? 'stored locally' : syncState === 'offline' ? 'loading locally' : 'synced'}`, onPress: handleExport, disabled: !hasExportData },
          { icon: 'trash-2', title: 'Delete local data', body: 'Remove this device\u2019s diary and profile data.', onPress: handleDelete },
          { icon: 'shield', title: 'Your food data stays yours', body: 'Local-first logging with export and delete controls.' },
          { icon: 'eye-off', title: 'No surveillance ads', body: 'Your meals are never used to target advertisements.' },
          { icon: 'help-circle', title: 'Need a hand?', body: 'Reach a real person when something does not look right.' },
        ].map((item) => (
          <Pressable
            key={item.title}
            testID={'testID' in item ? item.testID : undefined}
            onPress={item.disabled ? undefined : item.onPress}
            accessibilityState={item.disabled ? { disabled: true } : undefined}
            style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.disabled ? 0.4 : 1 }]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon as keyof typeof Feather.glyphMap} size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Calora 1.0 preview · Made for steadier days</Text>
      </ScrollView>
      <Modal visible={billingModal !== null} transparent animationType="fade" onRequestClose={() => setBillingModal(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.accent }]}>
              <Feather name={billingModal === 'purchase' ? 'lock' : billingModal === 'restore' ? 'rotate-ccw' : 'external-link'} size={20} color={colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {billingModal === 'purchase' ? 'Billing is ready for setup' : billingModal === 'restore' ? 'Restore purchases' : 'Manage subscription'}
            </Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              {billingModal === 'purchase'
                ? `You chose the ${selectedPlan} plan at ${selectedPrice} per ${selectedPeriod}. The App Store and Google Play connection must be enabled before a real charge can be made.`
                : billingModal === 'restore'
                  ? 'Once store billing is connected, this will look up your active Calora Plus entitlement on this device.'
                  : 'Once store billing is connected, this will open the platform subscription settings so cancellation stays one tap away.'}
            </Text>
            <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={15} color={colors.primary} />
              <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>No payment has been taken.</Text>
            </View>
            <Pressable accessibilityLabel="Close billing dialog" onPress={() => setBillingModal(null)} style={[styles.dialogButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Got it</Text>
            </Pressable>
            <Pressable accessibilityLabel="View billing help" onPress={() => {
              setBillingModal(null);
              Alert.alert('Billing help', 'Calora will support App Store and Google Play subscriptions. Your plan, renewal date, and cancellation path will always be visible here.');
            }} style={styles.dialogSecondaryButton}>
              <Text style={[styles.dialogSecondaryText, { color: colors.primary }]}>How billing works</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={privacyModal !== null} transparent animationType="fade" onRequestClose={() => { if (!isClearing) setPrivacyModal(null); }}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: privacyModal === 'delete' ? colors.warning : colors.accent }]}>
              <Feather name={privacyModal === 'delete' ? 'trash-2' : 'download'} size={20} color={privacyModal === 'delete' ? colors.foreground : colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {privacyModal === 'delete' ? 'Delete local data?' : 'Your export is ready'}
            </Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              {privacyModal === 'delete'
                ? 'This removes your diary, profile, weights, and saved meals from this device. This cannot be undone.'
                : 'Calora prepared a portable JSON copy of your profile, diary, weights, and saved meals. A connected share/export surface will make the file downloadable in the next step.'}
            </Text>
            <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
              <Feather name={privacyModal === 'delete' ? 'alert-triangle' : 'check-circle'} size={15} color={privacyModal === 'delete' ? colors.warning : colors.success} />
              <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>
                {privacyModal === 'delete' ? 'This action is permanent.' : 'No data was sent anywhere.'}
              </Text>
            </View>
            {privacyModal === 'delete' && <Pressable accessibilityLabel="Delete everything" disabled={isClearing} onPress={handleConfirmDelete} style={[styles.dialogButton, { backgroundColor: colors.warning, opacity: isClearing ? 0.6 : 1 }]}>{isClearing ? <ActivityIndicator size="small" color={colors.foreground} /> : <Text style={[styles.dialogButtonText, { color: colors.foreground }]}>Delete everything</Text>}</Pressable>}
            <Pressable accessibilityLabel="Close privacy dialog" disabled={isClearing} onPress={() => setPrivacyModal(null)} style={[styles.dialogButton, { backgroundColor: privacyModal === 'delete' ? colors.muted : colors.primary, opacity: isClearing && privacyModal === 'delete' ? 0.4 : 1 }]}>
              <Text style={[styles.dialogButtonText, { color: privacyModal === 'delete' ? colors.foreground : colors.primaryForeground }]}>{privacyModal === 'delete' ? 'Keep my data' : 'Done'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={savedMealModal} transparent animationType="slide" onRequestClose={() => setSavedMealModal(false)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.savedModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Create a saved template</Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>Add the numbers from a meal or recipe you make often. It will be stored offline and appear in the add-food sheet.</Text>
            <View style={styles.savedKindRow}><Pressable onPress={() => setSavedMealKind('meal')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'meal' ? colors.primary : colors.card, borderColor: savedMealKind === 'meal' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'meal' ? colors.primaryForeground : colors.mutedForeground }]}>Meal</Text></Pressable><Pressable onPress={() => setSavedMealKind('recipe')} style={[styles.savedKind, { backgroundColor: savedMealKind === 'recipe' ? colors.primary : colors.card, borderColor: savedMealKind === 'recipe' ? colors.primary : colors.border }]}><Text style={[styles.savedKindText, { color: savedMealKind === 'recipe' ? colors.primaryForeground : colors.mutedForeground }]}>Recipe</Text></Pressable></View>
            <TextInput accessibilityLabel="Saved meal name" value={savedMealName} onChangeText={setSavedMealName} placeholder="Name, e.g. Sunday chili" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
            <View style={styles.savedNumbers}>{[['Calories', savedMealCalories, setSavedMealCalories], ['Protein g', savedMealProtein, setSavedMealProtein], ['Carbs g', savedMealCarbs, setSavedMealCarbs], ['Fat g', savedMealFat, setSavedMealFat]].map(([label, value, setter]) => <View key={label as string} style={styles.savedNumber}><Text style={[styles.savedNumberLabel, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput value={value as string} onChangeText={setter as (value: string) => void} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.savedInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}</View>
            <Pressable accessibilityLabel="Save meal template" onPress={createSavedMeal} style={[styles.dialogButton, { backgroundColor: colors.primary }]}><Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Save template</Text></Pressable>
            <Pressable accessibilityLabel="Cancel saved meal" onPress={() => setSavedMealModal(false)} style={styles.dialogSecondaryButton}><Text style={[styles.dialogSecondaryText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  profileHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 17, backgroundColor: '#1b3022' },
  profileHeaderContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  profileHeaderBadge: { position: 'absolute', top: 17, right: 17, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  profileHeaderBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  profileHeaderEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  profileHeaderTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.7 },
  profileHeaderSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 7, maxWidth: 280 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7, marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 23, padding: 16, marginBottom: 26 },
  largeAvatar: { width: 47, height: 47, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  largeAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  profileSub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4, maxWidth: 230 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4, marginBottom: 12 },
  themePicker: { flexDirection: 'row', gap: 5, borderWidth: 1, padding: 5, borderRadius: 16, marginBottom: 26 },
  themeOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  themeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 11 },
  betaPill: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  betaText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  planCard: { borderWidth: 1.5, borderRadius: 22, padding: 16 },
  planEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.1, marginBottom: 8 },
  planChoices: { gap: 8 },
  planChoice: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, padding: 11, gap: 9 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { width: 9, height: 9, borderRadius: 5 },
  planChoiceCopy: { flex: 1 },
  planName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  planHint: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  planPrice: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  planPeriod: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  savePill: { fontFamily: 'Inter_700Bold', fontSize: 9, paddingHorizontal: 5 },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  valueLineText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  featureList: { gap: 9, paddingVertical: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  planButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  planButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  billingNote: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 12 },
  billingLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 13 },
  billingLink: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  linkDot: { width: 3, height: 3, borderRadius: 2 },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', borderRadius: 24, padding: 20 },
  dialogIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  dialogBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  dialogStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, padding: 10, marginTop: 15 },
  dialogStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  dialogButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  dialogButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  dialogSecondaryButton: { alignItems: 'center', paddingTop: 14 },
  dialogSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  settingIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, padding: 12, marginBottom: 8 },
  connectionIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  connectButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  connectButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  savedHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  emptySaved: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 10 },
  emptySavedImage: { width: 58, height: 58, borderRadius: 13 },
  emptySavedCopy: { flex: 1 },
  emptySavedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 3 },
  savedList: { gap: 8 },
  savedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 17, padding: 11 },
  memoryShortcut: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  savedModal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 28, marginTop: 'auto' },
  savedKindRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  savedKind: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  savedKindText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  savedInput: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 12 },
  savedNumbers: { flexDirection: 'row', gap: 7, marginTop: 8 },
  savedNumber: { flex: 1 },
  savedNumberLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginBottom: 5 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  settingBody: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 18 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  reminderSettings: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 26, gap: 4 },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  reminderTimeIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reminderTimeLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, marginBottom: 3 },
  reminderTimeValue: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: -0.3 },
  reminderNudge: { flexDirection: 'row', gap: 6 },
  nudgeButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reminderDivider: { height: 1, marginVertical: 2 },
  reminderIntervalRow: { paddingVertical: 6 },
  intervalChips: { flexDirection: 'row', gap: 7 },
  intervalChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 9 },
  intervalChipText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  reminderPrivacy: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  reminderPrivacyText: { fontFamily: 'Inter_400Regular', fontSize: 10, flex: 1 },
});