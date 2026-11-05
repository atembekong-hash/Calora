// Native Android presentation only. Web/iOS retain their existing layout.
export const ANDROID_STEPS_RING_SCALE = 0.72;
export const ANDROID_STEPS_EXPANDED_HEIGHT = 199 * 0.8;
export const ANDROID_STEPS_COMPACT_HEIGHT = 162 * 0.8;
export const ANDROID_STEPS_RING_PULSE = 1.025;

export function androidStepsLayout({
  cardWidth,
  expanded,
  viewportWidth,
  fontScale = 1,
}: {
  cardWidth: number;
  expanded: boolean;
  viewportWidth: number;
  fontScale?: number;
}) {
  const padding = expanded ? 17 * 0.8 : 7 * 0.8;
  const gap = expanded ? 12 : 6;
  const height = expanded ? ANDROID_STEPS_EXPANDED_HEIGHT : ANDROID_STEPS_COMPACT_HEIGHT;
  const originalDiameter = expanded ? 160 : viewportWidth < 400 ? 80 : 90;
  const preferredDiameter = originalDiameter * ANDROID_STEPS_RING_SCALE;
  // Budget for the real Yoga card width (not just the screen width), the
  // right-side controls, and the unchanged foreground milestone pulse.
  const rightMinWidth = expanded ? 104 : 58;
  const horizontalBudget = Math.max(0, cardWidth - 2 * padding - gap - rightMinWidth - 4);
  const verticalBudget = Math.max(0, height - 2 * padding - 4);
  const diameter = Math.min(preferredDiameter, horizontalBudget / ANDROID_STEPS_RING_PULSE, verticalBudget / ANDROID_STEPS_RING_PULSE);
  const largeText = fontScale > 1.22;
  return { height, padding, gap, diameter, largeText };
}
