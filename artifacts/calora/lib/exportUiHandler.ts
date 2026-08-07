/**
 * exportUiHandler — pure export tap decision logic.
 *
 * Calls exportRawStorageData() and dispatches to one of two callbacks:
 *   • onNoData()        — storage is empty / post-clear (raw === null)
 *   • onData(raw)       — non-null bytes ready for the share sheet
 *
 * Also exports deriveExportHasData — a pure boolean helper that the profile
 * screen uses to disable and visually dim the "Export your data" row BEFORE
 * the user taps it, so no reactive Alert is needed for the empty-storage case.
 *
 * Profile screen usage:
 *   await handleExportTap({
 *     exportRawStorageData,
 *     onNoData: () => Alert.alert('No data', '…'),
 *     onData:   () => setPrivacyModal('export'),
 *   });
 */

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
