export type StartupReadinessQueryable = {
  query: (text: string) => Promise<unknown>;
};

/**
 * Proves the API data plane is reachable before the process opens a listener.
 * This query is read-only and intentionally performs no schema management.
 */
export async function assertStartupReady(
  queryable: StartupReadinessQueryable,
): Promise<void> {
  await queryable.query("SELECT 1");
}
