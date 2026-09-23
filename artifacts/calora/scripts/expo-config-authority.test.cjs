const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(appRoot, '..', '..');

test('Calora has one authoritative Expo project root', () => {
  assert.equal(
    fs.existsSync(path.join(repositoryRoot, 'app.json')),
    false,
    'repository root must not contain a competing Expo app.json',
  );
  for (const requiredPath of ['package.json', 'app.json', 'eas.json']) {
    assert.equal(
      fs.existsSync(path.join(appRoot, requiredPath)),
      true,
      `Calora Expo authority is missing ${requiredPath}`,
    );
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8'));
  assert.equal(packageJson.main, 'expo-router/entry');
  assert.equal(appJson.expo?.ios?.bundleIdentifier, 'com.etiendem.caloraapp');
  assert.equal(appJson.expo?.android?.package, 'com.etiendem.caloraapp');
});

test('Expo configuration requests only implemented health capabilities', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8'));
  const infoPlist = appJson.expo?.ios?.infoPlist || {};
  const healthKitPlugin = appJson.expo?.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === '@kingstinct/react-native-healthkit',
  );

  assert.equal(packageJson.devDependencies?.['expo-location'], undefined);
  assert.equal(infoPlist.NSHealthUpdateUsageDescription, undefined);
  assert.ok(Array.isArray(healthKitPlugin));
  assert.equal(healthKitPlugin[1]?.NSHealthUpdateUsageDescription, false);
});

test('mobile environment template cannot document server-only credentials', () => {
  const mobileTemplate = fs.readFileSync(path.join(appRoot, 'env.example'), 'utf8');
  const serverTemplate = fs.readFileSync(
    path.join(repositoryRoot, 'artifacts', 'api-server', '.env.example'),
    'utf8',
  );
  for (const serverOnlyName of [
    'DATABASE_URL=',
    'SUPABASE_SERVICE_ROLE_KEY=',
    'SESSION_SECRET=',
  ]) {
    assert.equal(mobileTemplate.includes(serverOnlyName), false, `${serverOnlyName} must stay server-only`);
    assert.equal(serverTemplate.includes(serverOnlyName), true, `${serverOnlyName} must be documented server-side`);
  }
  assert.equal(mobileTemplate.includes('SUPABASE_JWT_SECRET'), false);
});

test('static Expo packaging is provider-neutral and publishes configuration images', () => {
  const buildSource = fs.readFileSync(path.join(appRoot, 'scripts', 'build.js'), 'utf8');

  const forbiddenProviderHooks = [
    ['RE', 'PL_ID'].join(''),
    ['EXPO_PUBLIC_RE', 'PL_ID'].join(''),
    ['re', 'plit'].join(''),
  ];
  for (const forbidden of forbiddenProviderHooks) {
    assert.equal(
      buildSource.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `static packaging must not depend on ${forbidden}`,
    );
  }

  for (const required of [
    'copyConfigImage(',
    'expoClient.iconUrl = iconUrl',
    'expoClient.splash.imageUrl = splashUrl',
    'expoClient.web.favicon = faviconUrl',
  ]) {
    assert.equal(
      buildSource.includes(required),
      true,
      `static packaging is missing configuration-image contract: ${required}`,
    );
  }
});
