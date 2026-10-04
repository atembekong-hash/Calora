import { describe, expect, it, vi } from 'vitest';
import { recoverFromNotFoundRoute } from '../notFoundRecovery';

describe('recoverFromNotFoundRoute', () => {
  it('uses a document replacement for an unmatched web route', () => {
    const router = { replace: vi.fn() };
    const webLocation = { replace: vi.fn() };

    expect(recoverFromNotFoundRoute({
      platform: 'web',
      router,
      webLocation,
    })).toBe('web-location');

    expect(webLocation.replace).toHaveBeenCalledOnce();
    expect(webLocation.replace).toHaveBeenCalledWith('/');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps the in-app router recovery for native platforms', () => {
    const router = { replace: vi.fn() };
    const webLocation = { replace: vi.fn() };

    expect(recoverFromNotFoundRoute({
      platform: 'ios',
      router,
      webLocation,
    })).toBe('router');

    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(webLocation.replace).not.toHaveBeenCalled();
  });

  it('falls back to the in-app router when web location is unavailable', () => {
    const router = { replace: vi.fn() };

    expect(recoverFromNotFoundRoute({
      platform: 'web',
      router,
      webLocation: null,
    })).toBe('router');

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
