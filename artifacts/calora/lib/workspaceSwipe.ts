export const WORKSPACE_SWIPE_ACTIVATION_DISTANCE = 12;
export const WORKSPACE_SWIPE_COMMIT_DISTANCE = 44;
export const WORKSPACE_SWIPE_COMMIT_VELOCITY = 0.5;
export const WORKSPACE_SWIPE_VELOCITY_MIN_DISTANCE = 4;
export const WORKSPACE_SWIPE_DOMINANCE_RATIO = 1.35;
export const WORKSPACE_SWIPE_EDGE_RESISTANCE = 0.24;

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

export function isWorkspaceSwipeVelocityIntent(
  dx: number,
  dy: number,
  velocityX: number,
  velocityY: number,
): boolean {
  return (
    Number.isFinite(dx)
    && Number.isFinite(dy)
    && Number.isFinite(velocityX)
    && Number.isFinite(velocityY)
    && Math.abs(dx) >= WORKSPACE_SWIPE_VELOCITY_MIN_DISTANCE
    && Math.abs(velocityX) >= WORKSPACE_SWIPE_COMMIT_VELOCITY
    && Math.abs(velocityX) > Math.abs(velocityY) * WORKSPACE_SWIPE_DOMINANCE_RATIO
    && Math.abs(dx) > Math.abs(dy) * WORKSPACE_SWIPE_DOMINANCE_RATIO
    && Math.sign(dx) === Math.sign(velocityX)
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
  velocityX = 0,
  velocityY = 0,
): number | null {
  const committedByDistance = isWorkspaceSwipeIntent(
    dx,
    dy,
    WORKSPACE_SWIPE_COMMIT_DISTANCE,
  );
  const committedByVelocity = isWorkspaceSwipeVelocityIntent(
    dx,
    dy,
    velocityX,
    velocityY,
  );

  if (
    !Number.isInteger(currentIndex)
    || !Number.isInteger(itemCount)
    || itemCount <= 0
    || currentIndex < 0
    || currentIndex >= itemCount
    || (!committedByDistance && !committedByVelocity)
  ) {
    return null;
  }

  const direction = committedByDistance ? dx : velocityX;
  const targetIndex = direction < 0 ? currentIndex + 1 : currentIndex - 1;
  return targetIndex >= 0 && targetIndex < itemCount ? targetIndex : null;
}

/**
 * Lets content follow the finger while adding elastic resistance when the user
 * pulls outward from the first or last section.
 */
export function getWorkspaceSwipeOffset(
  currentIndex: number,
  itemCount: number,
  dx: number,
): number {
  if (!Number.isFinite(dx) || itemCount <= 0 || currentIndex < 0 || currentIndex >= itemCount) {
    return 0;
  }

  const pullingPastStart = currentIndex === 0 && dx > 0;
  const pullingPastEnd = currentIndex === itemCount - 1 && dx < 0;
  return pullingPastStart || pullingPastEnd
    ? dx * WORKSPACE_SWIPE_EDGE_RESISTANCE
    : dx;
}