/**
 * Shared referral offer configuration.
 *
 * Keep server reward grants and public invite marketing copy on one
 * authoritative value so the offer cannot drift between surfaces.
 */
export const REFERRAL_REWARD_DAYS = 30;

export function getReferralRewardCopy() {
  const duration = `${REFERRAL_REWARD_DAYS} days`;
  const caloraProOffer = `Get ${duration} of Calora Pro free`;
  const shortProOffer = `Get ${duration} of Pro free`;

  return {
    duration,
    caloraProOffer,
    shortProOffer,
    ogDescription: `A friend invited you to track nutrition effortlessly with AI. ${caloraProOffer} when you sign up using their invite link.`,
    twitterDescription: `Track nutrition effortlessly with AI. ${shortProOffer}.`,
  } as const;
}