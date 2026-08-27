/**
 * Sign-up screen — Email / Password account creation.
 *
 * After successful sign-up:
 *   • If Supabase requires email confirmation → /auth/verify-email
 *   • If confirmation is disabled (session returned) → back to previous screen
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { AppHeader } from '@/components/AppChrome';
import { useAuth } from '@/context/AuthContext';
import { BRAND, URLS } from '@/lib/brand';
import { getPendingInviteCode } from '@/lib/referral';

export default function SignUpScreen() {
  const { colors } = useCalora();
  const { signUpWithEmail } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  // Surface any pending invite code so the user knows it survived a relaunch.
  React.useEffect(() => {
    getPendingInviteCode().then(setPendingCode);
  }, []);

  const handleSignUp = useCallback(async () => {
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Please enter your email address.'); return; }
    if (!trimmedEmail.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setError(null);
    setLoading(true);
    try {
      const result = await signUpWithEmail(trimmedEmail, password);

      if (!result.success) {
        if (result.error.code === 'verify_email') {
          // Redirect to email verification waiting screen
          router.replace({
            pathname: '/auth/verify-email' as any,
            params: { email: trimmedEmail },
          });
          return;
        }
        setError(result.error.message);
        return;
      }

      // Session returned immediately — email confirmations disabled
      if (router.canGoBack()) {
        router.back();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)' as any);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, email, password, confirmPassword, signUpWithEmail]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader back title="Create account" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Feather name="sun" size={22} color={colors.primaryForeground} />
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Create your account</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Start syncing your {BRAND.name} data securely across all your devices.
        </Text>

        {/* Pending invite code notice */}
        {pendingCode ? (
          <View style={[styles.inviteNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="gift" size={13} color={colors.primary} />
            <Text style={[styles.inviteNoticeText, { color: colors.foreground }]}>
              Invite code <Text style={{ fontFamily: 'Inter_700Bold' }}>{pendingCode}</Text> will be applied after sign-up.
            </Text>
          </View>
        ) : null}

        {/* Email */}
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
          editable={!loading}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
        />

        {/* Password */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            placeholder="Minimum 8 characters"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            returnKeyType="next"
            editable={!loading}
            style={[styles.input, styles.passwordInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
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

        {/* Confirm password */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CONFIRM PASSWORD</Text>
        <TextInput
          accessibilityLabel="Confirm password"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
          placeholder="Repeat your password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
          editable={!loading}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
        />

        {/* Password hint */}
        <View style={[styles.hintRow, { backgroundColor: colors.muted }]}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Use 8+ characters. Your data stays encrypted.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {/* Create account */}
        <Pressable
          accessibilityLabel="Create account"
          accessibilityRole="button"
          onPress={handleSignUp}
          disabled={loading}
          style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Create account</Text>
          )}
        </Pressable>

        {/* Terms note */}
        <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
          By creating an account you agree to our{' '}
          <Text
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Use"
            onPress={() => { void Linking.openURL(URLS.terms); }}
            style={[styles.termsLink, { color: colors.primary }]}
          >
            Terms of Use
          </Text>
          {' '}and{' '}
          <Text
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
            onPress={() => { void Linking.openURL(URLS.privacy); }}
            style={[styles.termsLink, { color: colors.primary }]}
          >
            Privacy Policy
          </Text>
          .
        </Text>

        {/* Sign in link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account?{'  '}</Text>
          <Pressable onPress={() => router.back()} accessibilityLabel="Sign in">
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start' },
  brandMark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7, marginBottom: 8 },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 32 },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 16 },
  passwordWrap: { position: 'relative', marginBottom: 16 },
  passwordInput: { paddingRight: 48, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  inviteNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 20 },
  inviteNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 18 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 20 },
  hintText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  primaryButton: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginBottom: 16 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  termsText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 24 },
  termsLink: { fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  footerLink: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});
