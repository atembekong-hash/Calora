import { pool } from "@workspace/db";
import type { AdminSession } from "./admin-auth.js";
import { writeAdminAudit } from "./admin-data.js";
import { notifyOperationalAlerts } from "./admin-alert-email.js";
import { logger, safeErrorDetails } from "./logger.js";

export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export type AdminAlert = {
  id: string;
  alertKey: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type AdminAlertDelivery = {
  alertKey: string;
  severity: AlertSeverity;
  status: "pending" | "sent" | "failed";
  attemptCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
  sentAt: string | null;
};

type AlertObservation = {
  alertKey: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
};

function mapAlert(row: {
  id: string;
  alert_key: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string;
  occurrence_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}): AdminAlert {
  return {
    id: row.id,
    alertKey: row.alert_key,
    severity: row.severity,
    status: row.status,
    title: row.title,
    detail: row.detail,
    occurrenceCount: row.occurrence_count,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    acknowledgedAt: row.acknowledged_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
  };
}

export async function refreshOperationalAlerts(): Promise<void> {
  const observations: AlertObservation[] = [];
  const scan = await pool.query<{ total: string; failed: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (WHERE status IN ('failed', 'unavailable'))::text AS failed
       FROM calora_ai_capture_sessions
      WHERE created_at >= now() - interval '24 hours'`,
  );
  const total = Number(scan.rows[0]?.total ?? "0");
  const failed = Number(scan.rows[0]?.failed ?? "0");
  if (total >= 5 && failed / total >= 0.25) {
    observations.push({
      alertKey: "scan.failure_spike",
      severity: failed / total >= 0.5 ? "critical" : "warning",
      title: "Scan failure rate is elevated",
      detail: `${failed} of ${total} Scan sessions failed or were unavailable in the last 24 hours.`,
    });
  }

  const deletion = await pool.query<{ retryable: string }>(
    `SELECT count(*)::text AS retryable
       FROM calora_account_deletion_states
      WHERE state = 'retryable'`,
  );
  const retryable = Number(deletion.rows[0]?.retryable ?? "0");
  if (retryable > 0) {
    observations.push({
      alertKey: "privacy.deletion_retryable",
      severity: "critical",
      title: "Account deletion retries require attention",
      detail: `${retryable} deletion operation(s) are currently retryable.`,
    });
  }

  const openReports = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM calora_coach_reports
      WHERE status IN ('received', 'under_review', 'escalated')
        AND expires_at > now()`,
  );
  const reportCount = Number(openReports.rows[0]?.count ?? "0");
  if (reportCount >= 25) {
    observations.push({
      alertKey: "coach.report_backlog",
      severity: reportCount >= 100 ? "critical" : "warning",
      title: "Coach moderation queue is growing",
      detail: `${reportCount} non-expired Coach reports are awaiting final disposition.`,
    });
  }

  const release = process.env.CALORA_RELEASE_COMMIT?.trim();
  if (!release) {
    observations.push({
      alertKey: "deployment.unattested",
      severity: "warning",
      title: "Runtime release identity is unattested",
      detail:
        "The API did not publish CALORA_RELEASE_COMMIT; deployment provenance cannot be confirmed from the console.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const observedKeys = observations.map((item) => item.alertKey);
    for (const item of observations) {
      await client.query(
        `INSERT INTO calora_admin_operational_alerts
           (alert_key, severity, title, detail, occurrence_count, last_seen_at, status, resolved_at, metadata)
         VALUES ($1, $2, $3, $4, 1, now(), 'open', NULL, '{}'::jsonb)
         ON CONFLICT (alert_key) DO UPDATE
           SET severity = EXCLUDED.severity,
               title = EXCLUDED.title,
               detail = EXCLUDED.detail,
               occurrence_count = calora_admin_operational_alerts.occurrence_count + 1,
               last_seen_at = now(),
               status = CASE
                 WHEN calora_admin_operational_alerts.status = 'resolved' THEN 'open'
                 ELSE calora_admin_operational_alerts.status
               END,
               resolved_at = CASE
                 WHEN calora_admin_operational_alerts.status = 'resolved' THEN NULL
                 ELSE calora_admin_operational_alerts.resolved_at
               END`,
        [item.alertKey, item.severity, item.title, item.detail],
      );
    }
    if (observedKeys.length > 0) {
      await client.query(
        `UPDATE calora_admin_operational_alerts
            SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
          WHERE status <> 'resolved' AND NOT (alert_key = ANY($1::text[]))`,
        [observedKeys],
      );
    } else {
      await client.query(
        `UPDATE calora_admin_operational_alerts
            SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
          WHERE status <> 'resolved'`,
      );
    }
    await client.query("COMMIT");

    if (observedKeys.length > 0) {
      const current = await pool.query<Parameters<typeof mapAlert>[0]>(
        `SELECT id, alert_key, severity, status, title, detail, occurrence_count,
                first_seen_at, last_seen_at, acknowledged_at, resolved_at
           FROM calora_admin_operational_alerts
          WHERE status = 'open' AND alert_key = ANY($1::text[])
          ORDER BY last_seen_at DESC
          LIMIT 100`,
        [observedKeys],
      );
      await notifyOperationalAlerts(current.rows.map(mapAlert)).catch(
        (error) => {
          logger.warn(
            { error: error instanceof Error ? error.message : "unknown" },
            "Operational alert email processing failed",
          );
        },
      );
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listOperationalAlerts(): Promise<AdminAlert[]> {
  await refreshOperationalAlerts();
  const result = await pool.query<Parameters<typeof mapAlert>[0]>(
    `SELECT id, alert_key, severity, status, title, detail, occurrence_count,
            first_seen_at, last_seen_at, acknowledged_at, resolved_at
       FROM calora_admin_operational_alerts
      ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END,
               CASE status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END,
               last_seen_at DESC
      LIMIT 100`,
  );
  return result.rows.map(mapAlert);
}

export async function listOperationalAlertDeliveries(
  limit = 30,
): Promise<AdminAlertDelivery[]> {
  const result = await pool.query<{
    alert_key: string;
    severity: AlertSeverity;
    status: "pending" | "sent" | "failed";
    attempt_count: number;
    created_at: Date;
    last_attempt_at: Date | null;
    sent_at: Date | null;
  }>(
    `SELECT a.alert_key, a.severity, d.status, d.attempt_count,
            d.created_at,
            d.last_attempt_at, d.sent_at
       FROM calora_admin_alert_deliveries d
       JOIN calora_admin_operational_alerts a ON a.id = d.alert_id
      ORDER BY d.created_at DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 90)],
  );
  return result.rows.map((row) => ({
    alertKey: row.alert_key,
    severity: row.severity,
    status: row.status,
    attemptCount: row.attempt_count,
    createdAt: row.created_at.toISOString(),
    lastAttemptAt: row.last_attempt_at?.toISOString() ?? null,
    sentAt: row.sent_at?.toISOString() ?? null,
  }));
}

export async function changeOperationalAlertStatus(
  session: AdminSession,
  alertId: string,
  status: "acknowledged" | "resolved",
): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `UPDATE calora_admin_operational_alerts
        SET status = $2,
            acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN COALESCE(acknowledged_at, now()) ELSE acknowledged_at END,
            acknowledged_by_principal_id = CASE WHEN $2 = 'acknowledged' THEN $3::uuid ELSE acknowledged_by_principal_id END,
            resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, now()) ELSE resolved_at END,
            resolved_by_principal_id = CASE WHEN $2 = 'resolved' THEN $3::uuid ELSE resolved_by_principal_id END
      WHERE id = $1::uuid
      RETURNING id`,
    [alertId, status, session.principal.id],
  );
  if (!result.rows[0]) return false;
  await writeAdminAudit({
    session,
    action: status === "acknowledged" ? "alert.acknowledged" : "alert.resolved",
    targetType: "operational_alert",
    targetReference: alertId,
    result: "success",
  });
  return true;
}
