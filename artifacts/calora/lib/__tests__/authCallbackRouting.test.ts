import { describe, expect, it } from 'vitest';
import {
  getSafeAuthErrorMessage,
  normalizeAuthErrorCode,
  routeForOAuthCallbackError,
} from '../auth-callback-routing';

describe('OAuth callback routing policy', () => {
  it('keeps cancellation distinct and does not carry an error parameter', () => {
    expect(routeForOAuthCallbackError('cancelled')).toEqual({
      pathname: '/auth/sign-in',
    });
  });

  it('routes known non-cancellation categories to the sign-in consumer only', () => {
    for (const code of ['network', 'provider', 'token', 'expired', 'verify_email'] as const) {
      expect(routeForOAuthCallbackError(code)).toEqual({
        pathname: '/auth/sign-in',
        params: { authError: code },
      });
    }
  });

  it('normalizes unknown or hostile values without serializing callback data', () => {
    const hostileValue = 'provider?error_description=secret&access_token=token-value#fragment';
    expect(normalizeAuthErrorCode(hostileValue)).toBe('unknown');
    expect(routeForOAuthCallbackError(hostileValue)).toEqual({
      pathname: '/auth/sign-in',
      params: { authError: 'unknown' },
    });
    expect(JSON.stringify(routeForOAuthCallbackError(hostileValue))).not.toContain('token-value');
    expect(getSafeAuthErrorMessage(hostileValue)).toBe(
      'Sign-in could not be completed. Please try again.',
    );
  });

  it('uses fixed local messages rather than rendering a deep-link parameter', () => {
    expect(getSafeAuthErrorMessage('token')).toBe(
      'This sign-in link is no longer valid. Please try again.',
    );
    expect(getSafeAuthErrorMessage('https://attacker.example/?error=raw')).toBe(
      'Sign-in could not be completed. Please try again.',
    );
  });
});
