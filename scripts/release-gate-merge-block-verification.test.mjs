import test from "node:test";
import assert from "node:assert/strict";

test("temporary release-gate verification must fail", () => {
  assert.equal("release validation", "temporary verification failure");
});
