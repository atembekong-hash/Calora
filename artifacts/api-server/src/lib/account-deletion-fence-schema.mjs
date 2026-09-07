/**
 * Runtime schema for the sanitized account-deletion fence signal.
 *
 * This module is intentionally JavaScript so the API build and the standalone
 * monitor execute the same validator rather than maintaining parallel rules.
 *
 * ## Schema compatibility policy
 *
 * The monitor accepts only these sanitized signal revisions:
 * - legacy v0 records, which have no `schemaVersion` field; and
 * - the current explicitly tagged v1 record.
 *
 * New revisions must receive an explicit compatibility decision here before
 * they can be emitted or monitored. An unknown, non-string, or otherwise
 * unsafe `schemaVersion` fails closed rather than being interpreted as a
 * legacy record. Parsed signals retain only these allowlisted fields.
 */
export const ACCOUNT_DELETION_FENCE_ERROR_CLASS = "account_deletion_fence";
export const ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION =
  "calora.account-deletion-fence-signal.v1";
export const ACCOUNT_DELETION_FENCE_SUPPORTED_SIGNAL_SCHEMA_VERSIONS =
  Object.freeze([undefined, ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION]);
export const ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH = 200;
export const ACCOUNT_DELETION_FENCE_MAX_COUNT = 1_000_000;
export const ACCOUNT_DELETION_FENCE_ROUTE_PATTERN = /^\/[A-Za-z0-9._:/-]+$/;

export function isSupportedAccountDeletionFenceSignalSchemaVersion(value) {
  return ACCOUNT_DELETION_FENCE_SUPPORTED_SIGNAL_SCHEMA_VERSIONS.includes(value);
}

export function isAccountDeletionFenceRoute(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH &&
    ACCOUNT_DELETION_FENCE_ROUTE_PATTERN.test(value)
  );
}

export function isPositiveAccountDeletionFenceCount(value) {
  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= ACCOUNT_DELETION_FENCE_MAX_COUNT
  );
}

/**
 * Parse and sanitize an unknown value as a deletion-fence signal.
 *
 * Returning null for both an unrelated record and a malformed signal keeps
 * callers from accidentally treating partial structured data as trusted.
 */
export function parseAccountDeletionFenceSignal(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value;
  if (record.errorClass !== ACCOUNT_DELETION_FENCE_ERROR_CLASS) {
    return null;
  }
  if (
    !isSupportedAccountDeletionFenceSignalSchemaVersion(record.schemaVersion) ||
    !isAccountDeletionFenceRoute(record.route) ||
    !isPositiveAccountDeletionFenceCount(record.count)
  ) {
    return null;
  }

  return {
    ...(record.schemaVersion === ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION
      ? { schemaVersion: ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION }
      : {}),
    errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
    route: record.route,
    count: record.count,
  };
}

export function createAccountDeletionFenceSignal(route, count = 1) {
  const signal = {
    schemaVersion: ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION,
    errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
    route,
    count,
  };
  if (parseAccountDeletionFenceSignal(signal) === null) {
    throw new Error("Invalid account-deletion fence signal.");
  }
  return signal;
}