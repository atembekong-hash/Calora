/**
 * Forgot-password screen — request a password-reset email.
 *
 * Supabase sends a link to the registered email that redirects to:
 *   caloraapp://auth/callback
 * which establishes a recovery session and routes to /auth/reset-password.
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

export default function ForgotPasswordScreen() {
  const { colors } = useCalora();
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: sendError } = await sendPasswordReset(trimmed);
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }, [loading, email, sendPasswordReset]);

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
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        {sent ? (
          /* ── Success state ── */
          <View style={styles.sentContainer}>
            <View style={[styles.sentIcon, { backgroundColor: colors.accent }]}>
              <Feather name="mail" size={28} color={colors.accentForeground} />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Check your inbox</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              We sent a reset link to{'\n'}
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{email.trim()}</Text>
              {'\n\n'}Tap the link in the email to set a new password. It expires in 1 hour.
            </Text>
            <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                If you don't see it, check your spam folder.
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              accessibilityLabel="Back to sign in"
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Back to sign in</Text>
            </Pressable>
            <Pressable
              onPress={handleSend}
              disabled={loading}
              style={styles.resendButton}
              accessibilityLabel="Resend reset email"
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.resendText, { color: colors.primary }]}>Resend email</Text>}
            </Pressable>
          </View>
        ) : (
          /* ── Input state ── */
          <>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Reset your password</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Enter the email address for your {BRAND.name} account and we'll send you a reset link.
            </Text>

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
              returnKeyType="done"
              onSubmitEditing={handleSend}
              editable={!loading}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            />

            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <Pressable
              accessibilityLabel="Send reset link"
              accessibilityRole="button"
              onPress={handleSend}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Send reset link</Text>}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Remember it?{'  '}</Text>
              <Pressable onPress={() => router.back()} accessibilityLabel="Back to sign in">
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.6, marginBottom: 10 },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 32 },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  primaryButton: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginBottom: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  footerLink: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  // Sent state
  sentContainer: { alignItems: 'center', paddingTop: 16 },
  sentIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 28, alignSelf: 'stretch' },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  resendButton: { paddingVertical: 10, marginTop: 4 },
  resendText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
