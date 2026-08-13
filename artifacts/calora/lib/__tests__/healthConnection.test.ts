import { describe, expect, it } from 'vitest';
import { normalizeHealthConnection } from '../healthConnection';

describe('normalizeHealthConnection', () => {
  it('clears a legacy connected flag until a real health provider exists', () => {
    expect(normalizeHealthConnection(true)).toBe(false);
  });

  it('keeps absent and disconnected legacy values unavailable', () => {
    expect(normalizeHealthConnection(false)).toBe(false);
    expect(normalizeHealthConnection()).toBe(false);
  });
});