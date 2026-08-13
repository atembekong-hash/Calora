
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleOAuthCallbackUrl } from '../auth';

// Mock Supabase
const mockExchange = vi.fn();
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (url: string) => mockExchange(url),
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
    expect(mockExchange).toHaveBeenCalledWith(pkceUrl);
  });

  it('should handle Implicit flow (Email) correctly', async () => {
    const emailUrl = 'caloraapp://auth/callback#access_token=test-token&refresh_token=test-refresh';
    mockExchange.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    const result = await handleOAuthCallbackUrl(emailUrl);

    expect(result.success).toBe(true);
    expect(mockExchange).toHaveBeenCalledWith(emailUrl);
  });

  it('should handle provider errors correctly', async () => {
    const errorUrl = 'caloraapp://auth/callback?error=access_denied';
    
    const result = await handleOAuthCallbackUrl(errorUrl);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('cancelled');
    }
    expect(mockExchange).not.toHaveBeenCalled();
  });
});
