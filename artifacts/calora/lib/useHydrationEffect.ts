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
import { ParseHydrationError, type HydrationErrorKind } from './hydrationGuard';
import type { PersistenceManager } from './persistenceManager';

export type HydrationEffectResult = {
  hydrated: boolean;
  hydrationError: string | null;
  hydrationErrorKind: HydrationErrorKind | null;
  retryHydration: () => void;
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
    // Clear error state before starting the read.  This is the moment
    // hydrationError becomes null — the error screen guard (`if hydrationError`)
    // in app/index.tsx immediately stops rendering the error UI.
    setHydrationError(null);
    setHydrationErrorKind(null);
    setHydrated(false);

    readInFlight.current = true;

    pmRef.current.read<T>()
      .then(({ state: saved, error: parseError }) => {
        if (parseError) throw new ParseHydrationError(parseError);
        // SUCCESS BRANCH: never calls setHydrationError or setHydrationErrorKind.
        // hydrationError stays null throughout, so app/index.tsx's `if (hydrationError)`
        // guard remains false — the parse-error screen cannot reappear.
        onSuccessRef.current(saved);
      })
      .catch((err: unknown) => {
        if (err instanceof ParseHydrationError) {
          setHydrationErrorKind('parse');
          setHydrationError(
            'Your saved data could not be read — the file may be corrupt. Your data is still on device and can be exported before retrying.',
          );
        } else {
          setHydrationErrorKind('io');
          setHydrationError('Storage is temporarily unavailable. This is usually a momentary issue.');
        }
      })
      .finally(() => {
        readInFlight.current = false;
        setHydrated(true);
      });
  }, [hydrationAttempt, pmRef]);

  // Eagerly reset ALL error state and hydrated so no stale render between the
  // tap and the effect re-running can show the error screen.
  // app/index.tsx guards on `if (hydrationError)` — clearing it here (not just
  // in the effect) closes the race window where hydrationError is still truthy
  // but hydrationErrorKind is already null.
  //
  // Guard: if a read is already in flight (readInFlight.current === true), the
  // second tap is silently dropped.  This prevents two concurrent pm.read()
  // calls from racing to set `hydrated` and `hydrationErrorKind`, which could
  // leave the first read's stale callbacks clobbering the second read's result.
  const retryHydration = useCallback(() => {
    if (readInFlight.current) return;
    setHydrationError(null);
    setHydrationErrorKind(null);
    setHydrated(false);
    setHydrationAttempt((n) => n + 1);
  }, []);

  return { hydrated, hydrationError, hydrationErrorKind, retryHydration };
}
