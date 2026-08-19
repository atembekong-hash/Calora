export const WORKSPACE_SWIPE_ACTIVATION_DISTANCE = 12;
export const WORKSPACE_SWIPE_COMMIT_DISTANCE = 44;
export const WORKSPACE_SWIPE_DOMINANCE_RATIO = 1.35;

/**
 * Claims only gestures that are clearly horizontal. Keeping this separate from
 * the larger commit threshold lets the tab strip cancel an in-progress press
 * without turning small, accidental movements into navigation.
 */
export function isWorkspaceSwipeIntent(
  dx: number,
  dy: number,
  minimumDistance = WORKSPACE_SWIPE_ACTIVATION_DISTANCE,
): boolean {
  const horizontalDistance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);

  return (
    horizontalDistance >= minimumDistance
    && horizontalDistance > verticalDistance * WORKSPACE_SWIPE_DOMINANCE_RATIO
  );
}

/**
 * Resolves a completed swipe to the adjacent workspace index.
 *
 * A left swipe advances, a right swipe goes back, and first/last workspaces
 * never wrap. Null means the gesture should leave the active workspace alone.
 */
export function getWorkspaceSwipeTargetIndex(
  currentIndex: number,
  itemCount: number,
  dx: number,
  dy: number,
): number | null {
  if (
    !Number.isInteger(currentIndex)
    || !Number.isInteger(itemCount)
    || itemCount <= 0
    || currentIndex < 0
    || currentIndex >= itemCount
    || !isWorkspaceSwipeIntent(dx, dy, WORKSPACE_SWIPE_COMMIT_DISTANCE)
  ) {
    return null;
  }

  const targetIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
  return targetIndex >= 0 && targetIndex < itemCount ? targetIndex : null;
}