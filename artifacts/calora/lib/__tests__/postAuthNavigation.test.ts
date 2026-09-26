import { describe, expect, it, vi } from 'vitest';
import {
  createPostAuthNavigationCoordinator,
  getPostAuthNavigationPlan,
  resolvePostAuthIntent,
} from '../postAuthNavigation';

describe('post-auth navigation policy', () => {
  it('replaces completed ordinary authentication with Home while retaining a future recovery callback entry point', () => {
    expect(getPostAuthNavigationPlan({
      restoreStatus: 'ready',
      hasSession: true,
      intent: 'ordinary',
      applicationReady: true,
    })).toEqual({
      authRoutesEnabled: true,
      destination: '/(tabs)',
    });
  });

  it('holds a callback session until its shared terminal intent is known', () => {
    expect(getPostAuthNavigationPlan({
      restoreStatus: 'ready',
      hasSession: true,
      intent: 'pending',
      applicationReady: true,
    })).toEqual({
      authRoutesEnabled: true,
      destination: null,
    });
  });

  it('keeps recovery in the narrowly scoped reset route until the password is changed', () => {
    expect(getPostAuthNavigationPlan({
      restoreStatus: 'ready',
      hasSession: true,
      intent: 'recovery',
      applicationReady: true,
    })).toEqual({
      authRoutesEnabled: true,
      destination: '/auth/reset-password',
    });
  });

  it('routes an ordinary-looking PKCE callback to password reset when Supabase confirms recovery', () => {
    // Supabase emits PASSWORD_RECOVERY but does not retain type=recovery in
    // the final code redirect. The event is therefore the trusted recovery
    // signal and must override the ordinary callback classification.
    expect(resolvePostAuthIntent({
      callbackRouteIsActive: true,
      isPasswordRecovery: true,
      postAuthIntent: 'ordinary',
    })).toBe('recovery');
  });

  it('holds a callback with no terminal signal pending instead of navigating early', () => {
    expect(resolvePostAuthIntent({
      callbackRouteIsActive: true,
      isPasswordRecovery: false,
      postAuthIntent: 'none',
    })).toBe('pending');
  });

  it('does not turn a failed encrypted restore into guest navigation', () => {
    expect(getPostAuthNavigationPlan({
      restoreStatus: 'failed',
      hasSession: false,
      intent: 'none',
      applicationReady: false,
    })).toEqual({
      authRoutesEnabled: true,
      destination: null,
    });
  });

  it('prunes stack history and executes only one Home transition for duplicate callback delivery', () => {
    const router = { dismissAll: vi.fn(), replace: vi.fn() };
    const coordinator = createPostAuthNavigationCoordinator(router);
    const plan = getPostAuthNavigationPlan({
      restoreStatus: 'ready',
      hasSession: true,
      intent: 'ordinary',
      applicationReady: true,
    });

    expect(coordinator.transition({ sessionId: 'user-a', intent: 'ordinary', plan })).toBe(true);
    // Browser and associated-link Router delivery report the same settled intent.
    expect(coordinator.transition({ sessionId: 'user-a', intent: 'ordinary', plan })).toBe(false);

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
