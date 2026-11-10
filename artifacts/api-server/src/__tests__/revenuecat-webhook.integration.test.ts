import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import app from "../app";
import { isDatabaseIntegrationTestEnabled } from "./db-integration-gate";

const enabled = isDatabaseIntegrationTestEnabled();
const userExternalId = "mission429-revenuecat-user";
const userId = "00000000-0000-4000-8000-000000000429";
const secret = "mission-429-disposable-secret";

function body(
  id: string,
  type: string,
  timestamp: number,
  expiration = 1_900_000_000_000,
) {
  return JSON.stringify({
    api_version: "1.0",
    event: {
      id,
      type,
      app_user_id: userExternalId,
      event_timestamp_ms: timestamp,
      expiration_at_ms: expiration,
      environment: "SANDBOX",
      product_id: "calora_pro_monthly",
      entitlement_ids: ["caloraapp_pro"],
      store: "APP_STORE",
    },
  });
}

function signature(raw: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

describe.skipIf(!enabled)(
  "Mission 429 disposable RevenueCat webhook rehearsal",
  () => {
    beforeAll(async () => {
      process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = secret;
      await pool.query(
        "DELETE FROM calora_revenuecat_webhook_events WHERE app_user_id = $1",
        [userExternalId],
      );
      await pool.query(
        "DELETE FROM calora_revenuecat_webhook_events WHERE event_id = 'mission429-unknown'",
      );
      await pool.query(
        "DELETE FROM calora_subscriptions WHERE user_id = $1::uuid",
        [userId],
      );
      await pool.query(
        `INSERT INTO calora_users (id, external_id, email)
       VALUES ($1::uuid, $2, 'mission429@example.invalid')
       ON CONFLICT (id) DO UPDATE SET external_id = EXCLUDED.external_id`,
        [userId, userExternalId],
      );
    });

    afterAll(async () => {
      await pool.query(
        "DELETE FROM calora_revenuecat_webhook_events WHERE app_user_id = $1",
        [userExternalId],
      );
      await pool.query(
        "DELETE FROM calora_revenuecat_webhook_events WHERE event_id = 'mission429-unknown'",
      );
      await pool.query(
        "DELETE FROM calora_subscriptions WHERE user_id = $1::uuid",
        [userId],
      );
      await pool.query("DELETE FROM calora_users WHERE id = $1::uuid", [
        userId,
      ]);
      await pool.end();
    });

    it("applies lifecycle events once and ignores out-of-order delivery", async () => {
      const initial = body(
        "mission429-initial",
        "INITIAL_PURCHASE",
        1_700_000_000_100,
      );
      const initialResponse = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(initial))
        .set("Content-Type", "application/json")
        .send(initial);
      expect(initialResponse.status).toBe(200);

      const cancellation = body(
        "mission429-cancel",
        "CANCELLATION",
        1_700_000_000_200,
      );
      const cancellationResponse = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(cancellation))
        .set("Content-Type", "application/json")
        .send(cancellation);
      expect(cancellationResponse.body.status).toBe("cancelled");

      const staleRenewal = body(
        "mission429-stale",
        "RENEWAL",
        1_700_000_000_050,
      );
      const staleResponse = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(staleRenewal))
        .set("Content-Type", "application/json")
        .send(staleRenewal);
      expect(staleResponse.status).toBe(200);

      const duplicateResponse = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(cancellation))
        .set("Content-Type", "application/json")
        .send(cancellation);
      expect(duplicateResponse.body.duplicate).toBe(true);

      const expired = body(
        "mission429-expired",
        "EXPIRATION",
        1_700_000_000_300,
        1_700_000_000_300,
      );
      const expiredResponse = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(expired))
        .set("Content-Type", "application/json")
        .send(expired);
      expect(expiredResponse.body.status).toBe("expired");

      const subscription = await pool.query<{
        status: string;
        last_event_timestamp_ms: string;
      }>(
        `SELECT status, last_event_timestamp_ms::text
         FROM calora_subscriptions
        WHERE user_id = $1::uuid AND product_id = 'calora_pro_monthly'`,
        [userId],
      );
      expect(subscription.rows[0]).toEqual({
        status: "expired",
        last_event_timestamp_ms: "1700000000300",
      });
    });

    it("dead-letters unknown users without creating a subscription", async () => {
      const raw = body(
        "mission429-unknown",
        "INITIAL_PURCHASE",
        1_700_000_001_000,
      ).replace(userExternalId, "unknown-mission429-user");
      const response = await request(app)
        .post("/api/v1/webhooks/revenuecat")
        .set("X-RevenueCat-Webhook-Signature", signature(raw))
        .set("Content-Type", "application/json")
        .send(raw);
      expect(response.status).toBe(200);
      expect(response.body.deadLettered).toBe(true);
      const ledger = await pool.query<{ status: string }>(
        `SELECT status FROM calora_revenuecat_webhook_events WHERE event_id = 'mission429-unknown'`,
      );
      expect(ledger.rows[0]?.status).toBe("dead_letter");
    });
  },
);
