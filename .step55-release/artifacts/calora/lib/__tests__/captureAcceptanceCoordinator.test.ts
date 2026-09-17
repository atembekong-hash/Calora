import { describe, expect, it } from 'vitest';
import { coordinateCaptureAcceptance, createCaptureAcceptanceCoordinator } from '../captureAcceptanceCoordinator';

describe('capture acceptance transaction coordinator', () => {
  it('permits retry after a rejected transaction', async () => {
    const coordinator = createCaptureAcceptanceCoordinator<string>();
    let attempts = 0;
    const transaction = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('storage rejected');
      return 'log-1';
    };

    await expect(coordinateCaptureAcceptance(coordinator, 'draft-1', transaction)).rejects.toThrow('storage rejected');
    await expect(coordinateCaptureAcceptance(coordinator, 'draft-1', transaction)).resolves.toBe('log-1');
    expect(attempts).toBe(2);
  });

  it('coalesces concurrent same-draft commits and serializes different drafts', async () => {
    const coordinator = createCaptureAcceptanceCoordinator<string>();
    let writes = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const same = () => gate.then(() => { writes += 1; return 'same-log'; });

    const first = coordinateCaptureAcceptance(coordinator, 'draft-same', same);
    const duplicate = coordinateCaptureAcceptance(coordinator, 'draft-same', same);
    const other = coordinateCaptureAcceptance(coordinator, 'draft-other', async () => {
      writes += 1;
      return 'other-log';
    });

    expect(first).toBe(duplicate);
    release();
    await expect(Promise.all([first, duplicate, other])).resolves.toEqual(['same-log', 'same-log', 'other-log']);
    expect(writes).toBe(2);
  });
});