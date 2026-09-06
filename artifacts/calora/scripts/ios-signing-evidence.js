const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const preflightPath = path.join(__dirname, 'ios-signing-preflight.js');
const evidenceFileName = 'calora-ios-signing-evidence.json';
const IOS_SIGNING_PREFIX = '[ios-signing] ';
const EVIDENCE_STORAGE_FAILURE_CLASS = 'EVIDENCE_STORAGE';

function extractPrefixedSummaryLines(output) {
  return String(output)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith(IOS_SIGNING_PREFIX));
}

function extractFailureClass(summaryLines) {
  const failureLine = summaryLines.find((line) => line.includes('Failure class:'));
  return failureLine?.match(/Failure class:\s*([A-Z_]+)/)?.[1] || null;
}

function resolveEvidencePath(env = process.env) {
  const configuredPath = env.CALORA_IOS_SIGNING_EVIDENCE_PATH?.trim();
  if (configuredPath) {
    return path.resolve(projectRoot, configuredPath);
  }

  const runnerTemp = env.RUNNER_TEMP?.trim();
  if (runnerTemp) {
    return path.resolve(runnerTemp, evidenceFileName);
  }

  return null;
}

function buildEvidence({ output, exitCode, signal = null, generatedAt = new Date().toISOString() }) {
  const summaryLines = extractPrefixedSummaryLines(output);
  return {
    schemaVersion: 1,
    generatedAt,
    result: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    ...(signal ? { signal } : {}),
    failureClass: extractFailureClass(summaryLines),
    summaryLines,
  };
}

function writeEvidence(evidence, evidencePath) {
  if (!evidencePath) {
    return null;
  }

  const evidenceDirectory = path.dirname(evidencePath);
  const evidenceFile = path.basename(evidencePath);
  fs.mkdirSync(evidenceDirectory, {
    recursive: true,
    mode: 0o700,
  });

  const temporaryDirectory = fs.mkdtempSync(
    path.join(evidenceDirectory, `.${evidenceFile}.`),
  );
  const temporaryPath = path.join(temporaryDirectory, evidenceFile);
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, evidencePath);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  return evidencePath;
}

function removeExistingEvidence(evidencePath) {
  if (!evidencePath) {
    return null;
  }

  try {
    fs.unlinkSync(evidencePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  return evidencePath;
}

function appendStepSummary(evidence, env = process.env) {
  const summaryPath = env.GITHUB_STEP_SUMMARY?.trim();
  if (!summaryPath) {
    return;
  }

  fs.appendFileSync(
    summaryPath,
    [
      '## iOS signing rehearsal evidence',
      '',
      '```json',
      JSON.stringify(evidence, null, 2),
      '```',
      '',
    ].join('\n'),
  );
}

function getStorageErrorCode(error) {
  const code = typeof error?.code === 'string' ? error.code.toUpperCase() : '';
  return /^[A-Z][A-Z0-9_]*$/.test(code) ? code : 'UNKNOWN';
}

function formatStorageFailure(error, destination = 'the configured evidence destination') {
  return [
    `[ios-signing] Evidence archive failed: required sanitized evidence artifact could not be archived to ${destination}.`,
    `[ios-signing] Evidence archive failure class: ${EVIDENCE_STORAGE_FAILURE_CLASS}`,
    `[ios-signing] Evidence archive diagnostic: ${getStorageErrorCode(error)}.`,
  ];
}

function run({
  spawn = spawnSync,
  env = process.env,
  write = writeEvidence,
  remove = removeExistingEvidence,
  appendSummary = appendStepSummary,
  output = console,
} = {}) {
  const result = spawn(process.execPath, [preflightPath, ...process.argv.slice(2)], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const childOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
  const exitCode = result.status ?? 1;
  const evidence = buildEvidence({
    output: childOutput,
    exitCode,
    signal: result.signal,
  });

  for (const line of evidence.summaryLines) {
    output.log(line);
  }
  if (evidence.summaryLines.length === 0) {
    output.error('[ios-signing] No sanitized preflight summary was emitted.');
  }
  output.log(`[ios-signing] Preflight exit status: ${exitCode}`);

  const resolvedEvidencePath = resolveEvidencePath(env);
  let evidencePath = null;
  let evidenceWriteError = null;
  try {
    remove(resolvedEvidencePath);
    evidencePath = write(evidence, resolvedEvidencePath);
  } catch (error) {
    evidenceWriteError = error;
    for (const line of formatStorageFailure(error, resolvedEvidencePath)) {
      output.error(line);
    }
  }

  if (evidencePath) {
    output.log(`[ios-signing] Evidence written to ${evidencePath}`);
  }

  try {
    appendSummary(evidence, env);
  } catch (error) {
    for (const line of formatStorageFailure(error, 'the GitHub step summary')) {
      output.error(line);
    }
  }

  // A failed preflight remains the primary result and must keep its original
  // status. A successful preflight is not releasable when its required
  // evidence artifact could not be archived.
  return exitCode === 0 && resolvedEvidencePath && evidenceWriteError ? 1 : exitCode;
}

if (require.main === module) {
  process.exit(run());
}

module.exports = {
  EVIDENCE_STORAGE_FAILURE_CLASS,
  IOS_SIGNING_PREFIX,
  buildEvidence,
  extractFailureClass,
  extractPrefixedSummaryLines,
  formatStorageFailure,
  getStorageErrorCode,
  removeExistingEvidence,
  resolveEvidencePath,
  run,
};