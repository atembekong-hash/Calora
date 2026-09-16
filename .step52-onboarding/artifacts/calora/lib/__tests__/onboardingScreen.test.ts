import { describe, expect, it } from 'vitest';

async function onboardingSource() {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  return readFile(resolve(__dirname, '../../app/index.tsx'), 'utf8');
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
});