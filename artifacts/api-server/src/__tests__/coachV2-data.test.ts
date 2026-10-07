import { afterEach, describe, expect, it, vi } from "vitest";

const { clientQuery, poolConnect, poolQuery } = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  poolConnect: vi.fn(),
  poolQuery: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: {
    connect: () => poolConnect(),
    query: (...args: unknown[]) => poolQuery(...args),
  },
}));

import {
  buildCoachV2Snapshot,
  startNewCoachV2Conversation,
} from "../lib/coach-v2-data.js";

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

  it("uses the bounded device-local day for today and recent-day coverage", async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [
          { calories: 163, protein_g: 4, carbs_g: 38, fat_g: 1, entries: 2 },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ days: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      buildCoachV2Snapshot("user-id", "2026-10-06"),
    ).resolves.toMatchObject({
      snapshotDate: "2026-10-06",
      today: { calories: 163, proteinG: 4, carbsG: 38, fatG: 1, entries: 2 },
      recentDaysLogged: 1,
    });

    expect(poolQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("entry_date = $2::date"),
      ["user-id", "2026-10-06"],
    );
    expect(poolQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("entry_date <= $2::date"),
      ["user-id", "2026-10-06"],
    );
  });
});
