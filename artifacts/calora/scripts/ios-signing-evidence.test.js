const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  buildEvidence,
  extractFailureClass,
  extractPrefixedSummaryLines,
  resolveEvidencePath,
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