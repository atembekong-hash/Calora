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
type EntitlementListResponse = {
  items?: { id?: string; lookup_key?: string }[];
};
type ActiveEntitlementsResponse = {
  items?: { entitlement_id?: string }[];
};

/**
 * Reads the current RevenueCat entitlement for a Calora account. This is the
 * server authority for Premium API access; device-side purchase state is never
 * accepted as an authorization signal.
 */
export async function hasActivePremiumEntitlement(appUserId: string): Promise<boolean> {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) {
    throw new Error("RevenueCat project ID is not configured");
  }

  // The connected RevenueCat credential authorizes the v2 REST API. Resolve
  // the opaque entitlement ID from its stable lookup key before checking the
  // customer's currently active entitlement records.
  const entitlementsResponse = await connectors.proxy(
    "revenuecat",
    `/v2/projects/${encodeURIComponent(projectId)}/entitlements?limit=100`,
    { method: "GET" },
  );
  if (!entitlementsResponse.ok) {
    throw new Error(`RevenueCat entitlement lookup failed (${entitlementsResponse.status})`);
  }

  const entitlements = (await entitlementsResponse.json()) as EntitlementListResponse;
  const premiumEntitlementId = entitlements.items?.find(
    (entitlement) => entitlement.lookup_key === ENTITLEMENT_ID,
  )?.id;
  if (!premiumEntitlementId) {
    throw new Error("RevenueCat Premium entitlement is not configured");
  }

  const activeResponse = await connectors.proxy(
    "revenuecat",
    `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}/active_entitlements`,
    { method: "GET" },
  );
  // RevenueCat has no customer record until an account first reaches its
  // billing system. That is a normal non-Premium state, not an availability
  // failure. Treat it as an explicit fail-closed denial while preserving
  // errors for every other provider failure.
  if (activeResponse.status === 404) {
    return false;
  }
  if (!activeResponse.ok) {
    throw new Error(`RevenueCat subscriber lookup failed (${activeResponse.status})`);
  }

  const activeEntitlements = (await activeResponse.json()) as ActiveEntitlementsResponse;
  return activeEntitlements.items?.some(
    (entitlement) => entitlement.entitlement_id === premiumEntitlementId,
  ) ?? false;
}

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

/** Removes the RevenueCat subscriber record associated with a deleted account. */
export async function deleteRevenueCatSubscriber(appUserId: string): Promise<void> {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) {
    throw new Error("RevenueCat project ID is not configured");
  }

  const customerPath = `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}`;
  const lookupResponse = await connectors.proxy(
    "revenuecat",
    customerPath,
    { method: "GET" },
  );
  // RevenueCat does not create a customer until an account reaches billing.
  // A verified absence means there is no provider record to erase.
  if (lookupResponse.status === 404) {
    return;
  }
  if (!lookupResponse.ok) {
    throw new Error(`RevenueCat customer lookup failed (${lookupResponse.status})`);
  }

  const response = await connectors.proxy(
    "revenuecat",
    customerPath,
    { method: "DELETE" },
  );
  // A missing customer is already deleted and therefore satisfies erasure.
  if (!response.ok && response.status !== 404) {
    throw new Error(`RevenueCat customer deletion failed (${response.status})`);
  }
}
