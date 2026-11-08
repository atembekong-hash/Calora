import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import { pool } from "@workspace/db";

const router = Router();
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const ACTIVE_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "REFUND_REVERSED",
  "PRODUCT_CHANGE",
  "PURCHASE_REDEEMED",
]);
const NON_REVOKING_EVENT_TYPES = new Set([
  "CANCELLATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
  "PRICE_INCREASE_CONSENT_REQUIRED",
]);
const REVOKING_EVENT_TYPES = new Set(["EXPIRATION"]);

type RevenueCatEvent = {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  event_timestamp_ms?: unknown;
  expiration_at_ms?: unknown;
  environment?: unknown;
  product_id?: unknown;
  entitlement_id?: unknown;
  entitlement_ids?: unknown;
  store?: unknown;
  transaction_id?: unknown;
  cancel_reason?: unknown;
};

type RevenueCatPayload = {
  api_version?: unknown;
  event?: RevenueCatEvent;
};

function rawBody(req: Request): Buffer {
  return Buffer.isBuffer(req.body) ? req.body : Buffer.from("", "utf8");
}

function verifyHmac(raw: Buffer, header: string, secret: string): boolean {
  const values = new URLSearchParams(header.replaceAll(",", "&"));
  const timestamp = values.get("t");
  const signature = values.get("v1");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  if (
    Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) >
    MAX_CLOCK_SKEW_SECONDS
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw.toString("utf8")}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function authenticate(req: Request, raw: Buffer): boolean {
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  const signature = req.get("x-revenuecat-webhook-signature");
  if (signingSecret && signature && verifyHmac(raw, signature, signingSecret))
    return true;
  const configuredAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  return Boolean(
    configuredAuthorization &&
    req.get("authorization") === configuredAuthorization,
  );
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerValue(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function eventStatus(type: string): string {
  if (ACTIVE_EVENT_TYPES.has(type)) return "active";
  if (NON_REVOKING_EVENT_TYPES.has(type)) return "cancelled";
  if (REVOKING_EVENT_TYPES.has(type)) return "expired";
  return "observed";
}

function eventEntitlement(event: RevenueCatEvent): string {
  if (Array.isArray(event.entitlement_ids)) {
    const first = event.entitlement_ids.find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (first) return first;
  }
  return stringValue(event.entitlement_id) ?? "premium";
}

router.post("/v1/webhooks/revenuecat", async (req, res) => {
  const raw = rawBody(req);
  if (!authenticate(req, raw)) {
    res.status(401).json({ message: "Webhook authentication failed." });
    return;
  }

  let payload: RevenueCatPayload;
  try {
    payload = JSON.parse(raw.toString("utf8")) as RevenueCatPayload;
  } catch {
    res.status(400).json({ message: "Webhook payload is not valid JSON." });
    return;
  }
  const event = payload.event;
  const eventId = stringValue(event?.id);
  const type = stringValue(event?.type);
  if (!event || !eventId || !type) {
    res
      .status(400)
      .json({ message: "Webhook event id and type are required." });
    return;
  }

  const appUserId =
    stringValue(event?.app_user_id) ?? stringValue(event?.original_app_user_id);
  const eventTimestampMs = integerValue(event?.event_timestamp_ms);
  const environment = stringValue(event?.environment);
  const payloadJson = JSON.stringify(payload);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ event_id: string }>(
      `INSERT INTO calora_revenuecat_webhook_events
         (event_id, app_user_id, event_type, event_timestamp_ms, environment, payload, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'received')
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, appUserId, type, eventTimestampMs, environment, payloadJson],
    );
    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(200).json({ accepted: true, duplicate: true });
      return;
    }

    if (!appUserId) {
      await client.query(
        `UPDATE calora_revenuecat_webhook_events
            SET status = 'ignored', error = 'missing app_user_id', processed_at = NOW()
          WHERE event_id = $1`,
        [eventId],
      );
      await client.query("COMMIT");
      res.status(200).json({ accepted: true, applied: false });
      return;
    }

    const user = await client.query<{ id: string }>(
      `SELECT id FROM calora_users WHERE external_id = $1 LIMIT 1`,
      [appUserId],
    );
    if (user.rowCount === 0) {
      await client.query(
        `UPDATE calora_revenuecat_webhook_events
            SET status = 'dead_letter', error = 'unknown app_user_id', processed_at = NOW()
          WHERE event_id = $1`,
        [eventId],
      );
      await client.query("COMMIT");
      res
        .status(200)
        .json({ accepted: true, applied: false, deadLettered: true });
      return;
    }

    const productId =
      stringValue(event.product_id) ?? `revenuecat:${eventEntitlement(event)}`;
    const expiresAtMs = integerValue(event.expiration_at_ms);
    const expiresAt = expiresAtMs === null ? null : new Date(expiresAtMs);
    const status = eventStatus(type);
    await client.query(
      `INSERT INTO calora_subscriptions
         (user_id, provider, product_id, entitlement, status, expires_at, last_event_timestamp_ms, updated_at)
       VALUES ($1, 'revenuecat', $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, product_id) DO UPDATE SET
         entitlement = EXCLUDED.entitlement,
         status = EXCLUDED.status,
         expires_at = COALESCE(EXCLUDED.expires_at, calora_subscriptions.expires_at),
         last_event_timestamp_ms = EXCLUDED.last_event_timestamp_ms,
         updated_at = NOW()
       WHERE calora_subscriptions.last_event_timestamp_ms IS NULL
          OR EXCLUDED.last_event_timestamp_ms IS NULL
          OR EXCLUDED.last_event_timestamp_ms >= calora_subscriptions.last_event_timestamp_ms`,
      [
        user.rows[0].id,
        productId,
        eventEntitlement(event),
        status,
        expiresAt,
        eventTimestampMs,
      ],
    );
    await client.query(
      `UPDATE calora_revenuecat_webhook_events
          SET status = 'applied', processed_at = NOW()
        WHERE event_id = $1`,
      [eventId],
    );
    await client.query("COMMIT");
    res.status(200).json({ accepted: true, applied: true, status });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log.error(
      { err: error, eventId },
      "RevenueCat webhook processing failed",
    );
    res.status(500).json({ message: "Webhook processing failed." });
  } finally {
    client.release();
  }
});

export default router;
