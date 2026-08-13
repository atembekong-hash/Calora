
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pzdulhkpwbrbrgskwwwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-3cvYunhb4ov7hJej3DAzg_WadMe74u';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Real Supabase Auth Simulation', () => {
  it('should attempt to sign in and report the exact error from Supabase', async () => {
    // We use a non-existent code to trigger the exchange logic
    // This will tell us if the server is reachable and how it responds to invalid data
    const fakeUrl = 'caloraapp://auth/callback?code=12345678-1234-1234-1234-123456789012';
    
    console.log('--- Starting Supabase Exchange Simulation ---');
    console.log('URL:', SUPABASE_URL);
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(fakeUrl);
      
      if (error) {
        console.log('Supabase Error Code:', error.status);
        console.log('Supabase Error Message:', error.message);
      } else {
        console.log('Unexpected Success with fake code:', data);
      }
    } catch (err) {
      console.log('Fatal Script Error:', err);
    }
    console.log('--- Simulation Finished ---');
  });
});
