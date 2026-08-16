/**
 * Invisible worker that settles referral state for the signed-in user:
 *
 *  1. Auto-redeems a pending invite code captured from a deep link
 *     (only when the account hasn't redeemed one already).
 *  2. Once the user has at least one saved meal, calls the activate
 *     endpoint so both parties receive their Pro reward. Retries on the next
 *     app session until the server reports a settled state.
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
  getPendingInviteCode,
  isReferralActivationComplete,
  isReferralActivationSettled,
  markReferralActivationSettled,
} from '@/lib/referral';

export function ReferralActivator() {
  const { user } = useAuth();
  const { logs } = useCalora();
  const { refreshCustomerInfo } = useSubscription();

  const redeemAttemptedRef = useRef<string | null>(null);
  const activateInFlightRef = useRef(false);

  // Auto-redeem a deep-linked invite code once per signed-in user.
  useEffect(() => {
    if (!user || redeemAttemptedRef.current === user.id) return;
    redeemAttemptedRef.current = user.id;

    (async () => {
      const pending = await getPendingInviteCode();
      if (!pending) return;
      try {
        await redeemReferral({ code: pending });
        await clearPendingInviteCode();
      } catch (err: unknown) {
        // 409 = already redeemed on this account; the stored code is useless.
        const status = (err as { status?: number } | null)?.status;
        if (status === 409 || status === 404 || status === 400) {
          await clearPendingInviteCode();
        }
        // Network failures keep the code for the referral card to retry.
      }
    })();
  }, [user]);

  // Ask the server to activate after a saved local meal. The endpoint
  // independently verifies that an authenticated diary persistence route
  // stored a meal for this JWT user; `logs` only avoids needless attempts
  // before the user has logged anything.
  useEffect(() => {
    if (!user || logs.length === 0 || activateInFlightRef.current) return;

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
