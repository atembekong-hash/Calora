#!/usr/bin/env node

/**
 * Summarize the structured account-deletion fence signals emitted by the API.
 *
 * The API intentionally returns a generic 503 to callers. Production logs
 * contain the useful distinction: a structured `account_deletion_fence` event
 * is an expected deletion-control rejection, while a pino-http `/v1/sync`
 * 503 without that signal is an unrelated sync failure.
 *
 * This monitor only writes aggregate counts, route names, a bounded run window,
 * and the allowlisted identity from the published API attestation. It never
 * copies log records, account identifiers, credentials, or database error text
 * into its report.
 *
 * Its accepted signal revisions are defined by the shared schema contract:
 * legacy unversioned v0 and explicitly tagged v1 only. Future revisions must
 * be added to that contract deliberately; unknown revisions fail closed.
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  fetchPublishedReleaseAttestation,
  sanitizePublishedReleaseAttestation,
} from "./lib/public-release-attestation.mjs";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  ACCOUNT_DELETION_FENCE_SUPPORTED_SIGNAL_SCHEMA_VERSIONS,
  parseAccountDeletionFenceSignal,
} from "../artifacts/api-server/src/lib/account-deletion-fence-schema.mjs";

export { ACCOUNT_DELETION_FENCE_ERROR_CLASS };
export { ACCOUNT_DELETION_FENCE_SUPPORTED_SIGNAL_SCHEMA_VERSIONS };
export const MONITOR_SCHEMA_VERSION =
  "calora.account-deletion-fence-monitor.v1";

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: node scripts/monitor-account-deletion-fence.mjs --log-file <log-file> --release-url <https-origin> [--log-format ndjson|hosted] [--window-start <ISO-8601> --window-end <ISO-8601>] [--report-file <json-file>] [--require-fence]",
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
  const route = url.split("?", 1)[0] || null;
  if (route === null) return null;
  return route === "/api" ? "/" : route.startsWith("/api/")
    ? route.slice("/api".length)
    : route;
}

function incrementRoute(routes, route, count) {
  routes[route] = (routes[route] ?? 0) + count;
}

function timestampFromRecord(record) {
  const value = record?.time;
  const date =
    typeof value === "number"
      ? new Date(value)
      : typeof value === "string"
        ? new Date(value)
        : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function validWindowTimestamp(value, name) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be a valid ISO-8601 timestamp.`);
  }
  return new Date(value).toISOString();
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

function jsonSuffixFromHostedLine(line) {
  const trimmed = line.trim();
  for (
    let start = trimmed.indexOf("{");
    start >= 0;
    start = trimmed.indexOf("{", start + 1)
  ) {
    try {
      const record = JSON.parse(trimmed.slice(start));
      if (record !== null && typeof record === "object" && !Array.isArray(record)) {
        return record;
      }
    } catch {
      // Hosted log lines have a human-readable prefix. Keep looking for the
      // JSON record rather than treating braces in that prefix as a record.
    }
  }
  return null;
}

function hostedExportText(exportText) {
  try {
    const response = JSON.parse(exportText);
    if (
      response !== null &&
      typeof response === "object" &&
      typeof response.logs === "string"
    ) {
      return response.logs;
    }
  } catch {
    // The normal input is the platform's plain `logs` string, not its
    // response envelope.
  }
  return exportText;
}

/**
 * Convert the deployment platform's formatted log export into the tiny
 * sanitized NDJSON contract consumed by the monitor.
 *
 * Hosted exports prefix each JSON record with platform text and include
 * operational fields such as host, pid, request headers, and error details.
 * Only the validated deletion-fence signal and the route/status pair needed
 * to identify unrelated sync 503s leave this adapter.
 *
 * @param {string} exportText
 * @returns {string}
 */
export function sanitizeHostedDeploymentLogExport(exportText) {
  if (typeof exportText !== "string") {
    throw new TypeError("Hosted deployment log export must be a string.");
  }

  const sanitizedRecords = [];
  const lines = hostedExportText(exportText).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;

    const record = jsonSuffixFromHostedLine(line);
    if (record === null) continue;

    if (record.errorClass === ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
      const signal = parseAccountDeletionFenceSignal(record);
      if (signal === null) {
        throw new Error(
          `Hosted deletion-fence signal on line ${index + 1} has an invalid route or count.`,
        );
      }
      sanitizedRecords.push(JSON.stringify(signal));
      continue;
    }

    const statusCode = record?.res?.statusCode ?? record?.statusCode;
    const route = routeForRequest(record);
    if (statusCode === 503 && route === "/v1/sync") {
      sanitizedRecords.push(
        JSON.stringify({
          statusCode: 503,
          req: { url: "/v1/sync" },
        }),
      );
    }
  }

  return sanitizedRecords.join("\n");
}

/**
 * Analyze pino NDJSON without retaining the source records.
 *
 * @param {string} ndjson
 * @param {{
 *   releaseAttestation?: object,
 *   runWindow?: {startedAt?: string, endedAt?: string, source?: string},
 * }} [options]
 * @returns {{
 *   schemaVersion: string,
 *   verified: boolean,
 *   release?: object,
 *   runWindow?: {startedAt: string, endedAt: string, source: string},
 *   deletionFence: {eventCount: number, rejectionCount: number, routes: Record<string, number>},
 *   unrelatedSync503: {eventCount: number, routes: Record<string, number>},
 * }}
 */
export function summarizeAccountDeletionFenceLogs(ndjson, options = {}) {
  const deletionFence = emptyDeletionFenceAggregate();
  const unrelatedSync503 = emptySync503Aggregate();
  let firstObservedAt = null;
  let lastObservedAt = null;

  const lines = ndjson.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new Error(`Monitoring input contains invalid JSON on line ${index + 1}.`);
    }

    const observedAt = timestampFromRecord(record);
    if (observedAt) {
      firstObservedAt ??= observedAt;
      lastObservedAt = observedAt;
    }

    // This is the only event class treated as an expected deletion-control
    // signal. Do not infer it from HTTP 503 or arbitrary database text.
    if (record?.errorClass === ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
      const signal = parseAccountDeletionFenceSignal(record);
      if (signal === null) {
        throw new Error(
          `Deletion-fence signal on line ${index + 1} has an invalid route or count.`,
        );
      }
      const { route, count } = signal;
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

  const report = {
    schemaVersion: MONITOR_SCHEMA_VERSION,
    verified: deletionFence.eventCount > 0,
    deletionFence,
    unrelatedSync503,
  };

  if (options.releaseAttestation !== undefined) {
    report.release = {
      source: "published-api-attestation",
      ...sanitizePublishedReleaseAttestation(options.releaseAttestation),
    };
  }

  if (options.runWindow !== undefined || firstObservedAt || lastObservedAt) {
    const startedAt = options.runWindow?.startedAt ?? firstObservedAt;
    const endedAt = options.runWindow?.endedAt ?? lastObservedAt;
    if (!startedAt || !endedAt) {
      throw new Error(
        "Monitoring input must provide both run-window bounds or timestamped log records.",
      );
    }
    report.runWindow = {
      startedAt: validWindowTimestamp(startedAt, "Run-window start"),
      endedAt: validWindowTimestamp(endedAt, "Run-window end"),
      source:
        options.runWindow?.source ??
        "sanitized-log-record-timestamps",
    };
    if (Date.parse(report.runWindow.startedAt) > Date.parse(report.runWindow.endedAt)) {
      throw new Error("Run-window start must not be after its end.");
    }
  }

  return report;
}

async function main() {
  const logPath = argument("--log-file");
  const releaseOrigin = argument("--release-url");
  const logFormat = process.argv.includes("--log-format")
    ? argument("--log-format")
    : "ndjson";
  if (logFormat !== "ndjson" && logFormat !== "hosted") {
    usage(`Unsupported --log-format: ${logFormat}.`);
  }
  const reportPath = process.argv.includes("--report-file")
    ? argument("--report-file")
    : null;
  const requireFence = process.argv.includes("--require-fence");
  const hasWindowStart = process.argv.includes("--window-start");
  const hasWindowEnd = process.argv.includes("--window-end");
  if (hasWindowStart !== hasWindowEnd) {
    usage("--window-start and --window-end must be provided together.");
  }
  const rawInput = await readFile(logPath, "utf8");
  const input =
    logFormat === "hosted"
      ? sanitizeHostedDeploymentLogExport(rawInput)
      : rawInput;
  const releaseAttestation = await fetchPublishedReleaseAttestation(releaseOrigin);
  const runWindow =
    hasWindowStart && hasWindowEnd
      ? {
          startedAt: validWindowTimestamp(argument("--window-start"), "Run-window start"),
          endedAt: validWindowTimestamp(argument("--window-end"), "Run-window end"),
          source:
            logFormat === "hosted"
              ? "bounded-hosted-log-export"
              : "bounded-log-export",
        }
      : undefined;
  const report = summarizeAccountDeletionFenceLogs(input, {
    releaseAttestation,
    runWindow,
  });

  if (requireFence && !report.verified) {
    throw new Error(
      "No sanitized account-deletion fence event was found in the monitoring input.",
    );
  }
  if (!report.runWindow) {
    throw new Error(
      "No bounded run window was found; pass --window-start and --window-end or include pino time fields.",
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