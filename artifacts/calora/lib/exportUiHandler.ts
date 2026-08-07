/**
 * exportUiHandler — pure export tap decision logic.
 *
 * Calls exportRawStorageData() and dispatches to one of two callbacks:
 *   • onNoData()        — storage is empty / post-clear (raw === null)
 *   • onData(raw)       — non-null bytes ready for the share sheet
 *
 * Extracting this from the Settings tap handler makes both UI branches
 * testable without mounting React, mocking AsyncStorage globally, or
 * spying on Alert inside a React Native render tree.
 *
 * Profile screen usage:
 *   await handleExportTap({
 *     exportRawStorageData,
 *     onNoData: () => Alert.alert('No data', '…'),
 *     onData:   () => setPrivacyModal('export'),
 *   });
 */
export async function handleExportTap(params: {
  /** CaloraContext.exportRawStorageData — reads raw storage bytes directly. */
  exportRawStorageData: () => Promise<string | null>;
  /** Called when storage is empty (null return) — show "No data" UI. */
  onNoData: () => void;
  /** Called with the raw JSON string when storage has content — open share sheet. */
  onData: (raw: string) => void;
}): Promise<void> {
  const raw = await params.exportRawStorageData();
  if (raw === null) {
    params.onNoData();
  } else {
    params.onData(raw);
  }
}
