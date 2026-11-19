import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Steps page header hierarchy', () => {
  it('disables the native duplicate header and uses the compact custom header', () => {
    const rootLayout = readFileSync(resolve(__dirname, '../../app/_layout.tsx'), 'utf8');
    const stepsSource = readFileSync(resolve(__dirname, '../../app/steps.tsx'), 'utf8');
    const chromeSource = readFileSync(resolve(__dirname, '../../components/AppChrome.tsx'), 'utf8');

    expect(rootLayout).toContain('<Stack.Screen name="steps" options={{ headerShown: false }} />');
    expect(stepsSource).toContain('<AppHeader compact title="Steps"');
    expect(stepsSource).toContain('headerAction: { width: 24, height: 24');
    expect(chromeSource).toContain('compactBar: { minHeight: 52');
  });
});
