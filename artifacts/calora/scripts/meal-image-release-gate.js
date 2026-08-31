const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const flowPath = path.join('tests', 'device', 'meal-images.yaml');
const targets = [
  { platform: 'iOS', envName: 'CALORA_IOS_DEVICE' },
  { platform: 'Android', envName: 'CALORA_ANDROID_DEVICE' },
];

function printUsage() {
  console.error(
    [
      'Meal-image release gate needs one booted target per platform.',
      'Set CALORA_IOS_DEVICE and CALORA_ANDROID_DEVICE to the exact IDs',
      'reported by the native platform tools, then run:',
      '  iOS: xcrun simctl list devices booted',
      '  Android: adb devices',
      '  pnpm test:release:meal-images',
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
    'Maestro is required for the meal-image release gate but was not found on PATH.',
  );
  console.error('Install Maestro before running this release validation.');
  process.exit(1);
}

const failures = [];

for (const { platform, envName } of targets) {
  const device = process.env[envName].trim();
  console.log(`\n[meal-images] ${platform} target: ${device}`);
  console.log(`[meal-images] Running ${flowPath}`);

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
      `[meal-images] ${platform} failed for ${device}. The flow reports the failed card's meal identity and whether its state is "Fallback image active" or "Swapped image detected" above.`,
    );
  } else {
    console.log(`[meal-images] ${platform} passed for ${device}`);
  }
}

if (failures.length > 0) {
  console.error('\n[meal-images] RELEASE GATE FAILED');
  for (const failure of failures) {
    const reason = failure.error
      ? failure.error.message
      : `Maestro exited with status ${failure.status}`;
    console.error(`- ${failure.platform} (${failure.device}): ${reason}`);
  }
  process.exit(1);
}

console.log('\n[meal-images] RELEASE GATE PASSED: iOS and Android');