/**
 * Auth group layout — Stack navigator for all authentication screens.
 *
 * The callback screen lives here so the deep link caloraapp://auth/callback
 * renders within this nested Stack and preserves the auth navigation history.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
      {/* Deep-link callback — receives caloraapp://auth/callback redirects */}
      <Stack.Screen name="callback" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}
