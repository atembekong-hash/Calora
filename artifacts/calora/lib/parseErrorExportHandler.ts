/**
 * Pure, injectable export handler for the parse-error screen.
 *
 * Extracted so it can be unit-tested without mounting React or
 * touching the real AsyncStorage / Share / Alert APIs.
 *
 * CaloraContext wires the real implementations:
 *   handleParseErrorExport({
 *     exportRawStorageData: ctx.exportRawStorageData,
 *     share:  Share.share,
 *     alert:  Alert.alert,
 *   })
 */

export interface ShareOptions {
  message: string;
  title: string;
}

export interface ParseErrorExportDeps {
  /** Returns the raw storage string, or null when storage is empty. */
  exportRawStorageData: () => Promise<string | null>;
  /** OS share sheet (Share.share from react-native). */
  share: (opts: ShareOptions) => Promise<unknown>;
  /** Alert dialog (Alert.alert from react-native). */
  alert: (title: string, message: string) => void;
}

/**
 * Runs the "Export raw data" flow for the parse-error screen:
 *   1. Reads raw bytes via exportRawStorageData.
 *   2. If null → shows "Nothing to export" Alert (storage genuinely empty).
 *   3. If non-null → passes bytes verbatim to Share.share.
 *   4. On unexpected error → shows "Export failed" Alert.
 */
export async function handleParseErrorExport(deps: ParseErrorExportDeps): Promise<void> {
  try {
    const raw = await deps.exportRawStorageData();
    if (!raw) {
      deps.alert('Nothing to export', 'Storage appears empty.');
      return;
    }
    await deps.share({ message: raw, title: 'Calora raw storage data' });
  } catch {
    deps.alert('Export failed', 'Could not read raw storage data.');
  }
}
