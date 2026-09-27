import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const script = new URL("./validate-eas-native-profiles.mjs", import.meta.url);

function validConfig() {
  return {
    build: {
      production: {
        environment: "production",
        env: { EXPO_PUBLIC_API_URL: "https://mycaloraapp.com" },
      },
      "development-device": {
        extends: "production",
        distribution: "internal",
        android: { buildType: "apk" },
      },
      preview: {
        extends: "production",
        distribution: "internal",
        android: { buildType: "apk" },
      },
      "production-apk": {
        extends: "production",
        distribution: "internal",
        android: { buildType: "apk" },
      },
    },
  };
}

async function run(config) {
  const directory = await mkdtemp(path.join(tmpdir(), "calora-eas-profile-"));
  const configPath = path.join(directory, "eas.json");
  await writeFile(configPath, `${JSON.stringify(config)}\n`);
  try {
    return execFileSync(process.execPath, [script.pathname, configPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("accepts internal signed-device profiles that inherit production API configuration", async () => {
  const output = await run(validConfig());
  assert.match(output, /"status": "ok"/);
});

test("rejects a preview profile that can drift to another API environment", async () => {
  const config = validConfig();
  config.build.preview.extends = "base";
  await assert.rejects(
    () => run(config),
    /preview must inherit the production API configuration/,
  );
});
