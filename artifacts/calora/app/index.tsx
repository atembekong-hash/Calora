import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCalora, ActivityLevel, DietPreference, Goal, Profile } from '@/context/CaloraContext';

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

export default function OnboardingScreen() {
  const { colors, onboardingComplete, completeOnboarding } = useCalora();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('lose');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [diet, setDiet] = useState<DietPreference>('Everything');
  const [name, setName] = useState('');
  const [age, setAge] = useState('31');
  const [height, setHeight] = useState('172');
  const [weight, setWeight] = useState('76');
  const [targetWeight, setTargetWeight] = useState('68');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (onboardingComplete) router.replace('/(tabs)');
  }, [onboardingComplete]);

  const calorieTarget = useMemo(() => {
    const weightNumber = Number(weight) || 76;
    const base = 10 * weightNumber + 900;
    const activityMultiplier = activity === 'low' ? 1.25 : activity === 'high' ? 1.55 : 1.4;
    const adjustment = goal === 'lose' ? -250 : goal === 'gain' ? 250 : 0;
    return Math.round((base * activityMultiplier + adjustment) / 50) * 50;
  }, [activity, goal, weight]);

  const finish = () => {
    const profile: Profile = {
      name: name.trim() || 'Alex Morgan',
      goal,
      activity,
      diet,
      heightCm: Number(height) || 172,
      weightKg: Number(weight) || 76,
      targetWeightKg: Number(targetWeight) || 68,
      age: Number(age) || 31,
      calorieTarget,
    };
    completeOnboarding(profile, consent);
    router.replace('/(tabs)');
  };

  const next = () => setStep((current) => Math.min(current + 1, 4));

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <View style={styles.brandMark}><Feather name="sun" size={18} color={colors.primaryForeground} /></View>
          <Text style={[styles.brand, { color: colors.foreground }]}>calora</Text>
          <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step + 1} of 5</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / 5) * 100}%` }]} /></View>

        {step === 0 && (
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>A STEADIER WAY TO TRACK</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Make food data feel human.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Calora keeps the numbers useful and the experience gentle. Start with your goal, then we’ll shape the day around you.</Text>
            <View style={[styles.welcomeCard, { backgroundColor: colors.hero }]}>
              <View style={[styles.welcomeIcon, { backgroundColor: 'rgba(157,215,189,0.16)' }]}><Feather name="shield" size={22} color={colors.heroMuted} /></View>
              <Text style={[styles.welcomeTitle, { color: colors.onHero }]}>Trust is a feature.</Text>
              <Text style={[styles.welcomeBody, { color: colors.heroMuted }]}>Every food shows where its numbers came from. Estimates stay estimates until you approve them.</Text>
            </View>
            <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>No ads. No shame. No medical advice.</Text>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR DIRECTION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>What are you working toward?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>There’s no wrong answer. You can change this whenever your life changes.</Text>
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
            <Text style={[styles.eyebrow, { color: colors.primary }]}>A LITTLE CONTEXT</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Make your target yours.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>These numbers create a starting point, not a verdict. Calora will learn from your real trend over time.</Text>
            <View style={styles.formGrid}>
              <View style={styles.fullField}><Text style={[styles.label, { color: colors.mutedForeground }]}>What should we call you?</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>
              {[['Age', age, setAge], ['Height (cm)', height, setHeight], ['Current weight (kg)', weight, setWeight], ['Goal weight (kg)', targetWeight, setTargetWeight]].map(([label, value, setter]) => <View key={label as string} style={styles.halfField}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput value={value as string} onChangeText={setter as (value: string) => void} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}
            </View>
            <View style={[styles.targetPreview, { backgroundColor: colors.accent }]}><Feather name="target" size={18} color={colors.accentForeground} /><Text style={[styles.targetText, { color: colors.accentForeground }]}>Starting target: <Text style={styles.targetBold}>{calorieTarget.toLocaleString()} kcal/day</Text></Text></View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR RHYTHM</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>How much movement is normal for you?</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>We’ll use this only to make the first estimate more useful.</Text>
            <View style={styles.optionList}>{activities.map((item) => {
              const selected = activity === item.key;
              return <Pressable key={item.key} onPress={() => setActivity(item.key)} style={[styles.option, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
                <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? colors.primary : colors.mutedForeground} />
              </Pressable>;
            })}</View>
            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 20, marginBottom: 9 }]}>Food preference</Text>
            <View style={styles.chipRow}>{diets.map((item) => <Pressable key={item} onPress={() => setDiet(item)} style={[styles.chip, { backgroundColor: diet === item ? colors.primary : colors.card, borderColor: diet === item ? colors.primary : colors.border }]}><Text style={[styles.chipText, { color: diet === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR DATA, YOUR CHOICE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Start with clarity.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Calora is a wellness tool, not a doctor. Your data stays local in this preview and can be exported or deleted from settings.</Text>
            <Pressable onPress={() => setConsent(!consent)} style={[styles.consentCard, { backgroundColor: consent ? colors.accent : colors.card, borderColor: consent ? colors.primary : colors.border }]}>
              <View style={[styles.consentCheck, { backgroundColor: consent ? colors.primary : colors.muted }]}><Feather name={consent ? 'check' : 'shield'} size={17} color={consent ? colors.primaryForeground : colors.mutedForeground} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>I understand and agree</Text><Text style={[styles.optionBody, { color: colors.mutedForeground }]}>I’ll review AI estimates before logging them and understand calorie targets are starting estimates.</Text></View>
            </Pressable>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryEyebrow, { color: colors.mutedForeground }]}>YOUR STARTING POINT</Text>
              <Text style={[styles.summaryCalories, { color: colors.foreground }]}>{calorieTarget.toLocaleString()} <Text style={[styles.summaryUnit, { color: colors.mutedForeground }]}>kcal/day</Text></Text>
              <Text style={[styles.summaryBody, { color: colors.mutedForeground }]}>{goal === 'lose' ? 'A gentle deficit' : goal === 'gain' ? 'A supportive surplus' : 'A steady maintenance target'} · {diet}</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomActions}>
          {step > 0 && <Pressable onPress={() => setStep((current) => current - 1)} style={styles.backButton}><Feather name="arrow-left" size={18} color={colors.mutedForeground} /><Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text></Pressable>}
          <Pressable disabled={step === 4 && !consent} onPress={step === 4 ? finish : next} style={[styles.continueButton, { backgroundColor: step === 4 && !consent ? colors.muted : colors.primary }]}><Text style={[styles.continueText, { color: step === 4 && !consent ? colors.mutedForeground : colors.primaryForeground }]}>{step === 4 ? 'Enter Calora' : 'Continue'}</Text><Feather name="arrow-right" size={17} color={step === 4 && !consent ? colors.mutedForeground : colors.primaryForeground} /></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 22, flexGrow: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brandMark: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef6b4f' },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4, marginLeft: 8 },
  stepText: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 'auto' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 46 },
  progressFill: { height: 5, borderRadius: 3 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 12 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 36, letterSpacing: -1, maxWidth: 340 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 340 },
  welcomeCard: { borderRadius: 24, padding: 20, marginTop: 38 },
  welcomeIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginBottom: 8 },
  welcomeBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  smallNote: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: 16 },
  optionList: { gap: 10, marginTop: 28 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  consentCard: { flexDirection: 'row', gap: 11, borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 27 },
  consentCheck: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 16 },
  summaryEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  summaryCalories: { fontFamily: 'Inter_700Bold', fontSize: 29, marginTop: 8 },
  summaryUnit: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  summaryBody: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 40, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 4 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  continueButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 15, paddingVertical: 15 },
  continueText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});