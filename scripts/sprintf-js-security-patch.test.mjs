import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { sprintf } = require("sprintf-js");

for (const specifier of ["e", "f", "g"]) {
  test(`caps oversized precision for %${specifier} without throwing`, () => {
    const bounded = sprintf(`%.100${specifier}`, 1.5);
    const oversized = sprintf(`%.101${specifier}`, 1.5);
    assert.equal(oversized, bounded);
  });
}

test("normalizes zero precision for %g to the supported minimum", () => {
  assert.equal(sprintf("%.0g", 1.5), sprintf("%.1g", 1.5));
});

test("retains normal in-range precision behavior", () => {
  assert.equal(sprintf("%.2f", 1.5), "1.50");
  assert.equal(sprintf("%.2e", 1.5), "1.50e+0");
  assert.equal(sprintf("%.2g", 1.5), "1.5");
});
