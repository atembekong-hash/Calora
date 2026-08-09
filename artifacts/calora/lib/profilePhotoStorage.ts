/**
 * profilePhotoStorage.ts
 *
 * Pure functions that wrap the two FileSystem operations used by the profile
 * photo flow (copy on pick, delete on remove). Returning a discriminated-union
 * result instead of throwing makes the callers' error paths explicit and the
 * logic unit-testable without a real device filesystem.
 */

export type FileSystemAdapter = {
  /** Mirrors FileSystem.documentDirectory — may be null when storage is unavailable. */
  documentDirectory: string | null;
  /** Mirrors FileSystem.copyAsync. */
  copyAsync: (opts: { from: string; to: string }) => Promise<void>;
  /** Mirrors FileSystem.deleteAsync. */
  deleteAsync: (path: string, opts?: { idempotent?: boolean }) => Promise<void>;
  /** Mirrors FileSystem.getInfoAsync — used to check whether a file still exists on disk. */
  getInfoAsync: (uri: string) => Promise<{ exists: boolean }>;
};

// ── Verify ────────────────────────────────────────────────────────────────────

/**
 * Check whether the persisted profile photo URI still points to a file on
 * disk.  Returns `true` when the file exists and `false` when it is missing
 * (e.g. the OS reclaimed storage between sessions) or the adapter cannot
 * determine existence.  Never throws.
 *
 * Pass the raw stored URI — NOT a cache-busted variant with a `?t=…` suffix.
 */
export async function verifyProfilePhotoExists(
  uri: string,
  fs: FileSystemAdapter,
): Promise<boolean> {
  try {
    const info = await fs.getInfoAsync(uri);
    return info.exists;
  } catch {
    // If the check itself fails (e.g. storage completely unavailable), treat
    // the photo as missing so we never show a broken image.
    return false;
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────

export type PhotoCopyResult =
  | { ok: true; dest: string }
  | { ok: false; reason: 'no-directory' | 'copy-failed'; error?: unknown };

/**
 * Copy a source URI into the app's document directory as the canonical profile
 * photo file.  Returns a typed result; never throws.
 *
 * Failure reasons:
 *   'no-directory' — FileSystem.documentDirectory is null/empty (storage
 *                    unavailable on the device, e.g. during unit tests or on
 *                    a severely misconfigured OS).
 *   'copy-failed'  — copyAsync threw (e.g. quota exceeded, permission denied,
 *                    source file no longer accessible).
 */
export async function copyProfilePhoto(
  sourceUri: string,
  fs: FileSystemAdapter,
): Promise<PhotoCopyResult> {
  if (!fs.documentDirectory) {
    return { ok: false, reason: 'no-directory' };
  }
  const dest = `${fs.documentDirectory}calora-profile-photo.jpg`;
  try {
    await fs.copyAsync({ from: sourceUri, to: dest });
    return { ok: true, dest };
  } catch (error) {
    return { ok: false, reason: 'copy-failed', error };
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export type PhotoDeleteResult =
  | { ok: true }
  | { ok: false; reason: 'delete-failed'; error?: unknown };

/**
 * Delete the canonical profile photo file from the document directory.
 * Returns a typed result; never throws.
 *
 * When documentDirectory is null the deletion is skipped and `ok: true` is
 * returned — there is no coherent path to delete from, and the caller's state
 * can be updated without risk of leaving a stale file behind.
 *
 * Failure reason:
 *   'delete-failed' — deleteAsync threw (e.g. permission denied, underlying
 *                     OS quota error unrelated to the file's existence).
 */
export async function deleteProfilePhoto(
  fs: FileSystemAdapter,
): Promise<PhotoDeleteResult> {
  if (!fs.documentDirectory) {
    // No coherent storage path — skip silently and let the caller clear state.
    return { ok: true };
  }
  const dest = `${fs.documentDirectory}calora-profile-photo.jpg`;
  try {
    await fs.deleteAsync(dest, { idempotent: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'delete-failed', error };
  }
}
