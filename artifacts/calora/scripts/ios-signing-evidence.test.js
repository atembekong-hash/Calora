const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const {
  buildEvidence,
  EVIDENCE_STORAGE_FAILURE_CLASS,
  extractFailureClass,
  extractPrefixedSummaryLines,
  formatStorageFailure,
  getStorageErrorCode,
  removeExistingEvidence,
  resolveEvidencePath,
  run,
} = require('./ios-signing-evidence');

const projectRoot = path.resolve(__dirname, '..');
const evidenceWrapperPath = path.join(__dirname, 'ios-signing-evidence.js');
const fixturePath = path.join(__dirname, 'fixtures', 'ios-signing-evidence.json');
const signingFixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

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

test('sanitizes evidence storage diagnostics to a stable error class and code', () => {
  assert.equal(
    getStorageErrorCode({ code: 'eacces', message: 'raw child output must not leak' }),
    'EACCES',
  );
  assert.equal(getStorageErrorCode(new Error('raw child output must not leak')), 'UNKNOWN');
  assert.deepEqual(
    formatStorageFailure(
      { code: 'EACCES', message: 'raw child output must not leak' },
      '/private/release/evidence.json',
    ),
    [
      '[ios-signing] Evidence archive failed: required sanitized evidence artifact could not be archived to /private/release/evidence.json.',
      `[ios-signing] Evidence archive failure class: ${EVIDENCE_STORAGE_FAILURE_CLASS}`,
      '[ios-signing] Evidence archive diagnostic: EACCES.',
    ],
  );
  assert.ok(
    formatStorageFailure({ code: 'EACCES', message: 'raw child output must not leak' }).every(
      (line) => !line.includes('raw child output'),
    ),
  );
});

test('prints the preflight result before an archive failure and preserves its exit status', () => {
  const stdout = [];
  const stderr = [];
  const result = run({
    env: { CALORA_IOS_SIGNING_EVIDENCE_PATH: 'release/evidence.json' },
    spawn: () => ({
      stdout: 'raw EAS output',
      stderr: [
        '[ios-signing] RELEASE PREFLIGHT FAILED',
        '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
      ].join('\n'),
      status: 17,
      signal: null,
    }),
    write: () => {
      throw Object.assign(new Error('raw child output must not leak'), { code: 'EACCES' });
    },
    appendSummary: () => {},
    output: {
      log: (line) => stdout.push(line),
      error: (line) => stderr.push(line),
    },
  });

  assert.equal(result, 17);
  assert.deepEqual(stdout, [
    '[ios-signing] RELEASE PREFLIGHT FAILED',
    '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
    '[ios-signing] Preflight exit status: 17',
  ]);
  assert.ok(stderr.some((line) => line.includes('Evidence archive failure class: EVIDENCE_STORAGE')));
  assert.ok(stderr.some((line) => line.includes('Evidence archive diagnostic: EACCES.')));
  assert.ok(stderr.every((line) => !line.includes('raw child output')));
});

test('fails a successful release when its required artifact cannot be archived', () => {
  const stderr = [];
  const result = run({
    env: { CALORA_IOS_SIGNING_EVIDENCE_PATH: 'release/evidence.json' },
    spawn: () => ({
      stdout: '[ios-signing] APPLE CERTIFICATE REHEARSAL PASSED',
      stderr: '',
      status: 0,
      signal: null,
    }),
    write: () => {
      throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
    },
    appendSummary: () => {},
    output: {
      log: () => {},
      error: (line) => stderr.push(line),
    },
  });

  assert.equal(result, 1);
  assert.ok(stderr.some((line) => line.includes('required sanitized evidence artifact')));
});

test('removes a pre-existing artifact before a failed archive attempt', () => {
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'calora-ios-signing-stale-evidence-'),
  );
  const evidencePath = path.join(fixtureDirectory, 'evidence.json');
  fs.writeFileSync(evidencePath, '{"result":"passed","run":"older"}\n');

  try {
    const stderr = [];
    const result = run({
      env: { CALORA_IOS_SIGNING_EVIDENCE_PATH: evidencePath },
      spawn: () => ({
        stdout: '[ios-signing] RELEASE PREFLIGHT FAILED',
        stderr: '[ios-signing] Failure class: APPLE_CERTIFICATE_STATE',
        status: 17,
        signal: null,
      }),
      write: () => {
        throw Object.assign(new Error('archive failed'), { code: 'EACCES' });
      },
      appendSummary: () => {},
      output: {
        log: () => {},
        error: (line) => stderr.push(line),
      },
    });

    assert.equal(result, 17);
    assert.equal(fs.existsSync(evidencePath), false);
    assert.ok(
      stderr.some((line) =>
        line.includes(`could not be archived to ${evidencePath}.`),
      ),
    );
  } finally {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test('ignores a missing artifact when clearing an evidence destination', () => {
  const evidencePath = path.join(
    os.tmpdir(),
    'calora-ios-signing-missing-evidence',
    'evidence.json',
  );
  assert.equal(removeExistingEvidence(evidencePath), evidencePath);
});

function writeFixtureEasCli(directory, fixture) {
  const executablePath = path.join(directory, 'eas-fixture.js');
  const script = [
    '#!/usr/bin/env node',
    `process.stdout.write(${JSON.stringify(fixture.stdout || '')});`,
    `process.stderr.write(${JSON.stringify(fixture.stderr || '')});`,
    `process.exit(${fixture.status ?? 0});`,
    '',
  ].join('\n');
  fs.writeFileSync(executablePath, script, { mode: 0o700 });
  return executablePath;
}

function startFixtureServer(responses) {
  let responseIndex = 0;
  const server = http.createServer((request, response) => {
    const fixture = responses[responseIndex++];
    if (!fixture) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ errors: [{ message: 'unexpected fixture request' }] }));
      return;
    }
    response.writeHead(fixture.status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(fixture.body));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/graphql`,
      });
    });
  });
}

function runEvidenceWrapper(fixture, evidencePath, easCliPath, easGraphqlUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [evidenceWrapperPath, ...fixture.args], {
      cwd: projectRoot,
      env: {
        ...process.env,
        CALORA_IOS_SIGNING_EVIDENCE_PATH: evidencePath,
        EAS_CLI_COMMAND: easCliPath,
        EAS_GRAPHQL_URL: easGraphqlUrl,
        EXPO_TOKEN: 'fixture-eas-token',
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}

test('archives the exact sanitized contract for every preflight child-process fixture', async (t) => {
  for (const fixture of signingFixtures) {
    await t.test(fixture.name, async (caseTest) => {
      const fixtureDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), 'calora-ios-signing-evidence-'),
      );
      caseTest.after(() =>
        fs.rmSync(fixtureDirectory, { recursive: true, force: true }),
      );

      const evidencePath = path.join(fixtureDirectory, 'release', 'evidence.json');
      const easCliPath = writeFixtureEasCli(
        fixtureDirectory,
        fixture.easCli || { status: 0 },
      );
      const fixtureServer = await startFixtureServer(fixture.responses);
      let result;
      try {
        result = await runEvidenceWrapper(
          fixture,
          evidencePath,
          easCliPath,
          fixtureServer.url,
        );
      } finally {
        await new Promise((resolve, reject) =>
          fixtureServer.server.close((error) => (error ? reject(error) : resolve())),
        );
      }

      assert.equal(result.signal, null);
      assert.equal(
        result.status,
        fixture.expected.exitCode,
        `${fixture.name} stderr:\n${result.stderr}\nstdout:\n${result.stdout}`,
      );
      const evidenceText = fs.readFileSync(evidencePath, 'utf8');
      const evidence = JSON.parse(evidenceText);

      assert.deepEqual(
        { ...evidence, generatedAt: '<timestamp>' },
        { schemaVersion: 1, generatedAt: '<timestamp>', ...fixture.expected },
      );
      assert.match(evidence.generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.deepEqual(Object.keys(evidence).sort(), [
        'exitCode',
        'failureClass',
        'generatedAt',
        'result',
        'schemaVersion',
        'summaryLines',
      ]);

      for (const sensitiveValue of fixture.sensitiveValues) {
        assert.equal(
          evidenceText.includes(sensitiveValue),
          false,
          `archived evidence leaked fixture value: ${sensitiveValue}`,
        );
        assert.equal(
          result.stdout.includes(sensitiveValue),
          false,
          `wrapper output leaked fixture value: ${sensitiveValue}`,
        );
      }
    });
  }
});