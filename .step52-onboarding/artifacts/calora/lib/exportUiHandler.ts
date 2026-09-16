/**
 * exportUiHandler — pure export tap decision logic.
 *
 * Calls exportRawStorageData() and dispatches to one of two callbacks:
 *   • onNoData()          — storage is empty / post-clear (raw === null)
 *   • onData(payload)     — non-null bytes ready for the share sheet
 *
 * onData receives an ExportPayload so the share sheet always has the correct
 * file name and MIME type regardless of which share API the caller uses
 * (expo-sharing, React Native Share, etc.).
 *
 * shareExportFile writes the payload to a named temp file then invokes the
 * platform share sheet with the correct MIME type via expo-sharing, so iOS
 * and Android route to Files, email, etc. rather than messaging apps.
 *
 * Also exports deriveExportHasData — a pure boolean helper that the profile
 * screen uses to disable and visually dim the "Export your data" row BEFORE
 * the user taps it, so no reactive Alert is needed for the empty-storage case.
 *
 * Profile screen usage:
 *   await handleExportTap({
 *     exportRawStorageData,
 *     onNoData: () => Alert.alert('No data', '…'),
 *     onData:   (payload) =>
 *       shareExportFile(payload, {
 *         cacheDirectory:    FileSystem.cacheDirectory,
 *         writeAsStringAsync: FileSystem.writeAsStringAsync,
 *         shareAsync:         Sharing.shareAsync,
 *       }).catch(() => Alert.alert('Export failed', '…')),
 *   });
 */

/** Metadata bundle passed to the share-sheet callback. */
export interface ExportPayload {
  /** Raw JSON string produced by exportRawStorageData(). */
  content: string;
  /** File name the share sheet should use when writing the file. */
  filename: string;
  /** MIME type so iOS/Android can route to Files, email, etc. */
  mimeType: string;
}

/** Canonical export file name — share sheet and file system use this. */
export const EXPORT_FILENAME = 'caloraapp-export.json';

/** MIME type for the export — routes the share sheet to appropriate apps. */
export const EXPORT_MIME_TYPE = 'application/json';

/**
 * Adapter interface for the platform file-system and sharing APIs.
 *
 * Using an adapter makes the function fully testable without mounting React or
 * reaching into real native modules. In production, pass the real
 * expo-file-system and expo-sharing implementations.
 */
export interface FileShareAdapter {
  /** Writable cache directory URI (FileSystem.cacheDirectory). */
  cacheDirectory: string | null;
  /**
   * Write a string to a local file URI.
   * Maps to FileSystem.writeAsStringAsync from expo-file-system.
   */
  writeAsStringAsync: (fileUri: string, contents: string) => Promise<void>;
  /**
   * Open the platform share sheet for a local file URI.
   * Maps to Sharing.shareAsync from expo-sharing.
   *
   * mimeType routes Android to the correct app (Files, email, etc.).
   * dialogTitle labels the file in the share sheet on Android / web.
   */
  shareAsync: (uri: string, options: { mimeType: string; dialogTitle: string }) => Promise<void>;
}

/**
 * Returns true when there is at least one piece of shareable local data.
 *
 * The export row should be interactive only when this is true.
 * Rule: profile set OR at least one diary log present.
 *
 * @param profile - CaloraContext.profile (null when onboarding not complete)
 * @param logs    - CaloraContext.logs (FoodLog array)
 */
export function deriveExportHasData(
  profile: { name: string } | null,
  logs: unknown[],
): boolean {
  return profile !== null || logs.length > 0;
}

/**
 * Writes the export payload to a named file in the cache directory, then
 * opens the platform share sheet with the correct MIME type via the adapter.
 *
 * The adapter is injectable for testing. Production callers pass the real
 * expo-file-system and expo-sharing implementations:
 *
 *   import * as FileSystem from 'expo-file-system/legacy';
 *   import * as Sharing from 'expo-sharing';
 *
 *   await shareExportFile(payload, {
 *     cacheDirectory:     FileSystem.cacheDirectory,
 *     writeAsStringAsync: FileSystem.writeAsStringAsync,
 *     shareAsync:         Sharing.shareAsync,
 *   });
 *
 * Errors (write failure, share sheet unavailable, share cancelled) are
 * propagated to the caller — profile.tsx catches them with an Alert.
 */
export async function shareExportFile(
  payload: ExportPayload,
  adapter: FileShareAdapter,
): Promise<void> {
  const dir = adapter.cacheDirectory ?? '';
  const fileUri = dir + payload.filename;
  await adapter.writeAsStringAsync(fileUri, payload.content);
  await adapter.shareAsync(fileUri, {
    mimeType: payload.mimeType,
    dialogTitle: payload.filename,
  });
}

/**
 * Builds an export handler that is safe to fire concurrently.
 *
 * The caller supplies a plain `{ current: boolean }` ref — typically a React
 * `useRef(false)` — which acts as a synchronous mutex.  Because the ref is
 * checked and set *before* the first `await`, two rapid invocations that share
 * the same event-loop tick both see the same `current` value; the second one
 * returns immediately without starting a duplicate export.
 *
 * `setLoading` is called with `true`/`false` purely for UI feedback (spinner,
 * disabled state) and does NOT close the race — that is the ref's job.
 *
 * Profile screen usage:
 *   const exportLockRef = useRef(false);
 *   const [isExporting, setIsExporting] = useState(false);
 *   const handleExport = useMemo(
 *     () => makeExportHandler(exportLockRef, exportRawStorageData, adapter, {
 *       setLoading: setIsExporting,
 *       onNoData:   () => Alert.alert('No data', '…'),
 *       onError:    () => Alert.alert('Export failed', '…'),
 *     }),
 *     [],
 *   );
 */
export function makeExportHandler(
  lockRef: { current: boolean },
  exportRawStorageData: () => Promise<string | null>,
  adapter: FileShareAdapter,
  callbacks: {
    setLoading: (loading: boolean) => void;
    onNoData: () => void;
    onError: () => void;
  },
): () => Promise<void> {
  return async () => {
    // Synchronous check-and-set — safe even when two taps land in the same frame.
    if (lockRef.current) return;
    lockRef.current = true;
    callbacks.setLoading(true);
    try {
      const raw = await exportRawStorageData();
      if (raw === null) {
        callbacks.onNoData();
        return;
      }
      await shareExportFile(
        { content: raw, filename: EXPORT_FILENAME, mimeType: EXPORT_MIME_TYPE },
        adapter,
      );
    } catch {
      callbacks.onError();
    } finally {
      lockRef.current = false;
      callbacks.setLoading(false);
    }
  };
}

export async function handleExportTap(params: {
  /** CaloraContext.exportRawStorageData — reads raw storage bytes directly. */
  exportRawStorageData: () => Promise<string | null>;
  /** Called when storage is empty (null return) — show "No data" UI. */
  onNoData: () => void;
  /**
   * Called with a fully-populated ExportPayload when storage has content.
   * The payload includes content, filename, and mimeType so the caller can
   * hand them directly to shareExportFile (or another share helper) without
   * re-deriving the metadata.
   */
  onData: (payload: ExportPayload) => void;
}): Promise<void> {
  const raw = await params.exportRawStorageData();
  if (raw === null) {
    params.onNoData();
  } else {
    params.onData({
      content: raw,
      filename: EXPORT_FILENAME,
      mimeType: EXPORT_MIME_TYPE,
    });
  }
}
