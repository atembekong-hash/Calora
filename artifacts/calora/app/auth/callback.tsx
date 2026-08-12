/**
 * auth/callback — OAuth / magic-link deep-link callback screen.
 *
 * Expo Router renders this screen when the app receives a deep link matching:
 *   caloraapp://auth/callback
 *
 * ─── When this screen activates ───────────────────────────────────────────
 *
 * Primary Google OAuth (via openAuthSessionAsync):
 *   expo-web-browser captures the redirect before it reaches this screen.
 *   The callback URL is handled inline in lib/auth.ts.  This screen does
 *   NOT activate in that path.
 *
 * This screen activates for:
 *   1. Email magic-link / OTP callbacks
 *   2. Password-reset recovery links (redirected here after the user taps
 *      the reset email)
 *   3. Email confirmation links
 *   4. Android edge cases where the intent is delivered as a deep link
 *
 * ─── Recovery routing ─────────────────────────────────────────────────────
 *   After exchanging the code, if AuthContext.isPasswordRecovery is true
 *   (set by the PASSWORD_RECOVERY event from supabase.auth.onAuthStateChange),
 *   the user is routed to /auth/reset-password instead of the main app.
 *
 * ─── Behavior ─────────────────────────────────────────────────────────────
 *   Success (normal)   → /(tabs)
 *   Success (recovery) → /auth/reset-password
 *   Failure            → / with authError query param after brief message
 *   No URL / timeout   → / after timeout
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { handleOAuthCallbackUrl, OAUTH_REDIRECT_URI } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const REDIRECT_DELAY_MS = 1400;
const URL_TIMEOUT_MS = 7000;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = useURL();
  const params = useLocalSearchParams();
  const { isPasswordRecovery } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Completing sign-in\u2026');
  const processed = useRef(false);
  const recoveryRef = useRef(isPasswordRecovery);

  // Keep ref in sync so the async process() closure can read the latest value
  useEffect(() => {
    recoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  // Determine the effective callback URL.
  // On Android, useURL() may return null if the deep link was already consumed
  // by Expo Router for navigation. In that case, we reconstruct the URL from
  // the local search params.
  const effectiveUrl = React.useMemo(() => {
    if (linkingUrl) return linkingUrl;
    
    // Reconstruct URL from params if code or error exists
    if (params.code || params.error) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') search.append(key, value);
      });
      return `${OAUTH_REDIRECT_URI}?${search.toString()}`;
    }
    
    return null;
  }, [linkingUrl, params]);

  // Process the callback URL once it resolves
  useEffect(() => {
    if (!effectiveUrl || processed.current) return;
    processed.current = true;

    async function process() {
      try {
        const result = await handleOAuthCallbackUrl(effectiveUrl!);

        if (result.success) {
          // Brief pause so the onAuthStateChange event (PASSWORD_RECOVERY) has
          // time to propagate through AuthContext before we navigate.
          await new Promise<void>((r) => setTimeout(r, 150));

          if (recoveryRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.replace('/auth/reset-password' as any);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.replace('/(tabs)' as any);
          }
        } else if (result.error.code === 'cancelled') {
          // User denied consent or dismissed the OAuth flow — navigate back to
          // sign-in silently with no error banner so the experience feels clean.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.replace('/auth/sign-in' as any);
        } else {
          // provider / token / other errors — show a brief inline message then
          // redirect to the root screen so the user can try again.
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
  }, [effectiveUrl, router]);

  // Timeout guard — if the URL never resolves (no deep link data)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!processed.current) {
        processed.current = true;
        setStatusMessage('No sign-in data was found.');
        setTimeout(() => router.replace('/'), REDIRECT_DELAY_MS);
      }
    }, URL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ef6b4f" />
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
    color: '#728078',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
