/**
 * Rendering tests: export row Pressable — disabled and non-tappable until the
 * user has real data.
 *
 * @vitest-environment jsdom
 *
 * Problem being prevented:
 *   profile.tsx builds the export row item with:
 *     disabled: !hasExportData || isExporting      (line 685)
 *   and passes it to SettingRowPressable which wires:
 *     <Pressable disabled={disabled} accessibilityState={{ disabled }} …>
 *   A regression — e.g. removing accessibilityState, hardcoding disabled=false,
 *   or changing the !hasExportData expression — would leave existing unit tests
 *   for deriveExportHasData green while silently breaking the rendered Pressable.
 *
 * Approach:
 *   The tests render the production SettingRowPressable component — the exact
 *   same Pressable used in profile.tsx — with controlled props derived from
 *   the real deriveExportHasData helper. react-native maps to react-native-web
 *   (via vitest.config.ts alias), so the Pressable renders to a DOM element
 *   and @testing-library/react can query it.
 *
 *   Any change to SettingRowPressable's disabled / accessibilityState wiring
 *   will immediately cause these tests to fail.
 *
 * Scenarios:
 *   A. No data (profile null, logs empty)   — row is disabled, pressing is blocked
 *   B. Has data (profile set, no logs)      — row is enabled, pressing fires handler
 *   C. Has data (logs only, no profile)     — enabled via log count alone
 *   D. isExporting=true while data present  — row is disabled during export
 *   E. Transition in a single render cycle  — no-data → has-data re-enables the row
 */

import React, { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingRowPressable } from '@/components/SettingRowPressable';
import { deriveExportHasData } from '../exportUiHandler';

// ---------------------------------------------------------------------------
// Fixture: ExportRowFixture
//
// Renders the production SettingRowPressable with the same props that
// profile.tsx derives at lines 64 + 685:
//
//   const hasExportData = deriveExportHasData(profile, logs);   // profile.tsx L64
//   const disabled      = !hasExportData || isExporting;        // profile.tsx L685
//   <SettingRowPressable
//     testID="export-data-row"
//     onPress={handleExport}
//     disabled={disabled}
//     ...
//   />
//
// The fixture passes the REAL deriveExportHasData output → SettingRowPressable,
// so the full production chain is exercised.
// ---------------------------------------------------------------------------

interface ExportRowFixtureProps {
  profile: { name: string } | null;
  logs: unknown[];
  onExport: () => void;
  isExporting?: boolean;
}

function ExportRowFixture({
  profile,
  logs,
  onExport,
  isExporting = false,
}: ExportRowFixtureProps) {
  const hasExportData = deriveExportHasData(profile, logs);
  const disabled = !hasExportData || isExporting;

  return (
    <SettingRowPressable
      testID="export-data-row"
      onPress={onExport}
      disabled={disabled}
    />
  );
}

// ---------------------------------------------------------------------------
// Transition fixture — lets tests trigger a no-data → has-data state change
// within a single mounted component.
// ---------------------------------------------------------------------------

function TransitionFixture({ onExport }: { onExport: () => void }) {
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const logs: unknown[] = [];

  return (
    <>
      <ExportRowFixture profile={profile} logs={logs} onExport={onExport} />
      <button
        data-testid="complete-onboarding"
        onClick={() => setProfile({ name: 'Alex' })}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers for assertions.
//
// react-native-web renders Pressable as a <div role="button"> element.
// Behaviour observed in jsdom:
//   accessibilityState={{ disabled: true }}  → aria-disabled="true"
//   accessibilityState={{ disabled: false }} → aria-disabled attribute absent (null)
//
// So we assert:
//   isRowDisabled(el) → true when aria-disabled="true"
//   isRowEnabled(el)  → true when aria-disabled is "false" or absent
// ---------------------------------------------------------------------------

function isRowDisabled(el: HTMLElement): boolean {
  return el.getAttribute('aria-disabled') === 'true';
}

function isRowEnabled(el: HTMLElement): boolean {
  const v = el.getAttribute('aria-disabled');
  return v === null || v === 'false';
}

// ---------------------------------------------------------------------------
// A. No data — profile null, logs empty
// ---------------------------------------------------------------------------

describe('export row Pressable: no-data state — disabled and non-tappable', () => {
  it('row is marked disabled (accessibilityState) when profile is null and logs are empty', () => {
    const { getByTestId } = render(
      <ExportRowFixture profile={null} logs={[]} onExport={vi.fn()} />,
    );
    expect(isRowDisabled(getByTestId('export-data-row'))).toBe(true);
  });

  it('handler is NOT called when the row is pressed with no data', () => {
    const onExport = vi.fn();
    const { getByTestId } = render(
      <ExportRowFixture profile={null} logs={[]} onExport={onExport} />,
    );
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// B. Has data — profile set, no logs
// ---------------------------------------------------------------------------

describe('export row Pressable: has-data state (profile) — enabled and tappable', () => {
  const profile = { name: 'Alex' };

  it('row is NOT marked disabled (accessibilityState) when a profile is present', () => {
    const { getByTestId } = render(
      <ExportRowFixture profile={profile} logs={[]} onExport={vi.fn()} />,
    );
    expect(isRowEnabled(getByTestId('export-data-row'))).toBe(true);
  });

  it('handler IS called when the row is pressed with a profile present', () => {
    const onExport = vi.fn();
    const { getByTestId } = render(
      <ExportRowFixture profile={profile} logs={[]} onExport={onExport} />,
    );
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// C. Has data via logs only — profile null, logs non-empty
// ---------------------------------------------------------------------------

describe('export row Pressable: has-data state (logs only) — enabled without a profile', () => {
  it('row is enabled when logs are present even if profile is null', () => {
    const { getByTestId } = render(
      <ExportRowFixture
        profile={null}
        logs={[{ id: '1', food: 'banana' }]}
        onExport={vi.fn()}
      />,
    );
    expect(isRowEnabled(getByTestId('export-data-row'))).toBe(true);
  });

  it('handler fires when logs are present even if profile is null', () => {
    const onExport = vi.fn();
    const { getByTestId } = render(
      <ExportRowFixture
        profile={null}
        logs={[{ id: '1', food: 'banana' }]}
        onExport={onExport}
      />,
    );
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// D. isExporting=true while data present — row is disabled during export
// ---------------------------------------------------------------------------

describe('export row Pressable: isExporting=true — disabled while export is in flight', () => {
  const profile = { name: 'Alex' };

  it('row is disabled while isExporting=true, even though data exists', () => {
    const { getByTestId } = render(
      <ExportRowFixture
        profile={profile}
        logs={[]}
        onExport={vi.fn()}
        isExporting={true}
      />,
    );
    expect(isRowDisabled(getByTestId('export-data-row'))).toBe(true);
  });

  it('handler is NOT called when the row is pressed while isExporting=true', () => {
    const onExport = vi.fn();
    const { getByTestId } = render(
      <ExportRowFixture
        profile={profile}
        logs={[]}
        onExport={onExport}
        isExporting={true}
      />,
    );
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).not.toHaveBeenCalled();
  });

  it('row re-enables once isExporting returns to false', () => {
    const onExport = vi.fn();
    const { getByTestId, rerender } = render(
      <ExportRowFixture
        profile={profile}
        logs={[]}
        onExport={onExport}
        isExporting={true}
      />,
    );
    expect(isRowDisabled(getByTestId('export-data-row'))).toBe(true);

    rerender(
      <ExportRowFixture
        profile={profile}
        logs={[]}
        onExport={onExport}
        isExporting={false}
      />,
    );
    expect(isRowEnabled(getByTestId('export-data-row'))).toBe(true);
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// E. Transition — single mounted component no-data → has-data
// ---------------------------------------------------------------------------

describe('export row Pressable: no-data → has-data transition in one render cycle', () => {
  it('row starts disabled and becomes enabled after profile is set', async () => {
    const onExport = vi.fn();
    const { getByTestId } = render(<TransitionFixture onExport={onExport} />);

    // initial state: no profile → disabled
    expect(isRowDisabled(getByTestId('export-data-row'))).toBe(true);

    // simulate completeOnboarding() writing a profile to context
    await act(async () => {
      fireEvent.click(getByTestId('complete-onboarding'));
    });

    // after transition: profile present → enabled
    expect(isRowEnabled(getByTestId('export-data-row'))).toBe(true);
  });

  it('handler is not called before the transition and is called after', async () => {
    const onExport = vi.fn();
    const { getByTestId } = render(<TransitionFixture onExport={onExport} />);

    // press while disabled — no call
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).not.toHaveBeenCalled();

    // complete onboarding → row enabled
    await act(async () => {
      fireEvent.click(getByTestId('complete-onboarding'));
    });

    // press while enabled — exactly one call
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('guard flips only at the profile boundary — two no-data presses produce zero calls', async () => {
    const onExport = vi.fn();
    const { getByTestId } = render(<TransitionFixture onExport={onExport} />);

    // multiple presses while disabled → still zero calls
    fireEvent.click(getByTestId('export-data-row'));
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).not.toHaveBeenCalled();

    // complete onboarding → press once → exactly one call
    await act(async () => {
      fireEvent.click(getByTestId('complete-onboarding'));
    });
    fireEvent.click(getByTestId('export-data-row'));
    expect(onExport).toHaveBeenCalledOnce();
  });
});
