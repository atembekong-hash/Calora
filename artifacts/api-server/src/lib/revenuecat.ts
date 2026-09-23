/**
 * RevenueCat server-side helpers — premium authorization, promotional grants,
 * and verified customer erasure. All provider requests use a deployment-owned
 * server credential; no hosting-provider connector is part of the runtime.
 */

const ENTITLEMENT_ID = "caloraapp_pro";
const REVENUECAT_V2_ORIGIN = "https://api.revenuecat.com";
const REVENUECAT_REQUEST_TIMEOUT_MS = 10_000;

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
type RevenueCatCustomerResponse = {
  id?: unknown;
};

function revenueCatConfig() {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const secretApiKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!projectId) throw new Error("RevenueCat project ID is not configured");
  if (!secretApiKey) throw new Error("RevenueCat server credential is not configured");
  return { projectId, secretApiKey };
}

async function revenueCatRequest(
  path: string,
  method: "GET" | "POST" | "DELETE",
  operation: string,
  body?: unknown,
): Promise<Response> {
  const { secretApiKey } = revenueCatConfig();

  try {
    return await fetch(`${REVENUECAT_V2_ORIGIN}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REVENUECAT_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error
      && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new Error(`RevenueCat ${operation} ${timedOut ? "timed out" : "request failed"}`);
  }
}

/**
 * Reads the current RevenueCat entitlement for a Calora account. This is the
 * server authority for Premium API access; device-side purchase state is never
 * accepted as an authorization signal.
 */
export async function hasActivePremiumEntitlement(appUserId: string): Promise<boolean> {
  const { projectId } = revenueCatConfig();

  const entitlementsResponse = await revenueCatRequest(
    `/v2/projects/${encodeURIComponent(projectId)}/entitlements?limit=100`,
    "GET",
    "entitlement lookup",
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

  const activeResponse = await revenueCatRequest(
    `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}/active_entitlements`,
    "GET",
    "subscriber lookup",
  );
  // A customer is absent until an account first reaches billing. Treat that as
  // an explicit fail-closed non-Premium state, not provider unavailability.
  if (activeResponse.status === 404) return false;
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
 */
export async function grantPromoDays(appUserId: string, days: number): Promise<Date> {
  revenueCatConfig();
  const encodedId = encodeURIComponent(appUserId);

  const subRes = await revenueCatRequest(
    `/v1/subscribers/${encodedId}`,
    "GET",
    "subscriber lookup",
  );
  if (!subRes.ok) {
    throw new Error(`RevenueCat subscriber lookup failed (${subRes.status})`);
  }
  const subJson = (await subRes.json()) as SubscriberResponse;
  const currentExpiry = subJson.subscriber?.entitlements?.[ENTITLEMENT_ID]?.expires_date;

  const now = Date.now();
  const base = currentExpiry ? Math.max(now, Date.parse(currentExpiry)) : now;
  const endTimeMs = base + days * 24 * 60 * 60 * 1000;

  const grantRes = await revenueCatRequest(
    `/v1/subscribers/${encodedId}/entitlements/${ENTITLEMENT_ID}/promotional`,
    "POST",
    "promo grant",
    { end_time_ms: endTimeMs },
  );
  if (!grantRes.ok) {
    // Provider bodies can contain customer identifiers or other diagnostics;
    // never promote them into application errors or request logs.
    throw new Error(`RevenueCat promo grant failed (${grantRes.status})`);
  }

  return new Date(endTimeMs);
}

async function verifyExistingRevenueCatCustomer(
  response: Response,
  expectedCustomerId: string,
): Promise<void> {
  let body: RevenueCatCustomerResponse;
  try {
    body = await response.json() as RevenueCatCustomerResponse;
  } catch {
    throw new Error("RevenueCat customer lookup returned a malformed response");
  }
  if (!body || typeof body !== "object" || body.id !== expectedCustomerId) {
    throw new Error("RevenueCat customer lookup returned a malformed response");
  }
}

/** Removes and positively verifies absence of the RevenueCat customer for a deleted account. */
export async function deleteRevenueCatSubscriber(appUserId: string): Promise<void> {
  const { projectId } = revenueCatConfig();
  const customerPath = `/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}`;

  const lookupResponse = await revenueCatRequest(customerPath, "GET", "customer lookup");
  if (lookupResponse.status === 404) return;
  if (!lookupResponse.ok) {
    throw new Error(`RevenueCat customer lookup failed (${lookupResponse.status})`);
  }
  await verifyExistingRevenueCatCustomer(lookupResponse, appUserId);

  const deletionResponse = await revenueCatRequest(customerPath, "DELETE", "customer deletion");
  if (!deletionResponse.ok) {
    throw new Error(`RevenueCat customer deletion failed (${deletionResponse.status})`);
  }

  const verificationResponse = await revenueCatRequest(customerPath, "GET", "customer verification");
  if (verificationResponse.status === 404) return;
  if (!verificationResponse.ok) {
    throw new Error(`RevenueCat customer verification failed (${verificationResponse.status})`);
  }
  throw new Error("RevenueCat customer verification failed (customer still exists)");
}
