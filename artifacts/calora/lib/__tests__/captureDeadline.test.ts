import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_ANALYSIS_TIMEOUT_MS,
  CaptureOperationTimeoutError,
  withCaptureDeadline,
} from "../captureDeadline";

afterEach(() => {
  vi.useRealTimers();
});

describe("withCaptureDeadline", () => {
  it("rejects a never-settling operation and runs the timeout cleanup once", async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const pending = withCaptureDeadline(
      () => new Promise<never>(() => undefined),
      CAPTURE_ANALYSIS_TIMEOUT_MS,
      onTimeout,
    );
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(CAPTURE_ANALYSIS_TIMEOUT_MS);

    expect(await outcome).toBeInstanceOf(CaptureOperationTimeoutError);
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("preserves a timely result and clears the deadline", async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const pending = withCaptureDeadline(
      async () => "review",
      CAPTURE_ANALYSIS_TIMEOUT_MS,
      onTimeout,
    );

    await expect(pending).resolves.toBe("review");
    await vi.advanceTimersByTimeAsync(CAPTURE_ANALYSIS_TIMEOUT_MS);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("does not revive an expired operation when its underlying promise completes late", async () => {
    vi.useFakeTimers();
    let resolveLate: ((value: string) => void) | undefined;
    const pending = withCaptureDeadline(
      () =>
        new Promise<string>((resolve) => {
          resolveLate = resolve;
        }),
      CAPTURE_ANALYSIS_TIMEOUT_MS,
    );
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(CAPTURE_ANALYSIS_TIMEOUT_MS);
    expect(await outcome).toBeInstanceOf(CaptureOperationTimeoutError);

    resolveLate?.("late review");
    await vi.advanceTimersByTimeAsync(0);
    expect(await outcome).toBeInstanceOf(CaptureOperationTimeoutError);
  });
});
