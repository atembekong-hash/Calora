import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertSupportedNodeRuntime } from "./lib/node-runtime-policy.mjs";

const root = new URL("..", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const apiPackageJson = JSON.parse(
  await readFile(new URL("../artifacts/api-server/package.json", import.meta.url), "utf8"),
);

test("production API pins a Node runtime compatible with Supabase SDK 2.112", () => {
  assert.equal(packageJson.engines?.node, ">=22.13.0 <23.0.0");
  assert.match(apiPackageJson.dependencies?.["@supabase/supabase-js"] ?? "", /^\^2\.112\.2$/);
});

test("the runtime pin is not accidentally duplicated or hidden in a stale service package", async () => {
  const nodeVersion = await readFile(new URL("../.node-version", import.meta.url), "utf8");
  assert.equal(nodeVersion.trim(), "22.16.0");
});

test("the build policy rejects incompatible runtimes instead of emitting a warning", () => {
  assert.doesNotThrow(() => assertSupportedNodeRuntime("v22.14.0"));
  assert.throws(() => assertSupportedNodeRuntime("v20.19.4"), /requires Node/);
  assert.throws(() => assertSupportedNodeRuntime("v24.0.0"), /requires Node/);
});
