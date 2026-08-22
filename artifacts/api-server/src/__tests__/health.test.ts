import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("API health routes", () => {
  it.each(["/api", "/api/healthz"])("returns a dependency-free status from %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});