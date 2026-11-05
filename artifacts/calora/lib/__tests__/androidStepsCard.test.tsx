// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import colors from '@/constants/colors';

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return { ...actual, useWindowDimensions: () => ({ width: 360, height: 800, scale: 1, fontScale: 1 }) };
});
vi.mock('@expo/vector-icons', () => ({ Feather: ({ name }: { name: string }) => <span data-icon={name} /> }));
vi.mock('react-native-svg', () => ({
  default: ({ children, testID, ...props }: any) => <svg data-testid={testID} {...props}>{children}</svg>,
  Circle: ({ animatedProps, ...props }: any) => <circle {...props} {...animatedProps} />,
}));
vi.mock('react-native-reanimated', async () => {
  const { View } = await import('react-native');
  return {
    default: { View, createAnimatedComponent: (component: any) => component },
    Easing: { out: (x: any) => x, cubic: (x: any) => x },
    ReduceMotion: { System: 'system' },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedProps: (fn: any) => fn(),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
    withSequence: (...values: any[]) => values.at(-1),
  };
});
import { AndroidStepsCard } from '@/components/AndroidStepsCard';

afterEach(cleanup);
const fixture = {
  expanded: true,
  colors: colors.light,
  steps: 6543,
  goal: 10000,
  progress: 0.6543,
  status: 'Live',
  live: true,
  sessionOnly: false,
  accessibilitySummary: 'Steps today: 6,543 of 10,000. Live.',
  actionLabel: null,
  onOpenSteps: vi.fn(),
};

describe('Android Steps presentation (rendered regression, not native screenshot proof)', () => {
  it.each([true, false])('matches the SVG and wrapper diameters with expanded=%s', (expanded) => {
    render(<AndroidStepsCard {...fixture} expanded={expanded} />);
    const ring = screen.getByTestId('dashboard-steps-value');
    const svg = screen.getByTestId('dashboard-steps-ring');
    const expected = expanded ? 115.2 : 57.6;
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(expected);
    expect(Number.parseFloat(ring.style.width)).toBeCloseTo(expected);
    expect(Number.parseFloat(ring.style.height)).toBeCloseTo(expected);
    const viewBox = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(viewBox.slice(0, 2)).toEqual([0, 0]);
    expect(viewBox[2]).toBeCloseTo(expected);
    expect(viewBox[3]).toBeCloseTo(expected);
    expect(ring.textContent).toContain('6,543');
    expect(ring.textContent).toContain('of 10,000');
    expect(screen.getAllByText('6,543')).toHaveLength(1);
    expect(screen.getByTestId('dashboard-steps-status').textContent).toBe('Live');
  });

  it.each([null, 0, 9999, 10000, 105432])('preserves the step count %s inside the accessible ring', (steps) => {
    render(<AndroidStepsCard {...fixture} steps={steps} />);
    const ring = screen.getByTestId('dashboard-steps-value');
    expect(ring.textContent).toContain(steps === null ? '—' : steps.toLocaleString());
    expect(ring.getAttribute('aria-label')).toBe(fixture.accessibilitySummary);
  });

  it.each(['Connect Health', 'Open motion settings', 'Enable live steps', 'Retry live steps', 'Update Health access', 'Sync Health'])('preserves the %s recovery callback separately from navigation', (actionLabel) => {
    const onAction = vi.fn();
    const onOpenSteps = vi.fn();
    render(<AndroidStepsCard {...fixture} actionLabel={actionLabel} onAction={onAction} onOpenSteps={onOpenSteps} />);
    fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpenSteps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Open Steps$/ }));
    expect(onOpenSteps).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('keeps full session-only and recovery status accessible and milestone content intact', () => {
    const status = 'Live since opened — connect Health for today’s total';
    render(<AndroidStepsCard {...fixture} expanded={false} sessionOnly status={status}><div data-testid="fixture-milestone">1,000 steps reached</div></AndroidStepsCard>);
    expect(screen.getByTestId('dashboard-steps-status').getAttribute('aria-label')).toBe(status);
    expect(screen.getByTestId('dashboard-steps-status').textContent).toBe('Live · session');
    expect(screen.getByTestId('fixture-milestone').textContent).toBe('1,000 steps reached');
  });
});
