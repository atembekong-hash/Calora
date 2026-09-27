import { describe, expect, it } from 'vitest';
import { normalizeExternalHttpsUrl } from '@workspace/api-zod/image-source-policy';

describe('external provider URL policy', () => {
  it('allows an absolute public HTTPS display URL', () => {
    expect(normalizeExternalHttpsUrl('https://provider.example/recipes/42?ref=calora'))
      .toBe('https://provider.example/recipes/42?ref=calora');
  });

  it.each([
    'http://provider.example/recipes/42',
    '/recipes/42',
    'javascript:alert(1)',
    'https://user:password@provider.example/recipes/42',
    'https://provider.example/recipes/42#fragment',
    'https://127.0.0.1/recipes/42',
    'https://[::1]/recipes/42',
    'https://localhost/recipes/42',
  ])('rejects an unsafe external URL: %s', (value) => {
    expect(normalizeExternalHttpsUrl(value)).toBeUndefined();
  });
});
