import { pool } from "@workspace/db";

export const ADMIN_MANAGED_FEATURE_FLAGS = {
  coach_report_intake: {
    label: "Coach report intake",
    description:
      "Allows users to submit privacy-minimized Coach feedback for the moderation queue.",
    defaultEnabled: true,
  },
} as const;

export type AdminManagedFeatureFlag = keyof typeof ADMIN_MANAGED_FEATURE_FLAGS;

function isManagedFeatureFlag(value: string): value is AdminManagedFeatureFlag {
  return Object.prototype.hasOwnProperty.call(
    ADMIN_MANAGED_FEATURE_FLAGS,
    value,
  );
}

function enabledValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "enabled" in value &&
    typeof (value as { enabled?: unknown }).enabled === "boolean"
  ) {
    return (value as { enabled: boolean }).enabled;
  }
  return fallback;
}

export async function listManagedFeatureFlags(): Promise<
  Array<{
    key: AdminManagedFeatureFlag;
    label: string;
    description: string;
    enabled: boolean;
  }>
> {
  const keys = Object.keys(
    ADMIN_MANAGED_FEATURE_FLAGS,
  ) as AdminManagedFeatureFlag[];
  const result = await pool.query<{ key: string; value: unknown }>(
    "SELECT key, value FROM calora_server_config WHERE key = ANY($1::text[])",
    [keys],
  );
  const stored = new Map(result.rows.map((row) => [row.key, row.value]));
  return keys.map((key) => {
    const definition = ADMIN_MANAGED_FEATURE_FLAGS[key];
    return {
      key,
      label: definition.label,
      description: definition.description,
      enabled: enabledValue(stored.get(key), definition.defaultEnabled),
    };
  });
}

export async function setManagedFeatureFlag(
  key: string,
  enabled: boolean,
): Promise<AdminManagedFeatureFlag | null> {
  if (!isManagedFeatureFlag(key)) return null;
  await pool.query(
    `INSERT INTO calora_server_config (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = now()`,
    [key, JSON.stringify({ enabled })],
  );
  return key;
}

/**
 * Report intake is intentionally fail-open if the configuration store is
 * temporarily unavailable: reporting an unsafe response must not be blocked
 * by an observability/configuration outage. Explicit Owner-managed false is
 * still honored whenever the store is readable.
 */
export async function isCoachReportIntakeEnabled(): Promise<boolean> {
  try {
    const flags = await listManagedFeatureFlags();
    return (
      flags.find((flag) => flag.key === "coach_report_intake")?.enabled ?? true
    );
  } catch {
    return true;
  }
}
