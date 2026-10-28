import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const apiPackageJson = JSON.parse(
  await readFile(new URL("../artifacts/api-server/package.json", import.meta.url), "utf8"),
);

test("production API pins a Node runtime compatible with Supabase SDK 2.112", () => {
  assert.equal(packageJson.engines?.node, "22.16.0");
  assert.match(apiPackageJson.dependencies?.["@supabase/supabase-js"] ?? "", /^\^2\.112\.2$/);
});

test("the runtime pin is not accidentally duplicated or hidden in a stale service package", async () => {
  const nodeVersion = await readFile(new URL("../.node-version", import.meta.url), "utf8");
  assert.equal(nodeVersion.trim(), "22.16.0");
});
