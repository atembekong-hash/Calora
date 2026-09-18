import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetRevenueCatIdentityTransitions,
  synchronizeRevenueCatIdentity,
  type RevenueCatIdentityApi,
} from '../revenuecatIdentity';

function makeApi(): RevenueCatIdentityApi {
  return {
    logIn: vi.fn(async () => undefined),
    isAnonymous: vi.fn(async () => false),
    logOut: vi.fn(async () => undefined),
  };
}

describe('synchronizeRevenueCatIdentity', () => {
  beforeEach(() => resetRevenueCatIdentityTransitions());

  it('serializes identity transitions and skips a superseded queued account', async () => {
    const api = makeApi();
    const first = synchronizeRevenueCatIdentity('account-a', api);
    const second = synchronizeRevenueCatIdentity('account-b', api);

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(api.logIn).toHaveBeenCalledOnce();
    expect(api.logIn).toHaveBeenCalledWith('account-b');
  });

  it('does not report a late in-flight completion as applied after logout is requested', async () => {
    let releaseLogin!: () => void;
    const api = makeApi();
    vi.mocked(api.logIn).mockImplementation(
      () => new Promise<void>((resolve) => { releaseLogin = resolve; }),
    );

    const login = synchronizeRevenueCatIdentity('account-a', api);
    await Promise.resolve();
    const logout = synchronizeRevenueCatIdentity(null, api);
    releaseLogin();

    await expect(login).resolves.toBe(false);
    await expect(logout).resolves.toBe(true);
    expect(api.logOut).toHaveBeenCalledOnce();
  });

  it('does not call logout when RevenueCat is already anonymous', async () => {
    const api = makeApi();
    vi.mocked(api.isAnonymous).mockResolvedValue(true);

    await expect(synchronizeRevenueCatIdentity(null, api)).resolves.toBe(true);

    expect(api.isAnonymous).toHaveBeenCalledOnce();
    expect(api.logOut).not.toHaveBeenCalled();
  });
});