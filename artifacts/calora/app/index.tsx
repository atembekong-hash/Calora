import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
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
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCalora, ActivityLevel, DietPreference, Goal, Profile } from '@/context/CaloraContext';
import { BRAND } from '@/lib/brand';
import { formatWhole } from '@/lib/formatters';
import { handleParseErrorExport } from '@/lib/parseErrorExportHandler';
import { deriveErrorScreenActions } from '@/lib/errorScreenActions';
import { recommendCalories } from '@/lib/calorieRecommendation';
import { validatePersonalDetails } from '@/lib/profileTargets';

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

const illustrationScenes: Record<IllustrationScene, {
  icon: keyof typeof Feather.glyphMap;
  eyebrow: string;
  title: string;
  secondaryIcon: keyof typeof Feather.glyphMap;
  secondaryLabel: string;
}> = {
  welcome: { icon: 'sunrise', eyebrow: 'A calmer way to track', title: 'Your day, in focus', secondaryIcon: 'shield', secondaryLabel: 'Private by default' },
  goal: { icon: 'target', eyebrow: 'Your direction', title: 'Progress with purpose', secondaryIcon: 'trending-down', secondaryLabel: 'Small steps count' },
  basics: { icon: 'user', eyebrow: 'Make it yours', title: 'A plan that knows you', secondaryIcon: 'edit-3', secondaryLabel: 'Change anytime' },
  metrics: { icon: 'sliders', eyebrow: 'Your starting point', title: 'Numbers, made useful', secondaryIcon: 'bar-chart-2', secondaryLabel: 'A clear baseline' },
  activity: { icon: 'activity', eyebrow: 'Your rhythm', title: 'Built around real life', secondaryIcon: 'zap', secondaryLabel: 'Flexible guidance' },
  food: { icon: 'coffee', eyebrow: 'Your preferences', title: 'More you, less noise', secondaryIcon: 'heart', secondaryLabel: 'Personalized ideas' },
  review: { icon: 'check-circle', eyebrow: 'Ready when you are', title: 'A thoughtful first day', secondaryIcon: 'lock', secondaryLabel: 'You stay in control' },
};

function OnboardingIllustration({
  scene,
  colors,
}: {
  scene: IllustrationScene;
  colors: ReturnType<typeof useCalora>['colors'];
}) {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const details = illustrationScenes[scene];

  React.useEffect(() => {
    if (reducedMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
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
    <View style={[styles.illustration, { backgroundColor: colors.hero }]}>
      <LinearGradient
        colors={[colors.hero, colors.primary]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.illustrationOrb, { backgroundColor: colors.accent }]} />
      <Animated.View style={[styles.illustrationMainCard, { backgroundColor: colors.card, borderColor: colors.border }, floatingStyle]}>
        <View style={[styles.illustrationIcon, { backgroundColor: colors.accent }]}>
          <Feather name={details.icon} size={24} color={colors.primary} />
        </View>
        <Text style={[styles.illustrationEyebrow, { color: colors.mutedForeground }]}>{details.eyebrow}</Text>
        <Text style={[styles.illustrationTitle, { color: colors.foreground }]}>{details.title}</Text>
        <View style={styles.illustrationBars}>
          <View style={[styles.illustrationBar, styles.illustrationBarLong, { backgroundColor: colors.primary }]} />
          <View style={[styles.illustrationBar, styles.illustrationBarShort, { backgroundColor: colors.accent }]} />
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(140).springify().damping(16)} style={[styles.illustrationBadge, styles.illustrationBadgeTop, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={details.secondaryIcon} size={14} color={colors.primary} />
        <Text style={[styles.illustrationBadgeText, { color: colors.foreground }]}>{details.secondaryLabel}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(240).springify().damping(16)} style={[styles.illustrationBadge, styles.illustrationBadgeBottom, { backgroundColor: colors.accent }]}>
        <View style={[styles.illustrationDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.illustrationBadgeText, { color: colors.accentForeground }]}>Made for today</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const {
    colors,
    onboardingComplete,
    onboardingStep,
    setOnboardingStep,
    profile: existingProfile,
    hydrated,
    hydrationError,
    hydrationErrorKind,
    retryHydration,
    isRetrying,
    clearAllData,
    exportRawStorageData,
    completeOnboarding,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const isReviewMode = mode === 'review' && onboardingComplete && !!existingProfile;
  const [step, setStep] = useState(() => onboardingStep);
  const [goal, setGoal] = useState<Goal>(() => existingProfile?.goal ?? 'lose');
  const [activity, setActivity] = useState<ActivityLevel>(() => existingProfile?.activity ?? 'moderate');
  const [diet, setDiet] = useState<DietPreference>(() => existingProfile?.diet ?? 'Everything');
  const [name, setName] = useState(() => existingProfile?.name ?? '');
  const [age, setAge] = useState(() => String(existingProfile?.age ?? 31));
  const [height, setHeight] = useState(() => String(existingProfile?.heightCm ?? 172));
  const [weight, setWeight] = useState(() => String(existingProfile?.weightKg ?? 76));
  const [targetWeight, setTargetWeight] = useState(() => String(existingProfile?.targetWeightKg ?? 68));
  // A completed onboarding flow has already accepted this review step. Keep it
  // selected in review mode, while a first-run flow still requires the tap.
  const [consent, setConsent] = useState(isReviewMode);
  const [personalDetailsError, setPersonalDetailsError] = useState('');
  const reviewSeededRef = useRef(false);
  const stepSeededRef = useRef(false);

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
    setHeight(String(existingProfile.heightCm));
    setWeight(String(existingProfile.weightKg));
    setTargetWeight(String(existingProfile.targetWeightKg));
    setConsent(true);
  }, [existingProfile, hydrated, isReviewMode]);

  const validatedPersonalDetails = useMemo(() => validatePersonalDetails({
    age, height, weight, targetWeight, activity, diet, goal,
  }, 'metric'), [activity, age, diet, goal, height, targetWeight, weight]);
  const calorieTarget = useMemo(
    () => validatedPersonalDetails.ok
      ? recommendCalories({
          weightKg: validatedPersonalDetails.values.weightKg,
          activity,
          goal,
        })
      : null,
    [activity, goal, validatedPersonalDetails],
  );

  const finish = () => {
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
      calorieTarget: recommendCalories({
        weightKg: validation.values.weightKg,
        activity: validation.values.activity,
        goal: validation.values.goal,
      }),
      targetMode: 'automatic',
    };
    completeOnboarding(profile, consent);
    if (isReviewMode) router.replace('/(tabs)/profile');
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

  // Show generic loading only on the initial read — not during a retry, where
  // the error screen (with its spinner button) should remain visible instead.
  if (!hydrated && !isRetrying) {
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
                        await clearAllData();
                        retryHydration();
                      } catch {
                        Alert.alert(
                          'Clear failed',
                          'Your local data was not fully deleted. Nothing else was changed. Please try again.',
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

  if (onboardingComplete && !isReviewMode) return <Redirect href="/(tabs)" />;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
         <View style={styles.progressRow}>
          <View style={styles.brandMark}><Feather name="sun" size={18} color={colors.primaryForeground} /></View>
          <Text style={[styles.brand, { color: colors.foreground }]}>{BRAND.name}</Text>
           <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step + 1} of {ONBOARDING_STEPS}</Text>
        </View>
         <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><Animated.View entering={FadeInRight.duration(280)} style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / ONBOARDING_STEPS) * 100}%` }]} /></View>

         <Animated.View key={`onboarding-step-${step}`} entering={FadeInRight.springify().damping(18).stiffness(150)} exiting={FadeOutLeft.duration(140)}>
         {step === 0 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Food tracking, made simpler.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Set your goal and get a plan that fits your day.</Text>
             <OnboardingIllustration scene="welcome" colors={colors} />
            <View style={[styles.welcomeCard, { backgroundColor: colors.hero }]}>
              <View style={[styles.welcomeIcon, { backgroundColor: 'rgba(157,215,189,0.16)' }]}><Feather name="shield" size={22} color={colors.heroMuted} /></View>
               <Text style={[styles.welcomeTitle, { color: colors.onHero }]}>Clear food data.</Text>
               <Text style={[styles.welcomeBody, { color: colors.heroMuted }]}>See where numbers come from. Review estimates before you log them.</Text>
            </View>
            <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>No ads. No shame. No medical advice.</Text>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>What’s your goal?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>You can change it anytime.</Text>
            <OnboardingIllustration scene="goal" colors={colors} />
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
             <Text style={[styles.title, { color: colors.foreground }]}>Let’s make this personal.</Text>
             <Text style={[styles.body, { color: colors.mutedForeground }]}>A few basics help Calora speak to you, not at you.</Text>
             <OnboardingIllustration scene="basics" colors={colors} />
             <View style={styles.formGrid}>
               <View style={styles.fullField}><Text style={[styles.label, { color: colors.mutedForeground }]}>What should we call you?</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>
               <View style={styles.fullField}><Text style={[styles.label, { color: colors.mutedForeground }]}>Age</Text><TextInput value={age} onChangeText={(nextValue) => { setAge(nextValue); if (personalDetailsError) setPersonalDetailsError(''); }} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>
             </View>
           </View>
         )}

         {step === 3 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Set your starting target.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>These details create a starting estimate, not a medical recommendation.</Text>
             <OnboardingIllustration scene="metrics" colors={colors} />
            <View style={styles.formGrid}>
               {[['Height (cm)', height, setHeight], ['Current weight (kg)', weight, setWeight], ['Goal weight (kg)', targetWeight, setTargetWeight]].map(([label, value, setter]) => <View key={label as string} style={styles.halfField}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput value={value as string} onChangeText={(nextValue) => { (setter as (value: string) => void)(nextValue); if (personalDetailsError) setPersonalDetailsError(''); }} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: personalDetailsError ? colors.destructive : colors.input }]} /></View>)}
            </View>
             {!!personalDetailsError && <Text accessibilityRole="alert" style={[styles.personalDetailsError, { color: colors.destructive }]}>{personalDetailsError}</Text>}
             <View style={[styles.targetPreview, { backgroundColor: colors.accent }]}><Feather name="target" size={18} color={colors.accentForeground} /><Text style={[styles.targetText, { color: colors.accentForeground }]}>{calorieTarget === null ? 'Enter valid details to see your starting target.' : <>Starting target: <Text style={styles.targetBold}>{formatWhole(calorieTarget)} kcal/day</Text></>}</Text></View>
          </View>
        )}

         {step === 4 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>How active are you?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>This helps make your first estimate more useful.</Text>
             <OnboardingIllustration scene="activity" colors={colors} />
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
             <Text style={[styles.title, { color: colors.foreground }]}>What sounds good to you?</Text>
             <Text style={[styles.body, { color: colors.mutedForeground }]}>We’ll use this to keep suggestions closer to your taste.</Text>
             <OnboardingIllustration scene="food" colors={colors} />
             <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 22, marginBottom: 9 }]}>Food preference</Text>
             <View style={styles.chipRow}>{diets.map((item) => <Pressable key={item} onPress={() => setDiet(item)} style={[styles.chip, { backgroundColor: diet === item ? colors.primary : colors.card, borderColor: diet === item ? colors.primary : colors.border }]}><Text style={[styles.chipText, { color: diet === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
           </View>
         )}

         {step === 6 && (
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Review before you start.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{BRAND.name} is a wellness tool, not a doctor. Your data stays local in this preview and can be exported or deleted from settings.</Text>
             <OnboardingIllustration scene="review" colors={colors} />
            <Pressable onPress={() => setConsent(!consent)} style={[styles.consentCard, { backgroundColor: consent ? colors.accent : colors.card, borderColor: consent ? colors.primary : colors.border }]}>
              <View style={[styles.consentCheck, { backgroundColor: consent ? colors.primary : colors.muted }]}><Feather name={consent ? 'check' : 'shield'} size={17} color={consent ? colors.primaryForeground : colors.mutedForeground} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>I understand and agree</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>I’ll review AI estimates before logging them and understand calorie targets are starting estimates.</Text></View>
            </Pressable>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryCalories, { color: colors.foreground }]}>{formatWhole(calorieTarget)} <Text style={[styles.summaryUnit, { color: colors.mutedForeground }]}>kcal/day</Text></Text>
              <Text style={[styles.summaryBody, { color: colors.mutedForeground }]}>{goal === 'lose' ? 'A gentle deficit' : goal === 'gain' ? 'A supportive surplus' : 'A steady maintenance target'} · {diet}</Text>
            </View>
          </View>
        )}
         </Animated.View>

        <View style={styles.bottomActions}>
           {step > 0 && <Pressable onPress={() => moveToStep(step - 1)} style={styles.backButton}><Feather name="arrow-left" size={18} color={colors.mutedForeground} /><Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text></Pressable>}
           <Pressable disabled={step === ONBOARDING_STEPS - 1 && !consent} onPress={step === ONBOARDING_STEPS - 1 ? finish : next} style={[styles.continueButton, { backgroundColor: step === ONBOARDING_STEPS - 1 && !consent ? colors.muted : colors.primary }]}><Text style={[styles.continueText, { color: step === ONBOARDING_STEPS - 1 && !consent ? colors.mutedForeground : colors.primaryForeground }]}>{step === ONBOARDING_STEPS - 1 ? `Enter ${BRAND.name}` : 'Continue'}</Text><Feather name="arrow-right" size={17} color={step === ONBOARDING_STEPS - 1 && !consent ? colors.mutedForeground : colors.primaryForeground} /></Pressable>
        </View>
      </ScrollView>
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
  illustration: { height: 188, borderRadius: 24, overflow: 'hidden', marginTop: 24, marginBottom: 22, position: 'relative' },
  illustrationOrb: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -36, top: -52, opacity: 0.28 },
  illustrationMainCard: { position: 'absolute', width: 194, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, left: 34, top: 24, shadowColor: '#07160e', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  illustrationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  illustrationEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  illustrationTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.3, marginTop: 4 },
  illustrationBars: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 16 },
  illustrationBar: { height: 6, borderRadius: 4 },
  illustrationBarLong: { width: 74 },
  illustrationBarShort: { width: 30 },
  illustrationBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, shadowColor: '#07160e', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  illustrationBadgeTop: { right: 12, top: 17 },
  illustrationBadgeBottom: { left: 14, bottom: 16 },
  illustrationBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  illustrationDot: { width: 7, height: 7, borderRadius: 4 },
  welcomeCard: { borderRadius: 24, padding: 20, marginTop: 38 },
  welcomeIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginBottom: 8 },
  welcomeBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
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