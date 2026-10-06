import { beforeEach, describe, expect, it, vi } from "vitest";

const { connect, end, query, release } = vi.hoisted(() => ({
  connect: vi.fn(),
  end: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));

vi.mock("pg", () => ({
  default: {
    Pool: class {
      connect = connect;
      end = end;
    },
  },
}));

vi.mock("../connection", () => ({
  buildDatabasePoolConfig: vi.fn(() => ({ connectionString: "postgresql://fixture" })),
  getMigrationDatabaseUrl: vi.fn(() => "postgresql://fixture"),
}));

const { provisionDatabaseSupportObjects } = await import(
  "../provision-support-objects"
);

describe("provisionDatabaseSupportObjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses the dedicated extensions schema for pgcrypto deletion fencing", async () => {
    const client = { query, release: vi.fn() };
    query.mockResolvedValue(undefined);

    await provisionDatabaseSupportObjects(client);

    expect(query.mock.calls.map(([statement]) => String(statement))).toEqual(
      expect.arrayContaining([
        "CREATE SCHEMA IF NOT EXISTS extensions",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions",
      ]),
    );
    expect(query.mock.calls.map(([statement]) => String(statement)).join("\n"))
      .toContain("extensions.digest(external_user_id, 'sha256')");
  });

  it("releases the owned connection as broken when rollback fails", async () => {
    const provisionError = new Error("support-object DDL failed");
    const rollbackError = new Error("rollback failed");
    const client = { query, release };

    connect.mockResolvedValue(client);
    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(provisionError)
      .mockRejectedValueOnce(rollbackError);

    await expect(provisionDatabaseSupportObjects()).rejects.toBe(
      provisionError,
    );

    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query).toHaveBeenNthCalledWith(2, "CREATE SCHEMA IF NOT EXISTS extensions");
    expect(query.mock.calls[2][0]).toContain("CREATE EXTENSION");
    expect(query).toHaveBeenNthCalledWith(5, "ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(rollbackError);
  });

  it("preserves an injected client when provisioning and rollback fail", async () => {
    const provisionError = new Error("support-object DDL failed");
    const rollbackError = new Error("rollback failed");
    const injectedRelease = vi.fn();
    const client = { query, release: injectedRelease };

    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(provisionError)
      .mockRejectedValueOnce(rollbackError);

    await expect(provisionDatabaseSupportObjects(client)).rejects.toBe(
      provisionError,
    );

    expect(connect).not.toHaveBeenCalled();
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query).toHaveBeenNthCalledWith(2, "CREATE SCHEMA IF NOT EXISTS extensions");
    expect(query.mock.calls[2][0]).toContain("CREATE EXTENSION");
    expect(query).toHaveBeenNthCalledWith(5, "ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(injectedRelease).not.toHaveBeenCalled();
  });
});
