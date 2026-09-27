const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceAppRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(sourceAppRoot, "..", "..");

function createIsolatedAppRoot() {
  // Keep the temporary fixture below the real workspace so pnpm resolves its
  // catalog dependencies without an install; the copied app source is still
  // entirely disposable and is removed in the test's finally block.
  const isolatedRoot = fs.mkdtempSync(
    path.join(workspaceRoot, ".calora-health-connect-prebuild-"),
  );
  fs.cpSync(sourceAppRoot, isolatedRoot, {
    recursive: true,
    filter: (source) =>
      !["node_modules", "android", "ios", ".expo", "dist"].includes(
        path.basename(source),
      ),
  });
  fs.symlinkSync(
    path.join(sourceAppRoot, "node_modules"),
    path.join(isolatedRoot, "node_modules"),
  );
  return isolatedRoot;
}

function prebuildAndroid(appRoot) {
  // Resolve from the authoritative app root. `pnpm exec` can otherwise walk
  // above the disposable fixture and select a stale outer workspace link.
  const expoCli = require.resolve("expo/bin/cli", { paths: [sourceAppRoot] });
  execFileSync(
    process.execPath,
    [expoCli, "prebuild", "--platform", "android", "--no-install"],
    {
      cwd: appRoot,
      env: { ...process.env, CI: "1" },
      stdio: "pipe",
    },
  );
}

function activityBlock(manifest, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = manifest.match(
    new RegExp(
      `<activity\\s+[^>]*android:name="${escapedName}"[\\s\\S]*?<\\/activity>`,
    ),
  );
  assert.ok(match, `generated manifest is missing activity ${name}`);
  return match[0];
}

test("generated Android manifest routes Health Connect privacy rationale only to Calora policy activity", () => {
  const appRoot = createIsolatedAppRoot();
  const androidRoot = path.join(appRoot, "android");
  const manifestPath = path.join(
    androidRoot,
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  const policySourcePath = path.join(
    androidRoot,
    "app",
    "src",
    "main",
    "java",
    "com",
    "etiendem",
    "caloraapp",
    "HealthConnectPrivacyPolicyActivity.kt",
  );

  try {
    prebuildAndroid(appRoot);
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const mainActivity = activityBlock(manifest, ".MainActivity");
    const policyActivity = activityBlock(
      manifest,
      ".HealthConnectPrivacyPolicyActivity",
    );

    assert.match(
      policyActivity,
      /androidx\.health\.ACTION_SHOW_PERMISSIONS_RATIONALE/,
    );
    assert.match(policyActivity, /android:exported="true"/);
    assert.doesNotMatch(
      mainActivity,
      /androidx\.health\.ACTION_SHOW_PERMISSIONS_RATIONALE/,
    );
    assert.match(
      manifest,
      /<activity-alias[^>]*android:name="ViewPermissionUsageActivity"[^>]*android:targetActivity="\.HealthConnectPrivacyPolicyActivity"[^>]*android:permission="android\.permission\.START_VIEW_PERMISSION_USAGE"/,
    );
    assert.match(manifest, /android\.intent\.action\.VIEW_PERMISSION_USAGE/);
    assert.match(manifest, /android\.intent\.category\.HEALTH_PERMISSIONS/);
    assert.match(manifest, /android\.permission\.health\.READ_STEPS/);
    assert.match(manifest, /android\.permission\.ACTIVITY_RECOGNITION/);

    const policySource = fs.readFileSync(policySourcePath, "utf8");
    assert.match(
      policySource,
      /Uri\.parse\("https:\/\/mycaloraapp\.com\/privacy"\)/,
    );
    assert.doesNotMatch(
      policySource,
      /intent\.data|extras|WebView|javascript/i,
    );

    // A second prebuild proves the plugin does not duplicate the activity or alias.
    prebuildAndroid(appRoot);
    const rerunManifest = fs.readFileSync(manifestPath, "utf8");
    assert.equal(
      (rerunManifest.match(/HealthConnectPrivacyPolicyActivity/g) ?? []).length,
      2,
    );
    assert.equal(
      (rerunManifest.match(/android:name="ViewPermissionUsageActivity"/g) ?? [])
        .length,
      1,
    );
  } finally {
    fs.rmSync(appRoot, { recursive: true, force: true });
  }
});
