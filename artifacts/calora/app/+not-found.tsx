import { Link, Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { recoverFromNotFoundRoute } from '@/lib/notFoundRecovery';

/**
 * Not-Found screen.
 *
 * On web, Expo Router can see a reverse-proxy prefix (/calora/) as a route
 * and lands here instead of the real root. We auto-redirect to "/" after a
 * short delay so the user never has to click anything.
 */
export default function NotFoundScreen() {
  const colors = useColors();

  useEffect(() => {
    // Expo Router cannot always replace an unmatched web route. Use a
    // document navigation there; native retains the in-app router path.
    const t = setTimeout(() => {
      const webLocation = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location
        : null;
      recoverFromNotFoundRoute({ platform: Platform.OS, router, webLocation });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Page not found.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Go home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
