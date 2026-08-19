import { describe, expect, it } from 'vitest';
import {
  getWorkspaceSwipeTargetIndex,
  isWorkspaceSwipeIntent,
  WORKSPACE_SWIPE_ACTIVATION_DISTANCE,
  WORKSPACE_SWIPE_COMMIT_DISTANCE,
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

  it('rejects invalid active indexes instead of selecting arbitrary content', () => {
    expect(getWorkspaceSwipeTargetIndex(-1, 3, -80, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(3, 3, 80, 0)).toBeNull();
    expect(getWorkspaceSwipeTargetIndex(0, 0, -80, 0)).toBeNull();
  });
});