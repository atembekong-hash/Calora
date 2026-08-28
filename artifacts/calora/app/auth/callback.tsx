/**
 * auth/callback — OAuth / magic-link deep-link callback screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { handleOAuthCallbackUrl, OAUTH_REDIRECT_URI } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const REDIRECT_DELAY_MS = 3000; // Increased to let users read the error message
const URL_TIMEOUT_MS = 10000;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = useURL();
  const params = useLocalSearchParams();
  const { isPasswordRecovery } = useAuth();
   const [statusMessage, setStatusMessage] = useState('Signing you in…');
  const processed = useRef(false);
  const recoveryRef = useRef(isPasswordRecovery);

  useEffect(() => {
    recoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  // Determine the effective callback URL.
  const effectiveUrl = React.useMemo(() => {
    // If linkingUrl is available, it's the most reliable (contains hash/fragment)
    if (linkingUrl) return linkingUrl;
    
    // Fallback: Reconstruct URL from params (common on Android where intent is consumed)
    const authParams = ['code', 'token', 'type', 'access_token', 'refresh_token', 'error', 'error_description'];
    const hasAuthParams = authParams.some(p => !!params[p]);

    if (hasAuthParams) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') search.append(key, value);
      });
      return `${OAUTH_REDIRECT_URI}?${search.toString()}`;
    }
    
    return null;
  }, [linkingUrl, params]);

  useEffect(() => {
    if (!effectiveUrl || processed.current) return;
    processed.current = true;

    async function process() {
      try {
        const result = await handleOAuthCallbackUrl(effectiveUrl!, setStatusMessage);

        if (result.success) {
          await new Promise<void>((r) => setTimeout(r, 150));
          if (recoveryRef.current) {
            router.replace('/auth/reset-password' as any);
          } else {
            router.replace('/(tabs)' as any);
          }
        } else if (result.error.code === 'cancelled') {
          router.replace('/auth/sign-in' as any);
        } else {
          // Show the specific error message to the user
          setStatusMessage(result.error.message);
          setTimeout(() => {
            router.replace({
              pathname: '/',
              params: { authError: result.error.code },
            });
          }, REDIRECT_DELAY_MS);
        }
      } catch (err) {
         setStatusMessage('Sign-in failed. Please try again.');
        setTimeout(() => router.replace('/'), REDIRECT_DELAY_MS);
      }
    }

    process();
  }, [effectiveUrl, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!processed.current) {
        processed.current = true;
         setStatusMessage('No sign-in information was found.');
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
