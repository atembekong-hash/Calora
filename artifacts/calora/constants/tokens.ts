/**
 * Design tokens for Calora.
 *
 * These are the single source of truth for spacing, radius, and typography
 * scales. Import these instead of using magic numbers in screen stylesheets.
 *
 * Font sizes should always be multiplied by fontScale at the usage site:
 *   fontSize: typography.label.fontSize * f
 */

export const spacing = {
  /** 4 — hair gap between icon and label */
  xs: 4,
  /** 8 — tight internal padding, icon gaps */
  sm: 8,
  /** 12 — card internal padding, between sibling elements */
  md: 12,
  /** 16 — standard section gap, card padding */
  lg: 16,
  /** 20 — screen horizontal padding, large section gap */
  xl: 20,
  /** 28 — modal top padding, major section separation */
  xxl: 28,
} as const;

export const radius = {
  /** 8 — small chips, tags */
  xs: 8,
  /** 11 — input fields, meal type chips */
  sm: 11,
  /** 14 — buttons, compact cards */
  md: 14,
  /** 20 — standard card radius */
  lg: 20,
  /** 24 — hero cards, modals */
  xl: 24,
  /** 99 — fully rounded pill shapes */
  pill: 99,
} as const;

export const typography = {
  /** UPPERCASE labels — section eyebrows, badges */
  eyebrow: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  /** Small supporting text — captions, sub-labels */
  caption: {
    fontFamily: 'Inter_400Regular' as const,
    fontSize: 11,
    lineHeight: 16,
  },
  /** Standard body text */
  body: {
    fontFamily: 'Inter_400Regular' as const,
    fontSize: 13,
    lineHeight: 19,
  },
  /** Medium-weight label — setting rows, pill text */
  label: {
    fontFamily: 'Inter_600SemiBold' as const,
    fontSize: 12,
  },
  /** Card section title */
  title: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  /** Screen / hero heading */
  heading: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 24,
    letterSpacing: -0.6,
  },
} as const;
