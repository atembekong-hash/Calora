const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildEvidence,
  isInstallableBinary,
  parseAaptBadging,
  parseAndroidVerifiedHost,
  parseEntitlements,
  parseIosInfo,
} = require('./native-auth-preflight');

test('parses the signed iOS identity and associated-domain entitlement', () => {
  assert.deepEqual(
    parseIosInfo(
      '"CFBundleIdentifier" => "com.etiendem.caloraapp"\n' +
        '"CFBundleShortVersionString" => "1.0.0"\n' +
        '"CFBundleVersion" => "1"',
    ),
    {
      bundleIdentifier: 'com.etiendem.caloraapp',
      version: '1.0.0',
      buildNumber: '1',
    },
  );
  assert.deepEqual(
    parseEntitlements(
      '<key>application-identifier</key><string>B5344GJRMT.com.etiendem.caloraapp</string>' +
        '<key>com.apple.developer.associated-domains</key><array>' +
        '<string>applinks:calorie-coach-pie35449.replit.app</string></array>',
    ),
    {
      applicationIdentifier: 'B5344GJRMT.com.etiendem.caloraapp',
      associatedDomains: ['applinks:calorie-coach-pie35449.replit.app'],
    },
  );
});

test('parses Android package identity and only accepts a verified callback host', () => {
  assert.deepEqual(
    parseAaptBadging(
      "package: name='com.etiendem.caloraapp' versionCode='24' versionName='1.0.0'",
    ),
    {
      packageName: 'com.etiendem.caloraapp',
      versionCode: 24,
      versionName: '1.0.0',
    },
  );
  assert.equal(
    parseAndroidVerifiedHost(
      '  calorie-coach-pie35449.replit.app: verified',
      'calorie-coach-pie35449.replit.app',
    ).verified,
    true,
  );
  assert.equal(
    parseAndroidVerifiedHost(
      '  calorie-coach-pie35449.replit.app: 1024',
      'calorie-coach-pie35449.replit.app',
    ).verified,
    false,
  );
});

test('rejects missing, stale-manifest, and empty native binaries', () => {
  assert.equal(isInstallableBinary(undefined, 'ios').ok, false);
  assert.equal(isInstallableBinary('/tmp/static-build/android/manifest.json', 'android').ok, false);
  assert.equal(isInstallableBinary('/tmp/missing-calora.apk', 'android').ok, false);
});

test('evidence keeps callback cases explicit until device tests produce artifacts', () => {
  const evidence = buildEvidence({
    identity: { ios: {}, android: {} },
    binaries: {},
    targets: {},
    callbackArtifacts: { status: 'not-provided', files: [] },
    failures: [{ platform: 'Android', failureClass: 'target_unavailable', reason: 'no device' }],
    generatedAt: '2026-09-05T00:00:00.000Z',
  });
  assert.equal(evidence.result, 'blocked');
  assert.equal(evidence.callbackCases.length, 10);
  assert.ok(evidence.callbackCases.every((entry) => entry.outcome === 'not-run'));
  assert.deepEqual(evidence.failureClasses, ['target_unavailable']);
});