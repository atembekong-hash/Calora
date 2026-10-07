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

  it("does not invalidate an Android native library selection while its picker Activity is active", () => {
    expect(source).toContain("shouldInterruptCaptureForAppState(nextState, nativePickerActiveRef.current)");
    expect(source).toContain("nativePickerActiveRef.current = true");
    expect(source).toContain("nativePickerActiveRef.current = false");
    expect(source).not.toContain("nextState !== 'active'");
  });

  it("prevents Auto barcode callbacks from superseding an explicit manual photo capture", () => {
    expect(source).toContain("manualPhotoCaptureRef.current || barcodeLockRef.current");
    expect(source).toContain("manualPhotoCaptureRef.current = true");
    expect(source).toContain("manualPhotoCaptureRef.current = false");
  });

  it("offers explicit sign-in recovery after a persistent capture auth failure", () => {
    expect(source).toContain("captureFlow.failure.kind === 'authentication'");
    expect(source).toContain('accessibilityLabel="Sign in again for Scan"');
    expect(source).toContain("router.push('/auth/sign-in')");
  });

  it("binds each protected Scan request to the active account rather than a stale render token", () => {
    expect(source).toContain("requestAuthenticatedCaptureAnalysis(");
    expect(source).toContain("captureAccountId");
    expect(source).toContain("user?.id");
    expect(source).not.toContain("captureAccessToken");
  });

  it("does not invite a futile retry when an installed build targets a stale endpoint", () => {
    expect(source).toContain("captureFlow.failure.kind === 'endpoint' ? null");
  });
});
