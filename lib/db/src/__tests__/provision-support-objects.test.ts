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
  buildDatabasePoolConfig: vi.fn(() => ({
    connectionString: "postgresql://fixture",
  })),
  getMigrationDatabaseUrl: vi.fn(() => "postgresql://fixture"),
}));

const { provisionDatabaseSupportObjects } =
  await import("../provision-support-objects");

describe("provisionDatabaseSupportObjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses the canonical pgcrypto schema without database-wide extension DDL", async () => {
    const client = { query, release: vi.fn() };
    query.mockResolvedValue(undefined);

    await provisionDatabaseSupportObjects(client);

    const statements = query.mock.calls
      .map(([statement]) => String(statement))
      .join("\n");
    expect(statements).toContain(
      "extensions.digest(external_user_id, 'sha256')",
    );
    expect(statements).not.toContain("CREATE SCHEMA IF NOT EXISTS extensions");
    expect(statements).not.toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  });

  it("releases the owned connection as broken when rollback fails", async () => {
    const provisionError = new Error("support-object DDL failed");
    const rollbackError = new Error("rollback failed");
    const client = { query, release };

    connect.mockResolvedValue(client);
    query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(provisionError)
      .mockRejectedValueOnce(rollbackError);

    await expect(provisionDatabaseSupportObjects()).rejects.toBe(
      provisionError,
    );

    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query.mock.calls[1][0]).toContain("CREATE OR REPLACE FUNCTION");
    expect(query).toHaveBeenNthCalledWith(3, "ROLLBACK");
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
      .mockRejectedValueOnce(provisionError)
      .mockRejectedValueOnce(rollbackError);

    await expect(provisionDatabaseSupportObjects(client)).rejects.toBe(
      provisionError,
    );

    expect(connect).not.toHaveBeenCalled();
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query.mock.calls[1][0]).toContain("CREATE OR REPLACE FUNCTION");
    expect(query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(injectedRelease).not.toHaveBeenCalled();
  });
});
