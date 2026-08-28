/**
 * Invite-a-friend referral card.
 *
 * Signed-in users see their invite code, share action, and reward stats.
 * Users who haven't redeemed a code yet can enter one here; rewards unlock
 * after their first saved meal (handled by ReferralActivator).
 * Signed-out users see a short explainer instead.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useGetReferral,
  useRedeemReferral,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useCalora } from '@/context/CaloraContext';
import { getPendingInviteCode, clearPendingInviteCode } from '@/lib/referral';

type Props = { fontScale: number };

export function ReferralCard({ fontScale }: Props) {
  const { colors } = useCalora();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);

  const referralQuery = useGetReferral({
    query: { queryKey: ['getReferral'], enabled: !!user, staleTime: 60_000 },
  });
  const redeemMutation = useRedeemReferral();

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Prefill a pending invite code captured from a deep link.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const pending = await getPendingInviteCode();
      if (pending) setCodeInput(pending);
    })();
  }, [user]);

  if (!user) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="referral-card">
        <View style={styles.headerRow}>
          <Feather name="gift" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Invite friends</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          You both get 30 days of Pro when they join and log a meal.
        </Text>
      </View>
    );
  }

  const data = referralQuery.data;

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        message: `Join me on CaloraApp. Use ${data.code} and we both get ${data.rewardDays} Pro days: ${data.inviteUrl}`,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleRedeem = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) {
      setFeedback({ kind: 'error', text: 'Enter the full invite code.' });
      return;
    }
    setFeedback(null);
    try {
      const result = await redeemMutation.mutateAsync({ data: { code } });
      setFeedback({ kind: 'success', text: result.message ?? 'Invite accepted!' });
      await clearPendingInviteCode();
      referralQuery.refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : "We couldn't redeem that code. Please try again.";
      setFeedback({ kind: 'error', text: message });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="referral-card">
      <View style={styles.headerRow}>
        <Feather name="gift" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>Invite friends</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          You both get {data?.rewardDays ?? 30} Pro days when they join and log a meal.
      </Text>

      {referralQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} />
      ) : referralQuery.isError ? (
        <Text style={[styles.subtitle, { color: colors.destructive }]}>
          Referrals are unavailable. Try again later.
        </Text>
      ) : data ? (
        <>
          <View style={[styles.codeRow, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Text style={[styles.code, { color: colors.foreground }]} testID="referral-code">{data.code}</Text>
            <Pressable
              accessibilityLabel="Share invite code"
              testID="referral-share"
              onPress={handleShare}
              style={({ pressed }) => [styles.shareButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="share-2" size={15} color={colors.primaryForeground} />
              <Text style={[styles.shareText, { color: colors.primaryForeground }]}>Share</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{data.stats.pendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{data.stats.rewardedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rewarded</Text>
            </View>
          </View>

          {data.redemption.status === 'none' ? (
            <View style={styles.redeemBlock}>
              <Text style={[styles.redeemLabel, { color: colors.foreground }]}>Have an invite code?</Text>
              <View style={styles.redeemRow}>
                <TextInput
                  value={codeInput}
                  onChangeText={(t) => { setCodeInput(t); setFeedback(null); }}
                  placeholder="e.g. 7KDQ2MNP"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={16}
                  testID="referral-redeem-input"
                  style={[styles.input, { color: colors.foreground, borderColor: feedback?.kind === 'error' ? colors.destructive : colors.border, backgroundColor: colors.background }]}
                />
                <Pressable
                  accessibilityLabel="Redeem invite code"
                  testID="referral-redeem-submit"
                  onPress={handleRedeem}
                  disabled={redeemMutation.isPending}
                  style={({ pressed }) => [styles.redeemButton, { backgroundColor: colors.primary, opacity: redeemMutation.isPending ? 0.6 : pressed ? 0.8 : 1 }]}
                >
                  {redeemMutation.isPending
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Text style={[styles.shareText, { color: colors.primaryForeground }]}>Apply</Text>}
                </Pressable>
              </View>
            </View>
          ) : data.redemption.status === 'pending' ? (
            <Text style={[styles.pendingNote, { color: colors.mutedForeground }]} testID="referral-pending-note">
              {data.redemption.code} applied — log a meal to unlock {data.rewardDays} Pro days.
            </Text>
          ) : (
            <Text style={[styles.pendingNote, { color: colors.primary }]} testID="referral-rewarded-note">
              Invite reward unlocked — Pro is ready.
            </Text>
          )}

          {feedback ? (
            <Text
              style={[styles.feedback, { color: feedback.kind === 'error' ? colors.destructive : colors.primary }]}
              testID="referral-feedback"
            >
              {feedback.text}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (f: number) =>
  StyleSheet.create({
    card: { borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: 'Inter_700Bold', fontSize: 16 * f, letterSpacing: -0.2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 * f, lineHeight: 18 * f, marginTop: 6 },
    codeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12,
    },
    code: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, letterSpacing: 2 },
    shareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
    shareText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: 'Inter_700Bold', fontSize: 16 * f },
    statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 2 },
    redeemBlock: { marginTop: 14 },
    redeemLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 * f, marginBottom: 6 },
    redeemRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12,
      fontFamily: 'Inter_500Medium', fontSize: 14 * f, letterSpacing: 1,
    },
    redeemButton: { borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    pendingNote: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, lineHeight: 18 * f, marginTop: 12 },
    feedback: { fontFamily: 'Inter_500Medium', fontSize: 13 * f, marginTop: 10 },
  });
