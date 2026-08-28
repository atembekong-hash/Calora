import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useAcceptCoachFactContextConsent,
  useGetCoachFactContextConsent,
  useRevokeCoachFactContextConsent,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { coachFactConsentCache, CoachFactRequestLifecycle } from '@/lib/intelligence';

/**
 * This component is rendered only while this sharing option is disabled.
 * It is intentionally separate from the existing Coach disclosure and sends no
 * nutrition context, messages, or routing instructions.
 */
export function CoachFactContextConsentPanel({ colors }: { colors: {
  card: string; border: string; foreground: string; mutedForeground: string;
  primary: string; primaryForeground: string; destructive: string;
} }) {
  const { user } = useAuth();
  const accountId = user?.id ?? null;
  const statusQuery = useGetCoachFactContextConsent({
    query: { queryKey: ['coach-fact-context-consent', accountId], enabled: Boolean(accountId), staleTime: 0 },
  });
  const accept = useAcceptCoachFactContextConsent();
  const revoke = useRevokeCoachFactContextConsent();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (statusQuery.data) void coachFactConsentCache.write(accountId, statusQuery.data);
  }, [accountId, statusQuery.data]);

  const acceptSharing = async () => {
    if (!accountId) return;
    setMessage(null);
    try {
      const status = await accept.mutateAsync({ data: { purpose: 'coach_fact_context_v1', documentVersion: '2026-08-21' } });
      await coachFactConsentCache.write(accountId, status);
       setMessage('Your choice was saved. This option is not available yet.');
      await statusQuery.refetch();
    } catch {
       setMessage('Your choice could not be saved. Sharing stays off.');
    }
  };

  const revokeSharing = async () => {
    if (!accountId) return;
    setMessage(null);
    try {
      const status = await revoke.mutateAsync();
      CoachFactRequestLifecycle.invalidateAll();
      await coachFactConsentCache.write(accountId, status);
       setMessage('Summarized sharing is off for future requests.');
      await statusQuery.refetch();
    } catch {
       setMessage('Your choice could not be changed. Sharing remains unavailable.');
    }
  };

  const status = statusQuery.data?.state ?? 'not_consented';
  const busy = accept.isPending || revoke.isPending || statusQuery.isLoading;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
       <Text style={[styles.title, { color: colors.foreground }]}>Share a daily summary with Coach?</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
         With permission, Calora can send Coach a summary of today’s calories, protein, meal distribution, and logging completeness.
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
         It never includes food names, notes, photos, recipes, raw timelines, account IDs, or your full history. Coach is not medical care.
      </Text>
      {status === 'consented_current' ? (
        <Pressable
          accessibilityLabel="Turn off daily summary sharing"
          disabled={busy}
          onPress={() => void revokeSharing()}
          style={[styles.button, { borderColor: colors.destructive, opacity: busy ? 0.55 : 1 }]}
        >
          {busy ? <ActivityIndicator color={colors.destructive} /> : <Text style={[styles.revokeText, { color: colors.destructive }]}>Turn off sharing</Text>}
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Allow daily summary sharing"
          disabled={busy || !accountId}
          onPress={() => void acceptSharing()}
          style={[styles.button, { backgroundColor: colors.primary, opacity: busy || !accountId ? 0.55 : 1 }]}
        >
          {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.allowText, { color: colors.primaryForeground }]}>Allow daily summary</Text>}
        </Pressable>
      )}
      <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.mutedForeground }]}>
         {message ?? (statusQuery.isError ? 'Unable to confirm status. Sharing stays off.' : 'This option is unavailable until it is approved.')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 14, borderWidth: 1 },
  allowText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  revokeText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  status: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 10 },
});