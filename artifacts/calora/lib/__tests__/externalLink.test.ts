import { describe, expect, it, vi } from 'vitest';
import { launchExternalUrl } from '../externalLink';

describe('launchExternalUrl', () => {
  const url = 'https://mycaloraapp.com/privacy';

  it('does not open an unsupported destination', async () => {
    const launcher = { canOpenURL: vi.fn(async () => false), openURL: vi.fn() };

    await expect(launchExternalUrl(launcher, url)).resolves.toBe('unsupported');
    expect(launcher.openURL).not.toHaveBeenCalled();
  });

  it('contains capability and opening failures in an actionable result', async () => {
    await expect(launchExternalUrl({
      canOpenURL: vi.fn(async () => { throw new Error('raw OS detail'); }),
      openURL: vi.fn(),
    }, url)).resolves.toBe('unsupported');

    await expect(launchExternalUrl({
      canOpenURL: vi.fn(async () => true),
      openURL: vi.fn(async () => { throw new Error('raw provider detail'); }),
    }, url)).resolves.toBe('failed');
  });

  it('opens a supported destination once', async () => {
    const launcher = { canOpenURL: vi.fn(async () => true), openURL: vi.fn(async () => undefined) };

    await expect(launchExternalUrl(launcher, url)).resolves.toBe('opened');
    expect(launcher.openURL).toHaveBeenCalledWith(url);
  });
});
