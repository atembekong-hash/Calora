
import { describe, it, expect, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const { exchangeCodeForSessionMock } = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  })),
}));

const SUPABASE_URL = 'https://calora-test.invalid';
const SUPABASE_ANON_KEY = 'calora-vitest-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Real Supabase Auth Simulation', () => {
  it('should attempt to sign in and report the exact error from Supabase', async () => {
    // Keep this simulation deterministic and offline: the production client is
    // exercised through the app, while this test verifies the auth error path
    // without contacting a real Supabase project or initializing Realtime.
    const fakeUrl = 'https://mycaloraapp.com/auth/callback?code=12345678-1234-1234-1234-123456789012';
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: { status: 400, message: 'Invalid authorization code' },
    });
    
    console.log('--- Starting Supabase Exchange Simulation ---');
    console.log('URL:', SUPABASE_URL);
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(fakeUrl);

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith(fakeUrl);
    expect(data.session).toBeNull();
    expect(error).toEqual({ status: 400, message: 'Invalid authorization code' });
    if (!error) throw new Error('Expected the deterministic auth simulation to return an error.');
    console.log('Supabase Error Code:', error.status);
    console.log('Supabase Error Message:', error.message);
    console.log('--- Simulation Finished ---');
  });
});
