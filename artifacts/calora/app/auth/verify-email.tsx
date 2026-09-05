/**
 * Verify-email screen — shown after sign-up when email confirmation is required.
 *
 * Reached from sign-up.tsx when Supabase returns no session (confirmation enabled).
 * The user must tap the link in their email; the app then receives it via the
 * HTTPS /auth/callback associated link which establishes the session.
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useCalora } from '@/context/CaloraContext';
import { AppHeader } from '@/components/AppChrome';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/lib/brand';

export default function VerifyEmailScreen() {
  const { colors } = useCalora();
  const { resendVerificationEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = useCallback(async () => {
    if (resendLoading || !email) return;
    setResendError(null);
    setResendLoading(true);
    try {
      const { error } = await resendVerificationEmail(email);
      if (error) {
        setResendError(error.message);
        return;
      }
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  }, [resendLoading, email, resendVerificationEmail]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader back title="Verify email" onBack={() => router.canGoBack() ? router.back() : router.replace('/auth/sign-in' as any)} />
      <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: 28, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Illustration */}
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
        <Feather name="mail" size={34} color={colors.accentForeground} />
      </View>

      <Text style={[styles.heading, { color: colors.foreground }]}>Check your email</Text>

      {email ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We sent a confirmation link to{'\n'}
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{email}</Text>
           {'\n\n'}Use the link to activate your account. It expires in 24 hours.
        </Text>
      ) : (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
           We sent a confirmation link to your email. Use it to activate your account.
        </Text>
      )}

      {/* Tips */}
      {[
         { icon: 'inbox' as const, text: "Check spam or junk if you don\u2019t see it." },
         { icon: 'smartphone' as const, text: 'Open the link on your phone to return to the app.' },
         { icon: 'lock' as const, text: 'The link works once and expires in 24 hours.' },
      ].map((tip) => (
        <View key={tip.text} style={[styles.tipRow, { backgroundColor: colors.muted }]}>
          <Feather name={tip.icon} size={14} color={colors.mutedForeground} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip.text}</Text>
        </View>
      ))}

      {/* Resend */}
      <View style={[styles.resendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <Text style={[styles.resendLabel, { color: colors.foreground }]}>Didn’t get it?</Text>
        {resendDone ? (
          <View style={styles.resendSuccess}>
            <Feather name="check-circle" size={16} color={colors.success} />
             <Text style={[styles.resendSuccessText, { color: colors.success }]}>Sent. Check your inbox.</Text>
          </View>
        ) : (
          <>
            {resendError && (
              <Text style={[styles.resendError, { color: colors.destructive }]}>{resendError}</Text>
            )}
            <Pressable
              onPress={handleResend}
              disabled={resendLoading}
              style={[styles.resendButton, { backgroundColor: colors.muted, opacity: resendLoading ? 0.7 : 1 }]}
              accessibilityLabel="Resend confirmation email"
            >
              {resendLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.resendButtonText, { color: colors.primary }]}>Resend confirmation email</Text>}
            </Pressable>
          </>
        )}
      </View>

      {/* Back to sign-in */}
      <Pressable
        onPress={() => router.replace('/auth/sign-in' as any)}
        style={styles.backRow}
        accessibilityLabel="Back to sign in"
      >
        <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to sign in</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.6, marginBottom: 14, textAlign: 'center' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28, maxWidth: 320 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, alignSelf: 'stretch' },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  resendCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 20, alignSelf: 'stretch' },
  resendLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 12 },
  resendButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  resendButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  resendSuccess: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resendSuccessText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  resendError: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
