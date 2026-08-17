import { describe, expect, it } from 'vitest';
import { normalizeHealthConnection } from '../healthConnection';

describe('normalizeHealthConnection', () => {
  it('does not trust a legacy connected flag without provider metadata', () => {
    expect(normalizeHealthConnection(true)).toMatchObject({ authorization: 'unavailable', provider: 'unsupported', granted: [] });
  });

  it('preserves provider-authoritative local metadata', () => {
    expect(normalizeHealthConnection({
      provider: 'health-connect',
      authorization: 'partial',
      granted: ['steps'],
      lastSyncedAt: '2026-08-17T12:00:00.000Z',
    })).toMatchObject({
      provider: 'health-connect',
      authorization: 'partial',
      granted: ['steps'],
      lastSyncedAt: '2026-08-17T12:00:00.000Z',
    });
  });
});