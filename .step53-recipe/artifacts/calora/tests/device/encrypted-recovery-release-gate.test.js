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
  'signedBuildIdentifier',
  'targets',
  'timestamp',
];
const signedBuildIdentifier = 'eas-build-ios-001,eas-build-android-001';

function writeFakeMaestro(directory) {
  const executablePath = path.join(directory, 'maestro');
  fs.writeFileSync(
    executablePath,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
   printf '%s\\n' "\${FAKE_MAESTRO_VERSION:-1.40.0}"
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

function writeFakeNativeTools(directory) {
  fs.writeFileSync(
    path.join(directory, 'xcrun'),
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '%s\\n' 'xcrun version 1.0'
  exit 0
fi
if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then
  if [ "\${FAKE_UNAVAILABLE_PLATFORM:-}" = "iOS" ]; then
    printf '%s\\n' '{"devices":{"iOS":{"udid":"other-ios-device","state":"Booted"}}}'
    exit 0
  fi
  printf '%s\\n' '{"devices":{"iOS":{"udid":"ios-simulator-001","state":"Booted"}}}'
  exit 0
fi
if [ "\${FAKE_MISSING_BUILD_PLATFORM:-}" = "iOS" ]; then
  exit 1
fi
printf '%s\\n' '/tmp/Calora.app'
`,
    { mode: 0o700 },
  );
  fs.writeFileSync(
    path.join(directory, 'adb'),
    `#!/bin/sh
if [ "$1" = "version" ]; then
  printf '%s\\n' 'Android Debug Bridge version 1.0.41'
  exit 0
fi
if [ "$3" = "get-state" ]; then
  if [ "\${FAKE_UNAVAILABLE_PLATFORM:-}" = "Android" ]; then
    printf '%s\\n' 'offline'
    exit 0
  fi
  printf '%s\\n' 'device'
  exit 0
fi
if [ "\${FAKE_MISSING_BUILD_PLATFORM:-}" = "Android" ]; then
  exit 1
fi
printf '%s\\n' 'package:/data/app/com.etiendem.caloraapp/base.apk'
`,
    { mode: 0o700 },
  );
}

function runGate({
  iosDevice = 'ios-simulator-001',
  androidDevice = 'android-emulator-001',
  failDevice,
  maestro = 'available',
  maestroVersion = '1.40.0',
  buildCheck = false,
  missingBuildPlatform,
  unavailablePlatform,
  summary = true,
  signedBuildIdentifier: buildIdentifier = signedBuildIdentifier,
}) {
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'calora-encrypted-recovery-gate-'),
  );
  const maestroDirectory = path.join(fixtureDirectory, 'bin');
  const evidencePath = path.join(fixtureDirectory, 'release', 'evidence.json');
  const summaryPath = path.join(fixtureDirectory, 'release', 'summary.md');
  fs.mkdirSync(maestroDirectory);
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

  if (maestro === 'available') {
    writeFakeMaestro(maestroDirectory);
  }
  writeFakeNativeTools(maestroDirectory);

  const result = spawnSync(process.execPath, [gatePath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      CALORA_IOS_DEVICE: iosDevice,
      CALORA_ANDROID_DEVICE: androidDevice,
      CALORA_ENCRYPTED_RECOVERY_SIGNED_BUILD_IDENTIFIER: buildIdentifier,
      CALORA_ENCRYPTED_RECOVERY_EVIDENCE_PATH: evidencePath,
      CALORA_ENCRYPTED_RECOVERY_BUILD_CHECK: buildCheck ? 'true' : '',
      FAKE_MISSING_BUILD_PLATFORM: missingBuildPlatform || '',
      FAKE_UNAVAILABLE_PLATFORM: unavailablePlatform || '',
      FAKE_MAESTRO_VERSION: maestroVersion,
      GITHUB_STEP_SUMMARY: summary ? summaryPath : '',
      FAKE_MAESTRO_FAIL_DEVICE: failDevice || '',
      PATH:
        maestro === 'available'
          ? `${maestroDirectory}:${process.env.PATH || ''}`
          : `${maestroDirectory}:/usr/bin:/bin`,
    },
    encoding: 'utf8',
  });

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  return {
    ...result,
    evidence,
    evidenceText: fs.readFileSync(evidencePath, 'utf8'),
    summaryText: summary ? fs.readFileSync(summaryPath, 'utf8') : '',
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

function assertEvidenceSchema(
  evidence,
  expectedTargets,
  expectedResult,
  failureClass,
) {
  assert.deepEqual(
    Object.keys(evidence).sort(),
    [...evidenceKeys, ...(failureClass ? ['failureClass'] : [])].sort(),
  );
  assert.equal(evidence.flow, 'tests/device/encrypted-recovery.yaml');
  assert.equal(evidence.appId, 'com.etiendem.caloraapp');
  assert.equal(evidence.signedBuildIdentifier, signedBuildIdentifier);
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
  const result = runGate({ buildCheck: true });
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
  assert.equal(result.summaryText.includes(sensitiveOutput), false);
  assert.match(result.summaryText, new RegExp(signedBuildIdentifier));
  assert.match(result.summaryText, /\| xcrun \| ✅ Ready \| 1\.0 \|/);
  assert.match(result.summaryText, /\| adb \| ✅ Ready \| 1\.0\.41 \|/);
  assert.match(result.summaryText, /\| Maestro \| ✅ Ready \| 1\.40\.0 \|/);
  assert.match(result.summaryText, /iOS target \(ios-simulator-001\).*app installed/);
  assert.match(
    result.summaryText,
    /Android target \(android-emulator-001\).*app installed/,
  );
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
  assert.equal(result.summaryText.includes(sensitiveOutput), false);
  assert.match(result.summaryText, new RegExp(signedBuildIdentifier));
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

test('records a missing native build without running Maestro', (t) => {
  const result = runGate({
    buildCheck: true,
    missingBuildPlatform: 'iOS',
  });
  t.after(() =>
    fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }),
  );

  assert.equal(result.status, 1);
  assertEvidenceSchema(
    result.evidence,
    [
      {
        platform: 'iOS',
        targetId: 'ios-simulator-001',
        outcome: 'failed',
        exitCode: 1,
      },
      {
        platform: 'Android',
        targetId: 'android-emulator-001',
        outcome: 'not-run',
        exitCode: null,
      },
    ],
    'failed',
    'missing_build',
  );
  assert.match(result.stderr, /iOS build missing/);
  assertEvidenceLineIsSanitized(result.stdout, result.evidence);
});

test('rejects an unsupported Maestro version before running the flow', (t) => {
  const result = runGate({ maestroVersion: '1.39.2' });
  t.after(() =>
    fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }),
  );

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
    'maestro_unsupported',
  );
  assert.match(result.stderr, /Maestro 1\.39\.2 is unsupported/);
  assert.match(result.summaryText, /Maestro \| ❌ Failed \| 1\.39\.2 \|/);
  assert.match(result.summaryText, /required Maestro 1\.40\.x/);
  assert.equal(result.stdout.includes(sensitiveOutput), false);
  assert.equal(result.evidenceText.includes(sensitiveOutput), false);
});

test('rejects a stale disposable target before running Maestro', (t) => {
  const result = runGate({ unavailablePlatform: 'Android' });
  t.after(() =>
    fs.rmSync(result.fixtureDirectory, { recursive: true, force: true }),
  );

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
        outcome: 'failed',
        exitCode: 1,
      },
    ],
    'failed',
    'target_unavailable',
  );
  assert.match(result.stderr, /Android target android-emulator-001 is not booted or connected/);
  assert.match(result.summaryText, /Android target \(android-emulator-001\) \| ❌ Failed/);
  assert.match(result.summaryText, /select a disposable target/);
  assert.equal(result.stdout.includes(sensitiveOutput), false);
  assert.equal(result.evidenceText.includes(sensitiveOutput), false);
});
