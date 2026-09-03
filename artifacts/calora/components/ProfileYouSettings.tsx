import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import type { ActivityLevel, DietPreference, Goal, Profile } from '@/context/CaloraContext';
import { BottomSheet } from '@/components/BottomSheet';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { getMacroTargets, type MacroGoalInput, validateMacroGoalInput } from '@/lib/nutritionGoals';
import { profileTargetMode, recommendationForProfile, validatePersonalDetails } from '@/lib/profileTargets';
import { formatWhole } from '@/lib/formatters';
import colors from '@/constants/colors';

const activities: { key: ActivityLevel; label: string }[] = [
  { key: 'low', label: 'Lightly active' }, { key: 'moderate', label: 'Moderately active' }, { key: 'high', label: 'Very active' },
];
const goals: { key: Goal; label: string }[] = [
  { key: 'lose', label: 'Lose weight' }, { key: 'maintain', label: 'Maintain' }, { key: 'gain', label: 'Build muscle' },
];
const diets: DietPreference[] = ['Everything', 'Vegetarian', 'Vegan', 'High protein'];
type PersonalForm = { age: string; height: string; weight: string; targetWeight: string; activity: ActivityLevel; diet: DietPreference; goal: Goal };

function displayWeight(value: number, units: 'metric' | 'imperial') {
  // String retains enough significant digits to convert back to the stored kg
  // value, unlike the former rounded pound display which drifted on every save.
  return String(units === 'imperial' ? value * 2.20462 : value);
}
function displayHeight(value: number, units: 'metric' | 'imperial') {
  return String(units === 'imperial' ? value * 0.393701 : value);
}

export function ProfileYouSettings({
  profile,
  colors: themeColors,
  updateProfile,
}: {
  profile: Profile | null;
  colors: typeof colors.light;
  updateProfile: (patch: Partial<Profile>) => void;
}) {
  const [personalOpen, setPersonalOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [error, setError] = useState('');
  const [pendingPersonal, setPendingPersonal] = useState<Pick<Profile, 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'activity' | 'diet' | 'goal'> | null>(null);
  const [personal, setPersonal] = useState<PersonalForm>({ age: '', height: '', weight: '', targetWeight: '', activity: 'moderate', diet: 'Everything', goal: 'maintain' });
  const [macro, setMacro] = useState<MacroGoalInput>({ calories: '', protein: '', carbs: '', fat: '' });
  const units = profile?.units ?? 'metric';
  const targetMode = profileTargetMode(profile);

  const openPersonal = () => {
    if (!profile) return;
    setPersonal({
      age: String(profile.age), height: displayHeight(profile.heightCm, units), weight: displayWeight(profile.weightKg, units),
      targetWeight: displayWeight(profile.targetWeightKg, units), activity: profile.activity, diet: profile.diet, goal: profile.goal,
    });
    setError(''); setPersonalOpen(true);
  };
  const openNutrition = () => {
    const targets = getMacroTargets(profile);
    setMacro({ calories: String(targets.calories), protein: String(targets.protein), carbs: String(targets.carbs), fat: String(targets.fat) });
    setError(''); setNutritionOpen(true);
  };
  const continuePersonal = () => {
    const result = validatePersonalDetails(personal, units);
    if (!result.ok) { setError(result.message); return; }
    setPendingPersonal(result.values);
    setPersonalOpen(false);
    setChoiceOpen(true);
  };
  const finishPersonal = (applyRecommendation: boolean) => {
    if (!pendingPersonal) return;
    // Keeping targets freezes them as custom values; otherwise a later
    // recommendation refresh could change a target the person chose to keep.
    const patch: Partial<Profile> = { ...pendingPersonal, targetMode: 'custom' };
    if (applyRecommendation) {
      patch.calorieTarget = recommendationForProfile(pendingPersonal);
      patch.targetMode = 'automatic';
      patch.proteinTargetGrams = undefined;
      patch.carbsTargetGrams = undefined;
      patch.fatTargetGrams = undefined;
    }
    updateProfile(patch);
    setPendingPersonal(null); setChoiceOpen(false);
  };
  const saveCustomTargets = () => {
    const result = validateMacroGoalInput(macro);
    if (!result.ok) { setError(result.message); return; }
    updateProfile({
      calorieTarget: result.values.calories, proteinTargetGrams: result.values.protein,
      carbsTargetGrams: result.values.carbs, fatTargetGrams: result.values.fat, targetMode: 'custom',
    });
    setNutritionOpen(false);
  };
  const resetRecommendations = () => {
    if (!profile) return;
    updateProfile({
      calorieTarget: recommendationForProfile(profile), targetMode: 'automatic',
      proteinTargetGrams: undefined, carbsTargetGrams: undefined, fatTargetGrams: undefined,
    });
    setNutritionOpen(false);
  };

  return (
    <>
      <Text style={[styles.title, { color: themeColors.foreground }]}>Your plan</Text>
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Pressable testID="personal-details-settings" onPress={openPersonal} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: themeColors.muted }]}><Feather name="user" size={16} color={themeColors.primary} /></View>
          <View style={styles.copy}><Text style={[styles.rowTitle, { color: themeColors.foreground }]}>Personal details</Text><Text style={[styles.rowBody, { color: themeColors.mutedForeground }]}>{profile ? `${profile.age} years · ${profile.activity}` : 'Finish onboarding first'}</Text></View>
          <Feather name="chevron-right" size={18} color={themeColors.mutedForeground} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        <Pressable testID="nutrition-goals-settings" onPress={openNutrition} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: themeColors.muted }]}><Feather name="target" size={16} color={themeColors.primary} /></View>
          <View style={styles.copy}><Text style={[styles.rowTitle, { color: themeColors.foreground }]}>Nutrition goals</Text><Text style={[styles.rowBody, { color: themeColors.mutedForeground }]}>{targetMode === 'automatic' ? 'Automatic recommendations' : 'Custom calorie and macro targets'}</Text></View>
          <Feather name="chevron-right" size={18} color={themeColors.mutedForeground} />
        </Pressable>
      </View>

      <BottomSheet visible={personalOpen} onRequestClose={() => setPersonalOpen(false)} sheetStyle={{ backgroundColor: themeColors.background }}>
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.sheet} bottomOffset={72}>
          <Text style={[styles.sheetTitle, { color: themeColors.foreground }]}>Personal details</Text>
          <Text style={[styles.sheetBody, { color: themeColors.mutedForeground }]}>Changing these details lets you decide whether to keep your current targets.</Text>
          <View style={styles.fields}>
            <Field label="Age" value={personal.age} setValue={(age) => setPersonal({ ...personal, age })} colors={themeColors} />
            <Field label={`Height (${units === 'imperial' ? 'in' : 'cm'})`} value={personal.height} setValue={(height) => setPersonal({ ...personal, height })} colors={themeColors} />
            <Field label={`Current weight (${units === 'imperial' ? 'lb' : 'kg'})`} value={personal.weight} setValue={(weight) => setPersonal({ ...personal, weight })} colors={themeColors} />
            <Field label={`Target weight (${units === 'imperial' ? 'lb' : 'kg'})`} value={personal.targetWeight} setValue={(targetWeight) => setPersonal({ ...personal, targetWeight })} colors={themeColors} />
          </View>
          <OptionGroup label="Activity level" items={activities} value={personal.activity} onChange={(activity) => setPersonal({ ...personal, activity })} colors={themeColors} />
          <OptionGroup label="Goal" items={goals} value={personal.goal} onChange={(goal) => setPersonal({ ...personal, goal })} colors={themeColors} />
          <OptionGroup label="Diet" items={diets.map((key) => ({ key, label: key }))} value={personal.diet} onChange={(diet) => setPersonal({ ...personal, diet })} colors={themeColors} />
          {!!error && <Text style={[styles.error, { color: themeColors.destructive }]}>{error}</Text>}
          <Pressable onPress={continuePersonal} style={[styles.primary, { backgroundColor: themeColors.primary }]}><Text style={[styles.primaryText, { color: themeColors.primaryForeground }]}>Continue</Text></Pressable>
        </KeyboardAwareScrollViewCompat>
      </BottomSheet>

      <BottomSheet visible={choiceOpen} onRequestClose={() => setChoiceOpen(false)} sheetStyle={{ backgroundColor: themeColors.background }}>
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, { color: themeColors.foreground }]}>Update nutrition targets?</Text>
          <Text style={[styles.sheetBody, { color: themeColors.mutedForeground }]}>Your details changed. Keep your existing targets, or apply a new starting estimate of {pendingPersonal ? `${formatWhole(recommendationForProfile(pendingPersonal))} kcal/day` : ''}.</Text>
          <Pressable testID="apply-updated-recommendations" onPress={() => finishPersonal(true)} style={[styles.primary, { backgroundColor: themeColors.primary }]}><Text style={[styles.primaryText, { color: themeColors.primaryForeground }]}>Apply updated recommendations</Text></Pressable>
          <Pressable testID="keep-current-targets" onPress={() => finishPersonal(false)} style={styles.secondary}><Text style={[styles.secondaryText, { color: themeColors.foreground }]}>Keep current targets</Text></Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={nutritionOpen} onRequestClose={() => setNutritionOpen(false)} sheetStyle={{ backgroundColor: themeColors.background }}>
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.sheet} bottomOffset={72}>
          <Text style={[styles.sheetTitle, { color: themeColors.foreground }]}>Nutrition goals</Text>
          <View style={[styles.mode, { backgroundColor: themeColors.muted }]}>
            {(['automatic', 'custom'] as const).map((mode) => <Pressable key={mode} onPress={() => mode === 'automatic' ? resetRecommendations() : updateProfile({ targetMode: 'custom' })} style={[styles.modeOption, targetMode === mode && { backgroundColor: themeColors.card }]}><Text style={[styles.modeText, { color: themeColors.foreground }]}>{mode === 'automatic' ? 'Automatic' : 'Custom'}</Text></Pressable>)}
          </View>
          <Text style={[styles.sheetBody, { color: themeColors.mutedForeground }]}>{targetMode === 'automatic' ? `Based on your details: ${profile ? formatWhole(recommendationForProfile(profile)) : 2000} kcal/day.` : 'Set each target independently; grams do not need to match calories.'}</Text>
          {targetMode === 'custom' && <><View style={styles.fields}>
            <Field label="Calories" value={macro.calories} setValue={(calories) => setMacro({ ...macro, calories })} colors={themeColors} />
            <Field label="Protein (g)" value={macro.protein} setValue={(protein) => setMacro({ ...macro, protein })} colors={themeColors} />
            <Field label="Carbs (g)" value={macro.carbs} setValue={(carbs) => setMacro({ ...macro, carbs })} colors={themeColors} />
            <Field label="Fat (g)" value={macro.fat} setValue={(fat) => setMacro({ ...macro, fat })} colors={themeColors} />
          </View>{!!error && <Text style={[styles.error, { color: themeColors.destructive }]}>{error}</Text>}<Pressable onPress={saveCustomTargets} style={[styles.primary, { backgroundColor: themeColors.primary }]}><Text style={[styles.primaryText, { color: themeColors.primaryForeground }]}>Save custom targets</Text></Pressable></>}
          <Pressable testID="reset-nutrition-recommendations" onPress={resetRecommendations} style={styles.secondary}><Text style={[styles.secondaryText, { color: themeColors.foreground }]}>Reset to recommendations</Text></Pressable>
        </KeyboardAwareScrollViewCompat>
      </BottomSheet>
    </>
  );
}

function Field({ label, value, setValue, colors }: { label: string; value: string; setValue: (value: string) => void; colors: typeof import('@/constants/colors').default.light }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>;
}
function OptionGroup<T extends string>({ label, items, value, onChange, colors }: { label: string; items: { key: T; label: string }[]; value: T; onChange: (next: T) => void; colors: typeof import('@/constants/colors').default.light }) {
  return <View style={styles.optionGroup}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><View style={styles.chips}>{items.map((item) => <Pressable key={item.key} onPress={() => onChange(item.key)} style={[styles.chip, { borderColor: value === item.key ? colors.primary : colors.border, backgroundColor: value === item.key ? colors.accent : colors.card }]}><Text style={[styles.chipText, { color: value === item.key ? colors.accentForeground : colors.foreground }]}>{item.label}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 17, marginBottom: 30 },
  row: { minHeight: 72, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 }, rowBody: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 }, sheet: { padding: 20, paddingBottom: 30 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 }, sheetBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }, field: { width: '47%' }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 13 },
  optionGroup: { marginTop: 16 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 }, chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  primary: { borderRadius: 13, paddingVertical: 13, alignItems: 'center', marginTop: 18 }, primaryText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  secondary: { borderRadius: 13, paddingVertical: 12, alignItems: 'center', marginTop: 8 }, secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 12 },
  mode: { flexDirection: 'row', borderRadius: 13, padding: 4, marginTop: 18 }, modeOption: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 10 }, modeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});