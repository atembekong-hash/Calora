import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LEDGER_PATH,
  validateQaCoverageLedger,
} from "./validate-qa-coverage-ledger.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const canonicalLedger = JSON.parse(
  readFileSync(path.join(repositoryRoot, DEFAULT_LEDGER_PATH), "utf8"),
);

function fixtureLedger(mutate) {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "calora-qa-coverage-ledger-"),
  );
  const ledger = structuredClone(canonicalLedger);
  mutate?.(ledger);
  const ledgerPath = path.join(root, "ledger.json");
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  return { root, ledgerPath };
}

function validateFixture(mutate) {
  const fixture = fixtureLedger(mutate);
  try {
    return validateQaCoverageLedger({
      root: repositoryRoot,
      ledgerPath: fixture.ledgerPath,
    });
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

test("accepts the checked-in Phase 1 QA coverage ledger", () => {
  const result = validateQaCoverageLedger({ root: repositoryRoot });
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.deepEqual(result.summary, {
    baselineCommit: "c04c5f1bbab734ba2a4a88c827e3a78ff6c12c51",
    domainCount: 8,
    entryCount: 8,
  });
});

test("rejects an invalid baseline SHA and incomplete domain inventory", () => {
  const result = validateFixture((ledger) => {
    ledger.baselineCommit = "not-a-sha";
    ledger.coverageDomains.pop();
  });
  assert.equal(result.ok, false);
  assert.match(
    result.failures.join("\n"),
    /baselineCommit must be a lowercase 40-character SHA/,
  );
  assert.match(
    result.failures.join("\n"),
    /coverageDomains must contain every required Phase 1 QA domain exactly once/,
  );
});

test("rejects duplicate IDs, unknown layers, and unknown evidence enums", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[1].id = ledger.entries[0].id;
    ledger.entries[0].liveVerification.status = "browser-only";
    ledger.entries[0].evidence.types[0] = "screenshot-dump";
  });
  assert.equal(result.ok, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /entries contains duplicate IDs/);
  assert.match(
    failures,
    /liveVerification.status has unknown enum value: browser-only/,
  );
  assert.match(
    failures,
    /evidence.types\[0\] has unknown enum value: screenshot-dump/,
  );
});

test("rejects missing implementation and automated test references", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[0].implementationSource = [
      "artifacts/calora/app/missing.tsx",
    ];
    ledger.entries[0].automatedControlled.testRefs = [
      "artifacts/calora/lib/missing.test.ts",
    ];
  });
  assert.equal(result.ok, false);
  const failures = result.failures.join("\n");
  assert.match(
    failures,
    /references a missing source file: artifacts\/calora\/app\/missing\.tsx/,
  );
  assert.match(
    failures,
    /references a missing test file: artifacts\/calora\/lib\/missing\.test\.ts/,
  );
});

test("rejects a non-test file registered as automated controlled coverage", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[0].automatedControlled.testRefs = [
      "artifacts/calora/app/(tabs)/_layout.tsx",
    ];
  });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must reference a test file/);
});

test("rejects unsafe secret-like keys and values", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[0].apiToken = "redacted";
    ledger.entries[0].objective = "Record password rotation status.";
  });
  assert.equal(result.ok, false);
  const failures = result.failures.join("\n");
  assert.match(
    failures,
    /apiToken uses a forbidden secret or identity-like field name/,
  );
  assert.match(failures, /contains a secret or credential-like value/);
});

test("rejects raw identity-like data and URLs with credentials or query strings", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[0].objective =
      "Contact qa.person@example.test at +1 415 555 1212.";
    ledger.entries[0].liveVerification.check =
      "Open https://operator:pass@example.test/check?run=1.";
  });
  assert.equal(result.ok, false);
  const failures = result.failures.join("\n");
  assert.match(failures, /contains a raw identity-like value/);
  assert.match(failures, /contains a URL with credentials/);
  assert.match(failures, /contains a URL with a query string/);
});

test("rejects invalid external blocker names and unknown prerequisite enums", () => {
  const result = validateFixture((ledger) => {
    ledger.entries[0].prerequisites[0] = "staging-admin";
    ledger.entries[0].blockers = [
      {
        name: "vendor-contact",
        state: "open",
        reason: "External confirmation is pending.",
      },
    ];
  });
  assert.equal(result.ok, false);
  const failures = result.failures.join("\n");
  assert.match(
    failures,
    /prerequisites\[0\] has unknown enum value: staging-admin/,
  );
  assert.match(
    failures,
    /blockers\[0\].name has unknown enum value: vendor-contact/,
  );
});

test("rejects an unknown top-level field to keep the schema closed", () => {
  const result = validateFixture((ledger) => {
    ledger.unreviewedNotes = "This field is not part of the schema.";
  });
  assert.equal(result.ok, false);
  assert.match(
    result.failures.join("\n"),
    /ledger has unknown field: unreviewedNotes/,
  );
});
