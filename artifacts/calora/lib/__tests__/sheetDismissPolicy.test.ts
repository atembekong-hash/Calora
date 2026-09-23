import { describe, expect, it } from 'vitest';
import { shouldDismissSheetPan } from '@/lib/sheetDismissPolicy';

describe('shouldDismissSheetPan', () => {
  it('accepts a deliberate long downward handle drag', () => {
    expect(shouldDismissSheetPan(8, 64, 0.1, 0.4)).toBe(true);
  });

  it('accepts a short fast downward flick', () => {
    expect(shouldDismissSheetPan(4, 24, 0.1, 1.1)).toBe(true);
  });

  it('rejects upward, horizontal, diagonal, and small slow movement', () => {
    expect(shouldDismissSheetPan(0, -70, 0, -1)).toBe(false);
    expect(shouldDismissSheetPan(70, 20, 1, 0.3)).toBe(false);
    expect(shouldDismissSheetPan(45, 50, 0.8, 0.9)).toBe(false);
    expect(shouldDismissSheetPan(2, 20, 0, 0.2)).toBe(false);
  });
});
