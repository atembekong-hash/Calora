/**
 * Sign-in screen — Google OAuth + Email/Password.
 *
 * Design follows the existing CaloraApp design language:
 *   • Background: colors.background
 *   • Cards/inputs: colors.card / colors.input
 *   • Primary CTA: colors.primary with primaryForeground text
 *   • Typography: Inter family with existing token sizes
 *   • Icons: Feather
 *
 * Navigation:
 *   Sign in success → back to previous screen (or /(tabs))
 *   Create account  → /auth/sign-up
 *   Forgot password → /auth/forgot-password
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCalora } from '@/context/CaloraContext';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/lib/brand';

export default function SignInScreen() {
  const { colors } = useCalora();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = useCallback(async () => {
    if (loading) return;
    setError(null);
    setLoading('google');
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        if (result.error.code !== 'cancelled') {
          setError(result.error.message);
        }
        return;
      }
      // Session established — AuthProvider updates state; navigate back.
      if (router.canGoBack()) {
        router.back();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)' as any);
      }
    } finally {
      setLoading(null);
    }
  }, [loading, signInWithGoogle]);

  const handleEmailSignIn = useCallback(async () => {
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading('email');
    try {
      const result = await signInWithEmail(trimmedEmail, password);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)' as any);
      }
    } finally {
      setLoading(null);
    }
  }, [loading, email, password, signInWithEmail]);

  const isDisabled = loading !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        {router.canGoBack() && (
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        )}

        {/* Brand mark */}
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Feather name="sun" size={22} color={colors.primaryForeground} />
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Sign in to {BRAND.name} to sync your progress across devices.
        </Text>

        {/* ── Google ── */}
        <Pressable
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
          onPress={handleGoogle}
          disabled={isDisabled}
          style={[
            styles.googleButton,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: isDisabled ? 0.7 : 1 },
          ]}
        >
          {loading === 'google' ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <>
              <GoogleLogo />
              <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Email inputs ── */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
        <TextInput
          accessibilityLabel="Email address"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!isDisabled}
          style={[
            styles.input,
            { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input },
          ]}
        />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            placeholder="Your password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleEmailSignIn}
            editable={!isDisabled}
            style={[
              styles.input,
              styles.passwordInput,
              { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input },
            ]}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeButton}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Forgot password */}
        <Pressable
          onPress={() => router.push('/auth/forgot-password' as any)}
          style={styles.forgotRow}
          accessibilityLabel="Forgot password"
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
        </Pressable>

        {/* Error */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {/* Sign in button */}
        <Pressable
          accessibilityLabel="Sign in"
          accessibilityRole="button"
          onPress={handleEmailSignIn}
          disabled={isDisabled}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: isDisabled ? 0.7 : 1 },
          ]}
        >
          {loading === 'email' ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Sign in</Text>
          )}
        </Pressable>

        {/* Create account */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            New to {BRAND.name}?{'  '}
          </Text>
          <Pressable
            onPress={() => router.push('/auth/sign-up' as any)}
            accessibilityLabel="Create a new account"
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Inline Google logo (SVG-free, matches the wordmark colours) ────────────

function GoogleLogo() {
  return (
    <View style={googleStyles.container}>
      <Text style={googleStyles.g}>G</Text>
    </View>
  );
}

const googleStyles = StyleSheet.create({
  container: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  g: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#4285F4' },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start' },

  brandMark: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7, marginBottom: 8 },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 32 },

  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1, borderRadius: 14,
    paddingVertical: 15, marginBottom: 24,
    minHeight: 52,
  },
  googleButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  fieldLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15,
    marginBottom: 16,
  },
  passwordWrap: { position: 'relative', marginBottom: 4 },
  passwordInput: { paddingRight: 48, marginBottom: 0 },
  eyeButton: {
    position: 'absolute', right: 14, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 10 },
  forgotText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },

  primaryButton: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 52, marginBottom: 28,
  },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  footerLink: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});
