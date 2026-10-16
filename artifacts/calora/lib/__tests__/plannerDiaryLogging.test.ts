import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const plannerSource = readFileSync(resolve(__dirname, '../../app/(tabs)/planner.tsx'), 'utf8');

describe('Plan diary logging contract', () => {
  it('records a selected Plan meal on Today rather than the scheduled slot day', () => {
    const addToDiaryBlock = plannerSource.slice(
      plannerSource.indexOf('const addToDiary = (meal: PlannerMeal) => {'),
      plannerSource.indexOf('const updatePlannerComponent ='),
    );
    expect(addToDiaryBlock).toContain('createPlannerDraft(meal, dateKey())');
  });

  it('passes the visible review draft directly to acceptance', () => {
    expect(plannerSource).toContain('acceptFoodMemory(plannerReviewDraft.id, plannerReviewDraft)');
  });

  it('does not close the review or announce success when acceptance returns no log', () => {
    const acceptanceBlock = plannerSource.slice(
      plannerSource.indexOf('const acceptPlannerDraft = async () => {'),
      plannerSource.indexOf('const dismissPlannerReview = () => {'),
    );

    expect(acceptanceBlock).toContain("if (!acceptedLog)");
    expect(acceptanceBlock).toContain("This planned meal was not added to your diary. Please try again.");
    expect(acceptanceBlock.indexOf('setPlannerReviewDraftId(null)')).toBeGreaterThan(acceptanceBlock.indexOf('if (!acceptedLog)'));
    expect(acceptanceBlock.indexOf("acknowledge('Added to diary.')")).toBeGreaterThan(acceptanceBlock.indexOf('setPlannerReviewDraftId(null)'));
  });

  it('shows an actionable error instead of save success when local persistence fails', () => {
    expect(plannerSource).toContain('persistenceError, retryPersistence');
    expect(plannerSource).toContain("title={persistenceError ? 'Plan changes not saved' : undefined}");
    expect(plannerSource).toContain("tone={persistenceError ? 'error' : 'success'}");
    expect(plannerSource).toContain("actionLabel={persistenceError ? (retryingPersistence ? 'Retrying…' : 'Retry')");
    expect(plannerSource).toContain('await retryPersistence();');
    expect(plannerSource).toContain("acknowledge('Your Plan is saved on this device.')");
  });
});
