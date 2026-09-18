const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(projectRoot, 'app.json');
const evidenceEnvName = 'CALORA_NATIVE_AUTH_EVIDENCE_PATH';
const callbackArtifactDirEnvName = 'CALORA_CALLBACK_ARTIFACT_DIR';
const EXPECTED_NATIVE_AUTH = Object.freeze({
  appName: 'Calora',
  legacyScheme: 'caloraapp',
  callbackOrigin: 'https://mycaloraapp.com',
  callbackPath: '/auth/callback',
  expoProjectId: '1f202325-5b9a-4260-978f-abbd3252b9ee',
  iosBundleIdentifier: 'com.etiendem.caloraapp',
  iosAssociatedDomain: 'mycaloraapp.com',
  androidPackageName: 'com.etiendem.caloraapp',
  androidCallbackHost: 'mycaloraapp.com',
});
const callbackCases = [
  { name: 'google-sign-in-warm-app', scope: 'native', evidence: 'provider-callback-and-session' },
  { name: 'google-sign-in-cold-launch', scope: 'native', evidence: 'provider-callback-and-session' },
  { name: 'email-verification-warm-app', scope: 'native', evidence: 'verification-callback-and-session' },
  { name: 'email-verification-cold-launch', scope: 'native', evidence: 'verification-callback-and-session' },
  { name: 'password-recovery-warm-app', scope: 'native', evidence: 'recovery-callback-and-reset-screen' },
  { name: 'password-recovery-cold-launch', scope: 'native', evidence: 'recovery-callback-and-reset-screen' },
  { name: 'force-quit-https-callback-relaunch', scope: 'native', evidence: 'relaunch-and-session-state' },
  { name: 'duplicate-browser-router-delivery', scope: 'native-and-unit', evidence: 'single-session-exchange' },
  { name: 'foreign-origin-rejected', scope: 'native-and-unit', evidence: 'controlled-rejection' },
  { name: 'legacy-caloraapp-auth-rejected', scope: 'native-and-unit', evidence: 'controlled-rejection' },
  { name: 'sign-out-clears-session', scope: 'native-and-unit', evidence: 'signed-out-state' },
  { name: 'account-switch-clears-replay', scope: 'native-and-unit', evidence: 'account-isolation' },
  { name: 'relaunch-restores-current-session', scope: 'native', evidence: 'restored-session-state' },
];

const FAILURE_CLASSES = {
  LOCAL_CONFIGURATION: 'local_configuration',
  TOOL_UNAVAILABLE: 'tool_unavailable',
  TARGET_UNAVAILABLE: 'target_unavailable',
  BINARY_UNAVAILABLE: 'binary_unavailable',
  BUILD_MISMATCH: 'build_mismatch',
  ASSOCIATION_UNVERIFIED: 'association_unverified',
};

const SAFE_FAILURE_REASONS = {
  [FAILURE_CLASSES.LOCAL_CONFIGURATION]:
    'Native auth-link preflight configuration is incomplete.',
  [FAILURE_CLASSES.TOOL_UNAVAILABLE]:
    'A required native inspection tool is unavailable.',
  [FAILURE_CLASSES.TARGET_UNAVAILABLE]:
    'The explicitly selected native target is unavailable.',
  [FAILURE_CLASSES.BINARY_UNAVAILABLE]:
    'The selected native binary is unavailable or not installable.',
  [FAILURE_CLASSES.BUILD_MISMATCH]:
    'The selected native build does not match the expected release identity.',
  [FAILURE_CLASSES.ASSOCIATION_UNVERIFIED]:
    'The production Android callback association is not verified.',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadBuildIdentity(configPath = appConfigPath) {
  const appConfig = readJson(configPath);
  const expo = appConfig?.expo;
  const routerOrigin = expo?.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-router',
  )?.[1]?.origin;
  let callbackOrigin = null;
  try {
    const parsedOrigin = new URL(routerOrigin);
    if (
      parsedOrigin.protocol === 'https:' &&
      !parsedOrigin.username &&
      !parsedOrigin.password &&
      parsedOrigin.pathname === '/' &&
      !parsedOrigin.search &&
      !parsedOrigin.hash
    ) {
      callbackOrigin = parsedOrigin.origin;
    }
  } catch {
    callbackOrigin = null;
  }
  const associatedDomain = expo?.ios?.associatedDomains?.find(
    (domain) => domain === `applinks:${EXPECTED_NATIVE_AUTH.iosAssociatedDomain}`,
  );
  const androidCallbackFilter = expo?.android?.intentFilters?.find((filter) =>
    filter.action === 'VIEW' &&
    filter.autoVerify === true &&
    filter.data?.some(
      (data) =>
        data.scheme === 'https' &&
        data.host === EXPECTED_NATIVE_AUTH.androidCallbackHost &&
        data.path === EXPECTED_NATIVE_AUTH.callbackPath,
    ),
  );
  const callbackHost = androidCallbackFilter?.data?.find(
    (data) =>
      data.scheme === 'https' &&
      data.host === EXPECTED_NATIVE_AUTH.androidCallbackHost &&
      data.path === EXPECTED_NATIVE_AUTH.callbackPath,
  )?.host;

  const identity = {
    appName: expo?.name,
    version: expo?.version,
    legacyScheme: expo?.scheme,
    callback: {
      origin: callbackOrigin,
      path: EXPECTED_NATIVE_AUTH.callbackPath,
    },
    expoProjectId: expo?.extra?.eas?.projectId,
    ios: {
      bundleIdentifier: expo?.ios?.bundleIdentifier,
      buildNumber: expo?.ios?.buildNumber,
      associatedDomain: associatedDomain?.slice('applinks:'.length),
    },
    android: {
      packageName: expo?.android?.package,
      versionCode: expo?.android?.versionCode,
      callbackHost,
    },
  };

  const required = [
    ['expo.name', identity.appName],
    ['expo.version', identity.version],
    ['expo.scheme', identity.legacyScheme],
    ['expo.extra.eas.projectId', identity.expoProjectId],
    ['expo.ios.bundleIdentifier', identity.ios.bundleIdentifier],
    ['expo.ios.buildNumber', identity.ios.buildNumber],
    ['expo.ios.associatedDomains', identity.ios.associatedDomain],
    ['expo.android.package', identity.android.packageName],
    ['expo.android.versionCode', identity.android.versionCode],
    ['expo.android callback host', identity.android.callbackHost],
  ];
  const missing = required.filter(([, value]) => value === undefined || value === null || value === '');
  const mismatches = [
    ['expo.name', identity.appName, EXPECTED_NATIVE_AUTH.appName],
    ['expo.scheme', identity.legacyScheme, EXPECTED_NATIVE_AUTH.legacyScheme],
    ['expo.extra.eas.projectId', identity.expoProjectId, EXPECTED_NATIVE_AUTH.expoProjectId],
    ['expo.ios.bundleIdentifier', identity.ios.bundleIdentifier, EXPECTED_NATIVE_AUTH.iosBundleIdentifier],
    ['expo.ios.associatedDomains', identity.ios.associatedDomain, EXPECTED_NATIVE_AUTH.iosAssociatedDomain],
    ['expo.android.package', identity.android.packageName, EXPECTED_NATIVE_AUTH.androidPackageName],
    ['expo.android callback host', identity.android.callbackHost, EXPECTED_NATIVE_AUTH.androidCallbackHost],
    ['expo-router origin', identity.callback.origin, EXPECTED_NATIVE_AUTH.callbackOrigin],
  ].filter(([, actual, expected]) => actual !== expected);
  if (missing.length > 0 || mismatches.length > 0) {
    throw new Error(
      `app.json has invalid native-auth identity fields: ${[
        ...missing.map(([name]) => name),
        ...mismatches.map(([name, , expected]) => `${name} (expected ${String(expected)})`),
      ].join(', ')}`,
    );
  }

  return identity;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    command,
    args,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error || null,
    ok: !result.error && result.status === 0,
  };
}

function commandExists(command) {
  const result = runCommand(command, ['--version']);
  return !result.error;
}

function isInstallableBinary(binaryPath, platform) {
  if (!binaryPath) {
    return {
      ok: false,
      reason: `Set ${platform === 'ios' ? 'CALORA_IOS_BINARY' : 'CALORA_ANDROID_BINARY'} to a newly built installable binary.`,
    };
  }

  const resolvedPath = path.resolve(binaryPath);
  if (!fs.existsSync(resolvedPath)) {
    return { ok: false, reason: `Binary does not exist: ${resolvedPath}` };
  }

  const stat = fs.statSync(resolvedPath);
  const expectedExtension = platform === 'ios' ? ['.ipa', '.app'] : ['.apk'];
  const isExpectedType =
    (stat.isDirectory() && platform === 'ios' && resolvedPath.endsWith('.app')) ||
    (stat.isFile() && expectedExtension.includes(path.extname(resolvedPath).toLowerCase()));
  if (!isExpectedType) {
    return {
      ok: false,
      reason: `${resolvedPath} is not an installable ${platform} binary (.${platform === 'ios' ? 'ipa or app' : 'apk'}). Static-build manifests are not native binaries.`,
    };
  }

  if (stat.isFile() && stat.size === 0) {
    return { ok: false, reason: `Binary is empty: ${resolvedPath}` };
  }

  return {
    ok: true,
    path: resolvedPath,
    sizeBytes: stat.isFile() ? stat.size : null,
    modifiedAt: new Date(stat.mtimeMs).toISOString(),
    sha256: stat.isFile()
      ? crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex')
      : null,
  };
}

function parseAaptBadging(output) {
  const packageMatch = output.match(
    /package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']+)'/,
  );
  if (!packageMatch) {
    return null;
  }
  return {
    packageName: packageMatch[1],
    versionCode: Number(packageMatch[2]),
    versionName: packageMatch[3],
  };
}

function parseEntitlements(output) {
  const applicationIdentifier =
    output.match(
      /<key>application-identifier<\/key>\s*<string>([^<]+)<\/string>/,
    )?.[1] || null;
  const associatedDomainsBlock = output.match(
    /<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>([\s\S]*?)<\/array>/,
  )?.[1];
  const associatedDomains = associatedDomainsBlock
    ? [...associatedDomainsBlock.matchAll(/<string>([^<]+)<\/string>/g)].map(
        (match) => match[1],
      )
    : [];
  return { applicationIdentifier, associatedDomains };
}

function parseIosInfo(output) {
  return {
    bundleIdentifier:
      output.match(/"CFBundleIdentifier"\s*=>\s*"([^"]+)"/)?.[1] || null,
    version:
      output.match(/"CFBundleShortVersionString"\s*=>\s*"([^"]+)"/)?.[1] || null,
    buildNumber: output.match(/"CFBundleVersion"\s*=>\s*"([^"]+)"/)?.[1] || null,
  };
}

function parseAndroidVerifiedHost(output, host) {
  const hostLine = output
    .split(/\r?\n/)
    .find((line) => line.includes(host));
  return {
    host,
    observed: hostLine?.trim() || null,
    verified: Boolean(hostLine && /\bverified\b/i.test(hostLine)),
  };
}

function extractIpaApp(binaryPath) {
  if (binaryPath.endsWith('.app')) {
    return { appPath: binaryPath, cleanup: () => {} };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calora-native-auth-'));
  const extract = runCommand('unzip', ['-q', binaryPath, '-d', tempDir]);
  if (!extract.ok) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('Could not inspect the iOS archive for signed metadata.');
  }
  const payloadEntries = fs
    .readdirSync(path.join(tempDir, 'Payload'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.app'));
  if (payloadEntries.length !== 1) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('IPA must contain exactly one Payload/*.app bundle.');
  }
  return {
    appPath: path.join(tempDir, 'Payload', payloadEntries[0].name),
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
}

function inspectIosBinary(binary, identity) {
  if (!commandExists('codesign') || !commandExists('plutil')) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TOOL_UNAVAILABLE,
      reason: 'codesign and plutil are required to inspect the signed iOS entitlements.',
    };
  }

  let extracted;
  try {
    extracted = extractIpaApp(binary.path);
    const info = runCommand('plutil', ['-p', path.join(extracted.appPath, 'Info.plist')]);
    const entitlements = runCommand(
      'codesign',
      ['-d', '--entitlements', ':-', extracted.appPath],
    );
    if (!info.ok || !entitlements.ok) {
      return {
        ok: false,
        failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
        reason: 'Could not inspect signed iOS metadata with codesign and plutil.',
      };
    }
    const signedInfo = parseIosInfo(info.stdout);
    const signedEntitlements = parseEntitlements(
      `${entitlements.stdout}\n${entitlements.stderr}`,
    );
    const identityMatch =
      signedInfo.bundleIdentifier === identity.ios.bundleIdentifier &&
      signedInfo.version === identity.version &&
      signedInfo.buildNumber === String(identity.ios.buildNumber);
    const entitlementsMatch = signedEntitlements.associatedDomains.includes(
      `applinks:${identity.ios.associatedDomain}`,
    );
    if (!identityMatch || !entitlementsMatch) {
      return {
        ok: false,
        failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
        reason:
          'Signed iOS metadata does not match app.json or is missing the production associated domain.',
        signedInfo,
        entitlements: {
          applicationIdentifier: signedEntitlements.applicationIdentifier,
          associatedDomains: signedEntitlements.associatedDomains,
        },
      };
    }
    return {
      ok: true,
      signedInfo,
      entitlements: {
        applicationIdentifier: signedEntitlements.applicationIdentifier,
        associatedDomains: signedEntitlements.associatedDomains,
      },
    };
  } catch (error) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
      reason: error.message,
    };
  } finally {
    extracted?.cleanup();
  }
}

function inspectAndroidBinary(binary, identity) {
  if (!commandExists('apksigner') || !commandExists('aapt')) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TOOL_UNAVAILABLE,
      reason: 'apksigner and aapt are required to inspect the signed Android APK.',
    };
  }
  const signature = runCommand('apksigner', ['verify', '--verbose', binary.path]);
  const badging = runCommand('aapt', ['dump', 'badging', binary.path]);
  const manifest = runCommand('aapt', ['dump', 'xmltree', binary.path, 'AndroidManifest.xml']);
  if (!signature.ok || !badging.ok || !manifest.ok) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
      reason: 'Could not inspect signed Android metadata with apksigner and aapt.',
    };
  }
  const signedInfo = parseAaptBadging(badging.stdout);
  const hasCallbackHost = manifest.stdout.includes(identity.android.callbackHost);
  const hasCallbackPath = manifest.stdout.includes(identity.callback.path);
  const identityMatch =
    signedInfo?.packageName === identity.android.packageName &&
    signedInfo?.versionCode === Number(identity.android.versionCode) &&
    hasCallbackHost &&
    hasCallbackPath;
  if (!identityMatch) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
      reason:
        'Signed Android metadata does not match app.json or is missing the production HTTPS callback filter.',
      signedInfo,
      callbackFilter: { hasCallbackHost, hasCallbackPath },
    };
  }
  return {
    ok: true,
    signedInfo,
      callbackFilter: { host: identity.android.callbackHost, path: identity.callback.path },
  };
}

function checkIosTarget(targetId, identity) {
  if (!targetId) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: 'Set CALORA_IOS_DEVICE to one exact booted simulator UDID.',
    };
  }
  if (!commandExists('xcrun')) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TOOL_UNAVAILABLE,
      reason: 'xcrun is required on the macOS host to inspect the selected iOS target.',
    };
  }
  const devices = runCommand('xcrun', ['simctl', 'list', 'devices', 'booted', '--json']);
  if (!devices.ok) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: 'Could not list booted iOS targets with xcrun simctl.',
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(devices.stdout);
  } catch {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: 'xcrun simctl returned malformed device JSON.',
    };
  }
  const booted = Object.values(parsed.devices || {})
    .flat()
    .find((device) => device.udid === targetId && device.state === 'Booted');
  if (!booted) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: `iOS target ${targetId} is not an exact booted simulator reported by xcrun.`,
    };
  }
  const appContainer = runCommand(
    'xcrun',
    ['simctl', 'get_app_container', targetId, identity.ios.bundleIdentifier, 'app'],
  );
  const installedAppPath = appContainer.stdout.trim();
  if (!appContainer.ok || !installedAppPath || !fs.existsSync(installedAppPath)) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BINARY_UNAVAILABLE,
      reason: `Signed Calora build ${identity.ios.bundleIdentifier} is not installed on ${targetId}.`,
    };
  }
  const installedInfo = commandExists('plutil')
    ? runCommand('plutil', ['-p', path.join(installedAppPath, 'Info.plist')])
    : null;
  const installedIdentity = installedInfo?.ok ? parseIosInfo(installedInfo.stdout) : null;
  if (
    !installedIdentity ||
    installedIdentity.bundleIdentifier !== identity.ios.bundleIdentifier ||
    installedIdentity.version !== identity.version ||
    installedIdentity.buildNumber !== String(identity.ios.buildNumber)
  ) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
      reason: `Installed Calora build on ${targetId} does not match app.json.`,
      installedIdentity,
    };
  }
  return {
    ok: true,
    target: { id: targetId, name: booted.name, state: booted.state },
    installedBuild: installedIdentity,
  };
}

function checkAndroidTarget(targetId, identity) {
  if (!targetId) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: 'Set CALORA_ANDROID_DEVICE to one exact connected Android serial.',
    };
  }
  if (!commandExists('adb')) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TOOL_UNAVAILABLE,
      reason: 'adb is required on the host to inspect the selected Android target.',
    };
  }
  const devices = runCommand('adb', ['devices']);
  const listed = devices.stdout
    .split(/\r?\n/)
    .some((line) => line.startsWith(`${targetId}\tdevice`));
  if (!devices.ok || !listed) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.TARGET_UNAVAILABLE,
      reason: `Android target ${targetId} is not an exact online device reported by adb.`,
    };
  }
  const packagePath = runCommand('adb', [
    '-s',
    targetId,
    'shell',
    'pm',
    'path',
    identity.android.packageName,
  ]);
  if (!packagePath.ok || !packagePath.stdout.includes('package:')) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BINARY_UNAVAILABLE,
      reason: `Signed Calora package ${identity.android.packageName} is not installed on ${targetId}.`,
    };
  }
  const packageDetails = runCommand('adb', [
    '-s',
    targetId,
    'shell',
    'dumpsys',
    'package',
    identity.android.packageName,
  ]);
  const installedVersionCode = packageDetails.stdout.match(/versionCode=(\d+)/)?.[1];
  if (installedVersionCode !== String(identity.android.versionCode)) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.BUILD_MISMATCH,
      reason: `Installed Calora build on ${targetId} does not match app.json versionCode.`,
      installedVersionCode: installedVersionCode || null,
    };
  }
  const appLinks = runCommand(
    'adb',
    ['-s', targetId, 'shell', 'pm', 'get-app-links', identity.android.packageName],
  );
  const verifiedHost = parseAndroidVerifiedHost(
    `${appLinks.stdout}\n${appLinks.stderr}`,
    identity.android.callbackHost,
  );
  if (!appLinks.ok || !verifiedHost.verified) {
    return {
      ok: false,
      failureClass: FAILURE_CLASSES.ASSOCIATION_UNVERIFIED,
      reason: `Android host ${identity.android.callbackHost} is not reported as verified by pm get-app-links.`,
      verifiedHost,
    };
  }
  return {
    ok: true,
    target: { id: targetId, status: 'device' },
    installedPackage: identity.android.packageName,
    installedVersionCode: Number(installedVersionCode),
    verifiedHost,
  };
}

function collectCallbackArtifacts(env = process.env) {
  const configuredDir = env[callbackArtifactDirEnvName]?.trim();
  if (!configuredDir) {
    return {
      status: 'not-provided',
      directory: null,
      files: [],
      note: `Set ${callbackArtifactDirEnvName} to a directory containing sanitized screenshots/logs after running each callback case.`,
    };
  }
  const directory = path.resolve(projectRoot, configuredDir);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return {
      status: 'missing',
      directory,
      files: [],
      note: 'The configured callback artifact directory does not exist.',
    };
  }
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile()) {
        const stat = fs.statSync(entryPath);
        files.push({
          path: path.relative(projectRoot, entryPath).split(path.sep).join('/'),
          sizeBytes: stat.size,
          modifiedAt: new Date(stat.mtimeMs).toISOString(),
        });
      }
    }
  };
  visit(directory);
  return {
    status: files.length > 0 ? 'provided' : 'empty',
    directory: path.relative(projectRoot, directory).split(path.sep).join('/'),
    files,
    note: 'Artifact names and metadata only; callback contents are not copied into this evidence record.',
  };
}

function buildEvidence({ identity, binaries, targets, callbackArtifacts, failures, generatedAt }) {
  const sanitizeInspection = (inspection) => {
    if (!inspection) return null;
    const sanitized = {
      ok: Boolean(inspection.ok),
      failureClass: inspection.failureClass || null,
      reason: SAFE_FAILURE_REASONS[inspection.failureClass] || null,
    };
    if (inspection.signedInfo) {
      sanitized.signedInfo = {
        bundleIdentifier: inspection.signedInfo.bundleIdentifier || null,
        packageName: inspection.signedInfo.packageName || null,
        version: inspection.signedInfo.version || null,
        versionCode: inspection.signedInfo.versionCode ?? null,
        versionName: inspection.signedInfo.versionName || null,
        buildNumber: inspection.signedInfo.buildNumber || null,
      };
    }
    if (inspection.entitlements) {
      sanitized.entitlements = {
        associatedDomains: inspection.entitlements.associatedDomains || [],
      };
    }
    if (inspection.callbackFilter) {
      sanitized.callbackFilter = {
        host: inspection.callbackFilter.host || null,
        path: inspection.callbackFilter.path || null,
        hasCallbackHost: Boolean(inspection.callbackFilter.hasCallbackHost),
        hasCallbackPath: Boolean(inspection.callbackFilter.hasCallbackPath),
      };
    }
    if (inspection.installedBuild) {
      sanitized.installedBuild = {
        bundleIdentifier: inspection.installedBuild.bundleIdentifier || null,
        version: inspection.installedBuild.version || null,
        buildNumber: inspection.installedBuild.buildNumber || null,
      };
    }
    if (inspection.target) {
      sanitized.target = {
        id: inspection.target.id || null,
        name: inspection.target.name || null,
        state: inspection.target.state || null,
        status: inspection.target.status || null,
      };
    }
    if (inspection.installedPackage) {
      sanitized.installedPackage = inspection.installedPackage;
    }
    if (inspection.installedVersionCode !== undefined) {
      sanitized.installedVersionCode = inspection.installedVersionCode;
    }
    if (inspection.verifiedHost) {
      sanitized.verifiedHost = {
        host: inspection.verifiedHost.host || null,
        verified: Boolean(inspection.verifiedHost.verified),
      };
    }
    return sanitized;
  };

  const sanitizedBinaries = Object.fromEntries(
    Object.entries(binaries || {}).map(([platform, binary]) => [
      platform,
      {
        ok: Boolean(binary?.ok),
        sizeBytes: binary?.sizeBytes ?? null,
        modifiedAt: binary?.modifiedAt || null,
        sha256: binary?.sha256 || null,
        inspection: sanitizeInspection(binary?.inspection),
      },
    ]),
  );
  const sanitizedTargets = Object.fromEntries(
    Object.entries(targets || {}).map(([platform, target]) => [
      platform,
      {
        id: target?.id || null,
        inspection: sanitizeInspection(target?.inspection),
      },
    ]),
  );
  const sanitizedCallbackArtifacts = {
    status: callbackArtifacts?.status || 'not-provided',
    directory: callbackArtifacts?.directory
      ? path.basename(callbackArtifacts.directory)
      : null,
    files: (callbackArtifacts?.files || []).map((file) => ({
      name: path.basename(file.path || ''),
      sizeBytes: file.sizeBytes,
      modifiedAt: file.modifiedAt,
    })),
  };

  return {
    schemaVersion: 1,
    generatedAt: generatedAt || new Date().toISOString(),
    result: failures.length === 0 ? 'passed' : 'blocked',
    failureClasses: [...new Set(failures.map((failure) => failure.failureClass))],
    build: identity || null,
    binaries: sanitizedBinaries,
    targets: sanitizedTargets,
    callbackCases: callbackCases.flatMap((callbackCase) =>
      ['iOS', 'Android'].map((platform) => ({
        platform,
        case: callbackCase.name,
        scope: callbackCase.scope,
        expectedEvidence: callbackCase.evidence,
        outcome: 'not-run',
        artifacts: [],
      })),
    ),
    callbackArtifacts: sanitizedCallbackArtifacts,
    failures: failures.map((failure) => ({
      platform: failure.platform,
      failureClass: failure.failureClass,
      reason:
        SAFE_FAILURE_REASONS[failure.failureClass] ||
        'Native auth-link preflight check failed.',
    })),
  };
}

function writeEvidence(evidence) {
  const configuredPath = process.env[evidenceEnvName]?.trim();
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  console.log(`[native-auth] RELEASE PREFLIGHT EVIDENCE ${serialized.trim()}`);
  if (configuredPath) {
    const evidencePath = path.resolve(projectRoot, configuredPath);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(evidencePath, serialized, { mode: 0o600 });
    console.log(`[native-auth] Evidence written to ${evidencePath}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      ['## Calora native auth-link preflight', '', '```json', serialized.trim(), '```', ''].join(
        '\n',
      ),
    );
  }
}

function main() {
  let identity;
  const failures = [];
  try {
    identity = loadBuildIdentity();
  } catch (error) {
    failures.push({
      platform: 'all',
      failureClass: FAILURE_CLASSES.LOCAL_CONFIGURATION,
      reason: error.message,
    });
  }

  const binaries = {
    iOS: { path: null, inspection: null },
    Android: { path: null, inspection: null },
  };
  const targets = {
    iOS: { id: process.env.CALORA_IOS_DEVICE?.trim() || null, inspection: null },
    Android: { id: process.env.CALORA_ANDROID_DEVICE?.trim() || null, inspection: null },
  };

  if (identity) {
    for (const [platform, key] of [
      ['iOS', 'ios'],
      ['Android', 'android'],
    ]) {
      const binary = isInstallableBinary(
        process.env[key === 'ios' ? 'CALORA_IOS_BINARY' : 'CALORA_ANDROID_BINARY']?.trim(),
        key,
      );
      binaries[platform] = { ...binary, inspection: null };
      if (!binary.ok) {
        failures.push({ platform, failureClass: FAILURE_CLASSES.BINARY_UNAVAILABLE, reason: binary.reason });
        continue;
      }
      const inspection =
        key === 'ios'
          ? inspectIosBinary(binary, identity)
          : inspectAndroidBinary(binary, identity);
      binaries[platform].inspection = inspection;
      if (!inspection.ok) {
        failures.push({
          platform,
          failureClass: inspection.failureClass,
          reason: inspection.reason,
        });
      }
    }

    const iosTarget = checkIosTarget(targets.iOS.id, identity);
    const androidTarget = checkAndroidTarget(targets.Android.id, identity);
    targets.iOS.inspection = iosTarget;
    targets.Android.inspection = androidTarget;
    for (const [platform, result] of [
      ['iOS', iosTarget],
      ['Android', androidTarget],
    ]) {
      if (!result.ok) failures.push({ platform, failureClass: result.failureClass, reason: result.reason });
    }
  }

  const callbackArtifacts = collectCallbackArtifacts();
  if (callbackArtifacts.status === 'missing') {
    failures.push({
      platform: 'all',
      failureClass: FAILURE_CLASSES.LOCAL_CONFIGURATION,
      reason: callbackArtifacts.note,
    });
  }

  const evidence = buildEvidence({
    identity,
    binaries,
    targets,
    callbackArtifacts,
    failures,
  });
  writeEvidence(evidence);
  if (failures.length > 0) {
    console.error('\n[native-auth] RELEASE PREFLIGHT BLOCKED');
    for (const failure of failures) {
      console.error(
        `[native-auth] ${failure.platform}: ${failure.failureClass} — ${failure.reason}`,
      );
    }
    return 1;
  }
  console.log(
    '\n[native-auth] RELEASE PREFLIGHT PASSED: signed iOS and Android builds, exact targets, and Android host verification are ready for callback tests.',
  );
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  EXPECTED_NATIVE_AUTH,
  FAILURE_CLASSES,
  buildEvidence,
  callbackCases,
  collectCallbackArtifacts,
  isInstallableBinary,
  loadBuildIdentity,
  parseAaptBadging,
  parseAndroidVerifiedHost,
  parseEntitlements,
  parseIosInfo,
};