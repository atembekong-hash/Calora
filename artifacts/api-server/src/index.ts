import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { recoverPendingAccountDeletions } from "./routes/account";
import { runSafeBackgroundTask } from "./lib/safe-background-task";

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

// node-postgres emits idle-client failures on the Pool. Without a listener,
// EventEmitter treats them as uncaught errors and can terminate the process.
// The failed client is already removed by pg; log the event and let subsequent
// requests acquire a healthy connection.
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected idle database client error");
});

// ---------------------------------------------------------------------------
// Periodic cleanup — remove rate-limit rows that expired more than 2 hours
// ago. Expired rows are inert, so this is storage hygiene rather than schema
// management. Errors never crash the server.
// ---------------------------------------------------------------------------
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const ACCOUNT_DELETION_RECOVERY_INTERVAL_MS = 60 * 1000;
// Must exceed the longest bounded provider request (currently 12 seconds)
// with enough margin to flush the response and close pooled connections.
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 20_000;

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

const runAccountDeletionRecovery = () =>
  runSafeBackgroundTask(
    recoverPendingAccountDeletions,
    (err) => logger.error({ err }, "Account deletion recovery failed"),
  );

void runAccountDeletionRecovery();
const accountRecoveryTimer = setInterval(
  () => void runAccountDeletionRecovery(),
  ACCOUNT_DELETION_RECOVERY_INTERVAL_MS,
);
accountRecoveryTimer.unref();

let rateLimitCleanupTimer: NodeJS.Timeout | undefined;
const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  const cleanupStartTimer = setTimeout(() => {
    void cleanupExpiredRateLimitRows();
    rateLimitCleanupTimer = setInterval(
      () => void cleanupExpiredRateLimitRows(),
      RATE_LIMIT_CLEANUP_INTERVAL_MS,
    );
    rateLimitCleanupTimer.unref();
  }, 60_000);
  cleanupStartTimer.unref();
});

let shutdownStarted = false;

function shutdown(reason: string, exitCode: number): void {
  if (shutdownStarted) return;
  shutdownStarted = true;

  logger.info({ reason, exitCode }, "API shutdown started");
  clearInterval(accountRecoveryTimer);
  if (rateLimitCleanupTimer) clearInterval(rateLimitCleanupTimer);

  const hardShutdownTimer = setTimeout(() => {
    logger.fatal({ reason }, "API graceful shutdown timed out");
    process.exit(exitCode || 1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  hardShutdownTimer.unref();

  server.close((serverError) => {
    void (async () => {
      let finalExitCode = exitCode;
      if (serverError) {
        finalExitCode = 1;
        logger.error({ err: serverError }, "HTTP server close failed");
      }

      try {
        await pool.end();
      } catch (err) {
        finalExitCode = 1;
        logger.error({ err }, "Database pool close failed");
      } finally {
        clearTimeout(hardShutdownTimer);
        logger.info({ reason, exitCode: finalExitCode }, "API shutdown complete");
        process.exit(finalExitCode);
      }
    })();
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM", 0));
process.once("SIGINT", () => shutdown("SIGINT", 0));
process.once("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  shutdown("uncaughtException", 1);
});
process.once("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});