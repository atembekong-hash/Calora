import type { ActivityMinutesLog, DailyActivity, FoodLog, Mood, MoodLog, ActivityLog, WaterLog } from '@/context/CaloraContext';
import { dateKey, dateList } from '@/lib/dates';

export type WeeklySignalDay = {
  date: string;
  day: string;
  kcal: number;
  meals: number;
  value: number;
  water: number;
  mood?: Mood;
  activity?: DailyActivity;
  activityMinutes: number;
  hasFood: boolean;
  hasData: boolean;
};

export type WeeklySignals = {
  days: WeeklySignalDay[];
  trackedDays: number;
  foodDays: number;
  waterDays: number;
  moodDays: number;
  activityDays: number;
  averageCalories: number;
  averageWater: number;
  averageActivityMinutes: number;
};

export function deriveWeeklySignals(
  logs: FoodLog[],
  waterLogs: WaterLog,
  moodLogs: MoodLog,
  activityLogs: ActivityLog,
  target: number,
  endDate = dateKey(),
  activityMinutesLogs: ActivityMinutesLog = {},
): WeeklySignals {
  const days = dateList(endDate, 7).map((date) => {
    const dayLogs = logs.filter((log) => log.date === date);
    const kcal = dayLogs.reduce((total, log) => total + log.calories, 0);
    const dateObject = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
    return {
      date,
      day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObject),
      kcal,
      meals: new Set(dayLogs.map((log) => log.meal)).size,
      value: kcal ? Math.min((kcal / target) * 100, 100) : 0,
      water: waterLogs[date] ?? 0,
      mood: moodLogs[date],
      activity: activityLogs[date],
      activityMinutes: activityMinutesLogs[date] ?? 0,
      hasFood: dayLogs.length > 0,
      hasData: dayLogs.length > 0 || Boolean(waterLogs[date]) || Boolean(moodLogs[date]) || Boolean(activityLogs[date]),
    };
  });
  const calorieDays = days.filter((day) => day.kcal > 0);
  const waterDays = days.filter((day) => day.water > 0);
  const minutesDays = days.filter((day) => day.activityMinutes > 0);
  return {
    days,
    trackedDays: days.filter((day) => day.hasData).length,
    foodDays: days.filter((day) => day.hasFood).length,
    waterDays: waterDays.length,
    moodDays: days.filter((day) => day.mood).length,
    activityDays: days.filter((day) => day.activity).length,
    averageCalories: calorieDays.length ? Math.round(calorieDays.reduce((sum, day) => sum + day.kcal, 0) / calorieDays.length) : 0,
    averageWater: waterDays.length ? Math.round(waterDays.reduce((sum, day) => sum + day.water, 0) / waterDays.length) : 0,
    averageActivityMinutes: minutesDays.length ? Math.round(minutesDays.reduce((sum, day) => sum + day.activityMinutes, 0) / minutesDays.length) : 0,
  };
}

export function trustScore(logs: FoodLog[]): number | null {
  if (!logs.length) return null;
  return Math.round(logs.reduce((sum, log) => sum + Math.max(0, Math.min(100, log.confidence)), 0) / logs.length);
}
