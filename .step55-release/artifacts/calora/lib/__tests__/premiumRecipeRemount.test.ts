import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREMIUM_RECIPE_REFRESH_POLICY } from '../premiumRecipeRefreshPolicy';

describe('Plus fresh-remount request contract', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not request fresh cached data again, but revalidates stale data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00.000Z'));
    const client = new QueryClient();
    const queryKey = ['premium-member', 'plus-recipes', { offset: 0 }];
    const request = vi.fn(async () => ({ recipes: [{ id: 'premium:1' }], nextOffset: null }));
    const options = {
      queryKey,
      queryFn: request,
      ...PREMIUM_RECIPE_REFRESH_POLICY,
    } as const;

    await client.fetchQuery(options);
    expect(request).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PREMIUM_RECIPE_REFRESH_POLICY.staleTime - 1);
    await client.fetchQuery(options);
    expect(request).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(request).toHaveBeenCalledTimes(2);

    await client.invalidateQueries({ queryKey });
    await client.fetchQuery(options);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('uses independent request/cache state after an account switch', async () => {
    const client = new QueryClient();
    const request = vi.fn(async ({ account }: { account: string }) => ({ account }));
    const makeOptions = (account: string) => ({
      queryKey: ['plus', account, { offset: 0 }],
      queryFn: () => request({ account }),
      staleTime: PREMIUM_RECIPE_REFRESH_POLICY.staleTime,
      retry: false,
    });

    await client.fetchQuery(makeOptions('account-a'));
    await client.fetchQuery(makeOptions('account-b'));

    expect(request).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(makeOptions('account-a').queryKey)).toEqual({ account: 'account-a' });
    expect(client.getQueryData(makeOptions('account-b').queryKey)).toEqual({ account: 'account-b' });
  });
});