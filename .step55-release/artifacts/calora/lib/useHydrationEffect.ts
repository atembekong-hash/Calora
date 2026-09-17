/**
 * useHydrationEffect — extracted hydration state machine shared by
 * CaloraProvider and integration tests.
 *
 * Owns all hydration lifecycle state:
 *   - hydrated / hydrationError / hydrationErrorKind
 *   - retryHydration (increments hydrationAttempt to re-trigger the effect)
 *
 * The caller supplies an `onSuccess` callback that receives the parsed saved
 * state (null on first-launch / empty storage).  This is the hook the test
 * exercises directly so the same code path is covered in both production and
 * the test suite.
 *
 * Error message strings match app/index.tsx's wording exactly — `hydrationError`
 * being non-null is what the screen uses as the visibility guard.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyStorageMigration, ParseHydrationError, type HydrationErrorKind } from './hydrationGuard';
import { STORAGE_SCHEMA_VERSION } from './storageSchema';
import type { PersistenceManager } from './persistenceManager';

export type HydrationEffectResult = {
  hydrated: boolean;
  hydrationError: string | null;
  hydrationErrorKind: HydrationErrorKind | null;
  retryHydration: () => void;
  /**
   * True from the moment the user taps 'Try Again' until the storage read
   * resolves (success or error).  Drives the disabled/loading state on the
   * error screen's retry button so a second tap gets clear feedback.
   */
  isRetrying: boolean;
};

/**
 * Manage the storage-read lifecycle for an injected PersistenceManager ref.
 *
 * @param pmRef     Ref to the PersistenceManager instance.  Using a ref (not
 *                  the value directly) matches how CaloraContext holds `pm`.
 * @param onSuccess Called with the parsed saved state when pm.read() succeeds.
 *                  Receives null on first launch or after a clear.  Errors are
 *                  handled internally — onSuccess is never called on failure.
 */
export function useHydrationEffect<T>(
  pmRef: React.RefObject<PersistenceManager>,
  onSuccess: (saved: T | null) => void,
): HydrationEffectResult {
  const [hydrated, setHydrated] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [hydrationErrorKind, setHydrationErrorKind] = useState<HydrationErrorKind | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Stable ref to onSuccess so the effect does not need it as a dependency.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  /**
   * True while a pm.read() promise is outstanding.  retryHydration checks
   * this ref and returns early when a read is already in flight — prevents
   * two concurrent reads from racing to set `hydrated` and `hydrationErrorKind`.
   */
  const readInFlight = useRef(false);

  useEffect(() => {
    // Keep hydrationError/hydrationErrorKind visible while the retry read is
    // in flight — the error screen stays mounted showing the previous error
    // message with a spinner on its 'Try Again' button.  They are cleared in
    // the SUCCESS branch of .then() once the read finishes cleanly, or
    // overwritten by a new value in .catch() on another failure.
    //
    // setHydrated(false) still hides the onboarding/tab screens during the
    // read so the user cannot navigate past a pending storage operation.
    setHydrated(false);

    readInFlight.current = true;

    pmRef.current.read<T & { schemaVersion?: number }>()
      .then(({ state: saved, error: parseError }) => {
        if (parseError) throw new ParseHydrationError(parseError);
        // Apply schema migrations before handing state to the app.
        // applyStorageMigration throws ParseHydrationError if the stored
        // version is newer than the app (downgrade) or if a migration step
        // is missing from the MIGRATIONS registry — both conditions surface
        // the existing "corrupt data" error UI via the .catch() branch below.
        // Null (empty storage / post-clear) bypasses migration entirely.
        const migrated = saved !== null
          ? applyStorageMigration(saved, STORAGE_SCHEMA_VERSION) as T
          : null;
        // SUCCESS BRANCH: clear error state here (not at the top of the effect)
        // so the error screen stays visible for the full duration of a retry
        // read.  Both fields are cleared atomically before handing state back
        // to the caller — hydrationError becomes null, which releases the
        // app/index.tsx `if (hydrationError || isRetrying)` guard once
        // isRetrying also clears in .finally().
        setHydrationError(null);
        setHydrationErrorKind(null);
        onSuccessRef.current(migrated);
      })
      .catch((err: unknown) => {
        if (err instanceof ParseHydrationError) {
          setHydrationErrorKind('parse');
          setHydrationError(
            'Your saved data could not be read — the encrypted copy may be corrupt and remains on this device. Export it before retrying.',
          );
        } else {
          setHydrationErrorKind('io');
          setHydrationError('Storage is temporarily unavailable. This is usually a momentary issue.');
        }
      })
      .finally(() => {
        readInFlight.current = false;
        setIsRetrying(false);
        setHydrated(true);
      });
  }, [hydrationAttempt, pmRef]);

  // Guard: if a read is already in flight (readInFlight.current === true), the
  // second tap is silently dropped.  This prevents two concurrent pm.read()
  // calls from racing to set `hydrated` and `hydrationErrorKind`, which could
  // leave the first read's stale callbacks clobbering the second read's result.
  //
  // Error state is NOT eagerly cleared here.  Keeping hydrationError/Kind set
  // means the error screen stays mounted — with its previous error message —
  // for the full duration of the retry read.  The effect's success branch
  // clears them once the read settles cleanly; .catch() overwrites them on a
  // subsequent failure.  isRetrying drives the button's spinner/disabled state
  // while the read is outstanding.
  const retryHydration = useCallback(() => {
    if (readInFlight.current) return;
    setIsRetrying(true);
    setHydrationAttempt((n) => n + 1);
  }, []);

  return { hydrated, hydrationError, hydrationErrorKind, retryHydration, isRetrying };
}
