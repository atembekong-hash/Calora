import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../components/SwipeableTabList.tsx'),
  'utf8',
);

describe('native recipe pager contract', () => {
  it('uses a directional native pager for vertically scrollable section panes', () => {
    expect(source).toContain('nativePaging?: boolean;');
    expect(source).toContain("const useNativePaging = nativePaging && Platform.OS !== 'web';");
    expect(source).toContain('if (useNativePaging && hasAdjacentPages && renderItem)');
    expect(source).toContain('horizontal');
    expect(source).toContain('pagingEnabled');
    expect(source).toContain('directionalLockEnabled');
    expect(source).toContain('nestedScrollEnabled');
    expect(source).toContain('onMomentumScrollEnd={commitNativePagerPosition}');
    expect(source).toContain('onScrollEndDrag={commitNativePagerPosition}');
  });

  it('does not wrap native recipe pages in the custom parent pan recognizer', () => {
    const nativePagerStart = source.indexOf('if (useNativePaging && hasAdjacentPages && renderItem)');
    const nativePager = source.slice(nativePagerStart, source.indexOf('\n  return (', nativePagerStart));

    expect(nativePagerStart).toBeGreaterThan(-1);
    expect(nativePager).toContain('SwipeGestureExclusionContext.Provider');
    expect(nativePager).toContain('<ScrollView');
    expect(nativePager).toContain('scrollEnabled={!excluded}');
    expect(nativePager).not.toContain('<GestureDetector');
  });
});
