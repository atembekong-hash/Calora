import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
import app from "../app";

describe("API health routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a dependency-free liveness status from /api", async () => {
    const response = await request(app).get("/api");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns a readiness status when the database is reachable", async () => {
    vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [{ "?column?": 1 }] } as never);

    const response = await request(app).get("/api/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("fails readiness when the database is unavailable", async () => {
    vi.spyOn(pool, "query").mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(app).get("/api/healthz");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
  });

  it("keeps source imports fail-closed and never exposes runtime environment as release identity", async () => {
    process.env.RELEASE_GIT_COMMIT = "f".repeat(40);
    process.env.RELEASE_SOURCE_DIGEST = "f".repeat(64);

    const response = await request(app).get("/api/version");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "Release identity is unavailable." });
    expect(response.headers["cache-control"]).toBe("no-store");
    delete process.env.RELEASE_GIT_COMMIT;
    delete process.env.RELEASE_SOURCE_DIGEST;
  });
});