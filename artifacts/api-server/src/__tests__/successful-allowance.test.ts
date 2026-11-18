import { describe, expect, it } from "vitest";
import { allowanceDayKey, allowanceTimestampMs } from "../lib/successful-allowance.js";

describe("successful allowance timestamp handling", () => {
  it("accepts PostgreSQL timestamp strings returned by the production driver", () => {
    const value = "2026-11-18T10:54:53.904Z";
    expect(allowanceTimestampMs(value)).toBe(Date.parse(value));
  });

  it("keeps Date timestamp handling unchanged", () => {
    const value = new Date("2026-11-18T10:54:53.904Z");
    expect(allowanceTimestampMs(value)).toBe(value.getTime());
  });

  it("normalizes PostgreSQL date values before matching the current period", () => {
    expect(allowanceDayKey("2026-11-18")).toBe("2026-11-18");
    expect(allowanceDayKey(new Date("2026-11-18T00:00:00.000Z"))).toBe("2026-11-18");
  });
});
