import type * as FileSystemModule from 'expo-file-system/legacy';

/**
 * Only app-created cache files are eligible for deletion. Library/content URIs
 * remain under the user's media provider and must never be deleted by Calora.
 */
export function isOwnedCaptureArtifact(uri: string | null | undefined): uri is string {
  return typeof uri === 'string' && /^(file:)?\/\/.*(?:Caches|cache|Camera)/i.test(uri);
}

export async function deleteOwnedCaptureArtifacts(
  fileSystem: Pick<typeof FileSystemModule, 'deleteAsync'>,
  uris: Iterable<string | null | undefined>,
): Promise<void> {
  const unique = new Set([...uris].filter(isOwnedCaptureArtifact));
  await Promise.all([...unique].map(async (uri) => {
    try {
      await fileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Cleanup is privacy best-effort; never replace the user's analysis or
      // review result with a storage cleanup error.
    }
  }));
}
