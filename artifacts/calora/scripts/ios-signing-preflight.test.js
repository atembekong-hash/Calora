const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateCredentialReadiness } = require('./ios-signing-preflight');

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
  assert.match(result.reason, /not active/i);
});

test('does not include certificate material in readiness output', () => {
  const result = evaluateCredentialReadiness(validCredentials(), now);
  assert.equal('certificateP12' in result, false);
  assert.equal('certificatePassword' in result, false);
});