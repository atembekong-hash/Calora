/**
 * Client-side selection of the diary log that can anchor the referral
 * first-log sync.
 *
 * Only logs carrying an explicit server-issued capture session id (a UUID
 * persisted by the API at analyze time) are eligible — manual, search,
 * recipe, and planner logs never qualify, and neither do capture logs from
 * anonymous sessions (their session ids are local fallbacks, not UUIDs).
 * The whole diary is searched so earlier non-qualifying logs never shadow a
 * later capture-backed one.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isServerCaptureSessionId(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function findCaptureBackedLog<T extends { captureSessionId?: string }>(logs: T[]): T | undefined {
  return logs.find((log) => isServerCaptureSessionId(log.captureSessionId));
}
