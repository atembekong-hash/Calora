import { describe, expect, it } from 'vitest';
import { coordinateCaptureAcceptance, createCaptureAcceptanceCoordinator } from '../captureAcceptanceCoordinator';

describe('capture acceptance transaction coordinator', () => {
  it('publishes only after a successful staged flush and permits retry after rejection', async () => {
    const coordinator = createCaptureAcceptanceCoordinator<string>();
    const published: string[] = [];
    let attempts = 0;
    const transaction = async () => {
      attempts++;
      if (attempts === 1) throw new Error('storage rejected');
      published.push('log-and-outbox');
      return 'log-1';
    };
    await expect(coordinateCaptureAcceptance(coordinator, 'draft-1', transaction)).rejects.toThrow('storage rejected');
    expect(published).toEqual([]);
    await expect(coordinateCaptureAcceptance(coordinator, 'draft-1', transaction)).resolves.toBe('log-1');
    expect(published).toEqual(['log-and-outbox']);
  });

  it('coalesces concurrent same-draft commits while also accepting another draft', async () => {
    const coordinator = createCaptureAcceptanceCoordinator<string>();
    let writes = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const same = () => gate.then(() => { writes++; return 'same-log'; });
    const first = coordinateCaptureAcceptance(coordinator, 'draft-same', same);
    const second = coordinateCaptureAcceptance(coordinator, 'draft-same', same);
    expect(first).toBe(second);
    const other = coordinateCaptureAcceptance(coordinator, 'draft-other', async () => { writes++; return 'other-log'; });
    release();
    await expect(Promise.all([first, second, other])).resolves.toEqual(['same-log', 'same-log', 'other-log']);
    expect(writes).toBe(2);
  });

  it('starts lazily and serializes different drafts over the latest committed snapshot', async () => {
    type Snapshot = { drafts: string[]; logs: string[]; outbox: string[] };
    const coordinator = createCaptureAcceptanceCoordinator<string>();
    let persisted: Snapshot = { drafts: ['draft-a', 'draft-b'], logs: [], outbox: [] };
    let calls = 0;
    const accept = (draftId: string) => coordinateCaptureAcceptance(coordinator, draftId, async () => {
      calls++;
      const next = {
        drafts: persisted.drafts.filter((id) => id !== draftId),
        logs: [...persisted.logs, `log-${draftId}`],
        outbox: [...persisted.outbox, `mutation-${draftId}`],
      };
      await Promise.resolve();
      persisted = next;
      return `log-${draftId}`;
    });

    const first = accept('draft-a');
    const duplicate = accept('draft-a');
    const second = accept('draft-b');
    expect(first).toBe(duplicate);
    // Transaction callbacks are not invoked during coordinate() itself.
    expect(calls).toBe(0);

    await expect(Promise.all([first, duplicate, second])).resolves.toEqual([
      'log-draft-a', 'log-draft-a', 'log-draft-b',
    ]);
    expect(calls).toBe(2);
    expect(persisted).toEqual({
      drafts: [],
      logs: ['log-draft-a', 'log-draft-b'],
      outbox: ['mutation-draft-a', 'mutation-draft-b'],
    });
  });
});