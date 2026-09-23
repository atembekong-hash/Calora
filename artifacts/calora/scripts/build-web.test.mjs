import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import {
  validateWebBuildEnvironment,
  validateWebOutput,
} from "./build-web.mjs";

const validEnv = {
  EXPO_PUBLIC_DOMAIN: "app.mycaloraapp.com",
  EXPO_PUBLIC_API_URL: "https://app.mycaloraapp.com",
  EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_public_key",
};
const tempRoots = [];
afterEach(() => {
  while (tempRoots.length)
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
});

function makeOutput(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "calora-web-build-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "_expo"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "<html></html>");
  fs.writeFileSync(path.join(root, "favicon.ico"), "ico");
  const bundle = [
    validEnv.EXPO_PUBLIC_API_URL,
    validEnv.EXPO_PUBLIC_SUPABASE_URL,
    validEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    validEnv.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
    overrides.extra || "",
  ].join("|");
  fs.writeFileSync(path.join(root, "_expo", "entry.js"), bundle);
  return root;
}

test("accepts the canonical same-origin production web configuration", () => {
  const config = validateWebBuildEnvironment(validEnv);
  assert.equal(config.webHostname, "app.mycaloraapp.com");
  assert.equal(config.apiOrigin, "https://app.mycaloraapp.com");
});

test("fails when any required public web variable is missing", () => {
  for (const key of Object.keys(validEnv)) {
    const env = { ...validEnv };
    delete env[key];
    assert.throws(() => validateWebBuildEnvironment(env), new RegExp(key));
  }
});

test("rejects non-host domain syntax and cross-origin API configuration", () => {
  assert.throws(
    () =>
      validateWebBuildEnvironment({
        ...validEnv,
        EXPO_PUBLIC_DOMAIN: "https://app.mycaloraapp.com/path",
      }),
    /bare public DNS hostname/,
  );
  assert.throws(
    () =>
      validateWebBuildEnvironment({
        ...validEnv,
        EXPO_PUBLIC_API_URL: "https://mycaloraapp.com",
      }),
    /same-origin/,
  );
});

test("verifies required runtime values are embedded in a complete web output", () => {
  const config = validateWebBuildEnvironment(validEnv);
  const summary = validateWebOutput(makeOutput(), config);
  assert.equal(summary.javascriptFileCount, 1);
  assert.ok(summary.fileCount >= 3);
});

test("rejects an incomplete or misconfigured web export", () => {
  const config = validateWebBuildEnvironment(validEnv);
  const root = makeOutput();
  fs.unlinkSync(path.join(root, "favicon.ico"));
  assert.throws(() => validateWebOutput(root, config), /favicon/);
});

test("rejects server-only secret markers in browser bundles", () => {
  const config = validateWebBuildEnvironment(validEnv);
  const root = makeOutput({ extra: "SUPABASE_SERVICE_ROLE_KEY" });
  assert.throws(
    () => validateWebOutput(root, config),
    /forbidden server-only marker/,
  );
});
