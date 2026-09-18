const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_NATIVE_AUTH,
  buildEvidence,
  callbackCases,
  isInstallableBinary,
  loadBuildIdentity,
  parseAaptBadging,
  parseAndroidVerifiedHost,
  parseEntitlements,
  parseIosInfo,
} = require('./native-auth-preflight');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
        '<string>applinks:mycaloraapp.com</string></array>',
    ),
    {
      applicationIdentifier: 'B5344GJRMT.com.etiendem.caloraapp',
      associatedDomains: ['applinks:mycaloraapp.com'],
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
      '  mycaloraapp.com: verified',
      'mycaloraapp.com',
    ).verified,
    true,
  );
  assert.equal(
    parseAndroidVerifiedHost(
      '  mycaloraapp.com: 1024',
      'mycaloraapp.com',
    ).verified,
    false,
  );
});

test('loads the exact branded native auth identity from app.json', () => {
  const identity = loadBuildIdentity();
  assert.equal(identity.appName, EXPECTED_NATIVE_AUTH.appName);
  assert.equal(identity.legacyScheme, EXPECTED_NATIVE_AUTH.legacyScheme);
  assert.equal(identity.callback.origin, EXPECTED_NATIVE_AUTH.callbackOrigin);
  assert.equal(identity.callback.path, EXPECTED_NATIVE_AUTH.callbackPath);
  assert.equal(identity.ios.bundleIdentifier, EXPECTED_NATIVE_AUTH.iosBundleIdentifier);
  assert.equal(identity.ios.associatedDomain, EXPECTED_NATIVE_AUTH.iosAssociatedDomain);
  assert.equal(identity.android.packageName, EXPECTED_NATIVE_AUTH.androidPackageName);
  assert.equal(identity.android.callbackHost, EXPECTED_NATIVE_AUTH.androidCallbackHost);
});

test('rejects insecure or broad callback configuration instead of normalizing it', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'calora-auth-config-'));
  const configPath = path.join(tempDirectory, 'app.json');
  const validConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'),
  );
  try {
    validConfig.expo.plugins = validConfig.expo.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-router'
        ? [plugin[0], { ...plugin[1], origin: 'http://mycaloraapp.com/' }]
        : plugin,
    );
    fs.writeFileSync(configPath, JSON.stringify(validConfig));
    assert.throws(() => loadBuildIdentity(configPath), /expo-router origin/);

    validConfig.expo.plugins = validConfig.expo.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'expo-router'
        ? [plugin[0], { ...plugin[1], origin: EXPECTED_NATIVE_AUTH.callbackOrigin + '/' }]
        : plugin,
    );
    validConfig.expo.android.intentFilters[1].data[0].pathPrefix = '/auth/callback';
    delete validConfig.expo.android.intentFilters[1].data[0].path;
    fs.writeFileSync(configPath, JSON.stringify(validConfig));
    assert.throws(() => loadBuildIdentity(configPath), /expo\.android callback host/);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
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
  assert.equal(evidence.callbackCases.length, callbackCases.length * 2);
  assert.ok(evidence.callbackCases.every((entry) => entry.outcome === 'not-run'));
  assert.ok(evidence.callbackCases.some((entry) => entry.case === 'duplicate-browser-router-delivery'));
  assert.ok(evidence.callbackCases.some((entry) => entry.case === 'relaunch-restores-current-session'));
  assert.deepEqual(evidence.failureClasses, ['target_unavailable']);
});

test('evidence excludes runner paths and command output', () => {
  const evidence = buildEvidence({
    identity: { appName: 'Calora', ios: {}, android: {} },
    binaries: {
      iOS: {
        ok: false,
        path: '/private/signing/Calora.ipa',
        inspection: {
          ok: false,
          failureClass: 'build_mismatch',
          reason: 'raw command output contains a signing credential',
          stderr: 'private output',
        },
      },
    },
    targets: {},
    callbackArtifacts: {
      status: 'provided',
      directory: '/private/callbacks',
      files: [{ path: 'nested/callback-token.txt', sizeBytes: 10, modifiedAt: 'now' }],
    },
    failures: [
      {
        platform: 'iOS',
        failureClass: 'build_mismatch',
        reason: 'raw command output contains a signing credential',
      },
    ],
    generatedAt: '2026-09-05T00:00:00.000Z',
  });
  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes('/private/signing/Calora.ipa'), false);
  assert.equal(serialized.includes('raw command output'), false);
  assert.equal(serialized.includes('private output'), false);
  assert.equal(serialized.includes('/private/callbacks'), false);
  assert.equal(serialized.includes('callback-token.txt'), true);
});
