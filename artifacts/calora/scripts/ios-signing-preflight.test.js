const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyBuildFailure,
  evaluateCredentialReadiness,
  redactSensitiveText,
} = require('./ios-signing-preflight');

const now = new Date('2026-09-05T12:00:00.000Z');

function validCredentials(overrides = {}) {
  return {
    distributionCertificate: {
      validityNotBefore: '2026-01-01T00:00:00.000Z',
      validityNotAfter: '2027-01-01T00:00:00.000Z',
    },
    provisioningProfile: {
      expiration: '2027-01-01T00:00:00.000Z',
      status: 'ACTIVE',
    },
    ...overrides,
  };
}

test('accepts active App Store credentials with future expirations', () => {
  assert.deepEqual(evaluateCredentialReadiness(validCredentials(), now), {
    ready: true,
    certificateExpires: '2027-01-01',
    provisioningProfileExpires: '2027-01-01',
  });
});

test('fails when the distribution certificate is missing', () => {
  const result = evaluateCredentialReadiness(
    validCredentials({ distributionCertificate: null }),
    now,
  );
  assert.equal(result.ready, false);
  assert.equal(result.failureClass, 'EAS_RECORD');
  assert.match(result.reason, /distribution certificate/i);
});

test('fails when the distribution certificate is expired', () => {
  const result = evaluateCredentialReadiness(
    validCredentials({
      distributionCertificate: {
        validityNotBefore: '2025-01-01T00:00:00.000Z',
        validityNotAfter: '2026-09-04T00:00:00.000Z',
      },
    }),
    now,
  );
  assert.equal(result.ready, false);
  assert.equal(result.failureClass, 'EAS_RECORD');
  assert.match(result.reason, /outside its validity window/i);
});

test('fails when the provisioning profile is not active', () => {
  const result = evaluateCredentialReadiness(
    validCredentials({
      provisioningProfile: {
        expiration: '2027-01-01T00:00:00.000Z',
        status: 'REVOKED',
      },
    }),
    now,
  );
  assert.equal(result.ready, false);
  assert.equal(result.failureClass, 'EAS_RECORD');
  assert.match(result.reason, /not active/i);
});

test('does not include certificate material in readiness output', () => {
  const result = evaluateCredentialReadiness(validCredentials(), now);
  assert.equal('certificateP12' in result, false);
  assert.equal('certificatePassword' in result, false);
});

test('classifies Apple-side certificate rejection separately from an EAS build failure', () => {
  const appleFailure = classifyBuildFailure(
    'Apple Developer rejected the distribution certificate because it was revoked.',
  );
  assert.deepEqual(appleFailure, {
    failureClass: 'APPLE_CERTIFICATE_STATE',
    reason:
      'EAS reached the Apple signing step, but Apple rejected or invalidated the distribution certificate or provisioning profile.',
  });

  const infrastructureFailure = classifyBuildFailure('EAS build worker timed out.');
  assert.deepEqual(infrastructureFailure, {
    failureClass: 'EAS_BUILD',
    reason:
      'The EAS build failed without a recognizable Apple certificate-state response; Apple-side revocation was not proven.',
  });
});

test('redacts credential-like values before failure text can be logged', () => {
  const safe = redactSensitiveText(
    'Bearer super-secret token=abc123 certificatePassword=hunter2 -----BEGIN PRIVATE KEY-----secret-----END PRIVATE KEY-----',
  );
  assert.equal(safe.includes('super-secret'), false);
  assert.equal(safe.includes('abc123'), false);
  assert.equal(safe.includes('hunter2'), false);
  assert.equal(safe.includes('BEGIN PRIVATE KEY'), false);
});