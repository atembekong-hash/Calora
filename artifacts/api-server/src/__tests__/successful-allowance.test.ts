import { describe, expect, it } from "vitest";
import { allowanceTimestampMs } from "../lib/successful-allowance.js";

describe("successful allowance timestamp handling", () => {
  it("accepts PostgreSQL timestamp strings returned by the production driver", () => {
    const value = "2026-11-18T10:54:53.904Z";
    expect(allowanceTimestampMs(value)).toBe(Date.parse(value));
  });

  it("keeps Date timestamp handling unchanged", () => {
    const value = new Date("2026-11-18T10:54:53.904Z");
    expect(allowanceTimestampMs(value)).toBe(value.getTime());
  });
});
