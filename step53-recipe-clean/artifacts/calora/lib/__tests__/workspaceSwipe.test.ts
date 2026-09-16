import { describe, expect, it } from 'vitest';
import {
  getWorkspaceSwipeTargetIndex,
  getWorkspaceSwipeOffset,
  isWorkspaceSwipeIntent,
  isWorkspaceSwipeVelocityIntent,
  WORKSPACE_SWIPE_ACTIVATION_DISTANCE,
  WORKSPACE_SWIPE_COMMIT_DISTANCE,
  WORKSPACE_SWIPE_COMMIT_VELOCITY,
  WORKSPACE_SWIPE_EDGE_RESISTANCE,
  WORKSPACE_SWIPE_VELOCITY_MIN_DISTANCE,
} from '@/lib/workspaceSwipe';

describe('workspace swipe intent', () => {
  it('recognizes a deliberate horizontal gesture in either direction', () => {
    expect(isWorkspaceSwipeIntent(WORKSPACE_SWIPE_ACTIVATION_DISTANCE, 2)).toBe(true);
    expect(isWorkspaceSwipeIntent(-WORKSPACE_SWIPE_ACTIVATION_DISTANCE, -2)).toBe(true);
  });

  it('does not claim taps, small movements, or vertical scrolling', () => {
    expect(isWorkspaceSwipeIntent(0, 0)).toBe(false);
    expect(isWorkspaceSwipeIntent(WORKSPACE_SWIPE_ACTIVATION_DISTANCE - 1, 0)).toBe(false);
    expect(isWorkspaceSwipeIntent(20, 30)).toBe(false);
    expect(isWorkspaceSwipeIntent(20, 18)).toBe(false);
  });
});

describe('workspace swipe target', () => {
  it('moves to the next workspace after a committed left swipe', () => {
    expect(getWorkspaceSwipeTargetIndex(0, 3, -WORKSPACE_SWIPE_COMMIT_DISTANCE, 3)).toBe(1);
    expect(getWorkspaceSwipeTargetIndex(1, 3, -80, 4)).toBe(2);
  });

  it('moves to the previous workspace after a committed right swipe', () => {
    expect(getWorkspaceSwipeTargetIndex(2, 3, WORKSPACE_SWIPE_COMMIT_DISTANCE, 3)).toBe(1);
    expect(getWorkspaceSwipeTargetIndex(1, 3, 80, -4)).toBe(0);
  });

  it('does not wrap past the first or last workspace', () => {
    expect(getWorkspaceSwipeTargetIndex(0, 3, 80, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(2, 3, -80, 0)).toBeNull();
  });

  it('does not switch for short, diagonal, or vertical gestures', () => {
    expect(getWorkspaceSwipeTargetIndex(1, 3, -(WORKSPACE_SWIPE_COMMIT_DISTANCE - 1), 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(1, 3, -80, 70)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(1, 3, 8, 80)).toBeNull();
  });

  it('accepts a deliberate fast flick before the distance threshold', () => {
    expect(getWorkspaceSwipeTargetIndex(1, 3, -20, 2, -WORKSPACE_SWIPE_COMMIT_VELOCITY, 0.04)).toBe(2);
    expect(getWorkspaceSwipeTargetIndex(1, 3, 20, 2, WORKSPACE_SWIPE_COMMIT_VELOCITY, 0.04)).toBe(0);
  });

  it('accepts an unambiguous fast flick below the ordinary activation distance', () => {
    const shortFlick = WORKSPACE_SWIPE_VELOCITY_MIN_DISTANCE + 2;
    expect(shortFlick).toBeLessThan(WORKSPACE_SWIPE_ACTIVATION_DISTANCE);
    expect(getWorkspaceSwipeTargetIndex(1, 3, -shortFlick, 1, -0.8, 0.05)).toBe(2);
    expect(getWorkspaceSwipeTargetIndex(1, 3, shortFlick, 1, 0.8, 0.05)).toBe(0);
  });

  it('rejects fast vertical or ambiguous flicks', () => {
    expect(getWorkspaceSwipeTargetIndex(1, 3, -20, 18, -0.9, 0.05)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(1, 3, -20, 2, -0.4, 0.7)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(1, 3, -2, 0, -1.2, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(1, 3, -8, 1, 0.9, 0)).toBeNull();
  });

  it('rejects invalid active indexes instead of selecting arbitrary content', () => {
    expect(getWorkspaceSwipeTargetIndex(-1, 3, -80, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(3, 3, 80, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(0, 0, -80, 0)).toBeNull();
  });
});

describe('workspace velocity intent', () => {
  it('recognizes short, fast, directionally consistent horizontal flicks', () => {
    expect(isWorkspaceSwipeVelocityIntent(-7, 1, -0.8, 0.04)).toBe(true);
    expect(isWorkspaceSwipeVelocityIntent(7, 1, 0.8, 0.04)).toBe(true);
  });

  it('rejects tiny, vertical, slow, or directionally inconsistent motion', () => {
    expect(isWorkspaceSwipeVelocityIntent(-2, 0, -1.2, 0)).toBe(false);
    expect(isWorkspaceSwipeVelocityIntent(-7, 6, -0.8, 0.04)).toBe(false);
    expect(isWorkspaceSwipeVelocityIntent(-7, 1, -0.3, 0.04)).toBe(false);
    expect(isWorkspaceSwipeVelocityIntent(-7, 1, 0.8, 0.04)).toBe(false);
  });
});

describe('workspace swipe offset', () => {
  it('tracks the finger between available workspaces', () => {
    expect(getWorkspaceSwipeOffset(1, 3, -72)).toBe(-72);
    expect(getWorkspaceSwipeOffset(1, 3, 72)).toBe(72);
  });

  it('adds resistance past the first and last workspace', () => {
    expect(getWorkspaceSwipeOffset(0, 3, 100)).toBe(100 * WORKSPACE_SWIPE_EDGE_RESISTANCE);
    expect(getWorkspaceSwipeOffset(2, 3, -100)).toBe(-100 * WORKSPACE_SWIPE_EDGE_RESISTANCE);
  });

  it('rejects invalid indexes and non-finite distances', () => {
    expect(getWorkspaceSwipeOffset(-1, 3, 40)).toBe(0);
    expect(getWorkspaceSwipeOffset(3, 3, 40)).toBe(0);
    expect(getWorkspaceSwipeOffset(0, 3, Number.NaN)).toBe(0);
  });
});

describe('nested horizontal gesture boundaries', () => {
  it('keeps the expanded Weight chart ScrollView inside a pager exclusion boundary', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/insights.tsx'),
      'utf8',
    );
    const chartScrollStart = source.indexOf('ref={scrollViewRef}');
    expect(chartScrollStart).toBeGreaterThan(-1);

    const boundaryStart = source.lastIndexOf('<SwipeGestureExclusion>', chartScrollStart);
    const chartScrollEnd = source.indexOf('</ScrollView>', chartScrollStart);
    const boundaryEnd = source.indexOf('</SwipeGestureExclusion>', chartScrollEnd);

    expect(boundaryStart).toBeGreaterThan(source.lastIndexOf('</SwipeGestureExclusion>', chartScrollStart));
    expect(chartScrollEnd).toBeGreaterThan(chartScrollStart);
    expect(boundaryEnd).toBeGreaterThan(chartScrollEnd);
  });
});