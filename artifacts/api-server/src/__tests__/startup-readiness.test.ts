import { describe, expect, it, vi } from "vitest";
import { assertStartupReady } from "../lib/startup-readiness";

describe("startup readiness", () => {
  it("proves database reachability with a read-only query", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });

    await expect(assertStartupReady({ query })).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("fails closed when the database cannot be reached", async () => {
    const failure = new Error("database unavailable");
    const query = vi.fn().mockRejectedValue(failure);

    await expect(assertStartupReady({ query })).rejects.toBe(failure);
  });
});
