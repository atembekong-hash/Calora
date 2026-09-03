import type { ActivityLevel, DietPreference, Goal, Profile } from '@/context/CaloraContext';
import { recommendCalories } from '@/lib/calorieRecommendation';

export type PersonalDetailsInput = {
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  activity: ActivityLevel;
  diet: DietPreference;
  goal: Goal;
};

export type PersonalDetailsValidation =
  | { ok: true; values: Pick<Profile, 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'activity' | 'diet' | 'goal'> }
  | { ok: false; message: string };

const poundsPerKg = 2.20462;
const inchesPerCm = 0.393701;

export function profileTargetMode(profile: Profile | null): 'automatic' | 'custom' {
  return profile?.targetMode ?? 'custom';
}

export function validatePersonalDetails(
  input: PersonalDetailsInput,
  units: 'metric' | 'imperial',
): PersonalDetailsValidation {
  const age = Number(input.age);
  const height = Number(input.height);
  const weight = Number(input.weight);
  const targetWeight = Number(input.targetWeight);
  const heightCm = units === 'imperial' ? height / inchesPerCm : height;
  const weightKg = units === 'imperial' ? weight / poundsPerKg : weight;
  const targetWeightKg = units === 'imperial' ? targetWeight / poundsPerKg : targetWeight;

  if (!Number.isFinite(age) || age < 13 || age > 120 || !Number.isInteger(age)) {
    return { ok: false, message: 'Enter an age from 13 to 120.' };
  }
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 260) {
    return { ok: false, message: `Enter a height from ${units === 'imperial' ? '32 to 102 in' : '80 to 260 cm'}.` };
  }
  const weightRange = units === 'imperial' ? '55 to 770 lb' : '25 to 350 kg';
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350) {
    return { ok: false, message: `Enter a current weight from ${weightRange}.` };
  }
  if (!Number.isFinite(targetWeightKg) || targetWeightKg < 25 || targetWeightKg > 350) {
    return { ok: false, message: `Enter a target weight from ${weightRange}.` };
  }
  return { ok: true, values: { age, heightCm, weightKg, targetWeightKg, activity: input.activity, diet: input.diet, goal: input.goal } };
}

export function recommendationForProfile(profile: Pick<Profile, 'weightKg' | 'activity' | 'goal'>): number {
  return recommendCalories(profile);
}