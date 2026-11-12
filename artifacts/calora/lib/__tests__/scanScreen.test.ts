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

  it("recovers a stalled native camera preview without changing capture safety", () => {
    expect(source).toContain("const [cameraInstanceKey, setCameraInstanceKey] = useState(0);");
    expect(source).toContain("key={cameraInstanceKey}");
    expect(source).toContain("The camera preview is taking too long to start.");
    expect(source).toContain("const retryCameraPreview = () => {");
    expect(source).toContain('accessibilityLabel="Retry camera preview"');
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

  it('sends manual Auto photos through the Auto contract and never fails a valid analysis because haptics are unavailable', () => {
    expect(source).toContain("mode === 'auto' ? 'auto' : 'food'");
    expect(source).toContain('void Haptics.notificationAsync(');
    expect(source).toContain('.catch(() => undefined)');
  });

  it('routes Auto barcode detections through the direct barcode lookup without a second shutter capture', () => {
    expect(source).toContain('const takePhoto = async (detectedBarcode?: string, barcodeSequence?: number) => {');
    expect(source).toContain("void submitAnalysis({ mode: mode === 'auto' ? 'barcode' : mode, barcode }, undefined, sequence);");
    expect(source).toContain('Auto uses the same direct lookup as Barcode');
    expect(source).not.toContain('void takePhoto(barcode, sequence);');
    expect(source).not.toContain('autoBarcodeHintRef');
  });

  it('wires typed serving text to the authoritative nutrition update and blocks invalid approval', () => {
    expect(source).toContain('onChangeText={(value) => onChange(updateComponentServing(component, value))}');
    expect(source).toContain('const hasInvalidServing = reviewDraft?.components.some((component) => component.included && servingInputErrorForComponent(component)) ?? false;');
    expect(source).toContain('|| hasInvalidServing;');
  });

  it('automatically applies only conservative provider matches and keeps an explicit fallback action', () => {
    expect(source).toContain('useListRestaurantFoods(');
    expect(source).toContain('rankNutritionMatches(component.name, providerSearch.data.foods)');
    expect(source).toContain('top.score < 0.8');
    expect(source).toContain('top.score - second.score < 0.15');
    expect(source).toContain('reconcileComponentWithRestaurantFood(component, top.food)');
    expect(source).toContain('Use verified nutrition match for');
  });

  it('gives Barcode capture a food-photo fallback when product lookup cannot match', () => {
    expect(source).toContain("mode === 'auto' || mode === 'barcode' ? 'auto' : 'food'");
    expect(source).toContain("...(detectedBarcode && captureMode === 'auto' ? { barcode: detectedBarcode } : {}),");
  });

  it('gives the Restaurants action enough horizontal room for its icon and label', () => {
    expect(source).toContain('styles.restaurantButton');
    expect(source).toContain('restaurantButton: { width: 110, paddingHorizontal: 10 }');
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

  it("retains a Voice deep-link intent through an undetermined microphone permission", () => {
    expect(source).toContain("const startVoiceCapture = async (fromRoute = false)");
    expect(source).toContain("voicePendingAfterCameraPermission.current = fromRoute;");
    expect(source).toContain("await requestMicrophonePermission()");
    expect(source).toContain("fromRoute && !voicePendingAfterCameraPermission.current");
    expect(source).toContain("if (params.capture !== 'voice') {");
    expect(source).toContain("void startVoiceCapture(true);");
  });

  it("does not start duplicate Voice permission prompts or recordings", () => {
    expect(source).toContain("const voicePermissionRequestInFlight = useRef(false);");
    expect(source).toContain("voicePermissionRequestInFlight.current || voiceRecording || voiceCaptureInFlight.current");
    expect(source).toContain("voicePermissionRequestInFlight.current = true;");
    expect(source).toContain("voicePermissionRequestInFlight.current = false;");
  });
});
