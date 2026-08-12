/**
 * Selection of the diary log that anchors referral qualification.
 *
 * Only logs with an explicit server-issued capture session id (UUID) may be
 * synced; manual/search/recipe/planner logs and anonymous-capture logs must
 * be skipped even when they appear before a real capture log.
 */
import { describe, it, expect } from 'vitest';
import { findCaptureBackedLog, isServerCaptureSessionId } from '../referralQualification';
import { buildAcceptResult } from '../captureReviewTransitions';
import { captureAnalysisToDraft } from '../foodMemory';
import type { FoodLog } from '../captureReviewTransitions';
import type { CaptureAnalysis } from '@workspace/api-client-react';

const SERVER_SESSION = '4f8a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b';

function log(overrides: Partial<FoodLog>): FoodLog {
  return {
    id: 'log-1',
    name: 'Meal',
    date: '2026-08-11',
    meal: 'Lunch',
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 15,
    source: 'Manual',
    confidence: 80,
    time: 'Just now',
    serving: '1 serving',
    ...overrides,
  };
}

describe('isServerCaptureSessionId', () => {
  it('accepts server UUIDs and rejects local fallback ids', () => {
    expect(isServerCaptureSessionId(SERVER_SESSION)).toBe(true);
    expect(isServerCaptureSessionId('manual-1754899200000-abc')).toBe(false);
    expect(isServerCaptureSessionId('memory-draft-food-123')).toBe(false);
    expect(isServerCaptureSessionId(undefined)).toBe(false);
    expect(isServerCaptureSessionId('')).toBe(false);
  });
});

describe('findCaptureBackedLog', () => {
  it('skips manual/search/recipe/planner logs that precede a capture-backed log', () => {
    const logs = [
      log({ id: 'manual', memoryId: 'memory-draft-manual-1754899200000' }),
      log({ id: 'recipe', memoryId: 'memory-draft-recipe-1754899200001' }),
      log({ id: 'planner', memoryId: 'memory-draft-planner-1754899200002' }),
      log({ id: 'capture', captureSessionId: SERVER_SESSION, memoryId: `memory-draft-${SERVER_SESSION}` }),
    ];
    expect(findCaptureBackedLog(logs)?.id).toBe('capture');
  });

  it('returns undefined when no log is capture-backed', () => {
    const logs = [
      log({ id: 'manual', memoryId: 'memory-draft-manual-1754899200000' }),
      log({ id: 'anon-capture', captureSessionId: 'client-session-9' }),
    ];
    expect(findCaptureBackedLog(logs)).toBeUndefined();
  });
});

describe('capture provenance threading (draft → accepted log)', () => {
  const analysis = (sessionId: string): CaptureAnalysis => ({
    sessionId,
    mode: 'food',
    status: 'review',
    title: 'Grilled chicken bowl',
    reviewMessage: 'Review',
    provider: 'Calora Vision',
    candidates: [
      {
        id: 'cand-1',
        editable: true,
        name: 'Grilled chicken bowl',
        serving: '1 bowl',
        calories: 520,
        proteinG: 42,
        carbsG: 45,
        fatG: 18,
        confidence: 85,
        provenance: 'Photo estimate',
        sourceLabel: 'Calora Vision',
      },
    ],
  });

  it('carries a server session UUID from analysis through accept into the log', () => {
    const draft = captureAnalysisToDraft(analysis(SERVER_SESSION), '2026-08-11', 'Lunch');
    expect(draft.captureSessionId).toBe(SERVER_SESSION);
    const { log: accepted } = buildAcceptResult(draft, 'log-x', new Date().toISOString());
    expect(accepted.captureSessionId).toBe(SERVER_SESSION);
    expect(findCaptureBackedLog([accepted])?.id).toBe('log-x');
  });

  it('does not mark anonymous/local session ids as capture-backed', () => {
    const draft = captureAnalysisToDraft(analysis('local-fallback-123'), '2026-08-11', 'Lunch');
    expect(draft.captureSessionId).toBeUndefined();
    const { log: accepted } = buildAcceptResult(draft, 'log-y', new Date().toISOString());
    expect(accepted.captureSessionId).toBeUndefined();
    expect(findCaptureBackedLog([accepted])).toBeUndefined();
  });
});
