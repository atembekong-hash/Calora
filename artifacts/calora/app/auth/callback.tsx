/**
 * auth/callback — OAuth / magic-link HTTPS associated-link callback screen.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { getAuthCallbackRedirectUri, handleOAuthCallbackUrl } from '@/lib/auth';
import { getSafeAuthErrorMessage, routeForOAuthCallbackError } from '@/lib/auth-callback-routing';
import { useAuth } from '@/context/AuthContext';

const REDIRECT_DELAY_MS = 3000;
const URL_TIMEOUT_MS = 10000;

type AuthDestination = '/auth/sign-in' | ReturnType<typeof routeForOAuthCallbackError>;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = useURL();
  const params = useLocalSearchParams();
  const { beginAuthCallback, completeAuthCallback } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Signing you in…');
  const processed = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingRedirect = useCallback(() => {
    if (!redirectTimerRef.current) return;
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = null;
  }, []);

  const scheduleRedirect = useCallback(
    (destination: AuthDestination) => {
      clearPendingRedirect();
      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null;
        router.replace(destination as any);
      }, REDIRECT_DELAY_MS);
    },
    [clearPendingRedirect, router],
  );

  // Determine the effective callback URL.
  const effectiveUrl = React.useMemo(() => {
    if (linkingUrl) return linkingUrl;

    // Android can consume the associated-link intent before the router reads it.
    const authParams = ['code', 'type', 'error', 'error_description'];
    const hasAuthParams = authParams.some((param) => !!params[param]);
    if (hasAuthParams) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') search.append(key, value);
      });
      return `${getAuthCallbackRedirectUri()}?${search.toString()}`;
    }
    return null;
  }, [linkingUrl, params]);

  useEffect(() => {
    if (!effectiveUrl || processed.current) return;
    let cancelled = false;
    processed.current = true;
    beginAuthCallback();

    async function process() {
      try {
        const result = await handleOAuthCallbackUrl(effectiveUrl!, setStatusMessage);
        if (cancelled) return;
        completeAuthCallback(result);

        if (result.success) {
          // RootLayoutNav owns validated post-auth navigation; it needs no timer.
          clearPendingRedirect();
        } else if (result.error.code === 'cancelled') {
          clearPendingRedirect();
          router.replace('/auth/sign-in' as any);
        } else {
          setStatusMessage(getSafeAuthErrorMessage(result.error.code));
          scheduleRedirect(routeForOAuthCallbackError(result.error.code));
        }
      } catch {
        if (cancelled) return;
        completeAuthCallback({
          success: false,
          error: { code: 'unknown', message: 'Sign-in failed.' },
        });
        setStatusMessage('Sign-in failed. Please try again.');
        scheduleRedirect('/auth/sign-in');
      }
    }

    void process();
    return () => {
      cancelled = true;
      clearPendingRedirect();
    };
  }, [beginAuthCallback, clearPendingRedirect, completeAuthCallback, effectiveUrl, router, scheduleRedirect]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (processed.current) return;
      processed.current = true;
      setStatusMessage('No sign-in information was found.');
      scheduleRedirect('/auth/sign-in');
    }, URL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [scheduleRedirect]);

  // Own every delayed navigation across unmount and every terminal transition.
  useEffect(() => clearPendingRedirect, [clearPendingRedirect]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ef6b4f" />
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {statusMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f8f3',
    padding: 24,
    gap: 16,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#728078',
    textAlign: 'center',
    lineHeight: 22,
  },
});
