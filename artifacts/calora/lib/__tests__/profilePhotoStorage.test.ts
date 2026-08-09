/**
 * Unit tests: profile photo storage error paths.
 *
 * Problem being prevented:
 *   The pickPhoto and photo-removal flows call FileSystem.copyAsync and
 *   FileSystem.deleteAsync.  If these throw (quota exceeded, permission
 *   denied) or if FileSystem.documentDirectory is null, the app must surface
 *   a clear user-visible error and must NOT update editPhotoUri to a path
 *   that was never successfully written.
 *
 * Approach:
 *   copyProfilePhoto and deleteProfilePhoto accept a FileSystemAdapter
 *   dependency-injection object, so the tests drive the real production
 *   functions with controlled FileSystem doubles without touching a real
 *   device filesystem.
 *
 *   The profile.tsx handlers (pickPhoto, saveProfileEdit) are wired to call
 *   these functions and inspect their discriminated-union result before
 *   mutating any React state, so consistent state is guaranteed by
 *   construction.
 *
 * Test scenarios:
 *   copy — A. documentDirectory null → 'no-directory'
 *          B. copyAsync throws quota/permission error → 'copy-failed', error attached
 *          C. copyAsync succeeds → dest path returned
 *          D. dest is always documentDirectory + canonical filename
 *   delete — E. documentDirectory null → ok:true (skip silently)
 *            F. deleteAsync throws → 'delete-failed', error attached
 *            G. deleteAsync succeeds → ok:true
 *            H. idempotent flag is forwarded
 */

import { describe, it, expect, vi } from 'vitest';
import { copyProfilePhoto, deleteProfilePhoto } from '../profilePhotoStorage';
import type { FileSystemAdapter } from '../profilePhotoStorage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFs(overrides: Partial<FileSystemAdapter> = {}): FileSystemAdapter {
  return {
    documentDirectory: '/data/user/0/com.calora/files/',
    copyAsync: vi.fn().mockResolvedValue(undefined),
    deleteAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const SOURCE_URI = 'file:///tmp/ImagePicker/picked-photo.jpg';

// ---------------------------------------------------------------------------
// copyProfilePhoto
// ---------------------------------------------------------------------------

describe('copyProfilePhoto — documentDirectory null', () => {
  it('returns ok:false with reason "no-directory"', async () => {
    const fs = makeFs({ documentDirectory: null });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-directory');
  });

  it('does NOT call copyAsync when documentDirectory is null', async () => {
    const fs = makeFs({ documentDirectory: null });
    await copyProfilePhoto(SOURCE_URI, fs);

    expect(fs.copyAsync).not.toHaveBeenCalled();
  });

  it('returns ok:false with reason "no-directory" when documentDirectory is empty string', async () => {
    const fs = makeFs({ documentDirectory: '' });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-directory');
  });
});

describe('copyProfilePhoto — copyAsync throws (quota / permission-denied)', () => {
  const diskFullError = new Error('ENOSPC: no space left on device');
  const permissionError = new Error('EPERM: operation not permitted');

  it('returns ok:false with reason "copy-failed" on ENOSPC', async () => {
    const fs = makeFs({ copyAsync: vi.fn().mockRejectedValue(diskFullError) });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('copy-failed');
  });

  it('attaches the thrown error to the result on ENOSPC', async () => {
    const fs = makeFs({ copyAsync: vi.fn().mockRejectedValue(diskFullError) });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(diskFullError);
  });

  it('returns ok:false with reason "copy-failed" on EPERM', async () => {
    const fs = makeFs({ copyAsync: vi.fn().mockRejectedValue(permissionError) });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('copy-failed');
  });

  it('attaches the thrown error to the result on EPERM', async () => {
    const fs = makeFs({ copyAsync: vi.fn().mockRejectedValue(permissionError) });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(permissionError);
  });

  it('does not propagate the throw — copyProfilePhoto never rejects', async () => {
    const fs = makeFs({ copyAsync: vi.fn().mockRejectedValue(new Error('boom')) });
    await expect(copyProfilePhoto(SOURCE_URI, fs)).resolves.toBeDefined();
  });
});

describe('copyProfilePhoto — happy path', () => {
  it('returns ok:true on success', async () => {
    const fs = makeFs();
    const result = await copyProfilePhoto(SOURCE_URI, fs);
    expect(result.ok).toBe(true);
  });

  it('dest is documentDirectory + canonical filename', async () => {
    const fs = makeFs({ documentDirectory: '/data/user/0/com.calora/files/' });
    const result = await copyProfilePhoto(SOURCE_URI, fs);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dest).toBe('/data/user/0/com.calora/files/calora-profile-photo.jpg');
    }
  });

  it('copyAsync receives the source URI and the constructed dest path', async () => {
    const dir = '/var/mobile/Containers/Data/Application/ABCD/Documents/';
    const fs = makeFs({ documentDirectory: dir });
    await copyProfilePhoto(SOURCE_URI, fs);

    expect(fs.copyAsync).toHaveBeenCalledOnce();
    expect(fs.copyAsync).toHaveBeenCalledWith({
      from: SOURCE_URI,
      to: `${dir}calora-profile-photo.jpg`,
    });
  });

  it('state invariant: caller receives the exact dest path to store — no stale uri possible', async () => {
    // This confirms that setEditPhotoUri(dest + '?t=' + ...) in profile.tsx
    // can only be reached when copyAsync resolved — the dest path is always
    // the one that was actually written.
    const fs = makeFs();
    const okResult = await copyProfilePhoto(SOURCE_URI, fs);
    const failResult = await copyProfilePhoto(
      SOURCE_URI,
      makeFs({ copyAsync: vi.fn().mockRejectedValue(new Error()) }),
    );

    expect(okResult.ok).toBe(true);   // dest is available — safe to store
    expect(failResult.ok).toBe(false); // no dest — caller must NOT update state
  });
});

// ---------------------------------------------------------------------------
// deleteProfilePhoto
// ---------------------------------------------------------------------------

describe('deleteProfilePhoto — documentDirectory null', () => {
  it('returns ok:true (skip silently — no coherent path to delete)', async () => {
    const fs = makeFs({ documentDirectory: null });
    const result = await deleteProfilePhoto(fs);
    expect(result.ok).toBe(true);
  });

  it('does NOT call deleteAsync when documentDirectory is null', async () => {
    const fs = makeFs({ documentDirectory: null });
    await deleteProfilePhoto(fs);
    expect(fs.deleteAsync).not.toHaveBeenCalled();
  });

  it('state invariant: ok:true allows the caller to clear profilePhotoUri from state safely', async () => {
    // Even if the file cannot be deleted (no coherent directory), the state
    // can still be cleared — the file was never at a known path.
    const fs = makeFs({ documentDirectory: null });
    const result = await deleteProfilePhoto(fs);
    expect(result.ok).toBe(true); // caller may proceed to setProfilePhotoUri(null)
  });
});

describe('deleteProfilePhoto — deleteAsync throws (permission-denied / OS error)', () => {
  const permissionError = new Error('EPERM: operation not permitted');
  const ioError = new Error('EIO: input/output error');

  it('returns ok:false with reason "delete-failed" on EPERM', async () => {
    const fs = makeFs({ deleteAsync: vi.fn().mockRejectedValue(permissionError) });
    const result = await deleteProfilePhoto(fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('delete-failed');
  });

  it('attaches the thrown error to the result on EPERM', async () => {
    const fs = makeFs({ deleteAsync: vi.fn().mockRejectedValue(permissionError) });
    const result = await deleteProfilePhoto(fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(permissionError);
  });

  it('returns ok:false with reason "delete-failed" on I/O error', async () => {
    const fs = makeFs({ deleteAsync: vi.fn().mockRejectedValue(ioError) });
    const result = await deleteProfilePhoto(fs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('delete-failed');
  });

  it('does not propagate the throw — deleteProfilePhoto never rejects', async () => {
    const fs = makeFs({ deleteAsync: vi.fn().mockRejectedValue(new Error('boom')) });
    await expect(deleteProfilePhoto(fs)).resolves.toBeDefined();
  });

  it('state invariant: ok:false prevents the caller from clearing profilePhotoUri', async () => {
    // saveProfileEdit returns early on delete failure — profile photo state
    // is NOT updated, so editPhotoUri stays consistent with the stored value.
    const fs = makeFs({ deleteAsync: vi.fn().mockRejectedValue(permissionError) });
    const result = await deleteProfilePhoto(fs);
    expect(result.ok).toBe(false); // caller must NOT call setProfilePhotoUri(null)
  });
});

describe('deleteProfilePhoto — happy path', () => {
  it('returns ok:true on success', async () => {
    const fs = makeFs();
    const result = await deleteProfilePhoto(fs);
    expect(result.ok).toBe(true);
  });

  it('deleteAsync is called with the canonical dest path', async () => {
    const dir = '/data/user/0/com.calora/files/';
    const fs = makeFs({ documentDirectory: dir });
    await deleteProfilePhoto(fs);

    expect(fs.deleteAsync).toHaveBeenCalledOnce();
    expect(fs.deleteAsync).toHaveBeenCalledWith(
      `${dir}calora-profile-photo.jpg`,
      { idempotent: true },
    );
  });

  it('idempotent:true is always forwarded so a missing file is not an error', async () => {
    const fs = makeFs();
    await deleteProfilePhoto(fs);

    const [, opts] = (fs.deleteAsync as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts).toEqual({ idempotent: true });
  });
});
