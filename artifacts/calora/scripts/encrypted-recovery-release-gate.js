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
const supportedMaestroVersion = /^1\.40(?:\.\d+)?$/;

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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ...result,
    output: `${result.stdout || ''}\n${result.stderr || ''}`,
  };
}

function parseVersion(output) {
  return output.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0] || null;
}

function checkTool(name, args, versionPattern) {
  const displayName = name === 'maestro' ? 'Maestro' : name;
  const result = runCommand(name, args);
  if (result.error || result.status !== 0) {
    return {
      name,
      status: 'failed',
      version: null,
      detail: `${displayName} is unavailable on PATH`,
    };
  }

  const version = parseVersion(result.output);
  if (!version) {
    return {
      name,
      status: 'failed',
      version: null,
      detail: `${displayName} returned no recognizable version`,
    };
  }

  if (versionPattern && !versionPattern.test(version)) {
    return {
      name,
      status: 'failed',
      version,
      detail: `${displayName} ${version} is unsupported; required Maestro 1.40.x`,
    };
  }

  return {
    name,
    status: 'ready',
    version,
    detail: `${displayName} ${version}`,
  };
}

function checkTargetAvailable(platform, device) {
  if (platform === 'iOS') {
    const result = runCommand('xcrun', [
      'simctl',
      'list',
      'devices',
      'booted',
      '--json',
    ]);
    if (result.error || result.status !== 0) {
      return false;
    }

    try {
      const deviceList = JSON.parse(result.stdout);
      return Object.values(deviceList.devices || {})
        .flat()
        .some(
          (candidate) =>
            candidate.udid === device && candidate.state === 'Booted',
        );
    } catch {
      return false;
    }
  }

  const result = runCommand('adb', ['-s', device, 'get-state']);
  return !result.error && result.status === 0 && result.stdout.trim() === 'device';
}

function writePreflightSummary(preflight, diagnoses) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  const lines = [
    '## Native encrypted-recovery runner preflight',
    '',
    '| Requirement | Status | Observed |',
    '| --- | --- | --- |',
    ...preflight.tools.map(
      ({ name, status, version, detail }) =>
        `| ${name === 'maestro' ? 'Maestro' : name} | ${
          status === 'ready' ? '✅ Ready' : '❌ Failed'
        } | ${
          version || detail
        } |`,
    ),
    ...preflight.targets.map(
      ({ platform, device, available, appInstalled }) => {
        const targetStatus =
          available === null
            ? '⚪ Not checked'
            : available
              ? '✅ Ready'
              : '❌ Failed';
        const appStatus =
          appInstalled === null
            ? 'not checked'
            : appInstalled
              ? 'installed'
              : 'missing';
        return `| ${platform} target${device ? ` (${device})` : ''} | ${targetStatus} | app ${appStatus} |`;
      },
    ),
    '',
  ];

  if (diagnoses.length > 0) {
    lines.push('### Diagnosis', '', ...diagnoses.map((diagnosis) => `- ❌ ${diagnosis}`), '');
  } else {
    lines.push(
      buildCheckEnabled
        ? 'All required runner tools, disposable targets, and signed apps are ready.'
        : 'All required runner tools and disposable targets are ready.',
      '',
    );
  }

  fs.mkdirSync(path.dirname(process.env.GITHUB_STEP_SUMMARY), {
    recursive: true,
  });
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
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
const failures = [];
const diagnoses = [];
const preflightTools = [
  checkTool('xcrun', ['--version']),
  checkTool('adb', ['version']),
  checkTool('maestro', ['--version'], supportedMaestroVersion),
];
const preflight = {
  tools: preflightTools,
  targets: targets.map(({ platform, envName }) => {
    const device = process.env[envName]?.trim() || null;
    if (!device) {
      return {
        platform,
        device,
        available: false,
        appInstalled: null,
      };
    }

    const platformToolName = platform === 'iOS' ? 'xcrun' : 'adb';
    const platformTool = preflightTools.find(
      (tool) => tool.name === platformToolName,
    );
    const available =
      platformTool.status === 'ready'
        ? checkTargetAvailable(platform, device)
        : null;
    const appInstalled =
      available && buildCheckEnabled
        ? checkInstalledBuild(platform, device)
        : null;
    return { platform, device, available, appInstalled };
  }),
};

if (missingTargets.length > 0) {
  diagnoses.push(
    `Missing required target selection: ${missingTargets
      .map(({ envName }) => envName)
      .join(', ')}`,
  );
}

for (const tool of preflight.tools) {
  if (tool.status !== 'ready') {
    diagnoses.push(tool.detail);
  }
}

for (const target of preflight.targets) {
  if (!target.device) {
    continue;
  }
  if (target.available === false) {
    diagnoses.push(
      `${target.platform} target ${target.device} is not booted or connected; select a disposable target reported by the native platform tool.`,
    );
    platformResults.set(target.platform, { outcome: 'failed', exitCode: 1 });
    failures.push({
      platform: target.platform,
      device: target.device,
      status: 1,
      error: new Error('The selected disposable target is not available.'),
      failureClass: 'target_unavailable',
    });
  } else if (buildCheckEnabled && !target.appInstalled) {
    diagnoses.push(
      `${target.platform} build missing on ${target.device}; the signed Calora build is not installed on the selected target.`,
    );
    platformResults.set(target.platform, { outcome: 'failed', exitCode: 1 });
    failures.push({
      platform: target.platform,
      device: target.device,
      status: 1,
      error: new Error(
        'The signed Calora build is not installed on the selected target.',
      ),
      failureClass: 'missing_build',
    });
  }
}

function determineFailureClass() {
  if (missingTargets.length > 0) {
    return 'missing_target_selection';
  }

  const maestroTool = preflight.tools.find((tool) => tool.name === 'maestro');
  if (maestroTool.status !== 'ready') {
    return maestroTool.detail.includes('unsupported')
      ? 'maestro_unsupported'
      : 'maestro_unavailable';
  }

  if (
    preflight.tools.some(
      (tool) => tool.name === 'xcrun' && tool.status !== 'ready',
    )
  ) {
    return 'xcrun_unavailable';
  }
  if (
    preflight.tools.some(
      (tool) => tool.name === 'adb' && tool.status !== 'ready',
    )
  ) {
    return 'adb_unavailable';
  }
  if (failures.some((failure) => failure.failureClass === 'missing_build')) {
    return 'missing_build';
  }
  return 'target_unavailable';
}

writePreflightSummary(preflight, diagnoses);

if (diagnoses.length > 0) {
  for (const diagnosis of diagnoses) {
    console.error(`[encrypted-recovery] PREFLIGHT FAILED: ${diagnosis}`);
  }
  printUsage();
  writeEvidence(buildEvidence('failed', determineFailureClass()));
  process.exit(1);
}

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
