import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("API health routes", () => {
  it.each(["/api", "/api/healthz"])("returns a dependency-free status from %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
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