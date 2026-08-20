import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { recoverPendingAccountDeletions } from "./routes/account";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Schema ownership is intentionally outside API startup:
// - task merge applies Drizzle's development schema through the managed setup;
// - Publish diffs the development and production schemas through Replit.
// The API must never mutate database structure during boot.
logger.info("Database schema is managed by the Drizzle source and Replit lifecycle");

// ---------------------------------------------------------------------------
// Periodic cleanup — remove rate-limit rows that expired more than 2 hours
// ago. Expired rows are inert, so this is storage hygiene rather than schema
// management. Errors never crash the server.
// ---------------------------------------------------------------------------
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const ACCOUNT_DELETION_RECOVERY_INTERVAL_MS = 60 * 1000;

async function cleanupExpiredRateLimitRows(): Promise<void> {
  try {
    const result = await pool.query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM calora_capture_rate_limits
         WHERE reset_at < NOW() - INTERVAL '2 hours'
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM deleted`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    logger.info({ count }, "Rate-limit cleanup: removed expired rows");
  } catch (err) {
    logger.error({ err }, "Rate-limit cleanup failed");
  }
}

void recoverPendingAccountDeletions();
setInterval(() => void recoverPendingAccountDeletions(), ACCOUNT_DELETION_RECOVERY_INTERVAL_MS).unref();
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  setTimeout(() => {
    void cleanupExpiredRateLimitRows();
    setInterval(() => void cleanupExpiredRateLimitRows(), RATE_LIMIT_CLEANUP_INTERVAL_MS);
  }, 60_000);
});