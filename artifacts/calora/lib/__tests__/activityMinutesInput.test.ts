import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INVALID_ACTIVITY_MINUTES_MESSAGE,
  resolveActivityMinutesInput,
} from '@/lib/activityMinutesInput';

describe('activity minutes input validation', () => {
  it('accepts whole non-negative minutes without converting them', () => {
    expect(resolveActivityMinutesInput('45', false)).toEqual({ kind: 'save', minutes: 45 });
    expect(resolveActivityMinutesInput('0', false)).toEqual({ kind: 'save', minutes: 0 });
  });

  it('rejects fractional input rather than silently discarding or rounding it', () => {
    expect(resolveActivityMinutesInput('12.5', false)).toEqual({
      kind: 'invalid',
      message: INVALID_ACTIVITY_MINUTES_MESSAGE,
    });
  });

  it('clears an existing saved check-in only when the field is intentionally blanked', () => {
    expect(resolveActivityMinutesInput('', true)).toEqual({ kind: 'clear' });
    expect(resolveActivityMinutesInput('', false)).toEqual({ kind: 'noop' });
  });

  it('renders invalid input feedback through the Insights field', () => {
    const source = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');

    expect(source).toContain("resolveActivityMinutesInput(");
    expect(source).toContain("decision.kind === 'invalid'");
    expect(source).toContain('onEndEditing={commitActivityMinutes}');
    expect(source).toContain('onBlur={commitActivityMinutes}');
    expect(source).toContain('accessibilityRole="alert"');
    expect(source).toContain('Invalid values are not saved.');
  });
});
