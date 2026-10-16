import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const planner = source('app/(tabs)/planner.tsx');
const programCelebration = source('components/ProgramAppliedCelebration.tsx');
const coach = source('app/coach.tsx');
const recipes = source('app/(tabs)/recipes.tsx');
const signUp = source('app/auth/sign-up.tsx');
const signIn = source('app/auth/sign-in.tsx');
const callback = source('app/auth/callback.tsx');
const onboarding = source('app/index.tsx');

describe('responsiveness follow-up interaction contracts', () => {
  it('keeps Program application visible, busy, retryable, and safely positioned', () => {
    expect(planner).toContain('if (generating) return;');
    expect(planner).toContain('busy: generating');
    expect(planner).toContain('Applying Program…');
    expect(planner).toContain('Retry Program');
    expect(planner).toContain('if (confirmedProgram) setProgramModal(CLOSED_PROGRAM_MODAL);');
    expect(planner).toContain('bottomOffset={Math.max(insets.bottom + 100, 132)}');
    expect(programCelebration).toContain('bottomOffset?: number;');
    expect(programCelebration).toContain('width: 44');
    expect(programCelebration).toContain('height: 44');
  });

  it('uses reachable Coach controls while preserving the complete request-response contract', () => {
    expect(coach).toContain('complete request/response exchange');
    expect(coach).toContain('headerAction: {');
    expect(coach).toContain('copyResponseButton: {');
    expect(coach).toContain('deleteSavedChatButton: {');
    expect(coach).toContain('menuClose: {');
    expect(coach).toContain('minHeight: 44');
  });

  it('shows the entire saved Discover rail and full touch frames for key recipe actions', () => {
    const savedStart = recipes.indexOf('Saved recipes');
    const savedEnd = recipes.indexOf('</SwipeGestureExclusion>', savedStart);
    const savedRail = recipes.slice(savedStart, savedEnd);
    expect(savedRail).toContain('savedDiscoverRecipes.map((recipe)');
    expect(savedRail).not.toContain('savedDiscoverRecipes.slice(');
    expect(recipes).toContain('headerSavedButton: {');
    expect(recipes).toContain('saveButton: {');
    expect(recipes).toContain('stepperButton: {');
    expect(recipes).toContain('width: 44');
    expect(recipes).toContain('height: 44');
  });

  it('provides deterministic and accessible auth recovery without orphaned callback timers', () => {
    expect(signUp).toMatch(/router\.replace\(['"]\/auth\/sign-in['"] as any\)/);
    expect(signUp).toContain('accessibilityState={{ disabled: loading, busy: loading }}');
    expect(signUp).toContain('accessibilityRole="alert"');
    expect(signIn).toMatch(/busy:\s*loading === ['"]google['"]/);
    expect(signIn).toMatch(/busy:\s*loading === ['"]email['"]/);
    expect(callback).toContain('const redirectTimerRef = useRef');
    expect(callback).toContain('const clearPendingRedirect = useCallback');
    expect(callback).toContain('const scheduleRedirect = useCallback');
    expect(callback).toContain('clearTimeout(redirectTimerRef.current)');
    expect(callback).toContain('useEffect(() => clearPendingRedirect, [clearPendingRedirect]);');
  });

  it('announces selected onboarding activity and diet choices', () => {
    expect(onboarding).toContain('accessibilityRole="radio"');
    expect(onboarding).toContain('accessibilityState={{ selected }}');
    expect(onboarding).toContain('activity level');
    expect(onboarding).toContain('diet preference');
  });
});
