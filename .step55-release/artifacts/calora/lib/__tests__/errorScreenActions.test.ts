/**
 * Error screen action-button derivation tests.
 *
 * These tests confirm that `deriveErrorScreenActions` — the pure helper that
 * drives the hydration error screen in app/index.tsx — maps each
 * `hydrationErrorKind` to exactly the right set of visible buttons.
 *
 * The invariant this file protects:
 *   parse error  → Export button present,   Try Again absent
 *   I/O error    → Try Again button present, Export absent
 *
 * If the logic were swapped (Export shown for I/O, Try Again shown for parse),
 * users with corrupted storage would see a useless retry instead of an escape
 * hatch, and users with a transient I/O error would see an export button that
 * has nothing useful to ship.
 *
 * Tests use the pure `deriveErrorScreenActions` helper extracted from the
 * component so they do not need to mount React Native primitives or mock the
 * full CaloraProvider.
 */

import { describe, expect, it } from 'vitest';
import { deriveErrorScreenActions } from '../errorScreenActions';

// ---------------------------------------------------------------------------
// Parse error — Export present, Try Again absent
// ---------------------------------------------------------------------------

describe('deriveErrorScreenActions: parse error maps to Export, not Try Again', () => {
  it('showExport is true when hydrationErrorKind is "parse"', () => {
    // A parse error means the stored JSON is corrupt. The only useful action
    // is to export the raw bytes so the user has a backup before clearing.
    // showExport must be true so the Export Pressable is rendered.
    const actions = deriveErrorScreenActions('parse');
    expect(actions.showExport).toBe(true);
  });

  it('showTryAgain is false when hydrationErrorKind is "parse"', () => {
    // Retrying a corrupt file returns the same parse error — it is not a
    // transient condition.  The Try Again Pressable must be absent so the
    // user is not led to believe a retry will recover their data.
    const actions = deriveErrorScreenActions('parse');
    expect(actions.showTryAgain).toBe(false);
  });

  it('showClearAll is true when hydrationErrorKind is "parse"', () => {
    // "Clear all data and start fresh" is an escape hatch specific to parse
    // errors.  It must be present so the user can recover from corruption.
    const actions = deriveErrorScreenActions('parse');
    expect(actions.showClearAll).toBe(true);
  });

  it('Export and Try Again are never both true for a parse error', () => {
    // Documents the mutual-exclusion contract: the two primary CTA buttons
    // must not appear together, so the user never faces an ambiguous choice.
    const { showExport, showTryAgain } = deriveErrorScreenActions('parse');
    expect(showExport && showTryAgain).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// I/O error — Try Again present, Export absent
// ---------------------------------------------------------------------------

describe('deriveErrorScreenActions: I/O error maps to Try Again, not Export', () => {
  it('showTryAgain is true when hydrationErrorKind is "io"', () => {
    // An I/O error is transient (device locked, quota, OS hiccup).  The
    // correct primary action is to retry — showTryAgain must be true so the
    // Try Again Pressable is rendered.
    const actions = deriveErrorScreenActions('io');
    expect(actions.showTryAgain).toBe(true);
  });

  it('showExport is false when hydrationErrorKind is "io"', () => {
    // No data was successfully parsed during an I/O error, so there is
    // nothing meaningful to export.  Showing the Export button would
    // mislead the user into believing their data is accessible.
    const actions = deriveErrorScreenActions('io');
    expect(actions.showExport).toBe(false);
  });

  it('showClearAll is false when hydrationErrorKind is "io"', () => {
    // "Clear all data" would permanently destroy the user's data for what is
    // likely a momentary storage failure.  It must be absent for I/O errors.
    const actions = deriveErrorScreenActions('io');
    expect(actions.showClearAll).toBe(false);
  });

  it('Try Again and Export are never both true for an I/O error', () => {
    // Documents the mutual-exclusion contract for the I/O case.
    const { showExport, showTryAgain } = deriveErrorScreenActions('io');
    expect(showExport && showTryAgain).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mutual exclusion across both kinds — buttons are never swapped
// ---------------------------------------------------------------------------

describe('deriveErrorScreenActions: buttons are never swapped between error kinds', () => {
  it('Export is only shown for parse, never for io', () => {
    // This is the "never swapped" contract: if this assertion fails the
    // component is showing an Export button to a user whose storage simply
    // failed to read — a confusing and useless action.
    expect(deriveErrorScreenActions('parse').showExport).toBe(true);
    expect(deriveErrorScreenActions('io').showExport).toBe(false);
  });

  it('Try Again is only shown for io, never for parse', () => {
    // The converse: if this assertion fails the component is telling a user
    // with corrupted data to "try again", which will always fail and leaves
    // them with no escape hatch.
    expect(deriveErrorScreenActions('io').showTryAgain).toBe(true);
    expect(deriveErrorScreenActions('parse').showTryAgain).toBe(false);
  });

  it('ClearAll mirrors Export — present for parse, absent for io', () => {
    expect(deriveErrorScreenActions('parse').showClearAll).toBe(true);
    expect(deriveErrorScreenActions('io').showClearAll).toBe(false);
  });

  it('no action is true for a null kind (no active error)', () => {
    // When hydrationErrorKind is null the error screen is not shown at all,
    // but the helper must still return a safe all-false result in case it is
    // called defensively.
    const actions = deriveErrorScreenActions(null);
    expect(actions.showExport).toBe(false);
    expect(actions.showTryAgain).toBe(false);
    expect(actions.showClearAll).toBe(false);
  });
});
