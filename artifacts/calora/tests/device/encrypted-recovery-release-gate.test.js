const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '../..');
const gatePath = path.join(
  projectRoot,
  'scripts',
  'encrypted-recovery-release-gate.js',
);
const sensitiveOutput =
  'SecureStoreKey=fixture-secret recoveryPayload=plaintext-secret';
const evidenceKeys = [
  'appId',
  'flow',
  'result',
  'targets',
  'timestamp',
];

function writeFakeMaestro(directory) {
  const executablePath = path.join(directory, 'maestro');
  fs.writeFileSync(
    executablePath,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '%s\\n' '1.40.0'
  exit 0
fi

printf '%s\\n' '${sensitiveOutput}'
if [ "\${3:-}" = "\${FAKE_MAESTRO_FAIL_DEVICE:-}" ] && [ -n "\${FAKE_MAESTRO_FAIL_DEVICE:-}" ]; then
  exit 17
fi
exit 0
`,
    { mode: 0o700 },
  );
  return executablePath;
}

function runGate({
  iosDevice = 'ios-simulator-001',
  androidDevice = 'android-emulator-001',
  failDevice,
  maestro = 'available',
}) {
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'calora-encrypted-recovery-gate-'),
  );
  const maestroDirectory = path.join(fixtureDirectory, 'bin');
  const evidencePath = path.join(fixtureDirectory, 'release', 'evidence.json');
  fs.mkdirSync(maestroDirectory);

  if (maestro === 'available') {
    writeFakeMaestro(maestroDirectory);
  }

  const result = spawnSync(process.execPath, [gatePath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      CALORA_IOS_DEVICE: iosDevice,
      CALORA_ANDROID_DEVICE: androidDevice,
      CALORA_ENCRYPTED_RECOVERY_EVIDENCE_PATH: evidencePath,
      FAKE_MAESTRO_FAIL_DEVICE: failDevice || '',
      PATH:
        maestro === 'available'
          ? `${maestroDirectory}:${process.env.PATH || ''}`
          : path.join(fixtureDirectory, 'missing-bin'),
    },
    encoding: 'utf8',
  });

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  return {
    ...result,
    evidence,
    evidenceText: fs.readFileSync(evidencePath, 'utf8'),
    fixtureDirectory,
  };
}

function assertEvidenceLineIsSanitized(stdout, evidence) {
  const evidenceLine = stdout
    .split('\n')
    .find((line) =>
      line.startsWith('[encrypted-recovery] RELEASE EVIDENCE '),
    );

  assert.ok(evidenceLine, 'the release evidence should be printed');
  assert.equal(evidenceLine.includes(sensitiveOutput), false);
  assert.deepEqual(
    JSON.parse(
      evidenceLine.slice('[encrypted-recovery] RELEASE EVIDENCE '.length),
    ),
    evidence,
  );
}

function assertEvidenceSchema(evidence, expectedTargets, expectedResult, failureClass) {
  assert.deepEqual(
    Object.keys(evidence).sort(),
    [...evidenceKeys, ...(failureClass ? ['failureClass'] : [])].sort(),
  );
  assert.equal(evidence.flow, 'tests/device/encrypted-recovery.yaml');
  assert.equal(evidence.appId, 'com.etiendem.caloraapp');
  assert.match(
    evidence.timestamp,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  assert.deepEqual(evidence.targets, expectedTargets);
  assert.equal(evidence.result, expectedResult);
  if (failureClass) {
    assert.equal(evidence.failureClass, failureClass);
  }
  assert.equal(JSON.stringify(evidence).includes(sensitiveOutput), false);
}

test('records sanitized evidence for a passing iOS and Android run', (t) => {
  const result = runGate({});
  t.after(() => fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }));

  assert.equal(result.status, 0);
  assertEvidenceSchema(
    result.evidence,
    [
      {
        platform: 'iOS',
        targetId: 'ios-simulator-001',
        outcome: 'passed',
        exitCode: 0,
      },
      {
        platform: 'Android',
        targetId: 'android-emulator-001',
        outcome: 'passed',
        exitCode: 0,
      },
    ],
    'passed',
  );
  assertEvidenceLineIsSanitized(result.stdout, result.evidence);
  assert.equal(result.evidenceText.includes(sensitiveOutput), false);
});

test('records the failed platform and preserves the sanitized boundary', (t) => {
  const result = runGate({ failDevice: 'ios-simulator-001' });
  t.after(() => fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }));

  assert.equal(result.status, 1);
  assertEvidenceSchema(
    result.evidence,
    [
      {
        platform: 'iOS',
        targetId: 'ios-simulator-001',
        outcome: 'failed',
        exitCode: 17,
      },
      {
        platform: 'Android',
        targetId: 'android-emulator-001',
        outcome: 'passed',
        exitCode: 0,
      },
    ],
    'failed',
    'platform_failure',
  );
  assertEvidenceLineIsSanitized(result.stdout, result.evidence);
  assert.equal(result.evidenceText.includes(sensitiveOutput), false);
});

test('writes failed evidence and exits nonzero when a target is missing', (t) => {
  const result = runGate({
    iosDevice: '',
    androidDevice: 'android-emulator-001',
  });
  t.after(() => fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }));

  assert.equal(result.status, 1);
  assertEvidenceSchema(
    result.evidence,
    [
      {
        platform: 'iOS',
        targetId: null,
        outcome: 'not-run',
        exitCode: null,
      },
      {
        platform: 'Android',
        targetId: 'android-emulator-001',
        outcome: 'not-run',
        exitCode: null,
      },
    ],
    'failed',
    'missing_target_selection',
  );
  assertEvidenceLineIsSanitized(result.stdout, result.evidence);
});

test('writes failed evidence and exits nonzero when Maestro is unavailable', (t) => {
  const result = runGate({ maestro: 'unavailable' });
  t.after(() => fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }));

  assert.equal(result.status, 1);
  assertEvidenceSchema(
    result.evidence,
    [
      {
        platform: 'iOS',
        targetId: 'ios-simulator-001',
        outcome: 'not-run',
        exitCode: null,
      },
      {
        platform: 'Android',
        targetId: 'android-emulator-001',
        outcome: 'not-run',
        exitCode: null,
      },
    ],
    'failed',
    'maestro_unavailable',
  );
  assertEvidenceLineIsSanitized(result.stdout, result.evidence);
});