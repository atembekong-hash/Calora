const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const wrapperPath = path.join(__dirname, 'ios-signing-evidence.js');
const fixturePath = path.join(
  __dirname,
  'fixtures',
  'ios-signing-apple-rehearsal.json',
);
const fixtureCases = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const evidenceOutputDirectory = path.resolve(
  projectRoot,
  process.env.CALORA_IOS_SIGNING_REHEARSAL_OUTPUT_DIR ||
    path.join(os.tmpdir(), 'calora-ios-signing-rehearsal'),
);

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
  fs.chmodSync(executablePath, 0o700);
  return executablePath;
}

function startFixtureServer(responses) {
  let responseIndex = 0;
  const server = http.createServer((request, response) => {
    const fixture = responses[responseIndex++];
    if (!fixture) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          errors: [{ message: 'unexpected fixture request' }],
        }),
      );
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runWrapper(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [wrapperPath, '--apple-rehearsal'],
      {
        cwd: projectRoot,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
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
    child.once('close', (status, signal) => {
      resolve({ status, signal, stdout, stderr });
    });
  });
}

function assertSanitizedEvidence({
  fixture,
  evidencePath,
  stdout,
  stderr,
  status,
}) {
  assert.equal(status, fixture.expected.exitCode, `${fixture.name} exit code`);
  assert.equal(
    stdout.includes('raw EAS output'),
    false,
    `${fixture.name} wrapper stdout retained raw EAS output`,
  );
  assert.equal(
    stderr.includes('raw EAS output'),
    false,
    `${fixture.name} wrapper stderr retained raw EAS output`,
  );

  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);
  assert.deepEqual(
    { ...evidence, generatedAt: '<timestamp>' },
    { schemaVersion: 1, generatedAt: '<timestamp>', ...fixture.expected },
    `${fixture.name} sanitized evidence`,
  );
  assert.match(
    evidence.generatedAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );

  for (const sensitiveValue of fixture.sensitiveValues) {
    assert.equal(
      evidenceText.includes(sensitiveValue),
      false,
      `${fixture.name} evidence leaked fixture value`,
    );
    assert.equal(
      stdout.includes(sensitiveValue),
      false,
      `${fixture.name} wrapper stdout leaked fixture value`,
    );
    assert.equal(
      stderr.includes(sensitiveValue),
      false,
      `${fixture.name} wrapper stderr leaked fixture value`,
    );
  }

  return evidence;
}

async function runFixture(fixture) {
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'calora-ios-signing-apple-rehearsal-'),
  );
  const evidencePath = path.join(
    evidenceOutputDirectory,
    fixture.evidenceFileName,
  );
  const easCliPath = writeFixtureEasCli(
    fixtureDirectory,
    fixture.easCli || { status: 0 },
  );
  const fixtureServer = await startFixtureServer(fixture.responses);

  try {
    fs.rmSync(evidencePath, { force: true });
    const result = await runWrapper({
      ...process.env,
      CALORA_IOS_SIGNING_EVIDENCE_PATH: evidencePath,
      EAS_CLI_COMMAND: easCliPath,
      EAS_GRAPHQL_URL: fixtureServer.url,
      EXPO_TOKEN: 'fixture-eas-token',
    });

    assert.equal(result.error, undefined, `${fixture.name} process error`);
    assert.equal(result.signal, null, `${fixture.name} process signal`);
    assert.equal(
      fs.existsSync(evidencePath),
      true,
      `${fixture.name} did not create evidence`,
    );
    const evidence = assertSanitizedEvidence({
      fixture,
      evidencePath,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status,
    });
    console.log(
      `[ios-signing-contract] ${fixture.name}: ${evidence.result}, exit ${evidence.exitCode}, failure class ${evidence.failureClass || 'none'}`,
    );
  } finally {
    await closeServer(fixtureServer.server);
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
}

async function main() {
  assert.equal(
    process.platform,
    'darwin',
    'The Apple signing rehearsal contract must run on a macOS runner.',
  );
  fs.mkdirSync(evidenceOutputDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(evidenceOutputDirectory, 0o700);

  for (const fixture of fixtureCases) {
    await runFixture(fixture);
  }
}

main().catch((error) => {
  console.error(`[ios-signing-contract] ${error.message}`);
  process.exitCode = 1;
});