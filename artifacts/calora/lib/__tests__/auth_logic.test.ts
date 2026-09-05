
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearSettledOAuthCodeExchanges, handleOAuthCallbackUrl, isValidEmail } from '../auth';

// Mock Supabase
const mockExchange = vi.fn();
const mockSetSession = vi.fn();
const mockGetSession = vi.fn();
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (url: string) => mockExchange(url),
      setSession: (session: { access_token: string; refresh_token: string }) => mockSetSession(session),
      getSession: () => mockGetSession(),
      storage: {
        setItem: vi.fn(),
        getItem: vi.fn(),
      }
    }
  },
  SUPABASE_STORAGE_KEY: 'test-key'
}));

// Mock Expo modules
vi.mock('expo-web-browser', () => ({
  warmUpAsync: vi.fn(),
  coolDownAsync: vi.fn(),
  openAuthSessionAsync: vi.fn(),
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

  it('should handle PKCE flow (Google) correctly', async () => {
    const pkceUrl = 'caloraapp://auth/callback?code=test-code';
    mockExchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(pkceUrl);

    expect(result.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledWith('test-code');
  });

  it('shares one PKCE exchange across concurrent WebBrowser and Router callbacks', async () => {
    let resolveExchange!: (value: unknown) => void;
    mockExchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));

    const browserResult = handleOAuthCallbackUrl('caloraapp://auth/callback?code=shared-code');
    const routerResult = handleOAuthCallbackUrl('caloraapp://auth/callback?code=shared-code&source=router');

    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(1));
    resolveExchange({ data: { session: { user: { id: 'qa-user' } } }, error: null });

    const [fromBrowser, fromRouter] = await Promise.all([browserResult, routerResult]);
    expect(fromBrowser.success).toBe(true);
    expect(fromRouter).toEqual(fromBrowser);
  });

  it('reuses a settled PKCE result for a duplicate callback within the safety window', async () => {
    const session = { user: { id: 'qa-user' } };
    mockExchange.mockResolvedValue({ data: { session }, error: null });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    const callbackUrl = 'caloraapp://auth/callback?code=settled-code';

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

    const failed = await handleOAuthCallbackUrl('caloraapp://auth/callback?code=missing-verifier-code');
    const retry = await handleOAuthCallbackUrl('caloraapp://auth/callback?code=missing-verifier-code');

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

    const first = handleOAuthCallbackUrl('caloraapp://auth/callback?code=long-pending-code');
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(61_000);
    const duplicate = handleOAuthCallbackUrl('caloraapp://auth/callback?code=long-pending-code');
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
    const callbackUrl = 'caloraapp://auth/callback?code=expired-success-code';

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
    const callbackUrl = 'caloraapp://auth/callback?code=account-switch-code';

    const first = await handleOAuthCallbackUrl(callbackUrl);
    const staleReplay = await handleOAuthCallbackUrl(callbackUrl);

    expect(first.success).toBe(true);
    expect(staleReplay.success).toBe(false);
    expect(mockExchange).toHaveBeenCalledTimes(1);
  });

  it('bounds simultaneous unique PKCE exchanges', async () => {
    mockExchange.mockImplementation(() => new Promise(() => undefined));

    const attempts = Array.from({ length: 9 }, (_, index) =>
      handleOAuthCallbackUrl(`caloraapp://auth/callback?code=capacity-code-${index}`),
    );
    await vi.waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(8));
    const ninth = await attempts[8];
    expect(ninth.success).toBe(false);
  });

  it('should handle Implicit flow (Email) correctly', async () => {
    const emailUrl = 'caloraapp://auth/callback#access_token=test-token&refresh_token=test-refresh';
    mockSetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(emailUrl);

    expect(result.success).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'test-token', refresh_token: 'test-refresh' });
  });

  it('should handle provider errors correctly', async () => {
    const errorUrl = 'caloraapp://auth/callback?error=access_denied';
    
    const result = await handleOAuthCallbackUrl(errorUrl);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('provider');
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

  it('rejects structurally malformed form email addresses before sign-in', () => {
    for (const value of ['user@', '@example.com', 'user @example.com', 'user@example', '']) {
      expect(isValidEmail(value)).toBe(false);
    }
    expect(isValidEmail('person@example.com')).toBe(true);
  });
});
