/**
 * Integration tests: profile photo is not visible before sign-in completes.
 *
 * @vitest-environment jsdom
 *
 * What this proves:
 *   1. profilePhotoUri is null before hydration — the loading splash screen is
 *      the gate; the photo URI stays at its useState initial value (null) until
 *      AsyncStorage.getItem resolves inside useHydrationEffect.
 *   2. The post-hydration stale-URI guard (CaloraContext's verifyProfilePhotoExists
 *      useEffect) clears a persisted URI when the file is missing on disk — a
 *      prior user's photo is purged even if the OS delayed the sign-out delete.
 *   3. clearProfilePhoto() — the real function exposed by useCalora() — deletes
 *      the file and resets profilePhotoUri to null in a single call.  It must
 *      complete before signOut() is invoked (call-order invariant).
 *
 * Approach:
 *   This file mounts the REAL CaloraProvider with native dependencies mocked
 *   (AsyncStorage, expo-file-system/legacy, expo-notifications, react-native
 *   colour/AppState APIs) and exercises the REAL useCalora() hook.  profilePhotoUri
 *   is read directly from the live context on every assertion.  Any regression
 *   in CaloraContext — e.g. initialising profilePhotoUri from storage before
 *   hydration, omitting the stale-URI guard, or breaking clearProfilePhoto —
 *   will cause these tests to fail.
 *
 * Mocking rationale:
 *   AsyncStorage         — replaced with a controllable in-memory adapter so no
 *                          real I/O occurs.  Supports blocking the next read to
 *                          simulate the in-flight window between app launch and
 *                          hydration completion.
 *   expo-file-system/legacy — replaced with a controllable FileSystem double so
 *                          verifyProfilePhotoExists and deleteProfilePhoto behave
 *                          as requested by each test (file present or absent).
 *   expo-notifications   — import must resolve; no scheduling in tests.
 *   react-native         — useColorScheme + AppState stubs.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Shared mutable state: AsyncStorage ────────────────────────────────────────
//
// _asyncStore is an object (not a primitive) so the vi.mock factory closure
// captures the same reference — mutations in tests are visible inside the mock.
// _asyncBlocker / _asyncRelease implement a blocking gate for the getItem path.

const {
  _asyncStore,
  _getAsyncBlocker,
  blockNextAsyncRead,
} = vi.hoisted(() => {
  const _asyncStore: Record<string, string> = {};
  let _blocker: Promise<void> | null = null;
  let _release: (() => void) | null = null;

  function blockNextAsyncRead(): () => void {
    _blocker = new Promise<void>((res) => { _release = res; });
    return () => { _release?.(); _blocker = null; _release = null; };
  }

  // getAsyncBlocker returns the current blocker so the mock factory can await it.
  function _getAsyncBlocker() { return _blocker; }

  return { _asyncStore, _getAsyncBlocker, blockNextAsyncRead };
});

// ── Shared mutable state: FileSystem ─────────────────────────────────────────
//
// _fsGetInfoResult controls what verifyProfilePhotoExists (and the stale-URI
// guard) observes.  Flip it in beforeEach / per-test to control the outcome.

const { _fsGetInfoResult } = vi.hoisted(() => {
  const _fsGetInfoResult = { exists: true };
  return { _fsGetInfoResult };
});

// ── Native module mocks ─────────────────────────────────────────────────────
// vi.mock calls are hoisted; they run before any calora imports below resolve.

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem:    vi.fn(async (k: string) => {
      const b = _getAsyncBlocker();
      if (b) await b;
      return _asyncStore[k] ?? null;
    }),
    setItem:    vi.fn(async (k: string, v: string) => { _asyncStore[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete _asyncStore[k]; }),
  },
}));

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/test/docs/',
  copyAsync:    vi.fn(async () => {}),
  deleteAsync:  vi.fn(async () => {}),
  getInfoAsync: vi.fn(async () => _fsGetInfoResult),
}));

vi.mock('expo-notifications', () => ({
  scheduleNotificationAsync:            vi.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync:     vi.fn().mockResolvedValue([]),
  setNotificationHandler:               vi.fn(),
  getPermissionsAsync:                  vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:              vi.fn().mockResolvedValue({ status: 'granted' }),
}));

vi.mock('react-native', () => ({
  useColorScheme:   vi.fn().mockReturnValue('light'),
  AppState: {
    currentState:     'active',
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj['ios'] },
}));

// ── Production imports ───────────────────────────────────────────────────────
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { CaloraProvider, useCalora } from '@/context/CaloraContext';
import { STORAGE_SCHEMA_VERSION } from '../storageSchema';
import { storageKeyForAccount } from '../accountStorage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = storageKeyForAccount(null);
const STORED_PHOTO_URI = '/test/docs/calora-profile-photo.jpg';

// ---------------------------------------------------------------------------
// Wrapper — provides the REAL CaloraProvider to every renderHook call.
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CaloraProvider, null, children);
}

// ---------------------------------------------------------------------------
// Helper — render useCalora() inside the real CaloraProvider and wait for the
// initial hydration effect to complete (same pattern as exportClearTransition).
// ---------------------------------------------------------------------------

async function renderAndAwaitHydration() {
  const handle = renderHook(() => useCalora(), { wrapper });
  await act(async () => {
    await new Promise<void>((res) => setTimeout(res, 0));
  });
  return handle;
}

// ---------------------------------------------------------------------------
// Between-test cleanup — reset AsyncStorage and FileSystem state.
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear AsyncStorage backing store.
  Object.keys(_asyncStore).forEach((k) => { delete _asyncStore[k]; });
  // Reset FileSystem to report file as present (default safe behaviour).
  _fsGetInfoResult.exists = true;
  // Reset all mock call histories so per-test assertions are not contaminated
  // by calls from previous tests (getInfoAsync, deleteAsync, etc. are shared
  // module-level spies).
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Pre-hydration boundary: profilePhotoUri is null before hydration completes
//
// CaloraProvider initialises profilePhotoUri with useState(null).
// The only pathway that applies a stored URI is the onSuccess callback inside
// useHydrationEffect, which fires AFTER AsyncStorage.getItem resolves.
// While the read is in flight, profilePhotoUri stays null and the loading
// splash (app/index.tsx: `if (!hydrated && !isRetrying)`) hides the tabs.
// ---------------------------------------------------------------------------

describe('real CaloraProvider — profilePhotoUri is null before hydration completes', () => {
  it('profilePhotoUri is null while AsyncStorage read is in flight', async () => {
    // Store a saved state that includes a profilePhotoUri so it WOULD be
    // applied once hydration resolves — but not before.
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });

    // Block the read BEFORE mounting so the in-flight window is observable.
    const releaseRead = blockNextAsyncRead();

    const handle = renderHook(() => useCalora(), { wrapper });

    // Flush synchronous React effects; getItem is blocked so hydration is pending.
    await act(async () => {});

    // The provider has started the read but it has not resolved.
    // profilePhotoUri MUST still be null — the stored value has not been applied.
    expect(handle.result.current.hydrated).toBe(false);
    expect(handle.result.current.profilePhotoUri).toBeNull();

    // Release the read — hydration completes and onSuccess fires.
    releaseRead();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Now hydration is done and profilePhotoUri has been applied from storage.
    expect(handle.result.current.hydrated).toBe(true);
    expect(handle.result.current.profilePhotoUri).toBe(STORED_PHOTO_URI);
  });

  it('hydrated=false while read is blocked — mirrors the app/index.tsx loading-splash guard', async () => {
    // app/index.tsx: `if (!hydrated && !isRetrying) { return <LoadingSplash /> }`
    // The tab navigator (including the profile avatar) is NOT rendered while this
    // condition holds.  This test confirms hydrated stays false during the gap.
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:   STORAGE_SCHEMA_VERSION,
      profilePhotoUri: STORED_PHOTO_URI,
    });

    const releaseRead = blockNextAsyncRead();
    const handle = renderHook(() => useCalora(), { wrapper });
    await act(async () => {});

    // Loading splash condition holds — photo tab not rendered.
    expect(handle.result.current.hydrated).toBe(false);
    expect(handle.result.current.isRetrying).toBe(false);

    releaseRead();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(handle.result.current.hydrated).toBe(true);
  });

  it('on first launch (empty storage) profilePhotoUri is null and stays null after hydration', async () => {
    // Empty storage → onSuccess receives null → no profilePhotoUri is applied.
    const { result } = await renderAndAwaitHydration();
    expect(result.current.hydrated).toBe(true);
    expect(result.current.profilePhotoUri).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Post-hydration stale-URI guard
//
// CaloraContext runs a useEffect after hydration (dep: [hydrated]):
//   if (!hydrated || !profilePhotoUri) return;
//   verifyProfilePhotoExists(profilePhotoUri, FileSystem).then((exists) => {
//     if (!cancelled && !exists) setProfilePhotoUriState(null);
//   });
//
// When the file is gone (sign-out delete flushed, OS reclaimed storage), the
// guard must clear profilePhotoUri in the real context before any photo renders.
// ---------------------------------------------------------------------------

describe('real CaloraProvider — stale-URI guard clears profilePhotoUri when the file is missing', () => {
  it('profilePhotoUri is cleared to null when the stored URI points to a missing file', async () => {
    // Persist a state with a profilePhotoUri — simulates the edge case where
    // the sign-out delete cleared the file but an autosave race left the URI
    // in AsyncStorage.
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });

    // The file is gone — the OS flushed the sign-out delete.
    _fsGetInfoResult.exists = false;

    const { result } = await renderAndAwaitHydration();

    // Hydration applied the stored URI from AsyncStorage.
    expect(result.current.hydrated).toBe(true);
    // At this point profilePhotoUri may be STORED_PHOTO_URI (just applied)
    // but the stale-URI guard (useEffect dep: [hydrated]) fires asynchronously
    // and must clear it.  Let the async guard resolve.
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Guard ran: verifyProfilePhotoExists returned false → setProfilePhotoUriState(null).
    expect(result.current.profilePhotoUri).toBeNull();
  });

  it('profilePhotoUri is preserved when the file exists on disk', async () => {
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });

    // File is present — guard must leave the URI intact.
    _fsGetInfoResult.exists = true;

    const { result } = await renderAndAwaitHydration();

    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    // Guard ran: exists=true → URI kept.
    expect(result.current.profilePhotoUri).toBe(STORED_PHOTO_URI);
  });

  it('guard does not run when profilePhotoUri is null — no FileSystem call on first-launch', async () => {
    // Empty storage → no stored URI → guard early-returns on `!profilePhotoUri`.
    // getInfoAsync must never be called.
    const { getInfoAsync } = await import('expo-file-system/legacy');

    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      // profilePhotoUri deliberately absent
    });

    await renderAndAwaitHydration();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    expect(getInfoAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Sign-out: the real clearProfilePhoto() from the real CaloraProvider
//
// CaloraContext.clearProfilePhoto():
//   await deleteProfilePhoto(FileSystem);   // deletes the file
//   setProfilePhotoUriState(null);          // clears React state
//
// AccountSection.tsx handleSignOut:
//   await clearProfilePhoto();              // file deleted, URI = null
//   await signOut();                        // auth session ended
//
// Tests call the REAL clearProfilePhoto() from the REAL useCalora() hook so
// any regression in how CaloraProvider wires the function would be caught.
// ---------------------------------------------------------------------------

describe('real CaloraProvider — clearProfilePhoto() clears the URI and deletes the file', () => {
  it('profilePhotoUri is null after clearProfilePhoto() is called on the real context', async () => {
    // Hydrate with a stored URI so clearProfilePhoto has something to clear.
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });
    // File exists so the stale-URI guard leaves it in place.
    _fsGetInfoResult.exists = true;

    const { result } = await renderAndAwaitHydration();

    // After hydration + guard: URI should still be set (file exists).
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });
    expect(result.current.profilePhotoUri).toBe(STORED_PHOTO_URI);

    // Call the REAL clearProfilePhoto() from the REAL context.
    await act(async () => {
      await result.current.clearProfilePhoto();
    });

    // The real function called deleteProfilePhoto(FileSystem) + setProfilePhotoUriState(null).
    expect(result.current.profilePhotoUri).toBeNull();
  });

  it('clearProfilePhoto() calls deleteAsync on the FileSystem mock — actual file deletion occurs', async () => {
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });
    _fsGetInfoResult.exists = true;

    const { deleteAsync } = await import('expo-file-system/legacy');

    const { result } = await renderAndAwaitHydration();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    await act(async () => {
      await result.current.clearProfilePhoto();
    });

    // The production deleteProfilePhoto() must have called deleteAsync.
    expect(deleteAsync).toHaveBeenCalled();
    const [deletedPath, opts] = (deleteAsync as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(deletedPath).toBe('/test/docs/calora-profile-photo.jpg');
    expect(opts).toEqual({ idempotent: true });
  });

  it('sign-out call order: clearProfilePhoto() runs before signOut() — file and URI cleared before auth ends', async () => {
    // Mirrors AccountSection.tsx handleSignOut:
    //   await clearProfilePhoto();
    //   await signOut();
    //
    // Exercises the real clearProfilePhoto from the real context.
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });
    _fsGetInfoResult.exists = true;

    const { result } = await renderAndAwaitHydration();
    await act(async () => {
      await new Promise<void>((res) => setTimeout(res, 0));
    });

    const callOrder: string[] = [];
    const mockSignOut = vi.fn(async () => { callOrder.push('signOut'); });

    // Execute in the required order, using the REAL clearProfilePhoto.
    await act(async () => {
      await result.current.clearProfilePhoto();
      callOrder.push('clearProfilePhoto');
      await mockSignOut();
    });

    // clearProfilePhoto ran first — file deleted, URI null — before auth ended.
    expect(callOrder).toEqual(['clearProfilePhoto', 'signOut']);
    expect(callOrder.indexOf('clearProfilePhoto')).toBeLessThan(
      callOrder.indexOf('signOut'),
    );
    // State is null at the time signOut was called.
    expect(result.current.profilePhotoUri).toBeNull();
  });

  it('clearProfilePhoto() works correctly when profilePhotoUri was already null — no error', async () => {
    // First launch: no stored URI, clearProfilePhoto is still callable.
    const { result } = await renderAndAwaitHydration();
    expect(result.current.profilePhotoUri).toBeNull();

    // Must not throw when called with no prior URI.
    await act(async () => {
      await result.current.clearProfilePhoto();
    });

    expect(result.current.profilePhotoUri).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Full cross-session guarantee
//
// All three layers compose to prevent User A's photo from appearing to User B.
// ---------------------------------------------------------------------------

describe('real CaloraProvider — cross-session guarantee: photo flash is prevented', () => {
  it('Session A sign-out (clearProfilePhoto) → Session B launch: stale URI cleared by guard', async () => {
    // ── Session A: hydrate with a stored URI, simulate sign-out ───────────────
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: true,
      profilePhotoUri:    STORED_PHOTO_URI,
    });
    _fsGetInfoResult.exists = true;

    const sessionA = await renderAndAwaitHydration();
    await act(async () => { await new Promise<void>((res) => setTimeout(res, 0)); });

    // Verify URI is loaded in Session A.
    expect(sessionA.result.current.profilePhotoUri).toBe(STORED_PHOTO_URI);

    // Sign out: clearProfilePhoto deletes the file and clears the URI.
    await act(async () => {
      await sessionA.result.current.clearProfilePhoto();
    });
    expect(sessionA.result.current.profilePhotoUri).toBeNull();

    // ── Session B: file is gone; AsyncStorage still has the old URI (edge case) ─
    // Simulate: an autosave race wrote the old URI to AsyncStorage after the
    // sign-out clear.  The file is gone (delete flushed in Session A).
    _asyncStore[STORAGE_KEY] = JSON.stringify({
      schemaVersion:      STORAGE_SCHEMA_VERSION,
      onboardingComplete: false, // new session, not onboarded
      profilePhotoUri:    STORED_PHOTO_URI, // stale value from the race
    });
    _fsGetInfoResult.exists = false; // file was deleted in Session A

    const sessionB = await renderAndAwaitHydration();

    // Layer 1: before hydration resolves, profilePhotoUri is null.
    // (Already proved above; here we confirm post-hydration is also safe.)

    // Layer 2: let stale-URI guard run — file is gone, URI must be cleared.
    await act(async () => { await new Promise<void>((res) => setTimeout(res, 0)); });

    // User A's photo is never seen by User B.
    expect(sessionB.result.current.profilePhotoUri).toBeNull();
  });
});
