import { describe, expect, it } from 'vitest';

async function onboardingSource() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  return readFile(resolve(__dirname, '../../app/index.tsx'), 'utf8');
}

async function rootLayoutSource() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  return readFile(resolve(__dirname, '../../app/_layout.tsx'), 'utf8');
}

describe('onboarding keyboard-aware and agreement contracts', () => {
  it('uses the existing keyboard-aware compatibility wrapper with safe-area spacing', async () => {
    const source = await onboardingSource();

    expect(source).toContain('KeyboardAwareScrollViewCompat');
    expect(source).toContain('testID="onboarding-keyboard-safe-scroll"');
    expect(source).toContain('bottomOffset={insets.bottom + 72}');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain("Platform.OS === 'ios' ? 'interactive' : 'on-drag'");
    expect(source).toContain('paddingBottom: insets.bottom + 32');
    expect(source).not.toContain('<ScrollView ');
  });

  it('gives every onboarding text field a stable target for focused-input checks', async () => {
    const source = await onboardingSource();

    for (const testID of [
      'onboarding-name-input',
      'onboarding-age-input',
      'onboarding-height-input',
      'onboarding-weight-input',
      'onboarding-target-weight-input',
    ]) {
      expect(source).toMatch(new RegExp(`['"]${testID}['"]`));
    }
    expect(source.match(/['"]onboarding-[^'"]+-input['"]/g)?.length).toBe(5);
  });

  it('keeps agreement affirmative, unchecked on first run, and inaccessible to bypass', async () => {
    const source = await onboardingSource();

    expect(source).toContain('const [consent, setConsent] = useState(isReviewMode);');
    expect(source).toContain('testID="onboarding-consent"');
    expect(source).toContain('accessibilityRole="checkbox"');
    expect(source).toContain('accessibilityState={{ checked: consent }}');
    expect(source).toContain('accessibilityLabel="Required agreement: I understand and agree"');
    expect(source).toContain('Tap to agree before entering Calora.');
    expect(source).toContain('onPress={() => setConsent((current) => !current)}');
    expect(source).toContain('disabled={isFinalStep && !consent}');
    expect(source).toContain('testID={isFinalStep ? \'onboarding-finish\' : \'onboarding-continue\'}');
  });

  it('keeps durable completion on the existing explicit persistence boundary', async () => {
    const source = await onboardingSource();

    expect(source).toContain('await completeOnboarding(profile, consent);');
    expect(source).toContain('if (isReviewMode) router.replace');
    expect(source).toContain('onboardingComplete');
    expect(source).toContain('onboardingDraft');
  });

  it('uses bundled food photography with restrained motion that honors reduced-motion settings', async () => {
    const source = await onboardingSource();

    expect(source).toContain("import { Image } from 'expo-image';");
    expect(source).toContain('function OnboardingPhotoHero');
    expect(source).toContain("require('../assets/images/calora-home-header.jpg')");
    expect(source).toContain("require('../assets/images/meals/harvest-salad.jpg')");
    expect(source).toContain("require('../assets/images/foods/chicken-rice-bowl.jpg')");
    expect(source).toContain('const reducedMotion = useReducedMotion();');
    expect(source).toContain('if (reducedMotion) {');
    expect(source).toContain('entering={reducedMotion ? undefined : FadeInRight.duration(220)}');
    expect(source).not.toContain('function OnboardingIllustration');
  });

  it('offers existing-account sign-in while the root waits for secure session and profile restoration', async () => {
    const source = await onboardingSource();
    const rootSource = await rootLayoutSource();

    expect(source).toContain("router.push('/auth/sign-in' as any)");
    expect(source).toContain('Sign in to restore an existing Calora account');
    expect(source).toContain('if ((!hydrated || !profileSyncReady)');
    expect(rootSource).toContain("if (restoreStatus === 'loading') return <AuthRestoreBootstrap />;");
    expect(rootSource).toContain('<CaloraProvider key={scopeKey} accountId={accountId}>');
    expect(rootSource).toContain('<Stack.Protected guard={allowOnboarding}>');
    expect(rootSource).toContain('<Stack.Protected guard={allowApplication}>');
  });
});
