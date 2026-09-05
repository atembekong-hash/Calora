#!/usr/bin/env node

/**
 * Summarize the structured account-deletion fence signals emitted by the API.
 *
 * The API intentionally returns a generic 503 to callers. Production logs
 * contain the useful distinction: a structured `account_deletion_fence` event
 * is an expected deletion-control rejection, while a pino-http `/v1/sync`
 * 503 without that signal is an unrelated sync failure.
 *
 * This monitor only writes aggregate counts and route names. It never copies
 * log records, account identifiers, credentials, or database error text into
 * its report.
 */
import { readFile, writeFile } from "node:fs/promises";

export const ACCOUNT_DELETION_FENCE_ERROR_CLASS = "account_deletion_fence";
export const MONITOR_SCHEMA_VERSION =
  "calora.account-deletion-fence-monitor.v1";

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: node scripts/monitor-account-deletion-fence.mjs --log-file <ndjson-file> [--report-file <json-file>] [--require-fence]",
  );
  process.exit(2);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) usage(`Missing ${name}.`);
  return process.argv[index + 1];
}

function routeForRequest(record) {
  const url = record?.req?.url;
  if (typeof url !== "string" || !url.startsWith("/")) return null;
  return url.split("?", 1)[0] || null;
}

function isSafeRoute(route) {
  return (
    typeof route === "string" &&
    route.length > 0 &&
    route.length <= 200 &&
    /^\/[A-Za-z0-9._:/-]+$/.test(route)
  );
}

function positiveCount(value) {
  return Number.isInteger(value) && value > 0 && value <= 1_000_000
    ? value
    : null;
}

function incrementRoute(routes, route, count) {
  routes[route] = (routes[route] ?? 0) + count;
}

function emptyDeletionFenceAggregate() {
  return {
    eventCount: 0,
    rejectionCount: 0,
    routes: {},
  };
}

function emptySync503Aggregate() {
  return {
    eventCount: 0,
    routes: {},
  };
}

/**
 * Analyze pino NDJSON without retaining the source records.
 *
 * @param {string} ndjson
 * @returns {{
 *   schemaVersion: string,
 *   verified: boolean,
 *   deletionFence: {eventCount: number, rejectionCount: number, routes: Record<string, number>},
 *   unrelatedSync503: {eventCount: number, routes: Record<string, number>},
 * }}
 */
export function summarizeAccountDeletionFenceLogs(ndjson) {
  const deletionFence = emptyDeletionFenceAggregate();
  const unrelatedSync503 = emptySync503Aggregate();

  const lines = ndjson.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new Error(`Monitoring input contains invalid JSON on line ${index + 1}.`);
    }

    // This is the only event class treated as an expected deletion-control
    // signal. Do not infer it from HTTP 503 or arbitrary database text.
    if (record?.errorClass === ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
      const route = record.route;
      const count = positiveCount(record.count);
      if (!isSafeRoute(route) || count === null) {
        throw new Error(
          `Deletion-fence signal on line ${index + 1} has an invalid route or count.`,
        );
      }
      deletionFence.eventCount += 1;
      deletionFence.rejectionCount += count;
      incrementRoute(deletionFence.routes, route, count);
      continue;
    }

    // pino-http writes response status separately from the route handler's
    // structured warning. A sync 503 without the exact signal is an outage
    // candidate, not a deletion-fence event.
    const statusCode = record?.res?.statusCode ?? record?.statusCode;
    const route = routeForRequest(record);
    if (statusCode === 503 && route === "/v1/sync") {
      unrelatedSync503.eventCount += 1;
      incrementRoute(unrelatedSync503.routes, route, 1);
    }
  }

  return {
    schemaVersion: MONITOR_SCHEMA_VERSION,
    verified: deletionFence.eventCount > 0,
    deletionFence,
    unrelatedSync503,
  };
}

async function main() {
  const logPath = argument("--log-file");
  const reportPath = process.argv.includes("--report-file")
    ? argument("--report-file")
    : null;
  const requireFence = process.argv.includes("--require-fence");
  const input = await readFile(logPath, "utf8");
  const report = summarizeAccountDeletionFenceLogs(input);

  if (requireFence && !report.verified) {
    throw new Error(
      "No sanitized account-deletion fence event was found in the monitoring input.",
    );
  }

  const output = `${JSON.stringify(report)}\n`;
  if (reportPath) {
    await writeFile(reportPath, output, { encoding: "utf8", flag: "wx" });
  }
  console.log(output.trim());
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(
      `Account-deletion fence monitor failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  });
}