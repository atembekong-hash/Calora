#!/usr/bin/env node

const APPROVED_TARGETS = Object.freeze({
  staging: Object.freeze({
    githubEnvironment: "calora-recovery-staging",
    targetId: "calora-staging-recovery",
    attestation: "CALORA_STAGING_RECOVERY_V1",
  }),
  "disposable-rehearsal": Object.freeze({
    githubEnvironment: "calora-recovery-disposable",
    targetId: "calora-disposable-recovery",
    attestation: "CALORA_DISPOSABLE_RECOVERY_V1",
  }),
});

function fail(message) {
  throw new Error(`Recovery target rejected: ${message}`);
}

function required(value, label) {
  if (typeof value !== "string" || value.trim() === "") fail(`${label} is missing`);
  return value.trim();
}

function parseDatabaseUrl(value) {
  const raw = required(value, "database endpoint");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail("database endpoint metadata is invalid");
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) fail("database endpoint scheme is not approved");
  if (!parsed.hostname || parsed.hostname.includes("@")) fail("database endpoint host is invalid");
  if (!parsed.pathname || parsed.pathname === "/") fail("database name is missing from endpoint metadata");
  return parsed;
}

export function validateRecoveryTarget({
  target,
  attestation,
  ref,
  databaseUrl,
  targetId,
  endpointHost,
  databaseName,
}) {
  const selectedTarget = required(target, "target");
  const config = APPROVED_TARGETS[selectedTarget];
  if (!config) fail("target is not approved");
  if (required(ref, "workflow ref") !== "refs/heads/main") fail("workflow ref is not approved");
  if (required(attestation, "target attestation") !== config.attestation) fail("target attestation does not match target");
  if (required(targetId, "target identity") !== config.targetId) fail("protected target identity does not match target");

  const expectedHost = required(endpointHost, "protected endpoint host").toLowerCase();
  const expectedDatabase = required(databaseName, "protected database name");
  const endpoint = parseDatabaseUrl(databaseUrl);
  if (endpoint.hostname.toLowerCase() !== expectedHost) fail("database endpoint host does not match protected metadata");
  if (decodeURIComponent(endpoint.pathname.slice(1)) !== expectedDatabase) fail("database name does not match protected metadata");

  return {
    target: selectedTarget,
    githubEnvironment: config.githubEnvironment,
    targetId: config.targetId,
    endpointHost: expectedHost,
    databaseName: expectedDatabase,
  };
}

export { APPROVED_TARGETS };

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = validateRecoveryTarget({
      target: process.env.CALORA_RECOVERY_TARGET,
      attestation: process.env.CALORA_RECOVERY_ATTESTATION,
      ref: process.env.GITHUB_REF,
      databaseUrl: process.env.CALORA_BACKUP_DATABASE_URL,
      targetId: process.env.CALORA_RECOVERY_TARGET_ID,
      endpointHost: process.env.CALORA_RECOVERY_ENDPOINT_HOST,
      databaseName: process.env.CALORA_RECOVERY_DATABASE_NAME,
    });
    process.stdout.write(`${JSON.stringify({ result: "approved", target: result.target })}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Recovery target rejected"}\n`);
    process.exitCode = 1;
  }
}
