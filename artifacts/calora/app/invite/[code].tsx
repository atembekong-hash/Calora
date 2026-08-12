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

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors } = useCalora();

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      if (typeof code === 'string' && code.length > 0) {
        await setPendingInviteCode(code);
      }
      if (user) {
        router.replace('/(tabs)/profile');
      } else {
        router.replace('/auth/sign-up');
      }
    })();
  }, [code, user, isLoading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
