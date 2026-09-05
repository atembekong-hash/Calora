import { describe, expect, it, vi } from "vitest";

const { connect, query, release } = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));

vi.mock("../index", () => ({
  pool: { connect },
}));

const { provisionDatabaseSupportObjects } = await import(
  "../provision-support-objects"
);

describe("provisionDatabaseSupportObjects", () => {
  it("releases the owned connection as broken when rollback fails", async () => {
    const provisionError = new Error("support-object DDL failed");
    const rollbackError = new Error("rollback failed");
    const client = { query, release };

    connect.mockResolvedValue(client);
    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(provisionError)
      .mockRejectedValueOnce(rollbackError);

    await expect(provisionDatabaseSupportObjects()).rejects.toBe(
      provisionError,
    );

    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query.mock.calls[1][0]).toContain("CREATE EXTENSION");
    expect(query).toHaveBeenNthCalledWith(4, "ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(rollbackError);
  });
});