const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync: defaultSpawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(projectRoot, 'app.json');
const easConfigPath = path.join(projectRoot, 'eas.json');
const DEFAULT_EAS_GRAPHQL_URL = 'https://api.expo.dev/graphql';
const DEFAULT_APP_STORE_CONNECT_URL = 'https://api.appstoreconnect.apple.com/v1/builds';
const PAGE_SIZE = 50;
const ACTIVE_EAS_STATUSES = new Set(['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'PENDING_CANCEL']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parsePositiveInteger(value, label) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer; received ${JSON.stringify(value)}.`);
  }
  return Number(normalized);
}

function loadBuildNumberConfig({
  appPath = appConfigPath,
  easPath = easConfigPath,
} = {}) {
  const appConfig = readJson(appPath);
  const easConfig = readJson(easPath);
  const expo = appConfig?.expo;
  const productionProfile = easConfig?.build?.production;
  const appVersionSource = easConfig?.cli?.appVersionSource;

  if (!expo?.version) {
    throw new Error('Expo marketing version is missing.');
  }
  if (!productionProfile) {
    throw new Error('EAS production profile is missing.');
  }
  if (appVersionSource !== 'local') {
    throw new Error(
      `The deterministic iOS strategy requires cli.appVersionSource "local"; received ${JSON.stringify(appVersionSource)}.`,
    );
  }
  if (productionProfile.autoIncrement !== false) {
    throw new Error(
      'The deterministic iOS strategy requires build.production.autoIncrement=false.',
    );
  }

  const buildNumber = parsePositiveInteger(
    expo.ios?.buildNumber,
    'expo.ios.buildNumber',
  );
  const ascAppId = easConfig?.submit?.production?.ios?.ascAppId;
  if (!ascAppId) {
    throw new Error('The App Store Connect app ID is missing from the EAS submit profile.');
  }

  return {
    marketingVersion: String(expo.version),
    buildNumber,
    appVersionSource,
    autoIncrement: productionProfile.autoIncrement,
    ascAppId: String(ascAppId),
  };
}

function getEasCommand(env = process.env) {
  return env.EAS_CLI_COMMAND?.trim() || 'eas';
}

function getEasToken(env = process.env) {
  return env.EXPO_TOKEN?.trim() || env.EAS_TOKEN?.trim() || null;
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /(token|secret|private\s+key|password)\s*[:=]\s*\S+/gi,
      '$1=[redacted]',
    )
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[redacted credential block]');
}

function parseEasBuildList(stdout) {
  let payload;
  try {
    payload = JSON.parse(String(stdout).trim());
  } catch (error) {
    throw new Error(`EAS build history returned invalid JSON: ${error.message}`);
  }

  const builds = Array.isArray(payload) ? payload : payload?.builds;
  if (!Array.isArray(builds)) {
    throw new Error('EAS build history JSON did not contain a build list.');
  }
  return builds;
}

function listEasIosBuilds({
  command = getEasCommand(),
  env = process.env,
  spawnSync = defaultSpawnSync,
  pageSize = PAGE_SIZE,
} = {}) {
  if (!getEasToken(env)) {
    throw new Error('EXPO_TOKEN (or EAS_TOKEN) is required to read EAS build history.');
  }

  const builds = [];
  for (let offset = 0; offset <= 5000; offset += pageSize) {
    const result = spawnSync(
      command,
      [
        'build:list',
        '--platform',
        'ios',
        '--limit',
        String(pageSize),
        '--offset',
        String(offset),
        '--json',
      ],
      {
        cwd: projectRoot,
        env,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    if (result.error) {
      throw new Error(`Unable to read EAS build history: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(
        `EAS build history failed: ${redactSensitiveText(result.stderr || result.stdout || 'unknown error')}`,
      );
    }

    const page = parseEasBuildList(result.stdout);
    builds.push(...page);
    if (page.length < pageSize) {
      return builds;
    }
  }

  throw new Error('EAS build history exceeded the pagination safety limit.');
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function createAppStoreConnectToken(env = process.env, nowSeconds = Math.floor(Date.now() / 1000)) {
  const privateKey = env.EXPO_ASC_API_KEY_P8?.trim();
  const keyId = env.EXPO_ASC_KEY_ID?.trim();
  const issuerId = env.EXPO_ASC_ISSUER_ID?.trim();
  if (!privateKey || !keyId || !issuerId) {
    throw new Error(
      'EXPO_ASC_API_KEY_P8, EXPO_ASC_KEY_ID, and EXPO_ASC_ISSUER_ID are required to read App Store Connect build history.',
    );
  }

  const normalizedKey = privateKey
    .replace(/\r?\n/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      aud: 'appstoreconnect-v1',
      exp: nowSeconds + 300,
      iat: nowSeconds,
      iss: issuerId,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: normalizedKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
}

async function listAppStoreConnectBuilds({
  appId,
  env = process.env,
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_APP_STORE_CONNECT_URL,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('The runtime does not provide fetch for App Store Connect history.');
  }

  const token = createAppStoreConnectToken(env);
  let nextUrl = new URL(baseUrl);
  nextUrl.searchParams.set('filter[app]', appId);
  nextUrl.searchParams.set('limit', '200');
  const builds = [];

  for (let page = 0; nextUrl && page < 100; page += 1) {
    const response = await fetchImpl(nextUrl, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`App Store Connect build history returned HTTP ${response.status}.`);
    }
    if (!response.ok) {
      const detail = payload.errors?.map((error) => error.detail || error.title).join('; ');
      throw new Error(
        `App Store Connect build history failed: ${detail || `HTTP ${response.status}`}`,
      );
    }
    if (!Array.isArray(payload.data)) {
      throw new Error('App Store Connect build history JSON did not contain a data list.');
    }
    builds.push(...payload.data);
    nextUrl = payload.links?.next ? new URL(payload.links.next) : null;
  }

  if (nextUrl) {
    throw new Error('App Store Connect build history exceeded the pagination safety limit.');
  }
  return builds;
}

function getBuildNumber(build) {
  const value = build?.appBuildVersion ?? build?.attributes?.version ?? build?.buildNumber;
  if (!/^\d+$/.test(String(value ?? '').trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getEasBuildNumber(build) {
  if (String(build?.platform ?? '').toUpperCase() !== 'IOS') {
    return null;
  }
  return getBuildNumber(build);
}

function getAppleBuildNumber(build) {
  return getBuildNumber(build);
}

function buildNumberProof({ config, easBuilds, appleBuilds }) {
  if (config.appVersionSource !== 'local') {
    throw new Error(
      `The deterministic iOS strategy requires appVersionSource "local"; received ${JSON.stringify(config.appVersionSource)}.`,
    );
  }
  if (config.autoIncrement !== false) {
    throw new Error('The deterministic iOS strategy requires autoIncrement=false.');
  }
  const easNumbers = easBuilds.map(getEasBuildNumber).filter(Number.isInteger);
  const appleNumbers = appleBuilds.map(getAppleBuildNumber).filter(Number.isInteger);
  const easConsumedFloor = Math.max(0, ...easNumbers);
  const appleConsumedFloor = Math.max(0, ...appleNumbers);
  const consumedFloor = Math.max(easConsumedFloor, appleConsumedFloor);
  const selectedNextBuildNumber = consumedFloor + 1;
  const activeBuilds = easBuilds.filter(
    (build) =>
      String(build?.platform ?? '').toUpperCase() === 'IOS' &&
      ACTIVE_EAS_STATUSES.has(String(build?.status ?? '').toUpperCase()),
  );

  if (activeBuilds.length > 0) {
    throw new Error(
      `Active iOS EAS build records exist; refusing to queue concurrently: ${activeBuilds
        .map((build) => `${build.id || 'unknown'}:${build.status || 'unknown'}:${getBuildNumber(build) || 'unknown'}`)
        .join(', ')}`,
    );
  }
  if (config.buildNumber !== selectedNextBuildNumber) {
    throw new Error(
      `Configured iOS build ${config.buildNumber} does not equal the safe next build ${selectedNextBuildNumber} (EAS floor ${easConsumedFloor}, Apple floor ${appleConsumedFloor}).`,
    );
  }

  return {
    marketingVersion: config.marketingVersion,
    versionControlSource: config.appVersionSource,
    autoIncrement: config.autoIncrement,
    configuredBuildNumber: config.buildNumber,
    easConsumedFloor,
    appleConsumedFloor,
    consumedFloor,
    selectedNextBuildNumber,
    predictedProductionBuildNumber: config.buildNumber,
    easBuildCount: easBuilds.length,
    appleBuildCount: appleBuilds.length,
  };
}

async function runBuildNumberPreflight({
  appPath = appConfigPath,
  easPath = easConfigPath,
  env = process.env,
  command = getEasCommand(env),
  spawnSync = defaultSpawnSync,
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = loadBuildNumberConfig({ appPath, easPath });
  const [easBuilds, appleBuilds] = await Promise.all([
    listEasIosBuilds({ command, env, spawnSync }),
    listAppStoreConnectBuilds({ appId: config.ascAppId, env, fetchImpl }),
  ]);
  return buildNumberProof({ config, easBuilds, appleBuilds });
}

function printProof(proof) {
  console.log('[ios-build-number] BUILD NUMBER PREFLIGHT PASSED');
  console.log(`[ios-build-number] Marketing version: ${proof.marketingVersion}`);
  console.log(`[ios-build-number] Version-control source: ${proof.versionControlSource}`);
  console.log(`[ios-build-number] autoIncrement: ${proof.autoIncrement}`);
  console.log(`[ios-build-number] EAS consumed floor: ${proof.easConsumedFloor}`);
  console.log(`[ios-build-number] Apple consumed floor: ${proof.appleConsumedFloor}`);
  console.log(`[ios-build-number] Authoritative consumed floor: ${proof.consumedFloor}`);
  console.log(`[ios-build-number] Selected next build number: ${proof.selectedNextBuildNumber}`);
  console.log(`[ios-build-number] Predicted production iOS build number: ${proof.predictedProductionBuildNumber}`);
}

async function main() {
  try {
    const proof = await runBuildNumberPreflight();
    printProof(proof);
    return 0;
  } catch (error) {
    console.error('[ios-build-number] BUILD NUMBER PREFLIGHT FAILED');
    console.error(`[ios-build-number] ${redactSensitiveText(error.message)}`);
    return 1;
  }
}

if (require.main === module) {
  main().then((exitCode) => process.exit(exitCode));
}

module.exports = {
  buildNumberProof,
  createAppStoreConnectToken,
  getAppleBuildNumber,
  getBuildNumber,
  getEasBuildNumber,
  loadBuildNumberConfig,
  listAppStoreConnectBuilds,
  listEasIosBuilds,
  parseEasBuildList,
  runBuildNumberPreflight,
};