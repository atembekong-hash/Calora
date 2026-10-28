import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns a system-scheme palette when Calora context is unavailable.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * This is intentionally retained only for the root error fallback, which
 * renders outside `CaloraProvider`. App screens and normal components must
 * consume `useCalora()` so their selected in-app appearance is respected.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? colors.dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
