
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearSettledOAuthCodeExchanges,
  getGoogleOAuthRedirectUri,
  handleOAuthCallbackUrl,
  isValidEmail,
  OAUTH_REDIRECT_URI,
  signInWithGoogle,
  WEB_OAUTH_CALLBACK_URI,
} from '../auth';

// Mock Supabase
const mockExchange = vi.fn();
const mockSetSession = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithOAuth = vi.fn();
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (url: string) => mockExchange(url),
      setSession: (session: { access_token: string; refresh_token: string }) => mockSetSession(session),
      getSession: () => mockGetSession(),
      signInWithOAuth: (options: unknown) => mockSignInWithOAuth(options),
      storage: {
        setItem: vi.fn(),
        getItem: vi.fn(),
      }
    }
  },
  SUPABASE_STORAGE_KEY: 'test-key'
}));

// Mock Expo modules
const mockOpenAuthSessionAsync = vi.fn();
vi.mock('expo-web-browser', () => ({
  warmUpAsync: vi.fn(),
  coolDownAsync: vi.fn(),
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSessionAsync(...args),
}));

vi.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid',
  digestStringAsync: vi.fn(async (_algorithm: string, value: string) => `digest:${value}`),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('Auth Logic Verification', () => {
  beforeEach(() => {
    clearSettledOAuthCodeExchanges();
    vi.clearAllMocks();
  });

  it('selects the dedicated web callback without changing the native HTTPS app-link callback', () => {
    expect(getGoogleOAuthRedirectUri('web')).toBe(WEB_OAUTH_CALLBACK_URI);
    expect(getGoogleOAuthRedirectUri('ios')).toBe(OAUTH_REDIRECT_URI);
    expect(getGoogleOAuthRedirectUri('android')).toBe(OAUTH_REDIRECT_URI);
  });

  it('requests and completes Google OAuth on the matching platform callback', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.example/authorize' }, error: null });
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

    await signInWithGoogle(undefined, 'web');
    expect(mockSignInWithOAuth).toHaveBeenLastCalledWith({
      provider: 'google',
      options: { redirectTo: WEB_OAUTH_CALLBACK_URI, skipBrowserRedirect: true },
    });
    expect(mockOpenAuthSessionAsync).toHaveBeenLastCalledWith(
      'https://provider.example/authorize',
      WEB_OAUTH_CALLBACK_URI,
    );

    await signInWithGoogle(undefined, 'android');
    expect(mockSignInWithOAuth).toHaveBeenLastCalledWith({
      provider: 'google',
      options: { redirectTo: OAUTH_REDIRECT_URI, skipBrowserRedirect: true },
    });
    expect(mockOpenAuthSessionAsync).toHaveBeenLastCalledWith(
      'https://provider.example/authorize',
      OAUTH_REDIRECT_URI,
    );
  });

  it('should handle PKCE flow (Google) correctly', async () => {
    const pkceUrl = 'https://mycaloraapp.com/auth/callback?code=test-code';
    mockExchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(pkceUrl);

    expect(result.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledWith('test-code');
  });

  it('accepts the exact dedicated production web callback', async () => {
    mockExchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(
      'https://app.mycaloraapp.com/auth/callback?code=web-code',
    );

    expect(result.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledWith('web-code');
  });

  it('shares one PKCE exchange across concurrent WebBrowser and Router callbacks', async () => {
    let resolveExchange!: (value: unknown) => void;
    mockExchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));

    const browserResult = handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=shared-code');
    const routerResult = handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=shared-code&source=router');

    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(1));
    resolveExchange({ data: { session: { user: { id: 'qa-user' } } }, error: null });

    const [fromBrowser, fromRouter] = await Promise.all([browserResult, routerResult]);
    expect(fromBrowser.success).toBe(true);
    expect(fromRouter).toEqual(fromBrowser);
  });

  it('returns explicit recovery intent from an exact trusted callback without listener timing', async () => {
    mockExchange.mockResolvedValue({ data: { session: { user: { id: 'recovering-user' } } }, error: null });

    const result = await handleOAuthCallbackUrl(
      'https://mycaloraapp.com/auth/callback?code=recovery-code&type=recovery',
    );

    expect(result).toMatchObject({ success: true, callbackIntent: 'recovery' });
  });

  it('coalesces duplicate recovery callback delivery into the same explicit intent', async () => {
    let resolveExchange!: (value: unknown) => void;
    mockExchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));

    const browserResult = handleOAuthCallbackUrl(
      'https://mycaloraapp.com/auth/callback?code=shared-recovery-code&type=recovery',
    );
    const routerResult = handleOAuthCallbackUrl(
      'https://mycaloraapp.com/auth/callback?code=shared-recovery-code&type=recovery&source=router',
    );

    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(1));
    resolveExchange({ data: { session: { user: { id: 'recovering-user' } } }, error: null });

    await expect(Promise.all([browserResult, routerResult])).resolves.toEqual([
      expect.objectContaining({ success: true, callbackIntent: 'recovery' }),
      expect.objectContaining({ success: true, callbackIntent: 'recovery' }),
    ]);
  });

  it('does not let mixed duplicate delivery race recovery to Home', async () => {
    let resolveExchange!: (value: unknown) => void;
    mockExchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));

    const browserResult = handleOAuthCallbackUrl(
      'https://mycaloraapp.com/auth/callback?code=mixed-intent-code',
    );
    const routerResult = handleOAuthCallbackUrl(
      'https://mycaloraapp.com/auth/callback?code=mixed-intent-code&type=recovery',
    );

    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(1));
    resolveExchange({ data: { session: { user: { id: 'recovering-user' } } }, error: null });

    await expect(Promise.all([browserResult, routerResult])).resolves.toEqual([
      expect.objectContaining({ success: true, callbackIntent: 'recovery' }),
      expect.objectContaining({ success: true, callbackIntent: 'recovery' }),
    ]);
  });

  it('reuses a settled PKCE result for a duplicate callback within the safety window', async () => {
    const session = { user: { id: 'qa-user' } };
    mockExchange.mockResolvedValue({ data: { session }, error: null });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    const callbackUrl = 'https://mycaloraapp.com/auth/callback?code=settled-code';

    const first = await handleOAuthCallbackUrl(callbackUrl);
    const duplicate = await handleOAuthCallbackUrl(callbackUrl);

    expect(first.success).toBe(true);
    expect(duplicate).toEqual(first);
    expect(mockExchange).toHaveBeenCalledTimes(1);
  });

  it('removes failed exchanges so a legitimate retry can proceed', async () => {
    mockExchange
      .mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'PKCE code verifier not found in storage.' },
      })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'qa-user' } } }, error: null });

    const failed = await handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=missing-verifier-code');
    const retry = await handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=missing-verifier-code');

    expect(failed.success).toBe(false);
    expect(retry.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledTimes(2);
  });

  it('does not expire a pending exchange or duplicate it after the success TTL', async () => {
    vi.useFakeTimers();
    let resolveExchange!: (value: unknown) => void;
    mockExchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));

    const first = handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=long-pending-code');
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(61_000);
    const duplicate = handleOAuthCallbackUrl('https://mycaloraapp.com/auth/callback?code=long-pending-code');
    await Promise.resolve();
    await Promise.resolve();

    expect(mockExchange).toHaveBeenCalledTimes(1);
    resolveExchange({ data: { session: { user: { id: 'qa-user' } } }, error: null });
    const results = await Promise.all([first, duplicate]);
    expect(results.every((result) => result.success)).toBe(true);
    vi.useRealTimers();
  });

  it('evicts a settled success after the replay window', async () => {
    vi.useFakeTimers();
    const session = { user: { id: 'qa-user' } };
    mockExchange.mockResolvedValue({ data: { session }, error: null });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    const callbackUrl = 'https://mycaloraapp.com/auth/callback?code=expired-success-code';

    const first = await handleOAuthCallbackUrl(callbackUrl);
    await vi.advanceTimersByTimeAsync(60_000);
    const afterExpiry = await handleOAuthCallbackUrl(callbackUrl);

    expect(first.success).toBe(true);
    expect(afterExpiry.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('fails a settled replay when the active session belongs to another account', async () => {
    const originalSession = { user: { id: 'qa-user' } };
    mockExchange.mockResolvedValue({ data: { session: originalSession }, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'different-user' } } },
      error: null,
    });
    const callbackUrl = 'https://mycaloraapp.com/auth/callback?code=account-switch-code';

    const first = await handleOAuthCallbackUrl(callbackUrl);
    const staleReplay = await handleOAuthCallbackUrl(callbackUrl);

    expect(first.success).toBe(true);
    expect(staleReplay.success).toBe(false);
    expect(mockExchange).toHaveBeenCalledTimes(1);
  });

  it('bounds simultaneous unique PKCE exchanges', async () => {
    mockExchange.mockImplementation(() => new Promise(() => undefined));

    const attempts = Array.from({ length: 9 }, (_, index) =>
      handleOAuthCallbackUrl(`https://mycaloraapp.com/auth/callback?code=capacity-code-${index}`),
    );
    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(8));
    const ninth = await attempts[8];
    expect(ninth.success).toBe(false);
  });

  it('should handle Implicit flow (Email) correctly', async () => {
    const emailUrl = 'https://mycaloraapp.com/auth/callback#access_token=test-token&refresh_token=test-refresh';
    mockSetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(emailUrl);

    expect(result.success).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'test-token', refresh_token: 'test-refresh' });
  });

  it('should handle provider errors correctly', async () => {
    const errorUrl = 'https://mycaloraapp.com/auth/callback?error=access_denied&error_description=raw-provider-detail-token-should-not-render';
    
    const result = await handleOAuthCallbackUrl(errorUrl);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('provider');
      expect(result.error.message).toBe('Unable to connect to the sign-in provider. Please try again.');
      expect(result.error.message).not.toContain('raw-provider-detail-token-should-not-render');
    }
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('rejects callbacks from an untrusted origin before consuming credentials', async () => {
    const result = await handleOAuthCallbackUrl(
      'https://attacker.example/auth/callback#access_token=attacker-token&refresh_token=attacker-refresh',
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('token');
    expect(mockExchange).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('rejects production-host lookalikes and wrong callback paths', async () => {
    for (const url of [
      'https://app.mycaloraapp.com.attacker.example/auth/callback?code=lookalike',
      'https://app.mycaloraapp.com/auth/callback/extra?code=wrong-path',
      'http://app.mycaloraapp.com/auth/callback?code=insecure',
    ]) {
      const result = await handleOAuthCallbackUrl(url);
      expect(result.success).toBe(false);
    }
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('rejects the legacy custom-scheme callback before consuming credentials', async () => {
    const result = await handleOAuthCallbackUrl(
      'caloraapp://auth/callback#access_token=legacy-token&refresh_token=legacy-refresh',
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('token');
    expect(mockExchange).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('rejects structurally malformed form email addresses before sign-in', () => {
    for (const value of ['user@', '@example.com', 'user @example.com', 'user@example', '']) {
      expect(isValidEmail(value)).toBe(false);
    }
    expect(isValidEmail('person@example.com')).toBe(true);
  });
});
