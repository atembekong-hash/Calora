export const ACCOUNT_DELETION_FENCE_ERROR_CLASS: "account_deletion_fence";
export const ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH: 200;
export const ACCOUNT_DELETION_FENCE_MAX_COUNT: 1_000_000;
export const ACCOUNT_DELETION_FENCE_ROUTE_PATTERN: RegExp;

export interface AccountDeletionFenceSignal {
  errorClass: typeof ACCOUNT_DELETION_FENCE_ERROR_CLASS;
  route: string;
  count: number;
}

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