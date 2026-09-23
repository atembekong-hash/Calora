import { describe, expect, it } from 'vitest';
import { defaultKeyboardDismissMode } from '@/lib/keyboardDismissPolicy';

describe('defaultKeyboardDismissMode', () => {
  it('uses interactive dismissal only on iOS', () => {
    expect(defaultKeyboardDismissMode('ios')).toBe('interactive');
  });

  it.each(['android', 'web', 'windows', 'macos'] as const)(
    'uses on-drag dismissal on %s',
    (platform) => {
      expect(defaultKeyboardDismissMode(platform)).toBe('on-drag');
    },
  );
});
