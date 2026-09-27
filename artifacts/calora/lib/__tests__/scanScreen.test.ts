import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../../app/(tabs)/scan.tsx"),
  "utf8",
);

describe("Scan screen recovery contracts", () => {
  it("bounds camera capture, image preparation, and analysis requests", () => {
    expect(source).toContain("CAPTURE_CAMERA_TIMEOUT_MS");
    expect(source).toContain("CAPTURE_IMAGE_PREPARATION_TIMEOUT_MS");
    expect(source).toContain("CAPTURE_ANALYSIS_TIMEOUT_MS");
    expect(source).toContain("withCaptureDeadline(");
    expect(source).toContain("() => controller.abort()");
  });

  it("does not invalidate a native library selection on transient inactive state", () => {
    expect(source).toContain("shouldInterruptCaptureForAppState(nextState)");
    expect(source).not.toContain("nextState !== 'active'");
  });

  it("offers explicit sign-in recovery after a persistent capture auth failure", () => {
    expect(source).toContain("captureFlow.failure.kind === 'authentication'");
    expect(source).toContain('accessibilityLabel="Sign in again for Scan"');
    expect(source).toContain("router.push('/auth/sign-in')");
  });

  it("does not invite a futile retry when an installed build targets a stale endpoint", () => {
    expect(source).toContain("captureFlow.failure.kind === 'endpoint' ? null");
  });
});
