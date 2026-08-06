import type { PlannerMeal } from '@workspace/api-client-react';
import type {
  ActivityLog,
  FoodLog,
  MoodLog,
  Profile,
  WaterLog,
} from '@/context/CaloraContext';
import type { RepeatPattern } from '@/lib/foodMemory';

export type LivingTimePeriod = 'morning' | 'midday' | 'afternoon' | 'evening';
export type RoutineStage = 'first_day' | 'building' | 'emerging' | 'consistent' | 'returning';
export type LivingCategory =
  | 'first_day'
  | 'early_habit'
  | 'emerging_routine'
  | 'consistent_routine'
  | 'returning_after_gap'
  | 'incomplete_day'
  | 'plan_ready'
  | 'reflection_ready';
export type LivingAction = 'log_meal' | 'add_water' | 'view_progress' | 'open_planner';
export type LivingFocus = 'breakfast' | 'hydration' | 'lunch' | 'protein' | 'dinner' | 'reflection' | 'routine';

export type LivingState = {
  currentDate: string;
  timePeriod: LivingTimePeriod;
  routineStage: RoutineStage;
  category: LivingCategory;
  focus: LivingFocus;
  greeting: string;
  headline: string;
  message: string;
  reason: string;
  action: {
    kind: LivingAction;
    label: string;
  };
  signal: {
    loggedDaysLast7: number;
    mealDaysLast7: number;
    waterDaysLast7: number;
    moodDaysLast7: number;
    activeDaysLast7: number;
    plannedMealsNext7: number;
    plannedDaysNext7: number;
    mealsToday: number;
    waterToday: number;
    hasBreakfastToday: boolean;
    hasLunchToday: boolean;
    hasDinnerToday: boolean;
    proteinToday: number;
  };
};

type LivingStateInput = {
  profile: Profile | null;
  logs: FoodLog[];
  waterLogs: WaterLog;
  moodLogs: MoodLog;
  activityLogs: ActivityLog;
  repeatPatterns: RepeatPattern[];
  plannerMeals: PlannerMeal[];
  onboardingComplete: boolean;
  now?: Date;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

function daysAgo(now: Date, count: number) {
  const date = new Date(now);
  date.setDate(date.getDate() - count);
  return dateKey(date);
}

function daysFrom(now: Date, count: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

function getTimePeriod(hour: number): LivingTimePeriod {
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getRoutineStage({
  onboardingComplete,
  loggedDaysLast7,
  mealDaysLast14,
  logs,
  now,
}: {
  onboardingComplete: boolean;
  loggedDaysLast7: number;
  mealDaysLast14: number;
  logs: FoodLog[];
  now: Date;
}): RoutineStage {
  if (!onboardingComplete && logs.length === 0) return 'first_day';

  const today = dateKey(now);
  const mostRecentLog = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceLastLog = mostRecentLog
    ? Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${mostRecentLog.date}T12:00:00Z`)) / 86_400_000)
    : Infinity;

  if (daysSinceLastLog >= 3 && mealDaysLast14 > 0) return 'returning';
  if (loggedDaysLast7 >= 7) return 'consistent';
  if (loggedDaysLast7 >= 5 || mealDaysLast14 >= 8) return 'emerging';
  return 'building';
}

export function deriveLivingState(input: LivingStateInput): LivingState {
  const now = input.now ?? new Date();
  const currentDate = dateKey(now);
  const recentDates = new Set(Array.from({ length: 7 }, (_, index) => daysAgo(now, index)));
  const last14Dates = new Set(Array.from({ length: 14 }, (_, index) => daysAgo(now, index)));
  const next7Dates = new Set(Array.from({ length: 7 }, (_, index) => daysFrom(now, index + 1)));
  const recentLogs = input.logs.filter((log) => recentDates.has(log.date));
  const last14Logs = input.logs.filter((log) => last14Dates.has(log.date));
  const todayLogs = input.logs.filter((log) => log.date === currentDate);
  const mealTypesToday = new Set(todayLogs.map((log) => log.meal));
  const loggedDaysLast7 = new Set(recentLogs.map((log) => log.date)).size;
  const mealDaysLast14 = new Set(last14Logs.map((log) => log.date)).size;
  const waterDaysLast7 = Array.from(recentDates).filter((date) => (input.waterLogs[date] ?? 0) > 0).length;
  const moodDaysLast7 = Array.from(recentDates).filter((date) => Boolean(input.moodLogs[date])).length;
  const activeDaysLast7 = Array.from(recentDates).filter((date) => Boolean(input.activityLogs[date])).length;
  const plannedNext7 = input.plannerMeals.filter((meal) => next7Dates.has(meal.day));
  const plannedMealsNext7 = plannedNext7.length;
  const plannedDaysNext7 = new Set(plannedNext7.map((meal) => meal.day)).size;
  const period = getTimePeriod(now.getHours());
  const routineStage = getRoutineStage({
    onboardingComplete: input.onboardingComplete,
    loggedDaysLast7,
    mealDaysLast14,
    logs: input.logs,
    now,
  });
  const waterToday = input.waterLogs[currentDate] ?? 0;
  const mealsToday = mealTypesToday.size;
  const proteinToday = todayLogs.reduce((sum, log) => sum + log.protein, 0);
  const proteinTarget = Math.round((input.profile?.calorieTarget ?? 2000) * 0.26 / 4);
  const hasBreakfastToday = mealTypesToday.has('Breakfast');
  const hasLunchToday = mealTypesToday.has('Lunch');
  const hasDinnerToday = mealTypesToday.has('Dinner');
  const expectedMealsByPeriod: Record<LivingTimePeriod, number> = {
    morning: 0,
    midday: 1,
    afternoon: 2,
    evening: 3,
  };
  const incompleteDay = routineStage !== 'first_day'
    && routineStage !== 'returning'
    && mealsToday < expectedMealsByPeriod[period];
  const reflectionReady = period === 'evening' && mealsToday >= 3;
  const planReady = !incompleteDay
    && !reflectionReady
    && !(period === 'afternoon' && waterToday < 16)
    && !(mealsToday > 0 && proteinToday < proteinTarget * 0.55 && period === 'afternoon')
    && plannedMealsNext7 >= 3
    && plannedDaysNext7 >= 2;
  const category: LivingCategory = routineStage === 'first_day'
    ? 'first_day'
    : routineStage === 'returning'
      ? 'returning_after_gap'
      : reflectionReady
        ? 'reflection_ready'
        : incompleteDay
          ? 'incomplete_day'
          : planReady
            ? 'plan_ready'
            : routineStage === 'consistent'
              ? 'consistent_routine'
              : routineStage === 'emerging'
                ? 'emerging_routine'
                : 'early_habit';

  let focus: LivingFocus = 'routine';
  let headline = 'Let’s make today easier.';
  let message = 'Start with the next useful choice, not the whole day.';
  let reason = `${loggedDaysLast7} day${loggedDaysLast7 === 1 ? '' : 's'} of nutrition history is enough to begin noticing what helps.`;
  let action: LivingState['action'] = { kind: 'log_meal', label: 'Add a meal' };

  if (routineStage === 'first_day') {
    focus = 'breakfast';
    headline = 'Start with one meal.';
    message = 'A small first entry gives Calora something real to remember.';
    reason = 'Your first few entries help recommendations become more personal over time.';
    action = { kind: 'log_meal', label: period === 'morning' ? 'Log breakfast' : 'Add a meal' };
  } else if (routineStage === 'returning') {
    focus = 'routine';
    headline = 'Welcome back.';
    message = 'Start with the next useful choice, not the whole day.';
    reason = 'Your earlier history is still here. There is no need to make up for missed days.';
    action = { kind: 'log_meal', label: period === 'morning' && !hasBreakfastToday ? 'Log breakfast' : 'Add a meal' };
  } else if (period === 'morning' && !hasBreakfastToday) {
    focus = 'breakfast';
    headline = 'Give your morning a beginning.';
    message = routineStage === 'consistent'
      ? 'Your mornings have a rhythm. Keep it simple today.'
      : 'Breakfast is an easy place to give today some shape.';
    reason = input.repeatPatterns.length > 0
      ? 'Your saved food memories can make a familiar breakfast quick to log.'
      : 'One breakfast entry is enough to start building a useful pattern.';
    action = { kind: 'log_meal', label: 'Log breakfast' };
  } else if ((period === 'midday' || period === 'afternoon') && !hasLunchToday) {
    focus = 'lunch';
    headline = 'Lunch is the next useful step.';
    message = 'Choose something that fits the rest of your day—not something perfect.';
    reason = mealsToday > 0
      ? 'You already have part of the day captured, so lunch can complete the picture.'
      : 'A lunch entry will make the rest of today easier to read.';
    action = { kind: 'log_meal', label: 'Add lunch' };
  } else if (period === 'afternoon' && waterToday < 16) {
    focus = 'hydration';
    headline = 'A small water break could help.';
    message = 'You have plenty of day left. A glass now is enough.';
    reason = waterDaysLast7 > 0
      ? `You have checked in on water ${waterDaysLast7} day${waterDaysLast7 === 1 ? '' : 's'} this week.`
      : 'A simple check-in gives hydration a place in your daily rhythm.';
    action = { kind: 'add_water', label: 'Add 8 fl oz' };
  } else if (reflectionReady) {
    focus = 'reflection';
    headline = routineStage === 'consistent' ? 'Your routine is becoming easier to read.' : 'Your day has a clear shape.';
    message = 'You have enough context to notice what felt useful today.';
    reason = moodDaysLast7 > 0 || activeDaysLast7 > 0
      ? 'Nutrition, wellness, and routine signals are starting to sit together.'
      : 'A little more history will make future reflections more personal.';
    action = { kind: 'view_progress', label: 'See your progress' };
  } else if (mealsToday > 0 && proteinToday < proteinTarget * 0.55 && period === 'afternoon') {
    focus = 'protein';
    headline = 'There is room for a protein-rich choice.';
    message = 'A snack or dinner with protein could round out the day.';
    reason = 'This is a gentle suggestion from today’s logged nutrition, not a score.';
    action = { kind: 'log_meal', label: 'Find a meal' };
  } else if (planReady) {
    focus = 'routine';
    headline = 'You have room to make the week easier.';
    message = 'A few planned meals can take pressure off the next few days.';
    reason = `${plannedMealsNext7} planned meals across ${plannedDaysNext7} upcoming days are ready when you need them.`;
    action = { kind: 'open_planner', label: 'Plan what is next' };
  } else if (routineStage === 'consistent' || input.repeatPatterns.some((pattern) => pattern.useCount >= 4)) {
    focus = 'routine';
    headline = 'You are building a strong routine.';
    message = 'Calora is learning which small choices fit your life.';
    reason = `You have logged nutrition on ${loggedDaysLast7} of the last 7 days.`;
    action = { kind: 'view_progress', label: 'See your progress' };
  }

  const greeting = period === 'morning' ? 'Good morning' : period === 'midday' ? 'Good afternoon' : period === 'afternoon' ? 'Good afternoon' : 'Good evening';

  return {
    currentDate,
    timePeriod: period,
    routineStage,
    category,
    focus,
    greeting,
    headline,
    message,
    reason,
    action,
    signal: {
      loggedDaysLast7,
      mealDaysLast7: loggedDaysLast7,
      waterDaysLast7,
      moodDaysLast7,
      activeDaysLast7,
      plannedMealsNext7,
      plannedDaysNext7,
      mealsToday,
      waterToday,
      hasBreakfastToday,
      hasLunchToday,
      hasDinnerToday,
      proteinToday,
    },
  };
}