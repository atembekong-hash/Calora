const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const preflightPath = path.join(__dirname, 'ios-signing-preflight.js');
const evidenceFileName = 'calora-ios-signing-evidence.json';
const IOS_SIGNING_PREFIX = '[ios-signing] ';

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

  fs.mkdirSync(path.dirname(evidencePath), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  return evidencePath;
}

function appendStepSummary(evidence) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();
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

function run() {
  const result = spawnSync(process.execPath, [preflightPath, ...process.argv.slice(2)], {
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
  const evidencePath = writeEvidence(evidence, resolveEvidencePath());

  for (const line of evidence.summaryLines) {
    console.log(line);
  }
  if (evidence.summaryLines.length === 0) {
    console.error('[ios-signing] No sanitized preflight summary was emitted.');
  }
  if (evidencePath) {
    console.log(`[ios-signing] Evidence written to ${evidencePath}`);
  }
  appendStepSummary(evidence);

  return exitCode;
}

if (require.main === module) {
  process.exit(run());
}

module.exports = {
  IOS_SIGNING_PREFIX,
  buildEvidence,
  extractFailureClass,
  extractPrefixedSummaryLines,
  resolveEvidencePath,
};