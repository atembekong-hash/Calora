import { describe, expect, it, vi } from "vitest";
import { runSafeBackgroundTask } from "../lib/safe-background-task";

describe("runSafeBackgroundTask", () => {
  it("waits for a successful background task", async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();

    await expect(runSafeBackgroundTask(task, onError)).resolves.toBeUndefined();

    expect(task).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("contains a rejected task and reports the error", async () => {
    const error = new Error("database temporarily unavailable");
    const task = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    await expect(runSafeBackgroundTask(task, onError)).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledWith(error);
  });
});