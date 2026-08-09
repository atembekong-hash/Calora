/**
 * Reset-password screen — set a new password after a recovery link is clicked.
 *
 * This screen is reached after:
 *   1. User taps the reset link in their email
 *   2. caloraapp://auth/callback receives the link
 *   3. handleOAuthCallbackUrl() exchanges the code → Supabase fires PASSWORD_RECOVERY
 *   4. AuthContext sets isPasswordRecovery = true
 *   5. callback.tsx routes here instead of to /(tabs)
 *
 * On success: signs in (session is already active) and navigates to /(tabs).
 * If the session has expired: shows an error and links back to forgot-password.
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

export default function ResetPasswordScreen() {
  const { colors } = useCalora();
  const { updatePassword, session } = useAuth();
  const insets = useSafeAreaInsets();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Guard: if we reach this screen without an active session the recovery
  // token has expired.  Show a helpful message instead of an unusable form.
  const sessionMissing = !session;

  const handleUpdate = useCallback(async () => {
    if (loading || sessionMissing) return;
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      // Brief pause to show success message, then navigate to main app
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)' as any);
      }, 1600);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionMissing, newPassword, confirmPassword, updatePassword]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success ? (
          /* ── Success ── */
          <View style={styles.centred}>
            <View style={[styles.successIcon, { backgroundColor: colors.accent }]}>
              <Feather name="check" size={28} color={colors.accentForeground} />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Password updated</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              You're all set. Taking you to the app…
            </Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          </View>
        ) : sessionMissing ? (
          /* ── Expired session ── */
          <View style={styles.centred}>
            <View style={[styles.expiredIcon, { backgroundColor: colors.muted }]}>
              <Feather name="clock" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Link has expired</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Password-reset links are only valid for 1 hour. Please request a new one.
            </Text>
            <Pressable
              onPress={() => router.replace('/auth/forgot-password' as any)}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              accessibilityLabel="Request new reset link"
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Request new link
              </Text>
            </Pressable>
          </View>
        ) : (
          /* ── Form ── */
          <>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.heading, { color: colors.foreground }]}>Set new password</Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Choose a strong password for your account.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NEW PASSWORD</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                accessibilityLabel="New password"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setError(null); }}
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

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              accessibilityLabel="Confirm new password"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
              placeholder="Repeat your new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
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
              accessibilityLabel="Update password"
              accessibilityRole="button"
              onPress={handleUpdate}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Update password</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  centred: { alignItems: 'center', paddingTop: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  expiredIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.6, marginBottom: 10, textAlign: 'center' },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 32, textAlign: 'center' },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 16 },
  passwordWrap: { position: 'relative', marginBottom: 16 },
  passwordInput: { paddingRight: 48, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  primaryButton: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginBottom: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
