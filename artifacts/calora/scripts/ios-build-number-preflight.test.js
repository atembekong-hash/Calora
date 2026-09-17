const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNumberProof,
  getAppleBuildNumber,
  getEasBuildNumber,
  parseEasBuildList,
} = require('./ios-build-number-preflight');

function config(buildNumber = 5) {
  return {
    marketingVersion: '1.0.0',
    appVersionSource: 'local',
    autoIncrement: false,
    buildNumber,
  };
}

test('uses every consumed iOS EAS number, including errored and old-version records', () => {
  const proof = buildNumberProof({
    config: config(5),
    easBuilds: [
      { id: 'finished', platform: 'IOS', status: 'FINISHED', appBuildVersion: '2' },
      { id: 'errored-old-version', platform: 'IOS', status: 'ERRORED', appVersion: '0.0.0', appBuildVersion: '4' },
      { id: 'android-only', platform: 'ANDROID', status: 'FINISHED', appBuildVersion: '99' },
    ],
    appleBuilds: [
      { attributes: { version: '2' } },
    ],
  });

  assert.deepEqual(proof, {
    marketingVersion: '1.0.0',
    versionControlSource: 'local',
    autoIncrement: false,
    configuredBuildNumber: 5,
    easConsumedFloor: 4,
    appleConsumedFloor: 2,
    consumedFloor: 4,
    selectedNextBuildNumber: 5,
    predictedProductionBuildNumber: 5,
    easBuildCount: 3,
    appleBuildCount: 1,
  });
});

test('fails closed when source build 2 would repeat a consumed number', () => {
  assert.throws(
    () =>
      buildNumberProof({
        config: config(2),
        easBuilds: [{ platform: 'IOS', status: 'ERRORED', appBuildVersion: '4' }],
        appleBuilds: [{ attributes: { version: '2' } }],
      }),
    /does not equal the safe next build 5/i,
  );
});

test('fails closed when auto-increment leaves the deterministic strategy', () => {
  assert.throws(
    () =>
      buildNumberProof({
        config: { ...config(5), autoIncrement: true },
        easBuilds: [{ platform: 'IOS', status: 'ERRORED', appBuildVersion: '4' }],
        appleBuilds: [],
      }),
    /does not equal the safe next build|autoIncrement/i,
  );
});

test('fails closed when an iOS build is already active', () => {
  assert.throws(
    () =>
      buildNumberProof({
        config: config(5),
        easBuilds: [{ id: 'active', platform: 'IOS', status: 'IN_PROGRESS', appBuildVersion: '5' }],
        appleBuilds: [{ attributes: { version: '4' } }],
      }),
    /Active iOS EAS build records exist/i,
  );
});

test('covers off-by-one by requiring the exact floor plus one', () => {
  assert.throws(
    () =>
      buildNumberProof({
        config: config(6),
        easBuilds: [{ platform: 'IOS', status: 'FINISHED', appBuildVersion: '4' }],
        appleBuilds: [],
      }),
    /does not equal the safe next build 5/i,
  );
});

test('rejects missing and malformed build numbers instead of treating them as zero', () => {
  assert.equal(getEasBuildNumber({ platform: 'IOS', appBuildVersion: '0.0.0' }), null);
  assert.equal(getEasBuildNumber({ platform: 'IOS', appBuildVersion: 'not-a-number' }), null);
  assert.equal(getAppleBuildNumber({ attributes: { version: '0' } }), null);
  assert.throws(() => parseEasBuildList('not-json'), /invalid JSON/i);
});

test('accepts paginated EAS JSON in either CLI response shape', () => {
  assert.deepEqual(parseEasBuildList('[{"platform":"IOS"}]'), [{ platform: 'IOS' }]);
  assert.deepEqual(parseEasBuildList('{"builds":[{"platform":"IOS"}]}'), [{ platform: 'IOS' }]);
});