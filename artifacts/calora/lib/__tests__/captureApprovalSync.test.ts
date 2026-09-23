import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, string> = {};
const approveCapture = vi.fn();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

vi.mock('@workspace/api-client-react', () => ({
  approveCapture: (...args: unknown[]) => approveCapture(...args),
}));

const logWithSession = (captureSessionId: string) => ({ captureSessionId }) as never;

async function freshCoordinator() {
  vi.resetModules();
  return import('../captureApprovalSync');
}

describe('capture approval retry coordinator', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    approveCapture.mockReset();
  });

  it('acknowledges a capture once and persists the settled session for the account', async () => {
    const coordinator = await freshCoordinator();
    coordinator.setCaptureApprovalAccountScope('account-a');
    approveCapture.mockResolvedValue(undefined);

    await coordinator.syncCaptureApprovals([logWithSession('session-1')], 'token-a');
    await coordinator.syncCaptureApprovals([logWithSession('session-1')], 'token-a');

    expect(approveCapture).toHaveBeenCalledTimes(1);
    expect(approveCapture).toHaveBeenCalledWith('session-1', {
      headers: { Authorization: 'Bearer token-a' },
    });
  });

  it('leaves transient failures eligible for a later retry', async () => {
    const coordinator = await freshCoordinator();
    coordinator.setCaptureApprovalAccountScope('account-a');
    approveCapture.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce(undefined);

    await coordinator.syncCaptureApprovals([logWithSession('session-2')], 'token-a');
    await coordinator.syncCaptureApprovals([logWithSession('session-2')], 'token-a');

    expect(approveCapture).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a prior account scope for a capture acknowledgement', async () => {
    const coordinator = await freshCoordinator();
    coordinator.setCaptureApprovalAccountScope('account-a');
    approveCapture.mockResolvedValue(undefined);
    await coordinator.syncCaptureApprovals([logWithSession('session-a')], 'token-a');

    coordinator.setCaptureApprovalAccountScope('account-b');
    await coordinator.syncCaptureApprovals([logWithSession('session-a')], 'token-b');

    expect(approveCapture).toHaveBeenCalledTimes(2);
    expect(approveCapture).toHaveBeenLastCalledWith('session-a', {
      headers: { Authorization: 'Bearer token-b' },
    });
  });
});
