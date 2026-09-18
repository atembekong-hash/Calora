export const ACCOUNT_DELETION_FENCE_ERROR_CLASS: "account_deletion_fence";
export const ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION: "calora.account-deletion-fence-signal.v1";
export const ACCOUNT_DELETION_FENCE_SUPPORTED_SIGNAL_SCHEMA_VERSIONS: readonly [
  undefined,
  typeof ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION,
];
export const ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH: 200;
export const ACCOUNT_DELETION_FENCE_MAX_COUNT: 1_000_000;
export const ACCOUNT_DELETION_FENCE_ROUTE_PATTERN: RegExp;

export interface AccountDeletionFenceSignal {
  /** Absent only for supported legacy v0 signals. */
  schemaVersion?: typeof ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION;
  errorClass: typeof ACCOUNT_DELETION_FENCE_ERROR_CLASS;
  route: string;
  count: number;
}

export function isSupportedAccountDeletionFenceSignalSchemaVersion(
  value: unknown,
): value is
  | undefined
  | typeof ACCOUNT_DELETION_FENCE_SIGNAL_SCHEMA_VERSION;
export function isAccountDeletionFenceRoute(value: unknown): value is string;
export function isPositiveAccountDeletionFenceCount(
  value: unknown,
): value is number;
export function parseAccountDeletionFenceSignal(
  value: unknown,
): AccountDeletionFenceSignal | null;
export function createAccountDeletionFenceSignal(
  route: string,
  count?: number,
): AccountDeletionFenceSignal;