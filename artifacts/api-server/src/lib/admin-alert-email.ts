import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { logger, safeErrorCode } from "./logger.js";
import { writeAdminAudit } from "./admin-data.js";
import type { AdminAlert } from "./admin-alerts.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const DELIVERY_COOLDOWN_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fingerprint(alert: AdminAlert): string {
  return createHash("sha256")
    .update(
      [alert.alertKey, alert.severity, alert.title, alert.detail].join(
        "\u001f",
      ),
    )
    .digest("hex");
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function boundedAlertText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function textBody(alert: AdminAlert): string {
  return [
    "Calora Admin System operational alert",
    `Severity: ${alert.severity.toUpperCase()}`,
    `Alert: ${alert.title}`,
    `Detail: ${boundedAlertText(alert.detail)}`,
    `Occurrences: ${alert.occurrenceCount}`,
    `Last seen: ${alert.lastSeenAt}`,
    "",
    "This message contains bounded operational metadata only. It does not include user nutrition, Coach messages, photos, account identifiers, or raw timelines.",
  ].join("\n");
}

async function sendViaResend(alert: AdminAlert): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from =
    process.env.CALORA_ALERT_FROM?.trim() ||
    "Calora Alerts <alerts@mycaloraapp.com>";
  const to =
    process.env.CALORA_ALERT_RECIPIENT?.trim() || "alerts@mycaloraapp.com";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      process.env.RESEND_API_URL?.trim() || RESEND_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `[Calora] ${alert.severity.toUpperCase()}: ${alert.title}`,
          text: textBody(alert),
          html: `<p><strong>Calora Admin System operational alert</strong></p><p><strong>Severity:</strong> ${escapeHtml(alert.severity.toUpperCase())}</p><p><strong>Alert:</strong> ${escapeHtml(alert.title)}</p><p>${escapeHtml(boundedAlertText(alert.detail))}</p><p><strong>Occurrences:</strong> ${alert.occurrenceCount}<br><strong>Last seen:</strong> ${escapeHtml(alert.lastSeenAt)}</p><hr><p>This message contains bounded operational metadata only.</p>`,
        }),
        signal: controller.signal,
      },
    );
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok || !body.id)
      throw new Error(`Resend request failed (${response.status})`);
    return body.id;
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyOperationalAlerts(
  alerts: AdminAlert[],
): Promise<void> {
  if (!configured() || alerts.length === 0) return;
  for (const alert of alerts.filter((item) => item.status === "open")) {
    const key = fingerprint(alert);
    const delivery = await pool.query<{
      id: string;
      attempt_count: number;
      status: "pending" | "sent" | "failed";
      last_attempt_at: Date | null;
    }>(
      `INSERT INTO calora_admin_alert_deliveries (alert_id, fingerprint)
       VALUES ($1::uuid, $2)
       ON CONFLICT (alert_id, fingerprint) DO UPDATE
         SET last_error = NULL
       RETURNING id, attempt_count, status, last_attempt_at`,
      [alert.id, key],
    );
    const deliveryRow = delivery.rows[0];
    if (!deliveryRow) continue;

    const recent = await pool.query<{ id: string }>(
      `SELECT id FROM calora_admin_alert_deliveries
        WHERE alert_id = $1::uuid
          AND status = 'sent'
          AND created_at >= now() - interval '15 minutes'
        ORDER BY created_at DESC LIMIT 1`,
      [alert.id],
    );
    const retryBlocked =
      deliveryRow.status === "failed" &&
      deliveryRow.last_attempt_at !== null &&
      Date.now() - deliveryRow.last_attempt_at.getTime() < DELIVERY_COOLDOWN_MS;
    if (deliveryRow.status === "sent" || retryBlocked || recent.rows[0])
      continue;

    try {
      const providerMessageId = await sendViaResend(alert);
      await pool.query(
        `UPDATE calora_admin_alert_deliveries
            SET status = 'sent', attempt_count = attempt_count + 1,
                provider_message_id = $2, last_attempt_at = now(), sent_at = now(), last_error = NULL
          WHERE id = $1::uuid`,
        [deliveryRow.id, providerMessageId],
      );
      logger.info(
        { alertKey: alert.alertKey, severity: alert.severity },
        "Operational alert email sent",
      );
      await writeAdminAudit({
        action: "alert.email_sent",
        targetType: "operational_alert",
        targetReference: alert.id,
        result: "success",
        metadata: {
          alertKey: alert.alertKey,
          severity: alert.severity,
          attemptCount: deliveryRow.attempt_count + 1,
        },
      }).catch(() => undefined);
    } catch (error) {
      await pool
        .query(
          `UPDATE calora_admin_alert_deliveries
            SET status = 'failed', attempt_count = attempt_count + 1,
                last_attempt_at = now(), last_error = $2
          WHERE id = $1::uuid`,
          [
            deliveryRow.id,
            safeErrorCode(error),
          ],
        )
        .catch(() => undefined);
      logger.warn(
        { alertKey: alert.alertKey, severity: alert.severity },
        "Operational alert email delivery failed",
      );
      await writeAdminAudit({
        action: "alert.email_failed",
        targetType: "operational_alert",
        targetReference: alert.id,
        result: "failed",
        metadata: {
          alertKey: alert.alertKey,
          severity: alert.severity,
          attemptCount: deliveryRow.attempt_count + 1,
        },
      }).catch(() => undefined);
    }
  }
}
