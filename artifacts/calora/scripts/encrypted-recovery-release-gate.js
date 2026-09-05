const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const flowPath = path.join('tests', 'device', 'encrypted-recovery.yaml');
const targets = [
  { platform: 'iOS', envName: 'CALORA_IOS_DEVICE' },
  { platform: 'Android', envName: 'CALORA_ANDROID_DEVICE' },
];

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

const missingTargets = targets.filter(({ envName }) => !process.env[envName]?.trim());
if (missingTargets.length > 0) {
  console.error(
    `Missing required target selection: ${missingTargets
      .map(({ envName }) => envName)
      .join(', ')}`,
  );
  printUsage();
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
  process.exit(1);
}

const failures = [];

for (const { platform, envName } of targets) {
  const device = process.env[envName].trim();
  console.log(`\n[encrypted-recovery] ${platform} target: ${device}`);
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
  process.exit(1);
}

console.log('\n[encrypted-recovery] RELEASE GATE PASSED: iOS and Android');