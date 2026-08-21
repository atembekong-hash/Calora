/**
 * Background diary sync hook.
 *
 * Fires whenever the user is authenticated and the diary changes — both
 * when new entries are added and when existing entries are edited. Also
 * detects local deletions (entries that were previously synced to the server
 * but have since been removed from the local diary) and sends corresponding
 * delete mutations so the server stays in sync.
 *
 * The sync is best-effort: failures are logged but never surface to the UI,
 * and the local diary remains the source of truth at all times.
 *
 * Concurrency: if a second diary change arrives while a sync run is in
 * flight, syncInProgressRef blocks a duplicate run. When the in-flight run
 * finishes it compares the logsKey it started with against the latest value
 * (tracked in logsKeyRef). If they differ, it bumps syncGeneration, which
 * re-fires the effect so the missed change is picked up immediately.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCalora } from '@/context/CaloraContext';
import {
  loadSyncedIds,
  ensureSigsLoaded,
  syncDiaryLogs,
  syncDiaryDeletes,
  isStarterLog,
  setDiarySyncAccountScope,
} from '@/lib/diarySync';

export function useDiarySync() {
  const { user, session } = useAuth();
  const { logs, hydrated } = useCalora();

  /**
   * The set of log IDs that have been confirmed by the server at any point.
   * Loaded from the persisted AsyncStorage key on mount and kept current as
   * syncs succeed or deletes are sent.
   */
  const syncedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Load the persisted synced-ID set and content signatures once per account.
  // Loading signatures here means the first sync after a restart will skip
  // entries that were already accepted by the server with identical content,
  // avoiding a full re-batch of hundreds of historical entries.
  useEffect(() => {
    let active = true;
    setDiarySyncAccountScope(user?.id);
    Promise.all([loadSyncedIds(), ensureSigsLoaded()])
      .then(([ids]) => {
        if (!active) return;
        syncedIdsRef.current = ids;
        initializedRef.current = true;
      })
      .catch(() => {
        if (!active) return;
        initializedRef.current = true;
      });
    return () => { active = false; };
  }, [user?.id]);

  // A stable key that changes when any log is added, removed, or edited.
  // Include image metadata so a provider image arriving after initial logging
  // is persisted even when nutrition and meal details have not changed.
  // without depending on the full array reference.
  const logsKey = logs
    .filter((l) => !isStarterLog(l))
    .map((l) => `${l.id}:${l.date}:${l.meal}:${l.name}:${Math.round(l.calories)}:${l.imageUrl ?? ''}:${l.imageSource ?? ''}`)
    .join('|');

  // Always reflects the latest logsKey so the in-flight run can detect drift
  // even after the component has re-rendered.
  const logsKeyRef = useRef(logsKey);
  logsKeyRef.current = logsKey;

  const syncInProgressRef = useRef(false);

  // Bumped after a sync run finishes when it detects that logsKey changed
  // while the run was in flight. Incrementing this causes the effect to
  // re-fire so the missed change is picked up immediately.
  const [syncGeneration, setSyncGeneration] = useState(0);

  useEffect(() => {
    if (!user || !session?.access_token || !hydrated || !initializedRef.current) return;
    if (syncInProgressRef.current) return;

    // Snapshot the key this run was started with so we can detect drift later.
    const logsKeyAtStart = logsKey;
    const accessTokenAtStart = session.access_token;
    syncInProgressRef.current = true;

    const currentNonStarterIds = new Set(
      logs.filter((l) => !isStarterLog(l)).map((l) => l.id),
    );

    // IDs that were synced before but are no longer in the local diary.
    const removedIds = [...syncedIdsRef.current].filter(
      (id) => !currentNonStarterIds.has(id),
    );

    let active = true;
    const run = async () => {
      try {
        // Delete before upserting so a re-added entry with the same clientId
        // doesn't get deleted by a racing delete mutation.
        if (removedIds.length > 0) {
          await syncDiaryDeletes(removedIds, accessTokenAtStart);
          if (!active) return;
          // Refresh synced set after deletes.
          const updated = await loadSyncedIds();
          syncedIdsRef.current = updated;
        }

        const newSyncedIds = await syncDiaryLogs(logs, accessTokenAtStart);
        if (!active) return;
        syncedIdsRef.current = newSyncedIds;
      } catch (err) {
        console.warn('[diary-sync] background sync failed', err);
      } finally {
        syncInProgressRef.current = false;

        // If logsKey changed while this run was in flight, a follow-up sync
        // is needed. Bumping syncGeneration re-fires the effect immediately
        // with the current logs so the missed change is not dropped.
        // This must also run after this effect instance has been cleaned up:
        // the replacement effect initially sees the shared in-flight guard and
        // exits, so leaving without this bump would strand future syncs.
        if (!active || logsKeyRef.current !== logsKeyAtStart) {
          setSyncGeneration((g) => g + 1);
        }
      }
    };

    void run();
    return () => { active = false; };
  // Re-run when auth state changes, the diary content changes (add/edit/delete),
  // or a follow-up sync was queued because a change arrived mid-flight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session?.access_token, hydrated, logsKey, syncGeneration]);
}
