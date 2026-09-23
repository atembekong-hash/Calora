/**
 * Invite deep-link landing — caloraapp://invite/<code> and
 * https://mycaloraapp.com/invite/<code>.
 *
 * Stores the code locally, then routes signed-in users to Profile (where the
 * referral card prefills it) and signed-out users to account creation. The
 * ReferralActivator auto-redeems the stored code after sign-in.
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useCalora } from '@/context/CaloraContext';
import { setPendingInviteCode } from '@/lib/referral';
import { getInviteDestination, getRootAccessGateState } from '@/lib/rootAccessGate';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const {
    colors,
    hydrated,
    hydrationError,
    profileSyncReady,
    onboardingComplete,
  } = useCalora();
  const { applicationReady } = getRootAccessGateState({
    hydrated,
    hydrationError,
    profileSyncReady,
    onboardingComplete,
    reviewRequested: false,
  });

  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      if (typeof code === 'string' && code.length > 0) {
        try {
          await setPendingInviteCode(code);
        } catch {
          // Keep this transient route navigable if device storage is unavailable.
        }
      }
      router.replace(getInviteDestination(Boolean(user), applicationReady));
    })();
  }, [applicationReady, code, user, isLoading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
