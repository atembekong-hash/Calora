import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInRight,
  FadeOutLeft,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useCalora, ActivityLevel, DietPreference, Goal, OnboardingDraft, Profile } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import { formatWhole, normalizeWholeNumberInput } from '@/lib/formatters';
import { handleParseErrorExport } from '@/lib/parseErrorExportHandler';
import { deriveErrorScreenActions } from '@/lib/errorScreenActions';
import { completeDeviceLocalReset } from '@/lib/deviceLocalReset';
import { recommendCalories } from '@/lib/calorieRecommendation';
import { MINIMUM_COMMERCIAL_AGE, validatePersonalDetails } from '@/lib/profileTargets';
import { useAuth } from '@/context/AuthContext';

const goals: { key: Goal; label: string; body: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'lose', label: 'Lose weight', body: 'A steady, sustainable pace', icon: 'trending-down' },
  { key: 'maintain', label: 'Maintain weight', body: 'Feel good where you are', icon: 'minus' },
  { key: 'gain', label: 'Build strength', body: 'Fuel performance and growth', icon: 'trending-up' },
];
const activities: { key: ActivityLevel; label: string; body: string }[] = [
  { key: 'low', label: 'Lightly active', body: 'Mostly sitting, occasional walks' },
  { key: 'moderate', label: 'Moderately active', body: 'Exercise 3–4 days a week' },
  { key: 'high', label: 'Very active', body: 'Training most days' },
];
const diets: DietPreference[] = ['Everything', 'Vegetarian', 'Vegan', 'High protein'];
const ONBOARDING_STEPS = 7;

type IllustrationScene = 'welcome' | 'goal' | 'basics' | 'metrics' | 'activity' | 'food' | 'review';

const photoScenes: Record<IllustrationScene, {
  image: number;
  eyebrow: string;
  title: string;
  detail: string;
}> = {
  welcome: { image: require('../assets/images/calora-home-header.jpg'), eyebrow: 'A CALMER START', title: 'Food that fits real life', detail: 'Flexible support, one day at a time' },
  goal: { image: require('../assets/images/meals/harvest-salad.jpg'), eyebrow: 'YOUR DIRECTION', title: 'Start with what matters', detail: 'Progress can look different for everyone' },
  basics: { image: require('../assets/images/foods/chicken-rice-bowl.jpg'), eyebrow: 'YOUR RHYTHM', title: 'A plan shaped around you', detail: 'The details stay editable' },
  metrics: { image: require('../assets/images/meals/salmon-quinoa.jpg'), eyebrow: 'A HELPFUL ESTIMATE', title: 'A useful starting point', detail: 'Numbers with context, never judgment' },
  activity: { image: require('../assets/images/foods/avocado-toast.jpg'), eyebrow: 'YOUR WEEK', title: 'Built for everyday movement', detail: 'Choose what feels most like you' },
  food: { image: require('../assets/images/meals/chickpea-bowl.jpg'), eyebrow: 'YOUR TASTE', title: 'Meals you will want to return to', detail: 'Small preferences make ideas more useful' },
  review: { image: require('../assets/images/meals/berry-oats.jpg'), eyebrow: 'READY WHEN YOU ARE', title: 'A gentler first day', detail: 'One meal never defines your day' },
};

function OnboardingPhotoHero({
  scene,
  colors,
}: {
  scene: IllustrationScene;
  colors: ReturnType<typeof useCalora>['colors'];
}) {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const details = photoScenes[scene];

  React.useEffect(() => {
    if (reducedMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(drift);
  }, [drift, reducedMotion]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }],
  }));

  return (
    <View style={[styles.photoHero, { backgroundColor: colors.hero }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, floatingStyle]}>
        <Image accessibilityIgnoresInvertColors contentFit="cover" source={details.image} style={StyleSheet.absoluteFillObject} transition={240} />
      </Animated.View>
      <LinearGradient
        colors={['rgba(9, 27, 20, 0.06)', 'rgba(9, 27, 20, 0.78)']}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.photoHeroCopy}>
        <Text style={styles.photoHeroEyebrow}>{details.eyebrow}</Text>
        <Text style={styles.photoHeroTitle}>{details.title}</Text>
        <Text style={styles.photoHeroDetail}>{details.detail}</Text>
      </View>
      <View style={[styles.photoHeroBadge, { backgroundColor: colors.card }]}>
        <Feather name="heart" size={14} color={colors.primary} />
        <Text style={[styles.photoHeroBadgeText, { color: colors.foreground }]}>Made to adapt</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { signOut } = useAuth();
  const {
    colors,
    onboardingComplete,
    onboardingStep,
    onboardingDraft,
    setOnboardingStep,
    setOnboardingDraft,
    profile: existingProfile,
    hydrated,
    profileSyncReady,
    profileSyncError,
    retryProfileSync,
    hydrationError,
    hydrationErrorKind,
    retryHydration,
    isRetrying,
    clearAllData,
    exportRawStorageData,
    completeOnboarding,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isReviewMode = mode === 'review' && onboardingComplete && !!existingProfile;
  const [step, setStep] = useState(() => onboardingStep);
  const [goal, setGoal] = useState<Goal>(() => existingProfile?.goal ?? 'lose');
  const [activity, setActivity] = useState<ActivityLevel>(() => existingProfile?.activity ?? 'moderate');
  const [diet, setDiet] = useState<DietPreference>(() => existingProfile?.diet ?? 'Everything');
  const [name, setName] = useState(() => existingProfile?.name ?? '');
  const [age, setAge] = useState(() => String(existingProfile?.age ?? 31));
  const [height, setHeight] = useState(() => String(Math.round(existingProfile?.heightCm ?? 172)));
  const [weight, setWeight] = useState(() => String(Math.round(existingProfile?.weightKg ?? 76)));
  const [targetWeight, setTargetWeight] = useState(() => String(Math.round(existingProfile?.targetWeightKg ?? 68)));
  // A completed onboarding flow has already accepted this review step. Keep it
  // selected in review mode, while a first-run flow still requires the tap.
  const [consent, setConsent] = useState(isReviewMode);
  const [personalDetailsError, setPersonalDetailsError] = useState('');
  const reviewSeededRef = useRef(false);
  const stepSeededRef = useRef(false);
  const draftSeededRef = useRef(false);

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);
    if (!isReviewMode) setOnboardingStep(nextStep);
  };

  useEffect(() => {
    if (!hydrated || stepSeededRef.current) return;
    stepSeededRef.current = true;
    const savedStep = isReviewMode ? 0 : onboardingStep;
    setStep(savedStep);
  }, [hydrated, isReviewMode, onboardingStep]);

  // An incomplete setup has no Profile yet. Restore its raw draft separately
  // so reopening at a later step never replaces typed answers with defaults.
  useEffect(() => {
    if (!hydrated || isReviewMode || draftSeededRef.current) return;
    draftSeededRef.current = true;
    if (!onboardingDraft) return;
    setGoal(onboardingDraft.goal);
    setActivity(onboardingDraft.activity);
    setDiet(onboardingDraft.diet);
    setName(onboardingDraft.name);
    setAge(onboardingDraft.age);
    setHeight(onboardingDraft.height);
    setWeight(onboardingDraft.weight);
    setTargetWeight(onboardingDraft.targetWeight);
    setConsent(onboardingDraft.consent);
  }, [hydrated, isReviewMode, onboardingDraft]);

  useEffect(() => {
    if (!hydrated || isReviewMode || onboardingComplete || !draftSeededRef.current) return;
    const draft: OnboardingDraft = {
      goal, activity, diet, name, age, height, weight, targetWeight, consent,
    };
    setOnboardingDraft(draft);
  }, [activity, age, consent, diet, goal, height, hydrated, isReviewMode, name, onboardingComplete, setOnboardingDraft, targetWeight, weight]);

  // Hydration can finish after this route first mounts. Seed review fields once
  // at that boundary so the review form never replaces saved values with the
  // first-run defaults.
  useEffect(() => {
    if (!hydrated || !isReviewMode || reviewSeededRef.current || !existingProfile) return;
    reviewSeededRef.current = true;
    setGoal(existingProfile.goal);
    setActivity(existingProfile.activity);
    setDiet(existingProfile.diet);
    setName(existingProfile.name);
    setAge(String(existingProfile.age));
    setHeight(String(Math.round(existingProfile.heightCm)));
    setWeight(String(Math.round(existingProfile.weightKg)));
    setTargetWeight(String(Math.round(existingProfile.targetWeightKg)));
    setConsent(true);
  }, [existingProfile, hydrated, isReviewMode]);

  const validatedPersonalDetails = useMemo(() => validatePersonalDetails({
    age, height, weight, targetWeight, activity, diet, goal,
  }, 'metric'), [activity, age, diet, goal, height, targetWeight, weight]);
  const calorieTarget = useMemo(
    () => validatedPersonalDetails.ok && validatedPersonalDetails.values.age >= MINIMUM_COMMERCIAL_AGE
      ? recommendCalories({
          weightKg: validatedPersonalDetails.values.weightKg,
          activity,
          goal,
        })
      : null,
    [activity, goal, validatedPersonalDetails],
  );

  const finish = async () => {
    const validation = validatePersonalDetails({
      age, height, weight, targetWeight, activity, diet, goal,
    }, 'metric');
    if (!validation.ok) {
      setPersonalDetailsError(validation.message);
      moveToStep(2);
      return;
    }
    const profile: Profile = {
      name: name.trim() || 'Alex Morgan',
      ...validation.values,
      calorieTarget: validation.values.age >= MINIMUM_COMMERCIAL_AGE ? recommendCalories({
        weightKg: validation.values.weightKg,
        activity: validation.values.activity,
        goal: validation.values.goal,
      }) : 2000,
      targetMode: validation.values.age >= MINIMUM_COMMERCIAL_AGE ? 'automatic' : 'custom',
    };
    try {
      await completeOnboarding(profile, consent);
      if (isReviewMode) router.replace('/(tabs)/profile');
    } catch {
      Alert.alert(
        'Couldn’t save your setup',
        'Your setup is still open. Check your device storage and try again before leaving this screen.',
      );
    }
  };

  const next = () => {
    if (step === 3) {
      if (!validatedPersonalDetails.ok) {
        setPersonalDetailsError(validatedPersonalDetails.message);
        return;
      }
      setPersonalDetailsError('');
    }
    moveToStep(Math.min(step + 1, ONBOARDING_STEPS - 1));
  };
  const isFinalStep = step === ONBOARDING_STEPS - 1;
  const keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

  // Show generic loading only on the initial read — not during a retry, where
  // the error screen (with its spinner button) should remain visible instead.
  if ((!hydrated || !profileSyncReady) && !isRetrying && !profileSyncError) {
    return (
      <View style={[styles.loadingPage, { backgroundColor: colors.background }]}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Feather name="sun" size={18} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.loadingBrand, { color: colors.foreground }]}>{BRAND.name}</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your data…</Text>
      </View>
    );
  }

  // Show error screen when there is an active error OR while a retry read is
  // in flight (isRetrying keeps the screen mounted with previous error context
  // so the spinner on 'Try Again' is visible for the full retry duration).
  if (hydrationError || isRetrying) {
    const { showExport, showTryAgain, showClearAll } = deriveErrorScreenActions(hydrationErrorKind);
    const isParseError = hydrationErrorKind === 'parse';
    return (
      <View style={[styles.loadingPage, { backgroundColor: colors.background, paddingHorizontal: 28 }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.muted }]}>
          <Feather name={isParseError ? 'alert-triangle' : 'refresh-cw'} size={20} color={isParseError ? colors.destructive : colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          {isParseError ? 'Your data can’t be read.' : 'Storage is unavailable.'}
        </Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{hydrationError}</Text>
        {showExport && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export encrypted recovery data"
            onPress={() => handleParseErrorExport({
              exportRawStorageData,
              share: Share.share.bind(Share),
              alert: Alert.alert.bind(Alert),
            })}
            style={[styles.exportButton, { backgroundColor: colors.muted }]}
          >
            <Feather name="share" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
            <Text style={[styles.exportButtonText, { color: colors.mutedForeground }]}>Export encrypted recovery data</Text>
          </Pressable>
        )}
        {(showTryAgain || isRetrying) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading local data"
            accessibilityState={{ disabled: isRetrying }}
            disabled={isRetrying}
            onPress={retryHydration}
            style={[styles.retryButton, { backgroundColor: isRetrying ? colors.muted : colors.primary }]}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Try again</Text>
            )}
          </Pressable>
        )}
        {showClearAll && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all data and start fresh"
            onPress={() => {
              Alert.alert(
                'Clear all data?',
                'This will permanently delete all your logs, meals, profile, and settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear everything',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const outcome = await completeDeviceLocalReset(clearAllData, signOut);
                        if (outcome.signOutError) {
                          Alert.alert(
                            'Data cleared, sign-out needs attention',
                            'Your core local data was deleted, but this device could not finish signing out. Please try again before continuing so an empty local profile cannot overwrite your account.',
                          );
                          return;
                        }
                        if (outcome.cleanupFailures.length > 0) {
                          Alert.alert(
                            'Core data cleared',
                            `Your profile, logs, meals, and settings were deleted. Some device cleanup still needs attention: ${outcome.cleanupFailures.join(', ')}.`,
                          );
                        }
                        retryHydration();
                      } catch {
                        Alert.alert(
                          'Clear failed',
                          'Your core local data could not be deleted. Nothing was cleared. Please try again.',
                        );
                      }
                    },
                  },
                ],
              );
            }}
            style={styles.clearButton}
          >
            <Text style={[styles.clearButtonText, { color: colors.destructive }]}>Clear all data and start fresh</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!profileSyncReady) {
    return (
      <View style={[styles.loadingPage, { backgroundColor: colors.background, paddingHorizontal: 28 }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.muted }]}>
          <Feather name="cloud-off" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Your setup is still loading.</Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          {profileSyncError ?? 'Checking your account setup…'}
        </Text>
        {profileSyncError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry account setup"
            onPress={retryProfileSync}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Try again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        testID="onboarding-keyboard-safe-scroll"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 32 }]}
        bottomOffset={insets.bottom + 72}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
      >
         <View style={styles.progressRow}>
          <View style={styles.brandMark}><Feather name="sun" size={18} color={colors.primaryForeground} /></View>
          <Text style={[styles.brand, { color: colors.foreground }]}>{BRAND.name}</Text>
           <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step + 1} of {ONBOARDING_STEPS}</Text>
        </View>
         <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><Animated.View entering={reducedMotion ? undefined : FadeInRight.duration(280)} style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / ONBOARDING_STEPS) * 100}%` }]} /></View>

         <Animated.View key={`onboarding-step-${step}`} entering={reducedMotion ? undefined : FadeInRight.duration(220)} exiting={reducedMotion ? undefined : FadeOutLeft.duration(140)}>
         {step === 0 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Start with the life you already live.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>A thoughtful setup takes a moment. Every choice can change with you.</Text>
             <OnboardingPhotoHero scene="welcome" colors={colors} />
            <View style={[styles.welcomeCard, { backgroundColor: colors.hero }]}>
              <View style={[styles.welcomeIcon, { backgroundColor: 'rgba(157,215,189,0.16)' }]}><Feather name="shield" size={22} color={colors.heroMuted} /></View>
               <Text style={[styles.welcomeTitle, { color: colors.onHero }]}>Your routine, your pace.</Text>
               <Text style={[styles.welcomeBody, { color: colors.heroMuted }]}>Start with a flexible goal. Review estimates before you save them.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign in to restore an existing Calora account" onPress={() => router.push('/auth/sign-in' as any)} style={styles.accountRestoreLink}>
              <Text style={[styles.accountRestoreText, { color: colors.mutedForeground }]}>Already have a Calora account?</Text>
              <Text style={[styles.accountRestoreAction, { color: colors.primary }]}> Sign in to restore it</Text>
            </Pressable>
            <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>No ads. No shame. No medical advice.</Text>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>What would feel useful right now?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Choose a starting direction. You can edit it anytime.</Text>
            <OnboardingPhotoHero scene="goal" colors={colors} />
            <View style={styles.optionList}>{goals.map((item) => {
              const selected = goal === item.key;
              return <Pressable key={item.key} onPress={() => setGoal(item.key)} style={[styles.option, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                <View style={[styles.optionIcon, { backgroundColor: selected ? colors.primary : colors.muted }]}><Feather name={item.icon} size={18} color={selected ? colors.primaryForeground : colors.mutedForeground} /></View>
                <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
                <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? colors.primary : colors.mutedForeground} />
              </Pressable>;
            })}</View>
          </View>
        )}

         {step === 2 && (
           <View>
             <Text style={[styles.title, { color: colors.foreground }]}>Let’s make this feel like yours.</Text>
             <Text style={[styles.body, { color: colors.mutedForeground }]}>A few basics help Calora personalize your starting plan. You stay in control.</Text>
             <OnboardingPhotoHero scene="basics" colors={colors} />
              <View style={styles.formGrid}>
                <View style={styles.fullField}><Text style={[styles.label, { color: colors.mutedForeground }]}>What should we call you?</Text><TextInput testID="onboarding-name-input" accessibilityLabel="Your name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>
                <View style={styles.fullField}><Text style={[styles.label, { color: colors.mutedForeground }]}>Age</Text><TextInput testID="onboarding-age-input" accessibilityLabel="Age" value={age} onChangeText={(nextValue) => { setAge(normalizeWholeNumberInput(nextValue)); if (personalDetailsError) setPersonalDetailsError(''); }} keyboardType="number-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>
             </View>
           </View>
         )}

         {step === 3 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Set a helpful starting point.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>These details shape a starting estimate, not a medical recommendation.</Text>
             <OnboardingPhotoHero scene="metrics" colors={colors} />
             <View style={styles.formGrid}>
                {[['Height (cm)', height, setHeight, 'onboarding-height-input'], ['Current weight (kg)', weight, setWeight, 'onboarding-weight-input'], ['Goal weight (kg)', targetWeight, setTargetWeight, 'onboarding-target-weight-input']].map(([label, value, setter, testID]) => <View key={label as string} style={styles.halfField}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput testID={testID as string} accessibilityLabel={label as string} value={value as string} onChangeText={(nextValue) => { (setter as (value: string) => void)(normalizeWholeNumberInput(nextValue)); if (personalDetailsError) setPersonalDetailsError(''); }} keyboardType="number-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: personalDetailsError ? colors.destructive : colors.input }]} /></View>)}
            </View>
             {!!personalDetailsError && <Text accessibilityRole="alert" style={[styles.personalDetailsError, { color: colors.destructive }]}>{personalDetailsError}</Text>}
             <View style={[styles.targetPreview, { backgroundColor: colors.accent }]}><Feather name="target" size={18} color={colors.accentForeground} /><Text style={[styles.targetText, { color: colors.accentForeground }]}>{calorieTarget === null ? 'Enter valid details to see your starting target.' : <>Starting target: <Text style={styles.targetBold}>{formatWhole(calorieTarget)} kcal/day</Text></>}</Text></View>
          </View>
        )}

         {step === 4 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>What does your usual week feel like?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>This only adjusts your first estimate. It is not a score.</Text>
             <OnboardingPhotoHero scene="activity" colors={colors} />
            <View style={styles.optionList}>{activities.map((item) => {
              const selected = activity === item.key;
              return <Pressable key={item.key} onPress={() => setActivity(item.key)} style={[styles.option, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
                <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? colors.primary : colors.mutedForeground} />
              </Pressable>;
             })}</View>
          </View>
        )}

         {step === 5 && (
           <View>
             <Text style={[styles.title, { color: colors.foreground }]}>What kinds of meals suit you?</Text>
             <Text style={[styles.body, { color: colors.mutedForeground }]}>We will use this to keep ideas closer to your taste. You can refine it later.</Text>
             <OnboardingPhotoHero scene="food" colors={colors} />
             <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 22, marginBottom: 9 }]}>Food preference</Text>
             <View style={styles.chipRow}>{diets.map((item) => <Pressable key={item} onPress={() => setDiet(item)} style={[styles.chip, { backgroundColor: diet === item ? colors.primary : colors.card, borderColor: diet === item ? colors.primary : colors.border }]}><Text style={[styles.chipText, { color: diet === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
           </View>
         )}

         {step === 6 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Here is your starting plan.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{BRAND.name} is a wellness tool, not a doctor. Your data can be exported or deleted from Settings.</Text>
             <OnboardingPhotoHero scene="review" colors={colors} />
             <Pressable
               testID="onboarding-consent"
               accessibilityRole="checkbox"
               accessibilityState={{ checked: consent }}
               accessibilityLabel="Required agreement: I understand and agree"
               accessibilityHint={consent ? 'Required agreement accepted. Tap to withdraw consent.' : 'Required agreement. Tap to agree before entering Calora.'}
               onPress={() => setConsent((current) => !current)}
               style={[styles.consentCard, { backgroundColor: consent ? colors.accent : colors.card, borderColor: consent ? colors.primary : colors.border }]}
             >
               <View style={[styles.consentCheck, { backgroundColor: consent ? colors.primary : colors.muted }]}><Feather name={consent ? 'check' : 'circle'} size={17} color={consent ? colors.primaryForeground : colors.mutedForeground} /></View>
               <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>Required agreement</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{consent ? 'Agreed. ' : 'Tap to agree. '}I’ll review AI estimates before logging them and understand calorie targets are starting estimates.</Text></View>
            </Pressable>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryCalories, { color: colors.foreground }]}>{calorieTarget === null ? 'Custom' : formatWhole(calorieTarget)} {calorieTarget !== null && <Text style={[styles.summaryUnit, { color: colors.mutedForeground }]}>kcal/day</Text>}</Text>
              <Text style={[styles.summaryBody, { color: colors.mutedForeground }]}>{calorieTarget === null ? 'Set targets with a parent, guardian, or qualified professional' : `${goal === 'lose' ? 'A gentle deficit' : goal === 'gain' ? 'A supportive surplus' : 'A steady maintenance target'} · ${diet}`}</Text>
            </View>
          </View>
        )}
         </Animated.View>

        <View style={styles.bottomActions}>
           {step > 0 && <Pressable onPress={() => moveToStep(step - 1)} style={styles.backButton}><Feather name="arrow-left" size={18} color={colors.mutedForeground} /><Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text></Pressable>}
            <Pressable testID={isFinalStep ? 'onboarding-finish' : 'onboarding-continue'} accessibilityRole="button" accessibilityLabel={isFinalStep ? `Enter ${BRAND.name}` : 'Continue onboarding'} accessibilityState={{ disabled: isFinalStep && !consent }} disabled={isFinalStep && !consent} onPress={isFinalStep ? finish : next} style={[styles.continueButton, { backgroundColor: isFinalStep && !consent ? colors.muted : colors.primary }]}><Text style={[styles.continueText, { color: isFinalStep && !consent ? colors.mutedForeground : colors.primaryForeground }]}>{isFinalStep ? `Enter ${BRAND.name}` : 'Continue'}</Text><Feather name="arrow-right" size={17} color={isFinalStep && !consent ? colors.mutedForeground : colors.primaryForeground} /></Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBrand: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, marginTop: 10 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 9 },
  errorIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, textAlign: 'center' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 310, textAlign: 'center' },
  retryButton: { borderRadius: 14, minWidth: 150, paddingHorizontal: 22, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  retryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  exportButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16 },
  exportButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  clearButton: { paddingHorizontal: 16, paddingVertical: 12, marginTop: 6, alignItems: 'center' },
  clearButtonText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  content: { paddingHorizontal: 22, flexGrow: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brandMark: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef6b4f' },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4, marginLeft: 8 },
  stepText: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 'auto' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 34 },
  progressFill: { height: 5, borderRadius: 3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 36, letterSpacing: -1, maxWidth: 340 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 340 },
  photoHero: { height: 224, borderRadius: 26, overflow: 'hidden', marginTop: 24, marginBottom: 22, position: 'relative', justifyContent: 'flex-end' },
  photoHeroCopy: { paddingHorizontal: 18, paddingBottom: 18, paddingRight: 28 },
  photoHeroEyebrow: { color: '#f6fbf6', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  photoHeroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 21, lineHeight: 25, letterSpacing: -0.45, marginTop: 5 },
  photoHeroDetail: { color: 'rgba(255,255,255,0.84)', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 5 },
  photoHeroBadge: { position: 'absolute', alignItems: 'center', flexDirection: 'row', gap: 6, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8, right: 12, top: 13, shadowColor: '#07160e', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  photoHeroBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  welcomeCard: { borderRadius: 24, padding: 20, marginTop: 38 },
  welcomeIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginBottom: 8 },
  welcomeBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  accountRestoreLink: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 17, minHeight: 32, paddingHorizontal: 8, paddingVertical: 5 },
  accountRestoreText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  accountRestoreAction: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  smallNote: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: 16 },
  optionList: { gap: 10, marginTop: 28 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 14 },
  optionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  optionBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 27 },
  fullField: { width: '100%' },
  halfField: { width: '48%' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginBottom: 7 },
  input: { height: 47, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  targetPreview: { flexDirection: 'row', gap: 9, alignItems: 'center', borderRadius: 14, padding: 13, marginTop: 18 },
  targetText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  targetBold: { fontFamily: 'Inter_700Bold' },
  personalDetailsError: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  consentCard: { flexDirection: 'row', gap: 11, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 14, marginTop: 27 },
  consentCheck: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 18, marginTop: 16 },
  summaryCalories: { fontFamily: 'Inter_700Bold', fontSize: 29, marginTop: 8 },
  summaryUnit: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  summaryBody: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 40, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 4 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  continueButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 15, paddingVertical: 15 },
  continueText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});
