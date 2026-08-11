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
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCalora } from '@/context/CaloraContext';
import {
  loadSyncedIds,
  syncDiaryLogs,
  syncDiaryDeletes,
  isStarterLog,
} from '@/lib/diarySync';

export function useDiarySync() {
  const { user } = useAuth();
  const { logs, hydrated } = useCalora();

  /**
   * The set of log IDs that have been confirmed by the server at any point.
   * Loaded from the persisted AsyncStorage key on mount and kept current as
   * syncs succeed or deletes are sent.
   */
  const syncedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Load the persisted synced-ID set once on mount so we can detect
  // deletions across app restarts.
  useEffect(() => {
    loadSyncedIds().then((ids) => {
      syncedIdsRef.current = ids;
      initializedRef.current = true;
    }).catch(() => {
      initializedRef.current = true;
    });
  }, []);

  // A stable key that changes when any log is added, removed, or edited.
  // Using id:date:meal:name:calories covers additions and common edits
  // without depending on the full array reference.
  const logsKey = logs
    .filter((l) => !isStarterLog(l))
    .map((l) => `${l.id}:${l.date}:${l.meal}:${l.name}:${Math.round(l.calories)}`)
    .join('|');

  const syncInProgressRef = useRef(false);

  useEffect(() => {
    if (!user || !hydrated || !initializedRef.current) return;
    if (syncInProgressRef.current) return;

    syncInProgressRef.current = true;

    const currentNonStarterIds = new Set(
      logs.filter((l) => !isStarterLog(l)).map((l) => l.id),
    );

    // IDs that were synced before but are no longer in the local diary.
    const removedIds = [...syncedIdsRef.current].filter(
      (id) => !currentNonStarterIds.has(id),
    );

    const run = async () => {
      try {
        // Delete before upserting so a re-added entry with the same clientId
        // doesn't get deleted by a racing delete mutation.
        if (removedIds.length > 0) {
          await syncDiaryDeletes(removedIds);
          // Refresh synced set after deletes.
          const updated = await loadSyncedIds();
          syncedIdsRef.current = updated;
        }

        const newSyncedIds = await syncDiaryLogs(logs);
        syncedIdsRef.current = newSyncedIds;
      } catch (err) {
        console.warn('[diary-sync] background sync failed', err);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    void run();
  // Re-run when auth state changes or the diary content changes (add/edit/delete).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated, logsKey]);
}
