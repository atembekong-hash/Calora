/**
 * Authenticated RevenueCat API client backed by the Replit RevenueCat connection.
 *
 * The connection injects credentials via the Replit connectors proxy, so no
 * RevenueCat secret key is ever stored in this repo. Always call
 * `getUncachableRevenueCatClient()` fresh — proxy auth headers are short-lived.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();
  const headers = await connectors.getProxyHeaders("revenuecat");
  return createClient({
    baseUrl: `${connectors.getProxyUrl()}/v2`,
    headers,
  });
}
