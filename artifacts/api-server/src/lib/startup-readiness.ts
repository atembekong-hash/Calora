export type StartupReadinessQueryable = {
  query: (text: string) => Promise<unknown>;
};

export const CAPTURE_LIMITER_READINESS_QUERY =
  "SELECT key, count, reset_at FROM calora_capture_rate_limits LIMIT 1";

/**
 * Proves the API data plane is reachable before the process opens a listener.
 * This query is read-only and intentionally performs no schema management.
 */
export async function assertStartupReady(
  queryable: StartupReadinessQueryable,
): Promise<void> {
  await queryable.query("SELECT 1");
  // Capture is fail-closed when this persistent cost-control table is absent.
  // Check it before listening so a deployment cannot look healthy while every
  // authenticated Scan request would be rejected before provider work.
  await queryable.query(CAPTURE_LIMITER_READINESS_QUERY);
}
