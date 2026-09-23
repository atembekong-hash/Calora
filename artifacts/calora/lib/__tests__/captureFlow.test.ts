import { describe, expect, it } from 'vitest';
import {
  captureFlowReducer,
  classifyCaptureError,
  initialCaptureFlowState,
  interruptedCaptureFailure,
  isCaptureBusy,
} from '../captureFlow';

describe('captureFlowReducer', () => {
  it('ignores a stale completion after a newer operation begins', () => {
    const first = captureFlowReducer(initialCaptureFlowState, { type: 'begin', operationId: 1, stage: 'preparing' });
    const second = captureFlowReducer(first, { type: 'begin', operationId: 2, stage: 'preparing' });
    const stale = captureFlowReducer(second, { type: 'review', operationId: 1 });

    expect(stale).toEqual(second);
    expect(isCaptureBusy(stale)).toBe(true);
  });

  it('uses a newer reset as an explicit stale-work cancellation boundary', () => {
    const pending = captureFlowReducer(initialCaptureFlowState, { type: 'begin', operationId: 3, stage: 'uploading' });
    const reset = captureFlowReducer(pending, { type: 'reset', operationId: 4 });
    const staleError = captureFlowReducer(reset, {
      type: 'failed',
      operationId: 3,
      failure: { kind: 'provider', message: 'old response' },
    });

    expect(reset).toEqual({ operationId: 4, stage: 'idle' });
    expect(staleError).toEqual(reset);
  });

  it('holds error recovery in the operation that failed', () => {
    const pending = captureFlowReducer(initialCaptureFlowState, { type: 'begin', operationId: 6, stage: 'uploading' });
    const failure = captureFlowReducer(pending, { type: 'failed', operationId: 6, failure: interruptedCaptureFailure() });

    expect(failure.stage).toBe('error');
    expect(failure.failure?.kind).toBe('interrupted');
  });
});

describe('classifyCaptureError', () => {
  it.each([
    [{ name: 'CaptureCameraError', message: 'native camera failed' }, 'local_camera'],
    [{ name: 'CaptureImagePreparationError', message: 'unsupported HEIC' }, 'preparation'],
    [{ name: 'TypeError', message: 'Network request failed' }, 'offline'],
    [{ status: 502, message: 'provider unavailable' }, 'provider'],
    [{ status: 503, message: 'server unavailable' }, 'server'],
    [{ status: 504, message: 'deadline exceeded' }, 'timeout'],
    [{ status: 401, message: 'sign in' }, 'authentication'],
  ] as const)('classifies %o as %s', (error, expectedKind) => {
    expect(classifyCaptureError(error).kind).toBe(expectedKind);
  });
});
