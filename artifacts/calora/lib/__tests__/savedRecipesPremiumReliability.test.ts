import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../app/saved-recipes.tsx'),
  'utf8',
);

describe('Saved Plus recipe restoration contracts', () => {
  it('keeps expired authentication distinct from a provider outage', () => {
    expect(source).toContain("const premiumRestorationState = premiumSavedRecipeRestorationState(premiumQueries);");
    expect(source).toContain("const premiumRequiresSignIn = !user || premiumRestorationState === 'authentication';");
    expect(source).toContain("plus: premiumRestorationState === 'unavailable'");
    expect(source).toContain("requiresSignIn={source === 'plus' && premiumRequiresSignIn}");
    expect(source).toContain("source === 'plus' && (!signedIn || requiresSignIn)");
  });

  it('does not label protected saved recipes as a generic reconnect wait', () => {
    expect(source).toContain('const missingDiscoverCount = Math.max(discoverIds.length - discoverRecipes.length, 0);');
    expect(source).toContain("const showReconnectNotice = missingDiscoverCount > 0 || premiumRestorationState === 'unavailable';");
    expect(source).toContain('showReconnectNotice && !loadingSources.discover && !loadingSources.plus');
  });
});
