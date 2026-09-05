const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const flowPath = path.join('tests', 'device', 'encrypted-recovery.yaml');
const flowDisplayPath = flowPath.split(path.sep).join('/');
const targets = [
  { platform: 'iOS', envName: 'CALORA_IOS_DEVICE' },
  { platform: 'Android', envName: 'CALORA_ANDROID_DEVICE' },
];
const evidencePath = process.env.CALORA_ENCRYPTED_RECOVERY_EVIDENCE_PATH?.trim();
const buildCheckEnabled =
  process.env.CALORA_ENCRYPTED_RECOVERY_BUILD_CHECK === 'true';
const platformResults = new Map();

function readAppId() {
  const flowSource = fs.readFileSync(path.join(projectRoot, flowPath), 'utf8');
  const appId = flowSource.match(/^appId:\s*(\S+)\s*$/m)?.[1];
  if (!appId) {
    throw new Error(
      `The encrypted-recovery flow does not declare an appId: ${flowDisplayPath}`,
    );
  }
  return appId;
}

const appId = readAppId();

function buildEvidence(result, failureClass) {
  return {
    flow: flowDisplayPath,
    appId,
    timestamp: new Date().toISOString(),
    targets: targets.map(({ platform, envName }) => ({
      platform,
      targetId: process.env[envName]?.trim() || null,
      outcome: platformResults.get(platform)?.outcome || 'not-run',
      exitCode: platformResults.get(platform)?.exitCode ?? null,
    })),
    result,
    ...(failureClass ? { failureClass } : {}),
  };
}

function writeEvidence(evidence) {
  const serializedEvidence = `${JSON.stringify(evidence)}\n`;

  // The evidence contains only release metadata. It must never contain
  // Maestro's output, app state, SecureStore keys, or recovery payloads.
  console.log(
    `[encrypted-recovery] RELEASE EVIDENCE ${serializedEvidence.trim()}`,
  );

  if (evidencePath) {
    const resolvedEvidencePath = path.resolve(projectRoot, evidencePath);
    fs.mkdirSync(path.dirname(resolvedEvidencePath), {
      recursive: true,
      mode: 0o700,
    });
    fs.writeFileSync(resolvedEvidencePath, serializedEvidence, { mode: 0o600 });
    console.log(`[encrypted-recovery] Evidence written to ${resolvedEvidencePath}`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        '## Native encrypted-recovery release evidence',
        '',
        '```json',
        serializedEvidence.trim(),
        '```',
        '',
      ].join('\n'),
    );
  }
}

function printUsage() {
  console.error(
    [
      'Encrypted-recovery release gate needs one booted target per platform.',
      'Set CALORA_IOS_DEVICE and CALORA_ANDROID_DEVICE to the exact IDs',
      'reported by the native platform tools, then run:',
      '  iOS: xcrun simctl list devices booted',
      '  Android: adb devices',
      '  pnpm test:release:encrypted-recovery',
    ].join('\n'),
  );
}

function checkInstalledBuild(platform, device) {
  const command =
    platform === 'iOS'
      ? ['xcrun', ['simctl', 'get_app_container', device, appId, 'app']]
      : ['adb', ['-s', device, 'shell', 'pm', 'path', appId]];
  const result = spawnSync(command[0], command[1], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.error || result.status !== 0) {
    return false;
  }

  return Boolean(result.stdout?.trim());
}

const missingTargets = targets.filter(({ envName }) => !process.env[envName]?.trim());
if (missingTargets.length > 0) {
  console.error(
    `Missing required target selection: ${missingTargets
      .map(({ envName }) => envName)
      .join(', ')}`,
  );
  printUsage();
  writeEvidence(buildEvidence('failed', 'missing_target_selection'));
  process.exit(1);
}

const versionCheck = spawnSync('maestro', ['--version'], {
  cwd: projectRoot,
  encoding: 'utf8',
});
if (versionCheck.error) {
  console.error(
    'Maestro is required for the encrypted-recovery release gate but was not found on PATH.',
  );
  console.error('Install Maestro before running this release validation.');
  writeEvidence(buildEvidence('failed', 'maestro_unavailable'));
  process.exit(1);
}

const failures = [];

for (const { platform, envName } of targets) {
  const device = process.env[envName].trim();
  console.log(`\n[encrypted-recovery] ${platform} target: ${device}`);

  if (buildCheckEnabled && !checkInstalledBuild(platform, device)) {
    platformResults.set(platform, {
      outcome: 'failed',
      exitCode: 1,
    });
    failures.push({
      platform,
      device,
      status: 1,
      error: new Error(
        'The signed Calora build is not installed on the selected target.',
      ),
      failureClass: 'missing_build',
    });
    console.error(
      `[encrypted-recovery] ${platform} build missing on ${device}; skipping Maestro.`,
    );
    continue;
  }

  console.log(`[encrypted-recovery] Running ${flowPath}`);

  const result = spawnSync(
    'maestro',
    ['test', '--device', device, flowPath],
    {
      cwd: projectRoot,
      stdio: 'inherit',
    },
  );

  if (result.error || result.status !== 0) {
    platformResults.set(platform, {
      outcome: 'failed',
      exitCode: typeof result.status === 'number' ? result.status : null,
    });
    failures.push({
      platform,
      device,
      status: result.status,
      error: result.error,
    });
    console.error(
      `[encrypted-recovery] ${platform} failed for ${device}. Review the migration, tamper, export, account-isolation, and clear-all assertions above.`,
    );
  } else {
    platformResults.set(platform, { outcome: 'passed', exitCode: 0 });
    console.log(`[encrypted-recovery] ${platform} passed for ${device}`);
  }
}

if (failures.length > 0) {
  console.error('\n[encrypted-recovery] RELEASE GATE FAILED');
  for (const failure of failures) {
    const reason = failure.error
      ? failure.error.message
      : `Maestro exited with status ${failure.status}`;
    console.error(`- ${failure.platform} (${failure.device}): ${reason}`);
  }
  const failureClass = failures.some(
    (failure) => failure.failureClass === 'missing_build',
  )
    ? 'missing_build'
    : 'platform_failure';
  writeEvidence(buildEvidence('failed', failureClass));
  process.exit(1);
}

writeEvidence(buildEvidence('passed'));
console.log('\n[encrypted-recovery] RELEASE GATE PASSED: iOS and Android');
