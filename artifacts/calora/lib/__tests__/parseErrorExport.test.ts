/**
 * Confirms that the parse-error export path sends real data and not an empty
 * file, and that the Alert fallback fires only when storage is genuinely empty.
 *
 * Context: Task 38 added an "Export raw data" button on the parse-error screen.
 * If AsyncStorage returns null or an empty string (e.g. after a race with a
 * clear), the export silently fails with an Alert. A user whose data is
 * recoverable should not hit that path.
 *
 * The tests drive the real handleParseErrorExport handler (lib/parseErrorExportHandler.ts)
 * that app/index.tsx delegates to, and verify the PersistenceManager.read()
 * contract that drives the hydrationErrorKind='parse' branch in CaloraContext.
 *
 * Key relationships:
 *   app/index.tsx — "Export raw data" Pressable calls handleParseErrorExport
 *   lib/parseErrorExportHandler.ts — pure handler, deps injected for testing
 *   CaloraContext.exportRawStorageData = async () => AsyncStorage.getItem(STORAGE_KEY)
 *   CaloraContext hydration effect: pm.read() → if (parseError) throw ParseHydrationError
 *                                   catch → setHydrationErrorKind('parse')
 *   PersistenceManager.read() → storage.getItem(key) → parseStorageValue(raw)
 */

import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { handleParseErrorExport, type ParseErrorExportDeps } from '../parseErrorExportHandler';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';

// ---------------------------------------------------------------------------
// Shared in-memory StorageAdapter — injects into PersistenceManager so tests
// can pre-seed corrupt or empty storage without touching real AsyncStorage.
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@calora/local-state-v2'; // must match CaloraContext

function makeStore(initial?: Record<string, string>): StorageAdapter & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    async getItem(key) { return store[key] ?? null; },
    async setItem(key, value) { store[key] = value; },
    async removeItem(key) { delete store[key]; },
  };
}

// ---------------------------------------------------------------------------
// Test 1 — corrupt JSON in storage triggers a parse error, which CaloraContext
// maps to hydrationErrorKind = 'parse'.
//
// CaloraContext hydration effect:
//   const { state: saved, error: parseError } = await pm.read();
//   if (parseError) throw new ParseHydrationError(parseError); // → hydrationErrorKind = 'parse'
//
// The tests verify pm.read() returns error !== null for corrupt data, which is
// the exact signal that drives the hydrationErrorKind='parse' branch.
// ---------------------------------------------------------------------------

describe('hydrationErrorKind="parse": corrupt JSON in storage produces a read error', () => {
  let storage: StorageAdapter & { store: Record<string, string> };
  let pm: PersistenceManager;

  beforeEach(() => {
    storage = makeStore();
    pm = new PersistenceManager(storage, STORAGE_KEY);
  });

  it('pm.read() returns a non-null error for intentionally invalid JSON', async () => {
    // Seeds storage with corrupt bytes — same path the user's device would
    // present after a failed write or file corruption.
    storage.store[STORAGE_KEY] = '{not-valid-json}';

    const { state, error } = await pm.read<Record<string, unknown>>();

    // error !== null → CaloraContext throws ParseHydrationError
    //               → catch sets hydrationErrorKind = 'parse'
    expect(error).not.toBeNull();
    // state must be null — no partial corrupt data may be applied.
    expect(state).toBeNull();
  });

  it('error message contains the wording shown to the user on the parse-error screen', async () => {
    storage.store[STORAGE_KEY] = 'TRUNCATED{{{{{';

    const { error } = await pm.read<Record<string, unknown>>();

    expect(error).toContain('Your data was not changed');
  });

  it('pm.read() returns error for truncated JSON (interrupted mid-write)', async () => {
    // A write interrupted by power loss or app termination would leave a
    // partial object that is syntactically invalid.
    storage.store[STORAGE_KEY] = '{"onboardingComplete":true,"logs":[{"id":"log-1"';

    const { error } = await pm.read<Record<string, unknown>>();

    expect(error).not.toBeNull();
  });

  it('pm.read() returns no error for empty storage — first launch is not a parse error', async () => {
    // Key absent → null from getItem → parseStorageValue returns { state: null, error: null }
    // CaloraContext does NOT throw ParseHydrationError, so hydrationErrorKind stays null.
    const { state, error } = await pm.read<Record<string, unknown>>();
    expect(error).toBeNull();
    expect(state).toBeNull();
  });

  it('a parse error does NOT mean the raw bytes are gone — getItem still returns them', async () => {
    // Critical invariant: hydrationErrorKind='parse' means bytes are present
    // but unreadable as JSON. The export button must still work.
    const corruptBytes = '{this is not json at all}';
    storage.store[STORAGE_KEY] = corruptBytes;

    const { error } = await pm.read<Record<string, unknown>>();
    expect(error).not.toBeNull(); // would set hydrationErrorKind='parse' in context

    // exportRawStorageData delegates to storage.getItem — bytes survive.
    const exported = await storage.getItem(STORAGE_KEY);
    expect(exported).not.toBeNull();
    expect(exported).toBe(corruptBytes);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — handleParseErrorExport passes the exact raw bytes to Share.share.
//
// This tests the real handler from lib/parseErrorExportHandler.ts (the same
// code app/index.tsx's "Export raw data" Pressable delegates to) with injected
// mocks for exportRawStorageData, Share.share, and Alert.alert.
// ---------------------------------------------------------------------------

describe('handleParseErrorExport: passes real bytes to Share.share, not null', () => {
  let shareMock: MockedFunction<ParseErrorExportDeps['share']>;
  let alertMock: MockedFunction<ParseErrorExportDeps['alert']>;

  beforeEach(() => {
    shareMock = vi.fn().mockResolvedValue({ action: 'sharedAction' });
    alertMock = vi.fn();
  });

  it('calls Share.share with the exact corrupt bytes returned by exportRawStorageData', async () => {
    const corruptBytes = '{not-valid-json}';
    const exportRawStorageData = vi.fn().mockResolvedValue(corruptBytes);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(exportRawStorageData).toHaveBeenCalledOnce();
    expect(shareMock).toHaveBeenCalledOnce();
    expect(shareMock).toHaveBeenCalledWith({
      message: corruptBytes,
      title: 'CaloraApp raw storage data',
    });
    // Alert must NOT fire — data is present and shareable.
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('calls Share.share with truncated bytes — partial data is still exportable', async () => {
    const truncated = '{"onboardingComplete":true,"logs":[{"id":"log-1","name":"Oats"';
    const exportRawStorageData = vi.fn().mockResolvedValue(truncated);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(shareMock).toHaveBeenCalledWith({
      message: truncated,
      title: 'CaloraApp raw storage data',
    });
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('calls Share.share with valid JSON bytes intact — bytes are not re-serialised', async () => {
    // Even when stored bytes are valid JSON, the export must pass them verbatim,
    // not re-parse and re-stringify (which could change whitespace/key order).
    const rawWithWhitespace = '{\n  "onboardingComplete" : true  \n}';
    const exportRawStorageData = vi.fn().mockResolvedValue(rawWithWhitespace);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    const [shareCall] = shareMock.mock.calls;
    expect(shareCall[0].message).toBe(rawWithWhitespace);
    // Confirm it would differ from a round-tripped value.
    const roundTripped = JSON.stringify(JSON.parse(rawWithWhitespace));
    expect(shareCall[0].message).not.toBe(roundTripped);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Alert fallback fires when storage is genuinely empty.
//
// The "Export raw data" button in app/index.tsx:
//   const raw = await exportRawStorageData();
//   if (!raw) { Alert.alert('Nothing to export', 'Storage appears empty.'); return; }
//   await Share.share({ message: raw, … });
//
// When exportRawStorageData returns null (key absent or post-clearAllData),
// handleParseErrorExport must fire Alert and must NOT call Share.share.
// ---------------------------------------------------------------------------

describe('handleParseErrorExport: Alert fallback fires when storage is genuinely empty', () => {
  let shareMock: MockedFunction<ParseErrorExportDeps['share']>;
  let alertMock: MockedFunction<ParseErrorExportDeps['alert']>;

  beforeEach(() => {
    shareMock = vi.fn().mockResolvedValue({ action: 'sharedAction' });
    alertMock = vi.fn();
  });

  it('fires the "Nothing to export" Alert when exportRawStorageData returns null', async () => {
    const exportRawStorageData = vi.fn().mockResolvedValue(null);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(alertMock).toHaveBeenCalledOnce();
    expect(alertMock).toHaveBeenCalledWith(
      'Nothing to export',
      'Storage appears empty.',
    );
    // Share must NOT be called — no bytes to export.
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('fires the "Nothing to export" Alert when exportRawStorageData returns an empty string', async () => {
    // An empty string is falsy — the !raw guard treats it the same as null.
    const exportRawStorageData = vi.fn().mockResolvedValue('');

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(alertMock).toHaveBeenCalledWith(
      'Nothing to export',
      'Storage appears empty.',
    );
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('fires "Nothing to export" Alert via PersistenceManager after a clear — end-to-end empty path', async () => {
    // Simulates: user clears all data → taps "Export raw data" on parse-error screen.
    // pm.clear() removes the storage key; exportRawStorageData (getItem) returns null.
    const store = makeStore({ [STORAGE_KEY]: '{"onboardingComplete":true}' });
    const pm = new PersistenceManager(store, STORAGE_KEY);
    await pm.clear();

    // exportRawStorageData reads directly from the storage adapter (AsyncStorage.getItem).
    const exportRawStorageData = async () => store.getItem(STORAGE_KEY);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(alertMock).toHaveBeenCalledWith(
      'Nothing to export',
      'Storage appears empty.',
    );
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('fires "Export failed" Alert when exportRawStorageData throws', async () => {
    // Simulates an unexpected I/O error (e.g. device locked during export).
    const exportRawStorageData = vi.fn().mockRejectedValue(new Error('AsyncStorage unavailable'));

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(alertMock).toHaveBeenCalledWith(
      'Export failed',
      'Could not read raw storage data.',
    );
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('fires "Export failed" Alert when Share.share throws (e.g. OS share sheet dismissed with error)', async () => {
    const exportRawStorageData = vi.fn().mockResolvedValue('{corrupt}');
    shareMock.mockRejectedValue(new Error('Share cancelled'));

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    expect(alertMock).toHaveBeenCalledWith(
      'Export failed',
      'Could not read raw storage data.',
    );
  });

  it('end-to-end: corrupt bytes flow from storage adapter through exportRawStorageData to Share.share', async () => {
    // Wires the full chain: PersistenceManager reads corrupt bytes via adapter,
    // exportRawStorageData (adapter.getItem) returns them, handler passes to share.
    const corruptBytes = '[[[[broken json here';
    const store = makeStore({ [STORAGE_KEY]: corruptBytes });
    const pm = new PersistenceManager(store, STORAGE_KEY);

    // Confirm hydration would fail with a parse error.
    const { error } = await pm.read<Record<string, unknown>>();
    expect(error).not.toBeNull(); // hydrationErrorKind = 'parse' in context

    // exportRawStorageData reads directly from storage (AsyncStorage.getItem).
    const exportRawStorageData = async () => store.getItem(STORAGE_KEY);

    await handleParseErrorExport({ exportRawStorageData, share: shareMock, alert: alertMock });

    // Bytes flow intact to the OS share sheet — not null, not transformed.
    expect(shareMock).toHaveBeenCalledWith({
      message: corruptBytes,
      title: 'CaloraApp raw storage data',
    });
    expect(alertMock).not.toHaveBeenCalled();
  });
});
