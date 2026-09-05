const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  buildEvidence,
  EVIDENCE_STORAGE_FAILURE_CLASS,
  extractFailureClass,
  extractPrefixedSummaryLines,
  formatStorageFailure,
  getStorageErrorCode,
  resolveEvidencePath,
  run,
} = require('./ios-signing-evidence');

test('keeps only prefixed preflight summary lines', () => {
  assert.deepEqual(
    extractPrefixedSummaryLines(
      [
        'raw EAS output must not be retained',
        '[ios-signing] RELEASE PREFLIGHT FAILED',
        '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
        'certificatePassword=must-not-be-captured',
        '[other-tool] unrelated output',
      ].join('\n'),
    ),
    [
      '[ios-signing] RELEASE PREFLIGHT FAILED',
      '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
    ],
  );
});

test('extracts the preflight failure class without retaining failure logs', () => {
  assert.equal(
    extractFailureClass([
      '[ios-signing] RELEASE PREFLIGHT FAILED',
      '[ios-signing] Failure class: EAS_RECORD',
      '[ios-signing] App: com.etiendem.caloraapp',
    ]),
    'EAS_RECORD',
  );
});

test('builds a sanitized passed evidence record with the exit code', () => {
  assert.deepEqual(
    buildEvidence({
      output: '[ios-signing] APPLE CERTIFICATE REHEARSAL PASSED\nraw output',
      exitCode: 0,
      generatedAt: '2026-09-05T12:00:00.000Z',
    }),
    {
      schemaVersion: 1,
      generatedAt: '2026-09-05T12:00:00.000Z',
      result: 'passed',
      exitCode: 0,
      failureClass: null,
      summaryLines: ['[ios-signing] APPLE CERTIFICATE REHEARSAL PASSED'],
    },
  );
});

test('uses the configured evidence path before the CI temp directory', () => {
  assert.equal(
    resolveEvidencePath({
      CALORA_IOS_SIGNING_EVIDENCE_PATH: 'release/ios-signing.json',
      RUNNER_TEMP: '/tmp/runner',
    }),
    path.resolve(__dirname, '..', 'release/ios-signing.json'),
  );
  assert.equal(
    resolveEvidencePath({ RUNNER_TEMP: '/tmp/runner' }),
    '/tmp/runner/calora-ios-signing-evidence.json',
  );
  assert.equal(resolveEvidencePath({}), null);
});

test('sanitizes evidence storage diagnostics to a stable error class and code', () => {
  assert.equal(
    getStorageErrorCode({ code: 'eacces', message: 'raw child output must not leak' }),
    'EACCES',
  );
  assert.equal(getStorageErrorCode(new Error('raw child output must not leak')), 'UNKNOWN');
  assert.deepEqual(
    formatStorageFailure(
      { code: 'EACCES', message: 'raw child output must not leak' },
      '/private/release/evidence.json',
    ),
    [
      '[ios-signing] Evidence archive failed: required sanitized evidence artifact could not be archived to /private/release/evidence.json.',
      `[ios-signing] Evidence archive failure class: ${EVIDENCE_STORAGE_FAILURE_CLASS}`,
      '[ios-signing] Evidence archive diagnostic: EACCES.',
    ],
  );
  assert.ok(
    formatStorageFailure({ code: 'EACCES', message: 'raw child output must not leak' }).every(
      (line) => !line.includes('raw child output'),
    ),
  );
});

test('prints the preflight result before an archive failure and preserves its exit status', () => {
  const stdout = [];
  const stderr = [];
  const result = run({
    env: { CALORA_IOS_SIGNING_EVIDENCE_PATH: 'release/evidence.json' },
    spawn: () => ({
      stdout: 'raw EAS output',
      stderr: [
        '[ios-signing] RELEASE PREFLIGHT FAILED',
        '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
      ].join('\n'),
      status: 17,
      signal: null,
    }),
    write: () => {
      throw Object.assign(new Error('raw child output must not leak'), { code: 'EACCES' });
    },
    appendSummary: () => {},
    output: {
      log: (line) => stdout.push(line),
      error: (line) => stderr.push(line),
    },
  });

  assert.equal(result, 17);
  assert.deepEqual(stdout, [
    '[ios-signing] RELEASE PREFLIGHT FAILED',
    '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
    '[ios-signing] Preflight exit status: 17',
  ]);
  assert.ok(stderr.some((line) => line.includes('Evidence archive failure class: EVIDENCE_STORAGE')));
  assert.ok(stderr.some((line) => line.includes('Evidence archive diagnostic: EACCES.')));
  assert.ok(stderr.every((line) => !line.includes('raw child output')));
});

test('fails a successful release when its required artifact cannot be archived', () => {
  const stderr = [];
  const result = run({
    env: { CALORA_IOS_SIGNING_EVIDENCE_PATH: 'release/evidence.json' },
    spawn: () => ({
      stdout: '[ios-signing] APPLE CERTIFICATE REHEARSAL PASSED',
      stderr: '',
      status: 0,
      signal: null,
    }),
    write: () => {
      throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
    },
    appendSummary: () => {},
    output: {
      log: () => {},
      error: (line) => stderr.push(line),
    },
  });

  assert.equal(result, 1);
  assert.ok(stderr.some((line) => line.includes('required sanitized evidence artifact')));
});