import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import type { AdminPrincipal, AdminRole, AdminSession } from "./admin-auth.js";

const SAFE_AUDIT_ACTIONS = new Set([
  "admin.session_created",
  "admin.session_revoked",
  "admin.reauthenticated",
  "admin.role_granted",
  "admin.role_revoked",
  "feature_flag.updated",
  "moderation.status_changed",
]);

export type AuditResult = "success" | "denied" | "failed";

function digestReference(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

function boundedMetadata(
  value: Record<string, string | number | boolean | null | undefined>,
) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [
        key.slice(0, 48),
        typeof item === "string" ? item.slice(0, 160) : item,
      ]),
  );
}

export async function writeAdminAudit(input: {
  session?: AdminSession;
  actorPrincipalId?: string | null;
  action: string;
  targetType?: string;
  targetReference?: string;
  result: AuditResult;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  requestId?: string;
}): Promise<void> {
  if (!SAFE_AUDIT_ACTIONS.has(input.action)) {
    throw new Error(
      "Attempted to write an unapproved administrative audit action",
    );
  }
  const actor = input.session?.principal.id ?? input.actorPrincipalId ?? null;
  await pool.query(
    `INSERT INTO calora_admin_audit_events
       (actor_principal_id, action, target_type, target_reference, result, request_id, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      actor,
      input.action,
      input.targetType?.slice(0, 64) ?? null,
      input.targetReference ? digestReference(input.targetReference) : null,
      input.result,
      input.requestId?.slice(0, 120) ?? null,
      JSON.stringify(boundedMetadata(input.metadata ?? {})),
    ],
  );
}

export type AdminPrincipalListRow = {
  id: string;
  displayName: string;
  role: AdminRole;
  createdAt: string;
  active: boolean;
};

export async function listAdminPrincipals(): Promise<AdminPrincipalListRow[]> {
  const result = await pool.query<{
    id: string;
    display_name: string;
    role: AdminRole;
    created_at: Date;
    revoked_at: Date | null;
  }>(
    `SELECT id, display_name, role, created_at, revoked_at
       FROM calora_admin_principals
      ORDER BY revoked_at NULLS FIRST, created_at ASC
      LIMIT 100`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    active: row.revoked_at === null,
  }));
}

export async function grantAdminRole(input: {
  actor: AdminSession;
  externalUserId: string;
  displayName: string;
  role: AdminRole;
  reason: string;
}): Promise<AdminPrincipal | null> {
  const result = await pool.query<{
    id: string;
    external_user_id: string;
    display_name: string;
    role: AdminRole;
  }>(
    `INSERT INTO calora_admin_principals
       (external_user_id, display_name, role, granted_by_principal_id, grant_reason)
     VALUES ($1, $2, $3, $4::uuid, $5)
     ON CONFLICT (external_user_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           role = EXCLUDED.role,
           granted_by_principal_id = EXCLUDED.granted_by_principal_id,
           grant_reason = EXCLUDED.grant_reason,
           revoked_at = NULL,
           revoked_by_principal_id = NULL,
           updated_at = now()
     RETURNING id, external_user_id, display_name, role`,
    [
      input.externalUserId,
      input.displayName,
      input.role,
      input.actor.principal.id,
      input.reason,
    ],
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        externalUserId: row.external_user_id,
        displayName: row.display_name,
        role: row.role,
      }
    : null;
}

export async function revokeAdminPrincipal(input: {
  actor: AdminSession;
  principalId: string;
  reason: string;
}): Promise<"revoked" | "not_found" | "last_owner" | "self"> {
  if (input.principalId === input.actor.principal.id) return "self";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      role: AdminRole;
      revoked_at: Date | null;
    }>(
      `SELECT role, revoked_at
         FROM calora_admin_principals
        WHERE id = $1::uuid
        FOR UPDATE`,
      [input.principalId],
    );
    const target = current.rows[0];
    if (!target || target.revoked_at) {
      await client.query("ROLLBACK");
      return "not_found";
    }
    if (target.role === "owner") {
      const owners = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM calora_admin_principals
          WHERE role = 'owner' AND revoked_at IS NULL`,
      );
      if (Number(owners.rows[0]?.count ?? "0") <= 1) {
        await client.query("ROLLBACK");
        return "last_owner";
      }
    }
    await client.query(
      `UPDATE calora_admin_principals
          SET revoked_at = now(),
              revoked_by_principal_id = $2::uuid,
              revocation_reason = $3,
              updated_at = now()
        WHERE id = $1::uuid`,
      [input.principalId, input.actor.principal.id, input.reason],
    );
    await client.query(
      `UPDATE calora_admin_sessions
          SET revoked_at = now()
        WHERE principal_id = $1::uuid AND revoked_at IS NULL`,
      [input.principalId],
    );
    await client.query("COMMIT");
    return "revoked";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
