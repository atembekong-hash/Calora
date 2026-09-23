import type { AuthErrorCode } from './auth';

export type SafeAuthErrorCode = Exclude<AuthErrorCode, 'cancelled'>;

export type OAuthCallbackRoute =
  | { pathname: '/auth/sign-in' }
  | { pathname: '/auth/sign-in'; params: { authError: SafeAuthErrorCode } };

const SAFE_ERROR_CODES: readonly SafeAuthErrorCode[] = [
  'network',
  'provider',
  'token',
  'unknown',
  'invalid_credentials',
  'verify_email',
  'expired',
];

const ERROR_MESSAGES: Record<SafeAuthErrorCode, string> = {
  network: 'We could not reach the sign-in service. Check your connection and try again.',
  provider: 'Sign-in could not be completed. Please try again.',
  token: 'This sign-in link is no longer valid. Please try again.',
  unknown: 'Sign-in could not be completed. Please try again.',
  invalid_credentials: 'Your sign-in details were not accepted. Please try again.',
  verify_email: 'Please verify your email before signing in.',
  expired: 'This sign-in link has expired. Please request a new one.',
};

export function normalizeAuthErrorCode(value: unknown): SafeAuthErrorCode {
  return SAFE_ERROR_CODES.includes(value as SafeAuthErrorCode)
    ? (value as SafeAuthErrorCode)
    : 'unknown';
}

export function getSafeAuthErrorMessage(value: unknown): string {
  return ERROR_MESSAGES[normalizeAuthErrorCode(value)];
}

/**
 * The callback route transports only a small allowlisted category. It never
 * serializes provider messages, callback URLs, query parameters, or tokens.
 */
export function routeForOAuthCallbackError(value: unknown): OAuthCallbackRoute {
  if (value === 'cancelled') return { pathname: '/auth/sign-in' };
  return {
    pathname: '/auth/sign-in',
    params: { authError: normalizeAuthErrorCode(value) },
  };
}
