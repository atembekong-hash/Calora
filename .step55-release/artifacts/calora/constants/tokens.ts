/**
 * Design tokens for CaloraApp.
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
    fontFamily: 'Inter_500Medium' as const,
    fontSize: 11,
    lineHeight: 16,
  },
  /** Standard body text */
  body: {
    fontFamily: 'Inter_500Medium' as const,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Medium-weight label — setting rows, pill text */
  label: {
    fontFamily: 'Inter_600SemiBold' as const,
    fontSize: 13,
  },
  /** Card section title */
  title: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  /** Screen / hero heading */
  heading: {
    fontFamily: 'Inter_800ExtraBold' as const,
    fontSize: 26,
    letterSpacing: -0.8,
  },
} as const;

/**
 * Motion tiers mirror the spatial hierarchy:
 * micro feedback, component transitions, screen choreography, and celebration.
 * Reduced-motion behavior is applied by the shared motion helpers/primitives.
 */
export const motion = {
  micro: {
    duration: 120,
    spring: { damping: 18, stiffness: 300, mass: 0.6 },
  },
  component: {
    duration: 220,
    stagger: 35,
  },
  screen: {
    duration: 380,
    stagger: 70,
  },
  modal: {
    duration: 260,
    stagger: 0,
  },
  celebration: {
    duration: 560,
    stagger: 90,
  },
} as const;

export const shadows = {
  light: {
    inset: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 0,
    },
    flat: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    raised: {
      shadowColor: '#17231f',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    floating: {
      shadowColor: '#17231f',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  dark: {
    inset: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 0,
    },
    flat: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    raised: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.4,
      shadowRadius: 32,
      elevation: 12,
    },
  }
} as const;
