/**
 * Invisible worker that settles referral state for the signed-in user:
 *
 *  1. Auto-redeems only an invite code that was captured while this same
 *     signed-in account was active. Guest links require an explicit Apply.
 *  2. Once the user has a capture-backed saved meal, calls the activate
 *     endpoint so the server can independently verify qualification and grant
 *     both rewards. Retries on the next app session until the server reports a
 *     settled state.
 *
 * Mounted inside SubscriptionProvider so a successful reward refreshes the
 * local entitlement state immediately.
 */
import { useEffect, useRef } from 'react';
import { activateReferral, redeemReferral } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useCalora } from '@/context/CaloraContext';
import { useSubscription } from '@/lib/revenuecat';
import {
  clearPendingInviteCode,
  getAccountBoundPendingInviteCode,
  isReferralActivationComplete,
  isReferralActivationSettled,
  markReferralActivationSettled,
} from '@/lib/referral';

const SERVER_CAPTURE_SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ReferralActivator() {
  const { user } = useAuth();
  const { logs } = useCalora();
  const { refreshCustomerInfo } = useSubscription();

  const redeemAttemptedRef = useRef<string | null>(null);
  const activateInFlightRef = useRef(false);

  // Auto-redeem only a deep link captured while this same account was active.
  useEffect(() => {
    if (!user || redeemAttemptedRef.current === user.id) return;
    redeemAttemptedRef.current = user.id;

    (async () => {
      const pending = await getAccountBoundPendingInviteCode(user.id);
      if (!pending) return;
      try {
        await redeemReferral({ code: pending });
        await clearPendingInviteCode(user.id);
      } catch (err: unknown) {
        // 409 = already redeemed on this account; the stored code is useless.
        const status = (err as { status?: number } | null)?.status;
        if (status === 409 || status === 404 || status === 400) {
          await clearPendingInviteCode(user.id);
        }
        // Network failures keep the code for the referral card to retry.
      }
    })();
  }, [user]);

  // Ask the server to activate only after local state contains the same
  // server-issued capture anchor that the diary persistence route accepts.
  // This is only an attempt gate: the endpoint independently verifies the
  // capture session and persisted meal for this JWT user.
  useEffect(() => {
    const hasCaptureBackedLog = logs.some(
      (log) => typeof log.captureSessionId === 'string'
        && SERVER_CAPTURE_SESSION_ID.test(log.captureSessionId),
    );
    if (!user || !hasCaptureBackedLog || activateInFlightRef.current) return;

    (async () => {
      if (await isReferralActivationSettled(user.id)) return;
      activateInFlightRef.current = true;
      try {
        const result = await activateReferral();
        if (isReferralActivationComplete(result)) {
          await markReferralActivationSettled(user.id);
          if (result.referredRewarded) {
            refreshCustomerInfo();
          }
        }
        // Pending or partial rewards retry next session so a released provider
        // claim can complete for both sides.
      } catch (err) {
        console.warn('[referral] activation attempt failed', err);
      } finally {
        activateInFlightRef.current = false;
      }
    })();
  }, [user, logs, refreshCustomerInfo]);

  return null;
}
