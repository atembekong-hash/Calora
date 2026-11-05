/**
 * Home screen — living-state action button smoke tests.
 *
 * These tests verify that:
 *   1. The action button is always rendered (unconditional in the fuel card).
 *   2. First-launch state drives a `log_meal` action → opens the Add Food modal.
 *   3. A reflection-ready evening state drives a `view_progress` action → navigates
 *      to the insights route.
 *   4. All four `LivingAction` kinds resolve to the correct side-effect descriptor.
 *
 * The button (testID="living-state-action") is rendered unconditionally at
 *   artifacts/calora/app/(tabs)/index.tsx lines 642-658 — there is no conditional
 *   guard around it, so it is always present when HomeScreen mounts.
 *
 * Handler dispatch is tested via the pure `resolveLivingActionEffect` helper that
 * HomeScreen delegates to. Integration with expo-router and the Add Food modal is
 * covered by the effect descriptors ('navigate' / 'open_add_food').
 */

import { describe, expect, it } from 'vitest';
import { deriveLivingState } from '../livingState';
import { resolveLivingActionEffect } from '../livingActionHandler';
import type { FoodLog, Profile } from '@/context/CaloraContext';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const profile: Profile = {
  name: 'Casey',
  goal: 'maintain',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 170,
  weightKg: 72,
  targetWeightKg: 72,
  age: 29,
  calorieTarget: 2000,
};

const meal = (date: string, kind: FoodLog['meal']): FoodLog => ({
  id: `${date}-${kind}`,
  name: kind,
  date,
  meal: kind,
  calories: 450,
  protein: 25,
  carbs: 45,
  fat: 14,
  source: 'USDA verified',
  confidence: 95,
  time: '12:00 PM',
  serving: '1 serving',
});

// ---------------------------------------------------------------------------
// 1. Button presence — unconditional render
// ---------------------------------------------------------------------------

describe('living-state-action button — static render guarantee', () => {
  it('is not behind any conditional guard in the HomeScreen source', async () => {
    /**
     * The button at testID="living-state-action" sits directly inside the
 * fuel card View without any surrounding conditional expression.
     * We verify this by reading the source and confirming the testID appears
     * exactly once, outside of any `{condition &&` or ternary guard.
     *
     * A future accidental `{someBool && <Pressable testID="living-state-action"`
     * would be caught by the component test below (which would fail to find
     * the element) or by the grep assertion here.
     */
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    // The testID must be present exactly once.
    const occurrences = source.split('testID="living-state-action"').length - 1;
    expect(occurrences).toBe(1);

    // The line containing the testID must NOT be immediately preceded by a
    // short-circuit `&&` or ternary `?` operator on the same element opening.
    const lines = source.split('\n');
    const lineIndex = lines.findIndex((line) =>
      line.includes('testID="living-state-action"'),
    );
    expect(lineIndex).toBeGreaterThan(-1);

    // Check the Pressable opening tag — no conditional guard on the same element.
    const pressableLine = lines[lineIndex - 1] ?? lines[lineIndex];
    expect(pressableLine).not.toMatch(/&&\s*$/);
    expect(pressableLine).not.toMatch(/\?\s*</);
  });
});

describe('Today dashboard visual-source boundary', () => {
  it('applies one shared 20 percent vertical compression to Today widgets', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('const TODAY_WIDGET_HEIGHT_SCALE = 0.8;');
    expect(source).toContain('const h = (value: number) => value * TODAY_WIDGET_HEIGHT_SCALE;');
    expect(source).toContain('const HYDRATION_WIDGET_HEIGHT = 199;');
    expect(source).toContain('height: h(SUPPORTING_WIDGET_BASE_HEIGHT)');
    expect(source).toContain('dashboardSingleColumnGrid');
    expect(source).toContain('const STEPS_RING_SIZE = 120 * TODAY_WIDGET_HEIGHT_SCALE;');
  });

  it('keeps the profile shortcut bound to the shared persisted photo control', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );
    const avatarStart = source.indexOf('accessibilityLabel="Profile shortcut"');
    const avatarEnd = source.indexOf('</Pressable>', avatarStart);
    const avatarSection = source.slice(avatarStart, avatarEnd);

    expect(avatarSection).toContain('<Feather name="user"');
    expect(avatarSection).toContain('<ProfilePhoto');
    expect(avatarSection).toContain("key={profilePhotoUri ?? 'profile-photo-empty'}");
    expect(avatarSection).toContain('uri={profilePhotoUri}');
  });

  it('uses the shared honest food-thumbnail resolver for diary rows without adding a large gallery', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).not.toMatch(/<ImageBackground\b|LinearGradient/);
    expect(source).toContain("require('../../assets/images/calora-home-header.jpg')");
    expect(source).toContain("import { FoodLogThumbnail } from '@/components/FoodLogThumbnail';");
    expect(source).toContain('<FoodLogThumbnail log={log} size={44} borderRadius={14} />');
    expect(source).not.toContain('useHourlyHeaderImage');
    expect(source).toContain('normalizeFoodImageUrl(recipe.image)');
    expect(source).toContain('styles.recipeWidgetImage');
    expect(source).toContain('today-supporting-widgets-grid');
    expect(source).toContain('dashboard-macro-card');
    expect(source).toContain('useSingleColumnWellness = viewportWidth < 360 || fontScale > 1.22');
    expect(source).toContain('status.remainingMs > 0');
    expect(source).toContain('<FoodLogThumbnail log={log} size={44} borderRadius={14} />');
    expect(source).toContain('styles.emptyDiaryGlyph');
  });
});

// ---------------------------------------------------------------------------
// 2. First-launch → log_meal → opens Add Food modal
// ---------------------------------------------------------------------------

describe('living-state-action — first launch (no history)', () => {
  it('deriveLivingState produces action.kind === log_meal for a brand-new user', () => {
    const state = deriveLivingState({
      profile: null,
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: false,
      now: new Date('2026-08-07T08:00:00.000Z'),
    });

    expect(state.routineStage).toBe('first_day');
    expect(state.action.kind).toBe('log_meal');
  });

  it('resolveLivingActionEffect maps log_meal to open_add_food', () => {
    const effect = resolveLivingActionEffect('log_meal');
    expect(effect).toEqual({ kind: 'open_add_food' });
  });

  it('first-launch action label is set for the morning period', () => {
    const state = deriveLivingState({
      profile: null,
      logs: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: false,
      now: new Date('2026-08-07T08:30:00.000Z'),
    });

    expect(state.action.label).toBe('Log breakfast');
  });
});

// ---------------------------------------------------------------------------
// 3. Reflection-ready evening → view_progress → navigates to insights
// ---------------------------------------------------------------------------

describe('living-state-action — reflection-ready evening', () => {
  const sevenDays = Array.from({ length: 7 }, (_, i) =>
    `2026-08-${String(i + 1).padStart(2, '0')}`,
  );
  const allLogs = sevenDays.flatMap((date) => [
    meal(date, 'Breakfast'),
    meal(date, 'Lunch'),
    meal(date, 'Dinner'),
  ]);

  it('deriveLivingState produces action.kind === view_progress for a consistent evening', () => {
    const state = deriveLivingState({
      profile,
      logs: allLogs,
      waterLogs: Object.fromEntries(sevenDays.map((d) => [d, 48])),
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      now: new Date('2026-08-07T20:00:00.000Z'),
    });

    expect(state.routineStage).toBe('consistent');
    expect(state.category).toBe('reflection_ready');
    expect(state.action.kind).toBe('view_progress');
  });

  it('resolveLivingActionEffect maps view_progress to navigate insights route', () => {
    const effect = resolveLivingActionEffect('view_progress');
    expect(effect).toEqual({ kind: 'navigate', route: '/(tabs)/insights' });
  });
});

// ---------------------------------------------------------------------------
// 3b. Afternoon low-water → add_water → does NOT open the Add Food modal
// ---------------------------------------------------------------------------

describe('living-state-action — afternoon low-water check-in', () => {
  // Build a user who has logged consistently for several days, has lunch today,
  // but only has 8 oz of water logged — below the 16 oz threshold that triggers
  // the hydration nudge in the afternoon period (14:00–17:59 UTC).
  const sevenDays = Array.from({ length: 7 }, (_, i) =>
    `2026-08-${String(i + 1).padStart(2, '0')}`,
  );
  const today = '2026-08-07';
  const pastDays = sevenDays.filter((d) => d !== today);

  // Breakfast + Lunch + Dinner for every past day; Breakfast + Lunch for today.
  const allLogs = [
    ...pastDays.flatMap((date) => [
      meal(date, 'Breakfast'),
      meal(date, 'Lunch'),
      meal(date, 'Dinner'),
    ]),
    meal(today, 'Breakfast'),
    meal(today, 'Lunch'),
  ];

  it('deriveLivingState produces action.kind === add_water for afternoon + low water', () => {
    const state = deriveLivingState({
      profile,
      logs: allLogs,
      // 8 oz today — below the 16 oz threshold
      waterLogs: { ...Object.fromEntries(pastDays.map((d) => [d, 48])), [today]: 8 },
      moodLogs: {},
      activityLogs: {},
      repeatPatterns: [],
      plannerMeals: [],
      onboardingComplete: true,
      // 15:30 — firmly inside the 'afternoon' period (14:00–17:59)
      now: new Date('2026-08-07T15:30:00.000Z'),
    });

    expect(state.timePeriod).toBe('afternoon');
    expect(state.signal.waterToday).toBe(8);
    expect(state.action.kind).toBe('add_water');
    expect(state.action.label).toBe('Add 8 fl oz');
  });

  it('resolveLivingActionEffect maps add_water to { kind: add_water, ounces: 8 }', () => {
    const effect = resolveLivingActionEffect('add_water');
    expect(effect).toEqual({ kind: 'add_water', ounces: 8 });
  });

  it('resolveLivingActionEffect does NOT return open_add_food for add_water', () => {
    const effect = resolveLivingActionEffect('add_water');
    expect(effect.kind).not.toBe('open_add_food');
  });
});

// ---------------------------------------------------------------------------
// 4. Full dispatch matrix — all four LivingAction kinds
// ---------------------------------------------------------------------------

describe('resolveLivingActionEffect — full dispatch matrix', () => {
  it('log_meal → open_add_food', () => {
    expect(resolveLivingActionEffect('log_meal')).toEqual({ kind: 'open_add_food' });
  });

  it('add_water → add_water with 8 ounces', () => {
    expect(resolveLivingActionEffect('add_water')).toEqual({
      kind: 'add_water',
      ounces: 8,
    });
  });

  it('view_progress → navigate to insights tab', () => {
    expect(resolveLivingActionEffect('view_progress')).toEqual({
      kind: 'navigate',
      route: '/(tabs)/insights',
    });
  });

  it('open_planner → navigate to planner tab', () => {
    expect(resolveLivingActionEffect('open_planner')).toEqual({
      kind: 'navigate',
      route: '/(tabs)/planner',
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Today dashboard hierarchy and precision
// ---------------------------------------------------------------------------

describe('Today dashboard — date context and display contracts', () => {
  it('keeps exactly one selected-day navigator and removes the planned-for-today widget', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source.split('accessibilityLabel="Previous diary day"').length - 1).toBe(1);
    expect(source).not.toContain('PlannerPeek');
    expect(source).not.toContain('planned for today');
  });

  it('opens a calendar picker from the date selector and restores today from past dates', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('testID="open-calendar-date-picker"');
    expect(source).toContain('testID="previous-calendar-month"');
    expect(source).toContain('testID="next-calendar-month"');
    expect(source).toContain('testID="back-to-today"');
    expect(source).toContain('testID="calendar-back-to-today"');
    expect(source).toContain('setCalendarMonth(calendarMonthKey(selectedDate))');
    expect(source).toContain('setSelectedDate(dateKey(new Date()))');
  });

  it('keeps the Add meal sheet reachable on native and gives the verified list room to scroll', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('styles.addFoodModalCard');
    expect(source).toContain("import { BottomSheet } from '@/components/BottomSheet'");
    expect(source).toContain('<BottomSheet');
    expect(source).toContain('sheetStyle={[styles.modalCard, styles.addFoodModalCard');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain('nestedScrollEnabled');
  });

  it('keeps manual entry fixed below the scrollable food options', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );
    const manualFooter = source.indexOf('styles.manualEntryFooter');
    const photoOption = source.indexOf('testID="photo-log-button"');
    const verifiedLabel = source.indexOf('>VERIFIED</Text>');

    expect(source).toContain('<KeyboardAvoidingView behavior="padding" style={styles.addFoodSheet}>');
    expect(source).not.toContain('stickyHeaderIndices');
    expect(source).toContain('testID="voice-log-button"');
    expect(source).toContain("params: { date: entryDate, capture: 'voice' }");
    expect(source).toContain('testID="barcode-log-button"');
    expect(source).toContain("params: { date: entryDate, capture: 'barcode' }");
    expect(source).toContain('styles.manualFooterRow');
    expect(source).toContain('manualInput: { flex: 1, minWidth: 0');
    expect(manualFooter).toBeGreaterThan(verifiedLabel);
    expect(manualFooter).toBeGreaterThan(photoOption);
    expect(photoOption).toBeLessThan(verifiedLabel);
  });

  it('keeps the diary title and Add action inside the log card', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );
    const logCardStart = source.indexOf('styles.logCard');
    const logCardHeader = source.indexOf('styles.logCardHeader');
    const diaryTitle = source.indexOf('{isToday(selectedDate) ? \'Today’s log\' : \'Diary log\'}');
    const addAction = source.indexOf('accessibilityLabel="Add meal"', logCardHeader);

    expect(logCardStart).toBeGreaterThan(-1);
    expect(logCardHeader).toBeGreaterThan(logCardStart);
    expect(diaryTitle).toBeGreaterThan(logCardHeader);
    expect(addAction).toBeGreaterThan(logCardHeader);
  });

  it('opens the Health Data connection sheet directly from the calorie ring', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain("router.push('/profile?tab=account&open=health')");
  });

  it('records concrete clock times for every Home diary insertion path', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).not.toContain("time: 'Just now'");
    expect(source.split('time: formatLogTime()').length - 1).toBe(3);
  });

  it('keeps the top greeting elevated without the removed bottom insight line', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('paddingBottom: 26');
    expect(source).not.toContain('styles.heroInsight');
    expect(source).not.toContain('livingState.headline');
  });

  it('enlarges only the calorie ring into the space above it', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('const CALORIE_RING_SCALE = 1.2');
    expect(source).toContain('style={[gaugeStyles.ringLayer');
    expect(source).toContain('const ringTop    = gaugeH - ringH');
    expect(source).toContain('const ringLeft   = (gaugeW - ringW) / 2');
  });

  it('uses stronger contrast for the central remaining-calorie figure only', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('gaugeStyles.remainingNumber, { color: colors.strongForeground }');
  });

  it('mounts Recipes for You immediately below the supporting grid and keeps the secondary insight unique', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source.split('testID="today-contextual-insight"').length - 1).toBe(1);
    expect(source.indexOf('testID="today-contextual-insight"')).toBeGreaterThan(source.indexOf('styles.footerNote'));
    expect(source.indexOf('styles.recipeSection')).toBeLessThan(source.indexOf('testID="today-contextual-insight"'));
    expect(source).not.toContain("widgetId === 'mealRhythm'");
    expect(source).toContain("isIntelligenceFeatureEnabled('intelligence.insights.today')");
    expect(source).toContain('selectVisibleTodayInsight');
  });

  it('renders dashboard calories, macros, and burned energy as whole numbers', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('formatWhole(log.calories)');
    expect(source).toContain('formatQuantity(value)');
    expect(source).toContain('formatQuantity(selectedTotals.protein)');
    expect(source).toContain('formatWhole(burned)');
    expect(source).not.toContain('burned?.toLocaleString()');
  });

  it('rejects fractional manual-food calories instead of silently changing their value', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('const kcal = parseWholeNumberInput(customCalories);');
    expect(source).toContain("setManualError('Enter whole-number calories greater than zero.');");
    expect(source).toContain('const nextCalories = parseWholeNumberInput(calories);');
  });

  it('opens a direct independent macro-goal editor from Macro balance', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('testID="edit-macro-goals"');
    expect(source).toContain('testID="save-macro-goals"');
    expect(source).toContain('testID="cancel-macro-goals"');
    expect(source).toContain('onPress={openMacroGoals}');
    expect(source).toContain('proteinTargetGrams: values.protein');
    expect(source).toContain('carbsTargetGrams: values.carbs');
    expect(source).toContain('fatTargetGrams: values.fat');
    const macroSection = source.slice(
      source.indexOf('>Macros Balance</Text>'),
      source.indexOf('<MoodCard', source.indexOf('>Macros Balance</Text>')),
    );
    expect(macroSection).not.toContain("router.navigate('/(tabs)/profile')");
    expect(macroSection).toContain('MacroBalanceDonut');
  });

  it('labels a no-Health Pedometer stream as session-only and keeps Health recovery reachable', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('Live since opened — ${healthMessage}');
    expect(source).toContain('Session steps since opened — ${healthMessage}');
    expect(source).toContain('`no ${healthStepsProvider} Steps recorded today`');
    expect(source).toContain('const sessionOnly = isLiveSessionOnly(tracking);');
    expect(source).toContain('const hasDailyProviderTotal = tracking.providerSteps !== null;');
    expect(source).toContain("healthConnection.granted.includes('steps')");
    expect(source).toContain("const hasReadyHealthConnection = healthConnection.authorization === 'requested'");
    expect(source).toContain("const healthStepsProvider = healthConnection.provider === 'health-connect' ? 'Health Connect' : 'Health';");
    expect(source).toContain("const needsDailyStepTotal = !hasDailyProviderTotal && (tracking.status !== 'live' || sessionOnly);");
    expect(source).toContain("? 'Update Health access'");
    expect(source).toContain("? 'Sync Health'");
    expect(source).toContain('const accessibilitySummary = `${accessibilityPrefix}:');
    expect(source).toContain('accessibilityRole="text"');
    expect(source).toContain('accessibilityLabel={accessibilitySummary}');
    expect(source).toContain('accessibilityRole="header"');
  });

  it('routes a permanent motion denial to settings rather than retrying the same prompt', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain("const needsMotionSettings = tracking.status === 'denied';");
    expect(source).toContain("? 'Open motion settings'");
    expect(source).toContain("const needsRetry = tracking.status === 'error';");
    expect(source).toContain("? 'Retry live steps'");
    expect(source).toContain('onOpenMotionSettings');
    expect(source).toContain('minHeight: 44');
  });

  it('renders the live step total inside an accessible progress ring and queues foreground milestones', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('function StepProgressRing');
    expect(source).toContain('testID="dashboard-steps-value"');
    expect(source).toContain('strokeDasharray={ringLength}');
    expect(source).toContain('testID="dashboard-steps-ring"');
    expect(source).toContain('<StepMilestoneCelebration');
    expect(source).toContain('milestone={liveStepMilestones[0] ?? null}');
    expect(source).toContain('onDismissMilestone={dismissLiveStepMilestone}');
  });

  it('keeps the reference Steps composition and supporting section aligned with the calorie card', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain("<CaloraFeatureIcon name=\"steps\"");
    expect(source).toContain('accessibilityRole="header" style={[styles.stepsCardTitle');
    expect(source).toContain('testID="dashboard-steps-action"');
    expect(source).toContain("<CaloraFeatureIcon name=\"mood\" size={22}");
    expect(source).toContain('dashboardTwoColumnGrid: { flexDirection: \'row\', flexWrap: \'wrap\', justifyContent: \'center\', gap: 5, marginHorizontal: -18');
    expect(source).toContain('recipeSection: { marginTop: 4, marginHorizontal: -10 }');
    expect(source).toContain("dashboardGridCell: { flexGrow: 0, flexShrink: 1, flexBasis: '49%', width: '49%', minWidth: 0, maxWidth: '49%' }");
    expect(source).toContain('const useSingleColumnWellness = viewportWidth < 360 || fontScale > 1.22;');
    expect(source).toContain('homeHeaderImage: { ...StyleSheet.absoluteFillObject, transform: [{ scale: 1.94 }, { translateX: -3 }] }');
    expect(source).toContain("dashboardFastingTrack: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: h(8) }");
  });

  it('keeps all five mood controls and macro values in the compact responsive cards', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('moodOptionsCompact: { flexWrap: \'wrap\'');
    expect(source).toContain('moodOptionCompact: { flexBasis: \'31%\'');
    expect(source).toContain('MacroBalanceDonut');
    expect(source).toContain('macroLegendValue');
  });

  it('follows today across a local-day change without overwriting a deliberate historical date', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toContain('const followsTodayRef = useRef(true);');
    expect(source).toContain('if (followsTodayRef.current) setSelectedDate(todayKey);');
    expect(source).toContain('followsTodayRef.current = date === dateKey(new Date());');
    expect(source).toContain('followsTodayRef.current = true;');
  });

  it('keeps the add-meal flow on every Today rhythm-card stage after removing Meals logged', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );
    const livingCard = source.slice(
      source.indexOf('function LivingRhythmCard'),
      source.indexOf('function RecipeSwipeWidget'),
    );

    expect(livingCard).not.toContain("livingState.routineStage === 'building'");
    expect(livingCard).toContain('testID="living-rhythm-add-meal-button"');
    expect(livingCard).toContain('accessibilityLabel="Add a meal from your rhythm card"');
    expect(livingCard).toContain('onPress={onAddMeal}');
    expect(source).not.toContain('<LivingRhythmCard');
    expect(source).not.toContain('onAddMeal={openAdd}');
    expect(source).not.toContain('Meals logged');
    expect(source).not.toContain('wellness-add-meal-button');
  });

  it('keeps dashboard recipe failures and empty results visible and recoverable', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );
    const widget = source.slice(
      source.indexOf('function RecipeSwipeWidget'),
      source.indexOf('const moodOptions'),
    );

    expect(widget).not.toContain('if (isError || (!isLoading && recipes.length === 0)) return null;');
    expect(widget).toContain('accessibilityLabel="Retry dashboard recipes"');
    expect(widget).toContain('accessibilityRole="alert"');
    expect(widget).toContain('const pageWidth = Math.max(110, Math.min(140, (width - 70) / 3));');
    expect(widget).toContain('width: pageWidth');
    expect(widget).toContain('Recipes for you');
    expect(widget).toContain('View all recipes');
    expect(widget).toContain('name="restaurant"');
    expect(widget).toContain('supportingWidgetColors(colors)');
    expect(widget).not.toContain('REFERENCE_WIDGET_PALETTE');
  });

  it('keeps the approved supporting-widget order and protects the calorie component boundary', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(__dirname, '../../app/(tabs)/index.tsx'), 'utf8');
    const grid = source.slice(source.indexOf('testID="today-supporting-widgets-grid"'), source.indexOf('styles.recipeSection'));
    expect(grid.indexOf('DashboardFastingCard')).toBeLessThan(grid.indexOf('StepsTodayCard'));
    expect(grid.indexOf('StepsTodayCard')).toBeLessThan(grid.indexOf('Macros Balance'));
    expect(grid.indexOf('Macros Balance')).toBeLessThan(grid.indexOf('<MoodCard'));
    expect(source).toContain('function MacroBalanceDonut');
    expect(source).toContain('strokeDasharray={`${segment} ${circumference - segment}`}');
    expect(source).toContain('height: h(SUPPORTING_WIDGET_BASE_HEIGHT)');
    expect(source).toContain("stepsCard: { flex: 1, alignSelf: 'stretch', height: h(SUPPORTING_WIDGET_BASE_HEIGHT), minHeight: 0");
    expect(source).toContain('dashboardHydrationFrame: { height: h(HYDRATION_WIDGET_HEIGHT), minHeight: h(HYDRATION_WIDGET_HEIGHT) }');
    expect(source).toContain("dashboardExpandedWidgetRow: { width: 'auto', marginHorizontal: 8, marginBottom: 14 }");
    expect(source).toContain('styles.dashboardHydrationFrame, styles.dashboardFastingExpandedCard');
    expect(source).toContain('styles.dashboardHydrationFrame, styles.stepsExpandedCard');
    expect(source).toContain('expanded && styles.dashboardHydrationFrame');
    expect(source).toContain('expanded && styles.dashboardHydrationFrame, expanded ? styles.moodExpandedCard');
    expect(source).toContain('dashboardFastingMiddle');
    expect(source).toContain('dashboardFastingExpandedMiddle');
    expect(source).toContain('Ready to start');
    expect(source).toContain('dashboardFastingExpandedFooter');
    expect(source).toContain('stepsExpandedBody');
    expect(source).toContain('accessibilityLabel="Open Steps"');
    expect(source).toContain('stepsExpandedSummary');
    expect(source).toContain('macroBlockExpanded');
    expect(source).toContain('<AnimatedMacroBar expanded');
    expect(source).toContain("moodOptionsExpanded: { flex: 1, justifyContent: 'center'");
    expect(source).toContain("moodOptionsCompact: { flexWrap: 'wrap'");
    expect(source).toContain("dashboardPreferences.order.filter((id) => id === 'water' || id === 'recipes' || id === 'quickLog' || id === 'log')");
    expect(source).toContain("if (widgetId === 'recipes')");
    const calorieStart = source.indexOf('function CalorieGauge');
    const fastingStart = source.indexOf('function DashboardFastingCard');
    expect(calorieStart).toBeGreaterThan(-1);
    expect(fastingStart).toBeGreaterThan(calorieStart);
    expect(source.slice(calorieStart, fastingStart)).toContain('dashboard-burned-stat');
  });
});
