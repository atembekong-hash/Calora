/**
 * auth/callback — OAuth deep-link callback screen.
 *
 * Expo Router renders this screen when the app receives a deep link matching:
 *
 *   caloraapp://auth/callback
 *
 * ─── When this screen activates ───────────────────────────────────────────
 *
 * PRIMARY Google OAuth flow (signInWithGoogle via openAuthSessionAsync):
 *   expo-web-browser captures the redirect URL before it reaches this screen.
 *   The callback URL never triggers a navigation event — it is handled
 *   inline in lib/auth.ts.  This screen does NOT activate in that path.
 *
 * This screen activates for:
 *   1. Email magic-link / OTP callbacks — user taps a link in their email
 *      client, which opens the app via the caloraapp:// scheme.
 *   2. Android deep-link edge cases — in rare configurations where Chrome
 *      Custom Tabs delivers the redirect as an OS-level intent rather than
 *      returning it through openAuthSessionAsync.
 *   3. Future auth providers that redirect back via the registered scheme.
 *
 * ─── Behavior ─────────────────────────────────────────────────────────────
 *   • Success → navigates to the main app at /(tabs)/.
 *   • Failure → shows the error message briefly, then returns to / with an
 *               authError query param so the landing screen can surface it.
 *   • No URL  → returns to / after a brief delay.
 *
 * This screen must never crash regardless of URL content.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { handleOAuthCallbackUrl } from '@/lib/auth';

// Delay before navigating away on error/missing-URL — just long enough for the
// user to see the status message without feeling like a blank screen.
const REDIRECT_DELAY_MS = 1400;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = useURL();
  const [statusMessage, setStatusMessage] = useState('Completing sign-in\u2026');
  const processed = useRef(false);

  useEffect(() => {
    // url is null on first render — wait until expo-linking resolves it.
    if (!url || processed.current) return;
    processed.current = true;

    async function process() {
      try {
        const result = await handleOAuthCallbackUrl(url!);

        if (result.success) {
          // Session established — navigate to the main app.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.replace('/(tabs)' as any);
        } else {
          setStatusMessage(result.error.message);
          setTimeout(() => {
            router.replace({
              pathname: '/',
              params: { authError: result.error.code },
            });
          }, REDIRECT_DELAY_MS);
        }
      } catch {
        setStatusMessage('Something went wrong. Please try again.');
        setTimeout(() => router.replace('/'), REDIRECT_DELAY_MS);
      }
    }

    process();
  }, [url, router]);

  // Guard: if url remains null for too long (no deep link data),
  // navigate back rather than showing an infinite spinner.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!processed.current) {
        processed.current = true;
        setStatusMessage('No sign-in data was found.');
        setTimeout(() => router.replace('/'), REDIRECT_DELAY_MS);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4caf7d" />
      <Text style={styles.message}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f8f3',
    gap: 16,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#5a6e5e',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
