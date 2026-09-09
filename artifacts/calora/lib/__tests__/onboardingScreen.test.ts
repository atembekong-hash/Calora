import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../../app/index.tsx'), 'utf8');

describe('onboarding keyboard-safe layout', () => {
  it('uses one keyboard-aware scroll container instead of nesting scroll views', () => {
    expect(source.match(/<KeyboardAwareScrollViewCompat\b/g)).toHaveLength(1);
    expect(source.match(/<\/KeyboardAwareScrollViewCompat>/g)).toHaveLength(1);
    expect(source).not.toMatch(/<ScrollView\b/);
  });

  it('keeps focused inputs and the action area clear of the keyboard', () => {
    expect(source).toContain('bottomOffset={insets.bottom + 88}');
    expect(source).toContain('extraKeyboardSpace={24}');
    expect(source).toContain("keyboardShouldPersistTaps=\"handled\"");
    expect(source).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}");
    expect(source).toContain('paddingBottom: insets.bottom + 118');
  });

  it('places every onboarding text input inside the keyboard-aware container', () => {
    const containerStart = source.indexOf('<KeyboardAwareScrollViewCompat');
    const containerEnd = source.indexOf('</KeyboardAwareScrollViewCompat>');
    const textInputPositions = [...source.matchAll(/<TextInput\b/g)].map((match) => match.index ?? -1);

    // Three declarations cover name, age, and the mapped height/weight fields.
    expect(textInputPositions).toHaveLength(3);
    expect(textInputPositions.every((position) => position > containerStart && position < containerEnd)).toBe(true);
  });
});

describe('onboarding final agreement', () => {
  it('announces an explicit unchecked or checked required agreement', () => {
    expect(source).toContain('accessibilityRole="checkbox"');
    expect(source).toContain('accessibilityState={{ checked: consent }}');
    expect(source).toContain("consent ? 'Checked.' : 'Unchecked.'");
    expect(source).toContain('Required to continue');
    expect(source).toContain('testID="onboarding-consent"');
  });

  it('states the consent scope and exposes the final action state', () => {
    expect(source).toContain('is a wellness tool, not medical care');
    expect(source).toContain('review AI estimates before logging');
    expect(source).toContain('calorie targets are starting estimates');
    expect(source).toContain("'Check agreement to continue'");
    expect(source).toContain('accessibilityState={{ disabled: finalActionDisabled }}');
    expect(source).toContain('testID="onboarding-final-action"');
  });
});