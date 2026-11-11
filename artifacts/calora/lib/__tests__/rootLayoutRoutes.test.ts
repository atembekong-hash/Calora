import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
const layoutSource = fs.readFileSync(layoutPath, 'utf8');

describe('root protected route registration', () => {
  it('does not register a top-level profile route that only exists inside the tab group', () => {
    expect(layoutSource).not.toMatch(/<Stack\.Screen\s+name=["']profile["']/);
    expect(layoutSource).toContain('<Stack.Screen name="(tabs)" options={{ headerShown: false }} />');
  });
});
