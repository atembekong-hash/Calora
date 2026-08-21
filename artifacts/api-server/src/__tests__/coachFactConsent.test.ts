import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const verifyBearerToken = vi.fn();
vi.mock("../lib/supabase-auth.js", () => ({ verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args) }));
const getCoachFactConsent = vi.fn();
const acceptCoachFactConsent = vi.fn();
const revokeCoachFactConsent = vi.fn();
vi.mock("../lib/coach-fact-consent.js", () => ({
  getCoachFactConsent: (...args: unknown[]) => getCoachFactConsent(...args),
  acceptCoachFactConsent: (...args: unknown[]) => acceptCoachFactConsent(...args),
  revokeCoachFactConsent: (...args: unknown[]) => revokeCoachFactConsent(...args),
}));

import router from "../routes/coachFactConsent.js";

const current = { purpose: "coach_fact_context_v1", documentVersion: "2026-08-21", state: "consented_current", decidedAt: "2026-08-21T00:00:00.000Z", revokedAt: null };
function app() { const instance = express(); instance.use(express.json()); instance.use(router); return instance; }

describe("Coach Fact Context consent routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue({ id: "account-a", email: "a@example.com" });
    getCoachFactConsent.mockResolvedValue(current);
    acceptCoachFactConsent.mockResolvedValue(current);
    revokeCoachFactConsent.mockResolvedValue({ ...current, state: "revoked", revokedAt: "2026-08-21T00:01:00.000Z" });
  });

  it("uses only the verified account to read, accept, and revoke consent", async () => {
    const server = app();
    expect((await request(server).get("/v1/coach/fact-context/consent")).body).toEqual(current);
    expect((await request(server).post("/v1/coach/fact-context/consent/accept").send({ purpose: "coach_fact_context_v1", documentVersion: "2026-08-21" })).body).toEqual(current);
    expect((await request(server).post("/v1/coach/fact-context/consent/revoke")).body.state).toBe("revoked");
    expect(getCoachFactConsent).toHaveBeenCalledWith("account-a", "a@example.com");
    expect(acceptCoachFactConsent).toHaveBeenCalledWith("account-a", "a@example.com");
    expect(revokeCoachFactConsent).toHaveBeenCalledWith("account-a", "a@example.com");
  });

  it("rejects missing auth and forged version/purpose input", async () => {
    const server = app();
    verifyBearerToken.mockResolvedValueOnce(null);
    expect((await request(server).get("/v1/coach/fact-context/consent")).status).toBe(401);
    expect((await request(server).post("/v1/coach/fact-context/consent/accept").send({ purpose: "legacy", documentVersion: "wrong" })).status).toBe(400);
    expect(acceptCoachFactConsent).not.toHaveBeenCalled();
  });
});