import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const plannerSource = readFileSync(resolve(__dirname, '../../app/(tabs)/planner.tsx'), 'utf8');

describe('Plan diary logging contract', () => {
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
});
