#!/usr/bin/env node
/**
 * Deliberate, one-time administrator bootstrap for Calora.
 *
 * Runs only from a trusted operator shell with a migration-capable connection.
 * It never creates a Supabase account, never accepts a password, and refuses
 * once any active administrator exists. Subsequent role grants use the audited
 * Owner-only console workflow.
 *
 * Required secure environment:
 *   MIGRATION_DATABASE_URL
 *   ADMIN_BOOTSTRAP_EXTERNAL_USER_ID
 *
 * Usage:
 *   pnpm exec node scripts/provision-admin-principal.mjs \
 *     --display-name <operator-name> \
 *     --confirm-admin-bootstrap
 */
import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(`[admin-bootstrap] ${message}`);
  process.exitCode = 1;
}

const displayName = argument("--display-name");
const externalUserId = process.env.ADMIN_BOOTSTRAP_EXTERNAL_USER_ID?.trim();
const connectionString = process.env.MIGRATION_DATABASE_URL;
const confirmed = process.argv.includes("--confirm-admin-bootstrap");

if (!connectionString || !externalUserId || !displayName || !confirmed) {
  fail(
    "requires MIGRATION_DATABASE_URL, ADMIN_BOOTSTRAP_EXTERNAL_USER_ID, --display-name, and --confirm-admin-bootstrap",
  );
} else if (
  externalUserId.length > 128 ||
  displayName.length < 1 ||
  displayName.length > 80
) {
  fail("invalid bootstrap input");
} else {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('calora-admin-bootstrap', 0))",
    );
    const active = await client.query(
      "SELECT count(*)::text AS count FROM calora_admin_principals WHERE revoked_at IS NULL",
    );
    if (Number(active.rows[0]?.count ?? "0") !== 0) {
      throw new Error(
        "refusing bootstrap because an active administrator already exists",
      );
    }
    const inserted = await client.query(
      `INSERT INTO calora_admin_principals
         (external_user_id, display_name, role, grant_reason)
       VALUES ($1, $2, 'owner', 'bootstrap')
       RETURNING id`,
      [externalUserId, displayName],
    );
    const principalId = inserted.rows[0]?.id;
    if (!principalId) throw new Error("unable to create first administrator");
    await client.query(
      `INSERT INTO calora_admin_audit_events
         (action, target_type, target_reference, result, metadata)
       VALUES ('admin.role_granted', 'admin_principal', $1, 'success', $2::jsonb)`,
      [
        createHash("sha256")
          .update(externalUserId, "utf8")
          .digest("hex")
          .slice(0, 16),
        JSON.stringify({ role: "owner", method: "one_time_bootstrap" }),
      ],
    );
    await client.query("COMMIT");
    console.info(
      "[admin-bootstrap] first administrator provisioned; remove the bootstrap identity configuration",
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    fail(error instanceof Error ? error.message : "bootstrap failed");
  } finally {
    client.release();
    await pool.end();
  }
}
