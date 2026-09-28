import { afterEach, describe, expect, it, vi } from "vitest";

const { clientQuery, poolConnect } = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  poolConnect: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: {
    connect: () => poolConnect(),
    query: vi.fn(),
  },
}));

import { startNewCoachV2Conversation } from "../lib/coach-v2-data.js";

describe("Coach V2 saved-chat transitions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("archives the active conversation without deleting its turns", async () => {
    const release = vi.fn();
    poolConnect.mockResolvedValue({ query: clientQuery, release });
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("has_pending_turn")) {
        return { rows: [{ has_pending_turn: false }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(startNewCoachV2Conversation("user-id")).resolves.toBe(true);

    const statements = clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("BEGIN");
    expect(statements).toContain("COMMIT");
    expect(
      statements.some((sql) => /SET archived_at = NOW\(\)/.test(sql)),
    ).toBe(true);
    expect(
      statements.some((sql) =>
        /DELETE\s+FROM\s+calora_coach_v2_(conversations|turns)/i.test(sql),
      ),
    ).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it("refuses to archive a chat while its Coach reply is still pending", async () => {
    const release = vi.fn();
    poolConnect.mockResolvedValue({ query: clientQuery, release });
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("has_pending_turn")) {
        return { rows: [{ has_pending_turn: true }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(startNewCoachV2Conversation("user-id")).resolves.toBe(false);

    const statements = clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain("BEGIN");
    expect(statements).toContain("ROLLBACK");
    expect(
      statements.some((sql) => /SET archived_at = NOW\(\)/.test(sql)),
    ).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });
});
