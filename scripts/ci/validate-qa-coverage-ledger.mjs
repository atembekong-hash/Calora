import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_LEDGER_PATH = "qa/calora-qa-coverage-ledger.json";
export const SCHEMA_VERSION = "calora.qa-coverage-ledger.v1";

const DOMAINS = Object.freeze([
  "navigation-ui",
  "recipes-images",
  "today-planning-progress",
  "scan-inputs",
  "auth-account-coach",
  "api-data-storage",
  "integrations-release",
  "native-device",
]);
const AUTOMATED_STATUSES = new Set(["covered", "partial", "not-applicable"]);
const LIVE_STATUSES = new Set(["required", "not-required", "blocked"]);
const NATIVE_STATUSES = new Set(["required", "not-required", "blocked"]);
const EVIDENCE_TYPES = new Set([
  "automated-test-report",
  "manual-checklist",
  "device-capture",
  "release-attestation",
]);
const RETENTION_PERIODS = new Set([
  "release-cycle",
  "ninety-days",
  "until-next-release",
]);
const PREREQUISITES = new Set([
  "controlled-test-account",
  "resettable-test-data",
  "seeded-recipe-data",
  "physical-device-access",
  "non-production-environment",
  "release-candidate",
  "approved-distribution-access",
]);
const EXTERNAL_BLOCKER_NAMES = new Set([
  "physical-device-access",
  "non-production-environment",
  "approved-distribution-access",
  "release-signing",
  "provider-sandbox",
]);
const BLOCKER_STATES = new Set(["open", "resolved"]);
const ALLOWED_COMMANDS = new Set([
  "pnpm --filter @workspace/calora run test",
  "pnpm --filter @workspace/api-server run test",
  "node --test scripts/release-workflow-contract.test.mjs",
  "node --test artifacts/calora/tests/device/encrypted-recovery-release-gate.test.js",
]);
const FORBIDDEN_KEY_PARTS =
  /(?:secret|token|password|passwd|credential|authorization|api[-_]?key|private[-_]?key|email|phone|address|identity|principal|subject|customer|person|(?:user|account|device)(?:id|identifier|name|serial)|(?:^|[-_])ip(?:[-_]|$))/i;
const SECRET_LIKE_VALUE =
  /\b(?:secret|token|password|passwd|credential|authorization|bearer|api[-_ ]?key|private[-_ ]?key)\b/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_VALUE = /(?:\+?\d[\d .()\-]{7,}\d)/;
const IPV4_VALUE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const UUID_VALUE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const URL_VALUE = /https?:\/\/[^\s"']+/gi;

function errorFor(failures, message) {
  failures.push(`[qa-coverage-ledger] ${message}`);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function validateObjectShape(
  value,
  location,
  requiredKeys,
  allowedKeys,
  failures,
) {
  if (!isPlainObject(value)) {
    errorFor(failures, `${location} must be an object`);
    return false;
  }
  for (const key of requiredKeys) {
    if (!(key in value))
      errorFor(failures, `${location} is missing required field: ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key))
      errorFor(failures, `${location} has unknown field: ${key}`);
  }
  return true;
}

function validateEnum(value, allowedValues, location, failures) {
  if (!allowedValues.has(value)) {
    errorFor(failures, `${location} has unknown enum value: ${String(value)}`);
    return false;
  }
  return true;
}

function validateStringArray(value, location, failures) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => !nonEmptyString(item))
  ) {
    errorFor(failures, `${location} must be a non-empty array of strings`);
    return false;
  }
  if (!unique(value))
    errorFor(failures, `${location} must not contain duplicates`);
  return true;
}

function validateRepositoryReference(
  root,
  reference,
  location,
  failures,
  kind,
) {
  if (!nonEmptyString(reference)) return;
  if (
    path.isAbsolute(reference) ||
    reference.includes("\\") ||
    reference.split("/").includes("..")
  ) {
    errorFor(failures, `${location} must be a repository-relative path`);
    return;
  }
  const absolutePath = path.resolve(root, reference);
  if (
    !absolutePath.startsWith(`${path.resolve(root)}${path.sep}`) ||
    !existsSync(absolutePath) ||
    !statSync(absolutePath).isFile()
  ) {
    errorFor(
      failures,
      `${location} references a missing ${kind} file: ${reference}`,
    );
    return;
  }
  if (
    kind === "source" &&
    /(?:^|\/)(?:__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(
      reference,
    )
  ) {
    errorFor(
      failures,
      `${location} must reference implementation source, not a test file: ${reference}`,
    );
  }
  if (
    kind === "test" &&
    !/(?:^|\/)(?:__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(
      reference,
    )
  ) {
    errorFor(failures, `${location} must reference a test file: ${reference}`);
  }
}

function validateUrl(value, location, failures) {
  for (const matchedUrl of value.match(URL_VALUE) ?? []) {
    let parsed;
    try {
      parsed = new URL(matchedUrl);
    } catch {
      errorFor(failures, `${location} contains an invalid URL`);
      continue;
    }
    if (parsed.username || parsed.password) {
      errorFor(failures, `${location} contains a URL with credentials`);
    }
    if (parsed.search) {
      errorFor(failures, `${location} contains a URL with a query string`);
    }
    if (
      matchedUrl !== "https://calora.app" &&
      matchedUrl !== "https://www.calora.app"
    ) {
      errorFor(
        failures,
        `${location} contains a URL other than a safe public home URL`,
      );
    }
  }
}

function scanUnsafeValues(value, location, failures) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, `${location}[${index}]`, failures),
    );
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (FORBIDDEN_KEY_PARTS.test(key)) {
        errorFor(
          failures,
          `${location}.${key} uses a forbidden secret or identity-like field name`,
        );
      }
      scanUnsafeValues(nestedValue, `${location}.${key}`, failures);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (SECRET_LIKE_VALUE.test(value)) {
    errorFor(
      failures,
      `${location} contains a secret or credential-like value`,
    );
  }
  if (
    EMAIL_VALUE.test(value) ||
    PHONE_VALUE.test(value) ||
    IPV4_VALUE.test(value) ||
    UUID_VALUE.test(value)
  ) {
    errorFor(failures, `${location} contains a raw identity-like value`);
  }
  validateUrl(value, location, failures);
}

function validateEntry(root, entry, index, failures) {
  const location = `entries[${index}]`;
  if (
    !validateObjectShape(
      entry,
      location,
      [
        "id",
        "domain",
        "objective",
        "implementationSource",
        "automatedControlled",
        "liveVerification",
        "nativeDeviceVerification",
        "prerequisites",
        "evidence",
        "blockers",
      ],
      [
        "id",
        "domain",
        "objective",
        "implementationSource",
        "automatedControlled",
        "liveVerification",
        "nativeDeviceVerification",
        "prerequisites",
        "evidence",
        "blockers",
      ],
      failures,
    )
  )
    return;

  if (!/^QA-[A-Z]+-\d{3}$/.test(entry.id ?? ""))
    errorFor(failures, `${location}.id must match QA-AREA-001`);
  validateEnum(entry.domain, new Set(DOMAINS), `${location}.domain`, failures);
  if (!nonEmptyString(entry.objective))
    errorFor(failures, `${location}.objective must be a non-empty string`);

  if (
    validateStringArray(
      entry.implementationSource,
      `${location}.implementationSource`,
      failures,
    )
  ) {
    entry.implementationSource.forEach((reference, referenceIndex) => {
      validateRepositoryReference(
        root,
        reference,
        `${location}.implementationSource[${referenceIndex}]`,
        failures,
        "source",
      );
    });
  }

  if (
    validateObjectShape(
      entry.automatedControlled,
      `${location}.automatedControlled`,
      ["status", "command", "testRefs"],
      ["status", "command", "testRefs"],
      failures,
    )
  ) {
    validateEnum(
      entry.automatedControlled.status,
      AUTOMATED_STATUSES,
      `${location}.automatedControlled.status`,
      failures,
    );
    if (!ALLOWED_COMMANDS.has(entry.automatedControlled.command)) {
      errorFor(
        failures,
        `${location}.automatedControlled.command is not an approved high-level command`,
      );
    }
    if (
      validateStringArray(
        entry.automatedControlled.testRefs,
        `${location}.automatedControlled.testRefs`,
        failures,
      )
    ) {
      entry.automatedControlled.testRefs.forEach(
        (reference, referenceIndex) => {
          validateRepositoryReference(
            root,
            reference,
            `${location}.automatedControlled.testRefs[${referenceIndex}]`,
            failures,
            "test",
          );
        },
      );
    }
  }

  if (
    validateObjectShape(
      entry.liveVerification,
      `${location}.liveVerification`,
      ["status", "check"],
      ["status", "check"],
      failures,
    )
  ) {
    validateEnum(
      entry.liveVerification.status,
      LIVE_STATUSES,
      `${location}.liveVerification.status`,
      failures,
    );
    if (!nonEmptyString(entry.liveVerification.check))
      errorFor(
        failures,
        `${location}.liveVerification.check must be a non-empty string`,
      );
  }

  if (
    validateObjectShape(
      entry.nativeDeviceVerification,
      `${location}.nativeDeviceVerification`,
      ["status", "check"],
      ["status", "check"],
      failures,
    )
  ) {
    validateEnum(
      entry.nativeDeviceVerification.status,
      NATIVE_STATUSES,
      `${location}.nativeDeviceVerification.status`,
      failures,
    );
    if (!nonEmptyString(entry.nativeDeviceVerification.check))
      errorFor(
        failures,
        `${location}.nativeDeviceVerification.check must be a non-empty string`,
      );
  }

  if (
    validateStringArray(
      entry.prerequisites,
      `${location}.prerequisites`,
      failures,
    )
  ) {
    entry.prerequisites.forEach((prerequisite, prerequisiteIndex) => {
      validateEnum(
        prerequisite,
        PREREQUISITES,
        `${location}.prerequisites[${prerequisiteIndex}]`,
        failures,
      );
    });
  }

  if (
    validateObjectShape(
      entry.evidence,
      `${location}.evidence`,
      ["types", "retention"],
      ["types", "retention"],
      failures,
    )
  ) {
    if (
      validateStringArray(
        entry.evidence.types,
        `${location}.evidence.types`,
        failures,
      )
    ) {
      entry.evidence.types.forEach((type, typeIndex) => {
        validateEnum(
          type,
          EVIDENCE_TYPES,
          `${location}.evidence.types[${typeIndex}]`,
          failures,
        );
      });
    }
    validateEnum(
      entry.evidence.retention,
      RETENTION_PERIODS,
      `${location}.evidence.retention`,
      failures,
    );
  }

  if (!Array.isArray(entry.blockers)) {
    errorFor(failures, `${location}.blockers must be an array`);
  } else {
    entry.blockers.forEach((blocker, blockerIndex) => {
      const blockerLocation = `${location}.blockers[${blockerIndex}]`;
      if (
        !validateObjectShape(
          blocker,
          blockerLocation,
          ["name", "state", "reason"],
          ["name", "state", "reason"],
          failures,
        )
      )
        return;
      validateEnum(
        blocker.name,
        EXTERNAL_BLOCKER_NAMES,
        `${blockerLocation}.name`,
        failures,
      );
      validateEnum(
        blocker.state,
        BLOCKER_STATES,
        `${blockerLocation}.state`,
        failures,
      );
      if (!nonEmptyString(blocker.reason))
        errorFor(
          failures,
          `${blockerLocation}.reason must be a non-empty string`,
        );
    });
  }
}

export function validateQaCoverageLedger({
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  ledgerPath = DEFAULT_LEDGER_PATH,
} = {}) {
  const failures = [];
  const absoluteLedgerPath = path.resolve(root, ledgerPath);
  if (!existsSync(absoluteLedgerPath)) {
    return {
      ok: false,
      failures: [`[qa-coverage-ledger] ledger is missing: ${ledgerPath}`],
    };
  }

  let ledger;
  try {
    ledger = JSON.parse(readFileSync(absoluteLedgerPath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      failures: [
        `[qa-coverage-ledger] ledger is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
      ],
    };
  }

  scanUnsafeValues(ledger, "ledger", failures);
  if (
    !validateObjectShape(
      ledger,
      "ledger",
      ["schemaVersion", "baselineCommit", "coverageDomains", "entries"],
      ["schemaVersion", "baselineCommit", "coverageDomains", "entries"],
      failures,
    )
  ) {
    return { ok: false, failures };
  }

  if (ledger.schemaVersion !== SCHEMA_VERSION)
    errorFor(failures, `schemaVersion must be ${SCHEMA_VERSION}`);
  if (!/^[a-f0-9]{40}$/.test(ledger.baselineCommit ?? ""))
    errorFor(failures, "baselineCommit must be a lowercase 40-character SHA");

  if (
    validateStringArray(ledger.coverageDomains, "coverageDomains", failures)
  ) {
    ledger.coverageDomains.forEach((domain, index) =>
      validateEnum(
        domain,
        new Set(DOMAINS),
        `coverageDomains[${index}]`,
        failures,
      ),
    );
    if (
      ledger.coverageDomains.length !== DOMAINS.length ||
      DOMAINS.some((domain) => !ledger.coverageDomains.includes(domain))
    ) {
      errorFor(
        failures,
        "coverageDomains must contain every required Phase 1 QA domain exactly once",
      );
    }
  }

  if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
    errorFor(failures, "entries must be a non-empty array");
  } else {
    const ids = ledger.entries.map((entry) => entry?.id);
    if (!unique(ids)) errorFor(failures, "entries contains duplicate IDs");
    ledger.entries.forEach((entry, index) =>
      validateEntry(root, entry, index, failures),
    );
    const entryDomains = ledger.entries.map((entry) => entry?.domain);
    for (const domain of DOMAINS) {
      if (!entryDomains.includes(domain))
        errorFor(
          failures,
          `entries is missing required Phase 1 QA domain: ${domain}`,
        );
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary:
      failures.length === 0
        ? {
            baselineCommit: ledger.baselineCommit,
            domainCount: ledger.coverageDomains.length,
            entryCount: ledger.entries.length,
          }
        : undefined,
  };
}

export function formatValidationResult(result) {
  if (result.ok)
    return JSON.stringify({ status: "ok", ...result.summary }, null, 2);
  return `QA coverage ledger validation failed:\n- ${result.failures.join("\n- ")}`;
}

function main() {
  const ledgerPath = process.argv[2] ?? DEFAULT_LEDGER_PATH;
  const result = validateQaCoverageLedger({ ledgerPath });
  if (!result.ok) throw new Error(formatValidationResult(result));
  console.log(formatValidationResult(result));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "[qa-coverage-ledger] unknown failure",
    );
    process.exitCode = 1;
  }
}
