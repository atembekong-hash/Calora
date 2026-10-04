import { describe, expect, it, vi } from 'vitest';
import { deleteOwnedCaptureArtifacts, isOwnedCaptureArtifact } from '../captureArtifactCleanup';

describe('capture artifact cleanup', () => {
  it('deletes only app-owned camera/cache artifacts and deduplicates URIs', async () => {
    const deleteAsync = vi.fn().mockResolvedValue(undefined);
    await deleteOwnedCaptureArtifacts({ deleteAsync } as never, [
      'file:///data/user/0/app/cache/camera.jpg',
      'file:///data/user/0/app/cache/camera.jpg',
      'content://media/external/images/media/123',
      'file:///storage/emulated/0/DCIM/user-photo.jpg',
    ]);
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    expect(deleteAsync).toHaveBeenCalledWith('file:///data/user/0/app/cache/camera.jpg', { idempotent: true });
    expect(isOwnedCaptureArtifact('content://media/external/images/media/123')).toBe(false);
  });

  it('contains deletion failures so a completed review remains available', async () => {
    const deleteAsync = vi.fn().mockRejectedValue(new Error('already removed'));
    await expect(deleteOwnedCaptureArtifacts({ deleteAsync } as never, ['file:///app/Caches/result.jpg'])).resolves.toBeUndefined();
  });
});
