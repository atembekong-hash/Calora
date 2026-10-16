import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const forgotPassword = source('app/auth/forgot-password.tsx');
const resetPassword = source('app/auth/reset-password.tsx');
const home = source('app/(tabs)/index.tsx');
const profileYouSettings = source('components/ProfileYouSettings.tsx');
const restaurants = source('app/restaurants.tsx');
const appConfig = JSON.parse(source('app.json')) as {
  expo?: { ios?: { buildNumber?: string } };
};

describe('final certification recovery interactions', () => {
  it('makes password recovery deterministic, announced, and busy-safe', () => {
    expect(forgotPassword).toContain("router.replace('/auth/sign-in' as any)");
    expect(forgotPassword).toContain('accessibilityRole="alert"');
    expect(forgotPassword).toContain('accessibilityState={{ disabled: loading, busy: loading }}');
    expect(resetPassword).toContain('accessibilityRole="alert"');
    expect(resetPassword).toContain('accessibilityState={{ disabled: loading, busy: loading }}');
  });

  it('keeps a local-storage recovery path visible on Today', () => {
    expect(home).toContain('hydrationError, retryHydration, isRetrying');
    expect(home).toContain('accessibilityLabel="Retry loading Today"');
    expect(home).toContain('onPress={retryHydration}');
    expect(home).toContain('hydrationError || isRetrying');
  });

  it('locks Profile setting writes and makes provider unavailability retryable', () => {
    expect(profileYouSettings).toContain('const saveInFlightRef = useRef(false);');
    expect(profileYouSettings).toContain('const [isSaving, setIsSaving] = useState(false);');
    expect(profileYouSettings).toContain('accessibilityState={{ disabled: isSaving, busy: isSaving }}');
    expect(restaurants).toContain('accessibilityLabel="Retry restaurant provider"');
    expect(restaurants).toContain('void searchResult.refetch();');
  });

  it('pins the next safe iOS build number after build 16 was consumed', () => {
    expect(appConfig.expo?.ios?.buildNumber).toBe('17');
  });
});
