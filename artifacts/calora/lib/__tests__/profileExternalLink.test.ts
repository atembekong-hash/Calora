import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../../app/(tabs)/profile.tsx'), 'utf8');

describe('Profile external-link recovery integration', () => {
  it('uses a checked external-link launcher with visible retry recovery', () => {
    expect(source).toContain('import { launchExternalUrl } from "@/lib/externalLink"');
    expect(source).toContain('const externalLinkLockRef = useRef(false);');
    expect(source).toContain('const result = await launchExternalUrl(Linking, url);');
    expect(source).toContain('accessibilityRole="alert"');
    expect(source).toContain('accessibilityLabel={`Retry opening ${externalLinkError.title}`}');
    expect(source).toContain('accessibilityLabel={`Opening ${item.title}`}');
    expect(source).not.toContain('item.url ? () => Linking.openURL(item.url!) : () => {}');
  });
});
