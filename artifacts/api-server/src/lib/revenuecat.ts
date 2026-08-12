/**
 * RevenueCat server-side helpers — promotional entitlement grants.
 *
 * Uses the Replit RevenueCat connection (authenticated proxy) so no secret
 * key lives in this repo. Grants EXTEND existing access: the new end time is
 * computed from the later of "now" and the current entitlement expiry.
 *
 * The v1 subscribers API is used because promotional entitlements are only
 * exposed there. app_user_id is the Supabase Auth user id — the mobile client
 * calls Purchases.logIn(<supabase user id>) so identities line up.
 */

import { ReplitConnectors } from "@replit/connectors-sdk";

const ENTITLEMENT_ID = "caloraapp_pro";

const connectors = new ReplitConnectors();

type SubscriberEntitlement = { expires_date: string | null };
type SubscriberResponse = {
  subscriber?: { entitlements?: Record<string, SubscriberEntitlement> };
};

/**
 * Grants `days` of the Pro promotional entitlement to `appUserId`, extending
 * (never truncating) any existing access. Returns the new end time.
 * Throws on any RevenueCat API failure — callers must not silently swallow.
 */
export async function grantPromoDays(appUserId: string, days: number): Promise<Date> {
  const encodedId = encodeURIComponent(appUserId);

  // 1. Read current entitlement expiry (creates the subscriber if unseen).
  const subRes = await connectors.proxy("revenuecat", `/v1/subscribers/${encodedId}`, {
    method: "GET",
  });
  if (!subRes.ok) {
    throw new Error(`RevenueCat subscriber lookup failed (${subRes.status})`);
  }
  const subJson = (await subRes.json()) as SubscriberResponse;
  const currentExpiry = subJson.subscriber?.entitlements?.[ENTITLEMENT_ID]?.expires_date;

  const now = Date.now();
  const base = currentExpiry ? Math.max(now, Date.parse(currentExpiry)) : now;
  const endTimeMs = base + days * 24 * 60 * 60 * 1000;

  // 2. Grant the promotional entitlement up to the extended end time.
  const grantRes = await connectors.proxy(
    "revenuecat",
    `/v1/subscribers/${encodedId}/entitlements/${ENTITLEMENT_ID}/promotional`,
    { method: "POST", body: { end_time_ms: endTimeMs } },
  );
  if (!grantRes.ok) {
    const text = await grantRes.text().catch(() => "");
    throw new Error(`RevenueCat promo grant failed (${grantRes.status}): ${text.slice(0, 300)}`);
  }

  return new Date(endTimeMs);
}
