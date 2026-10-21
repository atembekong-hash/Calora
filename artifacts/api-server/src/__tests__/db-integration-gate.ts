/**
 * Database-backed integration suites are opt-in so ordinary/offline test runs
 * cannot turn an inert DATABASE_URL sentinel into a real connection attempt.
 * The caller must supply a reachable PostgreSQL URL when opting in; this helper
 * deliberately performs no network I/O while tests are being collected.
 */
export function isDatabaseIntegrationTestEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.CALORA_RUN_DB_INTEGRATION_TESTS === "true" &&
    typeof env.DATABASE_URL === "string" &&
    env.DATABASE_URL.length > 0
  );
}
