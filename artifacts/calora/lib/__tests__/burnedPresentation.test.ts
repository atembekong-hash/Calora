import { describe, expect, it } from 'vitest';
import { burnedPresentationForStatus } from '../health/burnedPresentation';

describe('burnedPresentationForStatus', () => {
  it('renders a measured zero as zero, not unavailable', () => {
    expect(burnedPresentationForStatus({ kind: 'ready', calories: 0 }))
      .toEqual({ calories: 0, canOpenHealthRecovery: false });
  });

  it('renders no Android records as unavailable without a misleading recovery action', () => {
    expect(burnedPresentationForStatus({ kind: 'no-data', actionLabel: 'No active calories recorded today' }))
      .toEqual({ calories: null, statusLabel: 'No active calories recorded today', canOpenHealthRecovery: false });
  });

  it.each([
    { kind: 'connect' as const, actionLabel: 'Connect Health' },
    { kind: 'permission' as const, actionLabel: 'Allow active calories' },
    { kind: 'syncing' as const, actionLabel: 'Syncing health…' },
    { kind: 'failed' as const, actionLabel: 'Sync health' },
  ])('keeps $kind actionable while never substituting a calorie value', (status) => {
    expect(burnedPresentationForStatus(status)).toEqual({
      calories: null,
      statusLabel: status.actionLabel,
      canOpenHealthRecovery: true,
    });
  });

  it('keeps past and unsupported states truthful but not tappable', () => {
    expect(burnedPresentationForStatus({ kind: 'past-date', actionLabel: 'Burned unavailable for past dates' }))
      .toMatchObject({ calories: null, canOpenHealthRecovery: false });
    expect(burnedPresentationForStatus({ kind: 'unavailable', actionLabel: 'Health unavailable on this device' }))
      .toMatchObject({ calories: null, canOpenHealthRecovery: false });
  });
});
