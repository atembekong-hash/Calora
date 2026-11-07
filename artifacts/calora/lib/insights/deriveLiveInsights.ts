import type { FoodLog, Mood, SyncState, WeightEntry } from '@/context/CaloraContext';
import type { FastingState } from '@/lib/fasting';
import type { HealthConnection } from '@/lib/health/types';

type PlannerLike = { id: string; day: string; meal: string; name?: string };

type InsightCategory =
  | 'nutrition'
  | 'hydration'
  | 'steps'
  | 'fasting'
  | 'mood'
  | 'workout'
  | 'weight'
  | 'planning'
  | 'sync'
  | 'learning';

export type InsightEvidence = {
  kind: 'observed' | 'derived' | 'suggested';
  source: string;
  freshness: 'fresh' | 'dated' | 'stale' | 'unknown';
  detail: string;
};

export type LiveInsight = {
  id: string;
  category: InsightCategory;
  priority: 'high' | 'medium' | 'low';
  state: 'positive' | 'attention' | 'neutral' | 'stale';
  title: string;
  summary: string;
  metric?: string;
  action?: { label: string; route: string };
  evidence: InsightEvidence;
};

export type LiveActivityEvent = {
  id: string;
  category: InsightCategory;
  description: string;
  occurredAt: string;
  timeLabel: string;
  source: 'food-log' | 'fasting-history' | 'health-provider' | 'weight-entry';
};

export type LiveInsightSnapshot = {
  now: Date;
  logs: readonly FoodLog[];
  waterLogs: Readonly<Record<string, number>>;
  hydrationGoalOunces: number;
  healthConnection: HealthConnection;
  dailyStepGoal: number;
  fasting: FastingState;
  moodLogs: Readonly<Record<string, Mood>>;
  activityMinutesLogs: Readonly<Record<string, number>>;
  weights: readonly WeightEntry[];
  plannerMeals: readonly PlannerLike[];
  syncState: SyncState;
  hydrated: boolean;
};

export type DerivedLiveInsights = {
  briefing: {
    title: string;
    summary: string;
    tone: 'positive' | 'attention' | 'neutral';
  };
  observations: LiveInsight[];
  recommendations: LiveInsight[];
  activity: LiveActivityEvent[];
  today: {
    mealsLogged: number;
    waterOunces: number;
    steps: number | null;
    fastingActive: boolean;
  };
  freshness: {
    label: string;
    state: 'fresh' | 'dated' | 'stale' | 'offline';
    detail: string;
  };
};

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseEventDate(date: string, time?: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const candidate = time && /^\d{1,2}:\d{2}/.test(time)
    ? new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
    : new Date(`${date}T12:00:00`);
  return Number.isFinite(candidate.getTime()) ? candidate : null;
}

function freshnessFor(timestamp: string | undefined, now: Date): InsightEvidence['freshness'] {
  if (!timestamp) return 'unknown';
  const age = now.getTime() - new Date(timestamp).getTime();
  if (!Number.isFinite(age)) return 'unknown';
  if (age <= 24 * 60 * 60 * 1000) return 'fresh';
  if (age <= 72 * 60 * 60 * 1000) return 'dated';
  return 'stale';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dayProgress(now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0.15, Math.min(1, minutes / (24 * 60)));
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function deriveLiveInsights(input: LiveInsightSnapshot): DerivedLiveInsights {
  const today = localDateKey(input.now);
  const todayLogs = input.logs.filter((log) => log.date === today);
  const waterOunces = Math.max(0, Number(input.waterLogs[today] ?? 0));
  const steps = input.healthConnection.snapshot?.steps ?? null;
  const healthTimestamp = input.healthConnection.lastSyncedAt ?? input.healthConnection.snapshot?.syncedAt;
  const healthFreshness = freshnessFor(healthTimestamp, input.now);
  const healthAvailable = steps !== null || input.healthConnection.authorization === 'authorized' || input.healthConnection.authorization === 'partial';
  const stepsPct = steps === null ? null : Math.min(100, Math.round((steps / Math.max(1, input.dailyStepGoal)) * 100));
  const waterPct = Math.min(100, Math.round((waterOunces / Math.max(1, input.hydrationGoalOunces)) * 100));
  const mealsLogged = todayLogs.length;
  const activeFasting = Boolean(input.fasting.activeStartedAt);

  const observations: LiveInsight[] = [];
  const recommendations: LiveInsight[] = [];

  if (waterOunces > 0 && waterPct >= 100) {
    observations.push({ id: 'hydration-goal-reached', category: 'hydration', priority: 'medium', state: 'positive', title: 'Your hydration goal is reached', summary: `${waterOunces} oz logged against your ${input.hydrationGoalOunces} oz target.`, metric: `${waterPct}%`, action: { label: 'Review hydration', route: '/hydration' }, evidence: { kind: 'derived', source: `waterLogs[${today}]`, freshness: 'fresh', detail: 'Daily logged ounces divided by the configured hydration target.' } });
  } else if (waterOunces > 0) {
    observations.push({ id: 'hydration-progress', category: 'hydration', priority: waterPct < 35 ? 'high' : 'medium', state: waterPct < 35 ? 'attention' : 'neutral', title: 'Hydration is in progress', summary: `${waterOunces} oz logged of your ${input.hydrationGoalOunces} oz target.`, metric: `${waterPct}%`, action: { label: 'Log water', route: '/hydration' }, evidence: { kind: 'derived', source: `waterLogs[${today}]`, freshness: 'fresh', detail: 'Daily logged ounces divided by the configured hydration target.' } });
  } else {
    recommendations.push({ id: 'log-water', category: 'hydration', priority: 'medium', state: 'neutral', title: 'Start with a glass of water', summary: 'No water has been recorded today yet; a missing log is not proof that you have not had water.', action: { label: 'Log water', route: '/hydration' }, evidence: { kind: 'suggested', source: `waterLogs[${today}]`, freshness: 'unknown', detail: 'No daily water record is available.' } });
  }

  if (steps !== null && healthFreshness !== 'stale') {
    observations.push({ id: 'steps-today', category: 'steps', priority: stepsPct !== null && stepsPct >= 100 ? 'medium' : 'low', state: stepsPct !== null && stepsPct >= 100 ? 'positive' : 'neutral', title: stepsPct !== null && stepsPct >= 100 ? 'Your step goal is reached' : 'Movement is being tracked', summary: `${steps.toLocaleString()} steps recorded toward your ${input.dailyStepGoal.toLocaleString()}-step goal.`, metric: `${stepsPct}%`, action: { label: 'View steps', route: '/steps' }, evidence: { kind: 'observed', source: 'healthConnection.snapshot.steps', freshness: healthFreshness, detail: `Provider snapshot synced ${healthTimestamp ? new Date(healthTimestamp).toLocaleString() : 'without a timestamp'}.` } });
  } else if (!healthAvailable || healthFreshness === 'stale') {
    recommendations.push({ id: 'connect-health', category: 'sync', priority: 'high', state: healthFreshness === 'stale' ? 'stale' : 'attention', title: healthFreshness === 'stale' ? 'Health data needs a refresh' : 'Connect your health data', summary: healthFreshness === 'stale' ? 'The last provider snapshot is older than the current day.' : 'Connect Health to bring steps and activity into your daily briefing.', action: { label: 'Connect Health', route: '/profile?tab=account&open=health' }, evidence: { kind: 'observed', source: 'healthConnection', freshness: healthFreshness, detail: input.healthConnection.authorization } });
  }

  if (activeFasting) {
    observations.push({ id: 'fasting-active', category: 'fasting', priority: 'medium', state: 'positive', title: 'Your fasting window is active', summary: 'Your active fasting timer is available from the Fasting page.', action: { label: 'View fasting', route: '/fasting' }, evidence: { kind: 'observed', source: 'fasting.activeStartedAt', freshness: 'fresh', detail: `Started ${new Date(input.fasting.activeStartedAt as string).toLocaleString()}.` } });
  } else if (input.fasting.history.length === 0) {
    recommendations.push({ id: 'fasting-start', category: 'fasting', priority: 'low', state: 'neutral', title: 'Fasting is available when it fits your routine', summary: 'Explore the existing fasting guidance before choosing a schedule.', action: { label: 'Open fasting', route: '/fasting' }, evidence: { kind: 'suggested', source: 'fasting.history', freshness: 'unknown', detail: 'No completed fasting history is available.' } });
  }

  if (mealsLogged > 0) {
    observations.push({ id: 'nutrition-logged', category: 'nutrition', priority: 'medium', state: 'positive', title: 'Nutrition is on your record', summary: `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged today.`, action: { label: 'Review today', route: '/(tabs)' }, evidence: { kind: 'observed', source: 'logs', freshness: 'fresh', detail: 'Count of FoodLog records whose date matches the local current day.' } });
  } else {
    recommendations.push({ id: 'review-meals', category: 'nutrition', priority: 'medium', state: 'neutral', title: 'Your day is ready for its first food record', summary: 'No meal is recorded today yet; this does not mean that you have not eaten.', action: { label: 'Review today', route: '/(tabs)' }, evidence: { kind: 'suggested', source: 'logs', freshness: 'unknown', detail: 'No FoodLog record matches the local current day.' } });
  }

  const latestWeight = [...input.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latestWeight?.date === today) {
    observations.push({ id: 'weight-recorded', category: 'weight', priority: 'low', state: 'positive', title: 'Weight was recorded today', summary: 'Your latest weight entry is available in Progress.', action: { label: 'Open Progress', route: '/(tabs)/insights' }, evidence: { kind: 'observed', source: 'weights', freshness: 'fresh', detail: `Weight entry date ${latestWeight.date}.` } });
  }

  const plannedToday = input.plannerMeals.filter((meal) => meal.day === today).length;
  const loggedPlannerToday = input.plannerMeals.filter((meal) => meal.day === today && todayLogs.some((log) => log.plannerMealId === meal.id)).length;
  if (plannedToday > loggedPlannerToday && plannedToday > 0) {
    recommendations.push({ id: 'review-plan', category: 'planning', priority: 'low', state: 'neutral', title: 'Your plan has meals waiting', summary: `${plannedToday - loggedPlannerToday} planned meal${plannedToday - loggedPlannerToday === 1 ? '' : 's'} is not on today’s food record yet.`, action: { label: 'Review plan', route: '/(tabs)/planner' }, evidence: { kind: 'derived', source: 'plannerMeals and logs', freshness: 'dated', detail: 'Today’s planned slots minus planner-linked FoodLog records.' } });
  }

  const activity: LiveActivityEvent[] = [];
  for (const log of todayLogs) {
    const occurred = parseEventDate(log.date, log.time);
    if (occurred) activity.push({ id: `food-${log.id}`, category: 'nutrition', description: `${log.meal} logged: ${log.name}`, occurredAt: occurred.toISOString(), timeLabel: formatTime(occurred), source: 'food-log' });
  }
  for (const entry of input.fasting.history) {
    const occurred = new Date(entry.endedAt);
    if (Number.isFinite(occurred.getTime()) && localDateKey(occurred) === today) activity.push({ id: `fast-${entry.id}`, category: 'fasting', description: `${entry.plannedHours}-hour fast completed`, occurredAt: occurred.toISOString(), timeLabel: formatTime(occurred), source: 'fasting-history' });
  }
  if (healthTimestamp && localDateKey(new Date(healthTimestamp)) === today) activity.push({ id: `health-${healthTimestamp}`, category: 'sync', description: 'Health data synchronized', occurredAt: new Date(healthTimestamp).toISOString(), timeLabel: formatTime(new Date(healthTimestamp)), source: 'health-provider' });
  const todayWeight = input.weights.find((weight) => weight.date === today);
  if (todayWeight) {
    const occurred = parseEventDate(todayWeight.date);
    if (occurred) activity.push({ id: `weight-${todayWeight.id}`, category: 'weight', description: 'Weight entry recorded', occurredAt: occurred.toISOString(), timeLabel: 'Today', source: 'weight-entry' });
  }

  const orderedActivity = uniqueById(activity).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 12);
  const top = [...observations].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  const topRecommendations = [...recommendations].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 2);
  const attention = top.slice(0, 3).some((item) => item.state === 'attention' || item.state === 'stale') || topRecommendations.some((item) => item.priority === 'high');
  const enoughData = mealsLogged > 0 || waterOunces > 0 || steps !== null || activeFasting;
  const briefing = !input.hydrated || input.syncState === 'offline'
    ? { title: 'Your day is ready when you are', summary: 'Calora is showing local information and will keep the page honest when data is unavailable.', tone: 'neutral' as const }
    : !enoughData
      ? { title: 'Let’s get your day started', summary: 'As you log meals, water, movement, or mood, useful context will appear here.', tone: 'neutral' as const }
      : attention
        ? { title: 'A few things deserve attention', summary: 'Here are the most useful next steps supported by your available data.', tone: 'attention' as const }
        : { title: 'Your routine is coming together', summary: 'A concise view of what Calora has recorded so far today.', tone: 'positive' as const };

  const syncFreshness = !input.hydrated || input.syncState === 'offline'
    ? { label: 'Offline', state: 'offline' as const, detail: 'Showing available local information.' }
    : input.syncState === 'synced' && healthFreshness !== 'stale'
      ? { label: 'Updated from available data', state: 'fresh' as const, detail: 'Local records are available; health freshness follows the provider timestamp.' }
      : healthFreshness === 'stale'
        ? { label: 'Health data is dated', state: 'stale' as const, detail: 'Refresh Health to update provider measurements.' }
        : { label: 'Local data available', state: 'dated' as const, detail: 'Some information may not have a provider timestamp.' };

  return { briefing, observations: top, recommendations: topRecommendations, activity: orderedActivity, today: { mealsLogged, waterOunces, steps, fastingActive: activeFasting }, freshness: syncFreshness };
}

function priorityRank(priority: LiveInsight['priority']): number {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
}
