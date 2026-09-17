import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { msUntilNextHour } from '@/lib/clockHelpers';

export { msUntilNextHour };

/**
 * Returns the current `Date`, refreshed automatically:
 *
 *  • **AppState background → active** — fires when the app returns from the
 *    background (e.g. the user locks the screen and comes back hours later).
 *    This is the primary mechanism for the home-screen action-button to stay
 *    correct after a long background pause.
 *
 *  • **Hourly tick** — fires at the top of each new local hour while the app
 *    stays in the foreground, handling time-period transitions (morning →
 *    midday → afternoon → evening) without requiring any data change.
 *
 * Including this value in the `livingState` useMemo dependency array ensures
 * `deriveLivingState` always re-runs with a fresh `now`, so the action button
 * label and kind are never stale after a background resume or an hour rollover.
 */
export function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // ── 1. Refresh when the app returns from the background ──────────────────
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setNow(new Date());
      }
    });

    // ── 2. Tick at the top of each local hour ────────────────────────────────
    let timer: ReturnType<typeof setTimeout>;

    function scheduleNextTick(): void {
      const delay = msUntilNextHour(new Date());
      timer = setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, delay);
    }

    scheduleNextTick();

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, []);

  return now;
}
