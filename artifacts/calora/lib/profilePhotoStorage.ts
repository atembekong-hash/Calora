/**
 * Typed profile-photo storage operations.
 *
 * Every successful replacement is copied to a new immutable document path so
 * native image caches receive a new URI and recycling identity. Existing legacy
 * fixed paths remain readable and deletable for migration compatibility.
 */

export type FileSystemAdapter = {
  documentDirectory: string | null;
  copyAsync: (opts: { from: string; to: string }) => Promise<void>;
  deleteAsync: (path: string, opts?: { idempotent?: boolean }) => Promise<void>;
  getInfoAsync: (uri: string) => Promise<{ exists: boolean }>;
  readDirectoryAsync?: (uri: string) => Promise<string[]>;
};

function photoFilePrefix(accountId?: string | null): string {
  return accountId?.trim()
    ? `calora-profile-photo-${encodeURIComponent(accountId)}`
    : 'calora-profile-photo';
}

function legacyPhotoPath(fs: FileSystemAdapter, accountId?: string | null): string | null {
  if (!fs.documentDirectory) return null;
  return `${fs.documentDirectory}${photoFilePrefix(accountId)}.jpg`;
}

function createPhotoRevision(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function revisionedPhotoPath(
  fs: FileSystemAdapter,
  accountId?: string | null,
  revision = createPhotoRevision(),
): string | null {
  if (!fs.documentDirectory) return null;
  const normalizedRevision = revision.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!normalizedRevision) return null;
  return `${fs.documentDirectory}${photoFilePrefix(accountId)}-${normalizedRevision}.jpg`;
}

function rawUri(uri: string): string {
  return uri.split('?')[0]?.split('#')[0] ?? uri;
}

/** Reject arbitrary file deletion even when a malformed URI reaches local state. */
export function isManagedProfilePhotoUri(
  uri: string,
  fs: FileSystemAdapter,
  accountId?: string | null,
): boolean {
  if (!fs.documentDirectory) return false;
  const normalized = rawUri(uri);
  if (!normalized.startsWith(fs.documentDirectory)) return false;
  const name = normalized.slice(fs.documentDirectory.length);
  const prefix = photoFilePrefix(accountId);
  return name === 'calora-profile-photo.jpg'
    || name === `${prefix}.jpg`
    || (name.startsWith(`${prefix}-`) && name.endsWith('.jpg'));
}

export async function verifyProfilePhotoExists(uri: string, fs: FileSystemAdapter): Promise<boolean> {
  try {
    const info = await fs.getInfoAsync(rawUri(uri));
    return info.exists;
  } catch {
    return false;
  }
}

export type PhotoCopyResult =
  | { ok: true; dest: string; revision: string }
  | { ok: false; reason: 'no-directory' | 'copy-failed'; error?: unknown };

/**
 * Copy to a new immutable revision. The optional revision exists for
 * deterministic tests; production callers always receive a fresh revision.
 */
export async function copyProfilePhoto(
  sourceUri: string,
  fs: FileSystemAdapter,
  accountId?: string | null,
  revision = createPhotoRevision(),
): Promise<PhotoCopyResult> {
  const dest = revisionedPhotoPath(fs, accountId, revision);
  if (!dest) return { ok: false, reason: 'no-directory' };
  try {
    await fs.copyAsync({ from: sourceUri, to: dest });
    return { ok: true, dest, revision };
  } catch (error) {
    return { ok: false, reason: 'copy-failed', error };
  }
}

export type PhotoDeleteResult =
  | { ok: true; deleted: string[] }
  | { ok: false; reason: 'delete-failed' | 'invalid-path'; error?: unknown };

/**
 * Delete one known managed URI, or all discoverable revisions for an account.
 * Without directory-list support the legacy path is still removed safely.
 */
export async function deleteProfilePhoto(
  fs: FileSystemAdapter,
  accountId?: string | null,
  uri?: string | null,
): Promise<PhotoDeleteResult> {
  if (!fs.documentDirectory) return { ok: true, deleted: [] };

  let targets: string[];
  if (uri) {
    if (!isManagedProfilePhotoUri(uri, fs, accountId)) {
      return { ok: false, reason: 'invalid-path' };
    }
    targets = [rawUri(uri)];
  } else if (Object.prototype.hasOwnProperty.call(fs, 'readDirectoryAsync')) {
    try {
      const prefix = photoFilePrefix(accountId);
      const names = await fs.readDirectoryAsync!(fs.documentDirectory);
      targets = names
        .filter((name) => name === `${prefix}.jpg` || (name.startsWith(`${prefix}-`) && name.endsWith('.jpg')))
        .map((name) => `${fs.documentDirectory}${name}`);
    } catch (error) {
      return { ok: false, reason: 'delete-failed', error };
    }
  } else {
    const legacy = legacyPhotoPath(fs, accountId);
    targets = legacy ? [legacy] : [];
  }

  try {
    for (const target of targets) {
      await fs.deleteAsync(target, { idempotent: true });
    }
    return { ok: true, deleted: targets };
  } catch (error) {
    return { ok: false, reason: 'delete-failed', error };
  }
}
