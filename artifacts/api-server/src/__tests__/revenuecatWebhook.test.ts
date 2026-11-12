import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const releaseMock = vi.fn();
const clientMock = { query: queryMock, release: releaseMock };

vi.mock("@workspace/db", () => ({
  pool: { connect: vi.fn(async () => clientMock) },
}));

const { default: router } = await import("../routes/revenuecatWebhook");

function buildApp() {
  const app = express();
  app.use(
    "/api/v1/webhooks/revenuecat",
    express.raw({ type: "application/json" }),
  );
  app.use("/api", router);
  return app;
}

function sign(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = crypto
    .createHmac("sha256", "mission-429-test-secret")
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

const payload = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    api_version: "1.0",
    event: {
      id: "evt-1",
      type: "INITIAL_PURCHASE",
      app_user_id: "supabase-user-1",
      event_timestamp_ms: 1_700_000_000_000,
      expiration_at_ms: 1_800_000_000_000,
      environment: "SANDBOX",
      product_id: "calora_pro_monthly",
      entitlement_ids: ["caloraapp_pro"],
      ...overrides,
    },
  });

describe("RevenueCat webhook lifecycle ingress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = "mission-429-test-secret";
    delete process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  it("verifies the raw signed body before parsing and applies an initial purchase", async () => {
    const body = payload();
    queryMock
      .mockResolvedValueOnce({ rowCount: null, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ event_id: "evt-1" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "user-row-1" }] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const response = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", sign(body))
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      accepted: true,
      applied: true,
      status: "active",
    });
    expect(
      queryMock.mock.calls.some(([sql]) =>
        String(sql).includes("ON CONFLICT (event_id) DO NOTHING"),
      ),
    ).toBe(true);
    expect(
      queryMock.mock.calls.some(([sql]) =>
        String(sql).includes("last_event_timestamp_ms"),
      ),
    ).toBe(true);
  });

  it("rejects an invalid signature and does not open a database transaction", async () => {
    const body = payload();
    const validSignature = sign(body);
    const finalNibble = validSignature.at(-1);
    const invalidSignature = `${validSignature.slice(0, -1)}${finalNibble === "0" ? "1" : "0"}`;
    const response = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", invalidSignature)
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("acknowledges duplicate delivery without reapplying the subscription", async () => {
    const body = payload({ id: "evt-duplicate", type: "RENEWAL" });
    queryMock
      .mockResolvedValueOnce({ rowCount: null, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", sign(body))
      .set("Content-Type", "application/json")
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accepted: true, duplicate: true });
    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock.mock.calls[2][0]).toBe("ROLLBACK");
  });

  it("keeps cancellation non-revoking and maps expiration to expiry", async () => {
    const cancellation = payload({ id: "evt-cancel", type: "CANCELLATION" });
    queryMock
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ event_id: "evt-cancel" }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "user-row-1" }] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const cancelResponse = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", sign(cancellation))
      .set("Content-Type", "application/json")
      .send(cancellation);
    expect(cancelResponse.body.status).toBe("cancelled");

    queryMock.mockReset();
    queryMock
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ event_id: "evt-expire" }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "user-row-1" }] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const expiration = payload({ id: "evt-expire", type: "EXPIRATION" });
    const expireResponse = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", sign(expiration))
      .set("Content-Type", "application/json")
      .send(expiration);
    expect(expireResponse.body.status).toBe("expired");
  });

  it("rejects malformed JSON after authenticating the raw request", async () => {
    const body = "{not-json";
    const response = await request(buildApp())
      .post("/api/v1/webhooks/revenuecat")
      .set("X-RevenueCat-Webhook-Signature", sign(body))
      .set("Content-Type", "application/json")
      .send(body);
    expect(response.status).toBe(400);
  });
});
