import { Link, Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

/**
 * Not-Found screen.
 *
 * On web, Expo Router sees the Replit proxy prefix (/calora/) as a route
 * and lands here instead of the real root. We auto-redirect to "/" after a
 * short delay so the user never has to click anything.
 */
export default function NotFoundScreen() {
  const colors = useColors();

  useEffect(() => {
    // Immediate redirect — covers the proxy-prefix routing edge-case on web.
    const t = setTimeout(() => router.replace('/'), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Go to home screen!
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
