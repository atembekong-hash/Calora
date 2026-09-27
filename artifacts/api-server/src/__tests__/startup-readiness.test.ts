import { describe, expect, it, vi } from "vitest";
import {
  assertStartupReady,
  CAPTURE_LIMITER_READINESS_QUERY,
} from "../lib/startup-readiness";

describe("startup readiness", () => {
  it("proves database reachability and capture limiter availability with read-only queries", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });

    await expect(assertStartupReady({ query })).resolves.toBeUndefined();

    expect(query).toHaveBeenNthCalledWith(1, "SELECT 1");
    expect(query).toHaveBeenNthCalledWith(2, CAPTURE_LIMITER_READINESS_QUERY);
  });

  it("fails closed when the database cannot be reached", async () => {
    const failure = new Error("database unavailable");
    const query = vi.fn().mockRejectedValue(failure);

    await expect(assertStartupReady({ query })).rejects.toBe(failure);
  });

  it("fails closed when the persistent capture limiter table is unavailable", async () => {
    const failure = new Error('relation "calora_capture_rate_limits" does not exist');
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })
      .mockRejectedValueOnce(failure);

    await expect(assertStartupReady({ query })).rejects.toBe(failure);
    expect(query).toHaveBeenNthCalledWith(2, CAPTURE_LIMITER_READINESS_QUERY);
  });
});
