
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOAuthCallbackUrl, isValidEmail } from '../auth';

// Mock Supabase
const mockExchange = vi.fn();
const mockSetSession = vi.fn();
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (url: string) => mockExchange(url),
      setSession: (session: { access_token: string; refresh_token: string }) => mockSetSession(session),
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
  digestStringAsync: vi.fn(),
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
    vi.clearAllMocks();
  });

  it('should handle PKCE flow (Google) correctly', async () => {
    const pkceUrl = 'caloraapp://auth/callback?code=test-code';
    mockExchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(pkceUrl);

    expect(result.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledWith('test-code');
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

  it('rejects structurally malformed form email addresses before sign-in', () => {
    for (const value of ['user@', '@example.com', 'user @example.com', 'user@example', '']) {
      expect(isValidEmail(value)).toBe(false);
    }
    expect(isValidEmail('person@example.com')).toBe(true);
  });
});
