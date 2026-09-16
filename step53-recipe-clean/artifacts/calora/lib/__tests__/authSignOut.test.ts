import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOutMock = vi.hoisted(() => vi.fn());

vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: vi.fn(),
}));

vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn(),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signOut: signOutMock,
    },
  },
}));

import { signOut } from '../auth';

describe('signOut', () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it('clears only the current device session', async () => {
    signOutMock.mockResolvedValueOnce({ error: null });

    await expect(signOut()).resolves.toEqual({ error: null });
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
  });
});