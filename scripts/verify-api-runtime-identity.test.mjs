import test from "node:test";
import assert from "node:assert/strict";
import { validateLiveRuntimeMetadata } from "./verify-api-runtime-identity.mjs";

const valid = {
  nodeVersion: "v22.14.0",
  nodeMajor: 22,
  supabaseSdk: "2.112.2",
};

test("deployment smoke metadata accepts the Railway-supported Node 22 runtime", () => {
  assert.doesNotThrow(() => validateLiveRuntimeMetadata(valid));
});

test("deployment smoke metadata rejects a Node 20 release", () => {
  assert.throws(
    () => validateLiveRuntimeMetadata({ ...valid, nodeVersion: "v20.19.4", nodeMajor: 20 }),
    /approved runtime compatibility metadata/,
  );
});

test("deployment smoke metadata rejects a mismatched Supabase SDK", () => {
  assert.throws(
    () => validateLiveRuntimeMetadata({ ...valid, supabaseSdk: "2.111.0" }),
    /approved runtime compatibility metadata/,
  );
});
