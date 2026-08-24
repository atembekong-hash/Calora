import { afterEach, describe, expect, it, vi } from 'vitest';
import { customFetch, setBaseUrl } from '../../../../lib/api-client-react/src/custom-fetch';

describe('API client networking', () => {
  afterEach(() => {
    setBaseUrl(null);
    vi.unstubAllGlobals();
  });

  it('prepends the configured HTTPS origin to generated relative API paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recipes: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    setBaseUrl('https://api.calora.example/');

    await customFetch('/api/v1/recipes?limit=6', { responseType: 'json' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.calora.example/api/v1/recipes?limit=6',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fails clearly instead of asking a native runtime to resolve a relative API path', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(customFetch('/api/v1/coach/fact-context/respond', { method: 'POST' })).rejects.toThrow(
      'Calora API base URL is not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves transport failures while emitting a safe diagnostic', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network request failed'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);
    setBaseUrl('https://api.calora.example');

    await expect(customFetch('/api/v1/recipes')).rejects.toThrow('Network request failed');
    expect(warnSpy).toHaveBeenCalledWith(
      '[CaloraApp][network]',
      expect.objectContaining({
        event: 'network_error',
        method: 'GET',
        url: 'https://api.calora.example/api/v1/recipes',
        errorName: 'TypeError',
      }),
    );
  });
});