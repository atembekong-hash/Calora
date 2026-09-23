import { analyzeCapture as requestCaptureAnalysis, type CaptureAnalysis, type CaptureAnalyzeInput } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type BarcodeScanningResult, type CameraMode } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type MealType, useCalora } from '@/context/CaloraContext';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppChrome';
import { BRAND } from '@/lib/brand';
import { includedComponentCount, type FoodMemoryComponent } from '@/lib/foodMemory';
import { router, useLocalSearchParams } from 'expo-router';
import { dateKey } from '@/lib/dates';
import { syncCaptureApprovals } from '@/lib/captureApprovalSync';
import { formatGrams, formatPercent, formatWhole } from '@/lib/formatters';
import { Surface } from '@/components/Surface';
import { enterMotion } from '@/lib/motion';
import { CaloraFeatureIcon } from '@/components/CaloraFeatureIcon';
import { BottomSheetFrame } from '@/components/BottomSheet';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { captureFlowReducer, classifyCaptureError, initialCaptureFlowState, interruptedCaptureFailure, isAbortError, isCaptureBusy, localCameraFailure } from '@/lib/captureFlow';
import { prepareCaptureImage } from '@/lib/prepareCaptureImage';

type ScanMode = 'auto' | 'barcode' | 'food' | 'label';
type TextEntryKind = 'text' | 'voice';

function CandidateCard({ component, colors, onChange }: { component: FoodMemoryComponent; colors: ReturnType<typeof useCalora>['colors']; onChange: (component: FoodMemoryComponent) => void }) {
  return (
    <Surface tier="flat" radius="lg" style={[styles.candidateCard, { backgroundColor: component.included ? colors.card : colors.muted, borderColor: colors.border }]}>
      <View style={styles.candidateHeader}>
        <View style={[styles.candidateIcon, { backgroundColor: component.provenance === 'photo_estimate' ? colors.accent : colors.hero }]}>
          <Feather name={component.provenance === 'photo_estimate' ? 'sun' : 'check'} size={17} color={component.provenance === 'photo_estimate' ? colors.accentForeground : colors.heroMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.candidateName, { color: colors.foreground }]}>{component.name}</Text>
          <Text style={[styles.candidateBrand, { color: colors.mutedForeground }]}>{component.brand ? `${component.brand} · ` : ''}{component.sourceLabel}</Text>
        </View>
        <Text style={[styles.confidence, { color: component.provenance === 'photo_estimate' ? colors.warning : colors.success }]}>{component.confidence}%</Text>
      </View>
      <View style={styles.nutritionRow}>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{formatWhole(component.calories * component.eatenFraction)}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{formatGrams(component.proteinG * component.eatenFraction)}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{formatGrams(component.carbsG * component.eatenFraction)}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{formatGrams(component.fatG * component.eatenFraction)}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>How much did you eat?</Text>
      <View style={styles.fractionRow}>
        <Pressable accessibilityLabel={`Decrease ${component.name} portion`} onPress={() => onChange({ ...component, eatenFraction: Math.max(0, component.eatenFraction - 0.25) })} style={[styles.fractionButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={15} color={colors.foreground} /></Pressable>
        <Text style={[styles.fractionValue, { color: colors.foreground }]}>{formatPercent(component.eatenFraction * 100)}</Text>
        <Pressable accessibilityLabel={`Increase ${component.name} portion`} onPress={() => onChange({ ...component, eatenFraction: Math.min(1, component.eatenFraction + 0.25) })} style={[styles.fractionButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={15} color={colors.foreground} /></Pressable>
        <TextInput accessibilityLabel={`Serving for ${component.name}`} value={component.serving} onChangeText={(serving) => onChange({ ...component, serving })} style={[styles.servingInput, { flex: 1, color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]} />
      </View>
      <Pressable accessibilityLabel={`${component.included ? 'Remove' : 'Include'} ${component.name}`} onPress={() => onChange({ ...component, included: !component.included })} style={[styles.includeButton, { borderColor: colors.border }]}><Feather name={component.included ? 'eye-off' : 'eye'} size={14} color={colors.mutedForeground} /><Text style={[styles.includeButtonText, { color: colors.mutedForeground }]}>{component.included ? 'Remove from meal' : 'Include in meal'}</Text></Pressable>
      {component.reviewQuestions.length ? <Text style={[styles.questionText, { color: colors.warning }]}>{component.reviewQuestions[0]}</Text> : null}
    </Surface>
  );
}

function PermissionState({ colors, canAskAgain, onRequest, onOpenSettings }: { colors: ReturnType<typeof useCalora>['colors']; canAskAgain: boolean; onRequest: () => void; onOpenSettings: () => void }) {
  return (
    <View style={styles.centerState}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.accent }]}><CaloraFeatureIcon name="camera" size={42} primaryColor={colors.primary} accentColor={colors.accentForeground} foregroundColor={colors.foreground} highlightColor={colors.accentForeground} /></View>
      <Text style={[styles.centerTitle, { color: colors.foreground }]}>Allow camera access</Text>
      <Text accessibilityLiveRegion="polite" style={[styles.centerBody, { color: colors.mutedForeground }]}>{canAskAgain ? `Scan barcodes and food. ${BRAND.name} shows a review before logging.` : 'Camera access is blocked. Open Settings to allow it, then return here.'}</Text>
      <Pressable accessibilityLabel={canAskAgain ? 'Allow camera access' : 'Open device settings for camera access'} onPress={canAskAgain ? onRequest : onOpenSettings} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{canAskAgain ? 'Allow camera access' : 'Open Settings'}</Text></Pressable>
    </View>
  );
}

function ProcessingPhoto({ colors, uri }: { colors: ReturnType<typeof useCalora>['colors']; uri: string }) {
  const scannerProgress = useSharedValue(0);
  const [imageFailed, setImageFailed] = useState(!isSafeCaptureImageUri(uri));

  useEffect(() => {
    setImageFailed(!isSafeCaptureImageUri(uri));
  }, [uri]);

  useEffect(() => {
    scannerProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scannerProgress);
  }, [scannerProgress]);

  const scannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scannerProgress.value * 326 }],
  }));

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {imageFailed ? (
        <View style={[StyleSheet.absoluteFillObject, styles.processingImageFallback, { backgroundColor: colors.muted }]}>
          <Feather name="image" size={28} color={colors.mutedForeground} />
          <Text accessibilityLabel="Capture preview unavailable" style={[styles.processingImageFallbackText, { color: colors.mutedForeground }]}>
            Capture preview unavailable
          </Text>
        </View>
      ) : (
        <Image
          accessibilityLabel="Captured meal being analyzed"
          source={{ uri }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source;
            if (width * height > 20_000_000) setImageFailed(true);
          }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View style={styles.processingShade} />
      <View style={styles.scannerTrack}>
        <Animated.View style={[styles.scannerGlow, { backgroundColor: colors.accent }, scannerStyle]} />
        <Animated.View style={[styles.scannerBeam, { backgroundColor: colors.accent }, scannerStyle]} />
      </View>
      <View style={[styles.processingBadge, { backgroundColor: colors.hero }]}>
        <Feather name="activity" size={14} color={colors.accent} />
        <Text style={[styles.processingBadgeText, { color: colors.onHero }]}>ANALYZING MEAL</Text>
      </View>
      <View style={[styles.processingFooter, { backgroundColor: colors.hero }]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.processingFooterText, { color: colors.onHero }]}>Reading ingredients and portions</Text>
      </View>
    </View>
  );
}

function isSafeCaptureImageUri(uri: string): boolean {
  return uri.length <= 2048 && /^(file|content|ph|assets-library):/i.test(uri);
}

function recommendedMeal(now = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  if (hour < 21) return 'Dinner';
  return 'Snack';
}

function mealFromRoute(value: unknown): MealType | null {
  return value === 'Breakfast' || value === 'Lunch' || value === 'Dinner' || value === 'Snack'
    ? value
    : null;
}

function cameraError(message: string): Error {
  const error = new Error(message);
  error.name = 'CaptureCameraError';
  return error;
}

export default function ScanScreen() {
  const { colors, foodDrafts, createFoodMemoryDraft, updateFoodMemoryDraft, updateFoodMemoryDraftMeal, acceptFoodMemory, rejectFoodMemory } = useCalora();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; draftId?: string; capture?: string; meal?: MealType }>();
  const entryDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : dateKey();
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraIssue, setCameraIssue] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>(params.capture === 'barcode' ? 'barcode' : 'auto');
  const [hasScanned, setHasScanned] = useState(false);
  const barcodeLaunchRequested = useRef(false);
  const barcodeSequenceRef = useRef(0);
  const barcodeLockRef = useRef<{ barcode: string; sequence: number } | null>(null);

  const resetBarcodeCapture = () => {
    barcodeSequenceRef.current += 1;
    barcodeLockRef.current = null;
    setHasScanned(false);
  };

  useEffect(() => {
    if (params.capture !== 'barcode') return;
    setMode('barcode');
    resetBarcodeCapture();
    // The route capture value is the deliberate start/retry boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.capture]);

  useEffect(() => {
    if (params.capture !== 'barcode' || barcodeLaunchRequested.current || !permission) return;
    barcodeLaunchRequested.current = true;
    if (!permission.granted) void requestPermission();
  }, [params.capture, permission, requestPermission]);

  // Viewfinder corner pulse — breathes while waiting, stops when a result is in-flight
  const cornerPulse = useSharedValue(1);
  useEffect(() => {
    if (hasScanned) {
      cancelAnimation(cornerPulse);
      cornerPulse.value = withTiming(1, { duration: 200 });
      return;
    }
    cornerPulse.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [hasScanned, cornerPulse]);
  const cornerPulseStyle = useAnimatedStyle(() => ({ opacity: cornerPulse.value }));
  const [analysis, setAnalysis] = useState<CaptureAnalysis | null>(null);
  const [reviewDraftId, setReviewDraftId] = useState<string | null>(null);
  const [reviewMeal, setReviewMeal] = useState<MealType>(() => mealFromRoute(params.meal) ?? recommendedMeal());
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [textEntry, setTextEntry] = useState('');
  const [textEntryKind, setTextEntryKind] = useState<TextEntryKind>('text');
  const [altCaptureBanner, setAltCaptureBanner] = useState<string | null>(null);
  const [receiptCapture, setReceiptCapture] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('picture');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [captureFlow, dispatchCaptureFlow] = useReducer(captureFlowReducer, initialCaptureFlowState);
  const captureOperationIdRef = useRef(0);
  const captureAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const retryInputRef = useRef<{ input: CaptureAnalyzeInput; previewUri: string | null } | null>(null);
  const voiceCaptureInFlight = useRef(false);
  const voiceLaunchRequested = useRef(false);
  const voicePendingAfterCameraPermission = useRef(false);
  const routeDraftId = typeof params.draftId === 'string' ? params.draftId : undefined;
  const reviewDraft = foodDrafts.find((draft) => draft.status === 'draft' && (draft.id === reviewDraftId || draft.id === routeDraftId)) ?? null;
  const captureBusy = isCaptureBusy(captureFlow);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureOperationIdRef.current += 1;
      captureAbortRef.current?.abort();
      captureAbortRef.current = null;
    };
  }, []);

  const isCurrentOperation = (operationId: number) => mountedRef.current && captureOperationIdRef.current === operationId;

  const beginCaptureOperation = (stage: 'preparing' | 'uploading') => {
    captureAbortRef.current?.abort();
    const operationId = ++captureOperationIdRef.current;
    dispatchCaptureFlow({ type: 'begin', operationId, stage });
    return operationId;
  };

  const resetCaptureOperation = () => {
    captureAbortRef.current?.abort();
    captureAbortRef.current = null;
    const operationId = ++captureOperationIdRef.current;
    dispatchCaptureFlow({ type: 'reset', operationId });
  };

  const failCaptureOperation = (operationId: number, error: unknown) => {
    if (!isCurrentOperation(operationId)) return;
    const failure = classifyCaptureError(error);
    if (failure.kind === 'aborted') {
      dispatchCaptureFlow({ type: 'reset', operationId });
      return;
    }
    dispatchCaptureFlow({ type: 'failed', operationId, failure });
    setHasScanned(false);
  };

  const interruptCaptureOperation = () => {
    if (!isCaptureBusy(captureFlow)) return;
    captureAbortRef.current?.abort();
    captureAbortRef.current = null;
    const operationId = ++captureOperationIdRef.current;
    dispatchCaptureFlow({ type: 'begin', operationId, stage: 'preparing' });
    dispatchCaptureFlow({ type: 'failed', operationId, failure: interruptedCaptureFailure() });
    setHasScanned(false);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') interruptCaptureOperation();
      if (nextState === 'active') setCameraReady(false);
    });
    return () => subscription.remove();
  }, [captureFlow.stage]);

  useEffect(() => {
    const draftId = routeDraftId;
    if (!draftId || !reviewDraft || reviewDraftId === draftId || analysis) return;
    setReviewDraftId(draftId);
    setReviewMeal(reviewDraft.meal);
    setAnalysis({
      sessionId: draftId,
      clientCorrelationId: draftId,
      captureSessionId: null,
      mode: 'food',
      status: 'review',
      title: reviewDraft.title,
      reviewMessage: 'Review before adding. Adjust servings or remove anything you did not eat.',
      provider: reviewDraft.sourceLabel,
      candidates: [],
    });
  }, [analysis, reviewDraft, reviewDraftId, routeDraftId]);

  const showAnalysis = (next: CaptureAnalysis) => {
    setAnalysis(next);
    if (next.status === 'review') {
      const draft = createFoodMemoryDraft(next, entryDate, reviewMeal);
      setReviewDraftId(draft.id);
    }
    setHasScanned(true);
    Haptics.notificationAsync(next.status === 'review' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  };

  const submitAnalysis = async (
    input: Omit<CaptureAnalyzeInput, 'clientSessionId' | 'clientCorrelationId'>,
    operationId?: number,
    barcodeSequence?: number,
  ): Promise<CaptureAnalysis | null> => {
    const activeOperationId = operationId ?? beginCaptureOperation('uploading');
    if (operationId !== undefined) dispatchCaptureFlow({ type: 'uploading', operationId });
    if (!session?.access_token) {
      failCaptureOperation(activeOperationId, { status: 401, message: 'Sign in again before analyzing a photo.' });
      return null;
    }
    const controller = new AbortController();
    captureAbortRef.current = controller;
    retryInputRef.current = { input, previewUri: capturedPhotoUri };
    try {
      const correlationId = `capture-${activeOperationId}`;
      const next = await requestCaptureAnalysis({ ...input, clientCorrelationId: correlationId }, { signal: controller.signal });
      if (
        !isCurrentOperation(activeOperationId)
        || next.clientCorrelationId !== correlationId
        ||
        barcodeSequence !== undefined
        && barcodeLockRef.current?.sequence !== barcodeSequence
      ) {
        return null;
      }
      if (next.status === 'transcript') {
        dispatchCaptureFlow({ type: 'reset', operationId: activeOperationId });
        setHasScanned(false);
      } else {
        showAnalysis(next);
        dispatchCaptureFlow({ type: 'review', operationId: activeOperationId });
      }
      return next;
    } catch (error) {
      if (
        !isCurrentOperation(activeOperationId)
        || isAbortError(error)
        ||
        barcodeSequence !== undefined
        && barcodeLockRef.current?.sequence !== barcodeSequence
      ) {
        return null;
      }
      failCaptureOperation(activeOperationId, error);
      if (barcodeSequence !== undefined) {
        resetBarcodeCapture();
      }
      return null;
    } finally {
      if (isCurrentOperation(activeOperationId) && captureAbortRef.current === controller) {
        captureAbortRef.current = null;
      }
    }
  };

  const submitTextEntry = async () => {
    const text = textEntry.trim();
    if (!text || captureBusy) return;
    setHasScanned(true);
    setCapturedPhotoUri(null);
    setAltCaptureBanner(null);
    const next = await submitAnalysis({ mode: 'text', textInput: text });
    if (next?.status === 'review') {
      setShowTextEntry(false);
      setTextEntry('');
      setTextEntryKind('text');
    }
  };

  useEffect(() => {
    if (cameraMode !== 'video' || !voiceRecording || voiceCaptureInFlight.current) return;
    const camera = cameraRef.current;
    if (!camera) {
      setVoiceRecording(false);
      setCameraMode('picture');
      setAltCaptureBanner('Open the camera, then try voice again.');
      return;
    }

    voiceCaptureInFlight.current = true;
    const recordVoice = async () => {
      try {
        const recording = await camera.recordAsync({ maxDuration: 12, maxFileSize: 6 * 1024 * 1024 });
        if (!recording?.uri) {
          setAltCaptureBanner('No recording was captured. Try again, or type your meal description instead.');
          return;
        }
        const audioBase64 = await FileSystem.readAsStringAsync(recording.uri, { encoding: FileSystem.EncodingType.Base64 });
        if (!audioBase64) throw new Error('The recording could not be read');
        setHasScanned(true);
        setCapturedPhotoUri(null);
        const next = await submitAnalysis({ mode: 'voice', audioBase64, audioFormat: 'mp4' });
        if (next?.status === 'transcript' && next.transcript) {
          setTextEntry(next.transcript);
          setTextEntryKind('voice');
          setShowTextEntry(true);
          setAltCaptureBanner('Transcript ready. Edit it, then estimate nutrition.');
          setHasScanned(false);
        }
      } catch (error) {
        setHasScanned(false);
        setAltCaptureBanner(error instanceof Error ? `${error.message} Type your meal instead.` : 'Recording failed. Type your meal instead.');
      } finally {
        voiceCaptureInFlight.current = false;
        setVoiceRecording(false);
        setCameraMode('picture');
      }
    };

    void recordVoice();
  }, [cameraMode, voiceRecording]);

  const startVoiceCapture = async () => {
    if (Platform.OS === 'web') {
      setAltCaptureBanner('Voice recording is available in the mobile app. Type your meal instead.');
      setTextEntryKind('voice');
      setShowTextEntry(true);
      return;
    }
    if (!permission?.granted) {
      const granted = (await requestPermission()).granted;
      if (!granted) {
        setAltCaptureBanner('Camera access is needed to record a voice note here. You can type your meal instead.');
        setTextEntryKind('voice');
        setShowTextEntry(true);
        return;
      }
      voicePendingAfterCameraPermission.current = true;
      setAltCaptureBanner('Camera ready. Preparing voice recording…');
      return;
    }
    if (!cameraRef.current || !cameraReady) {
      voicePendingAfterCameraPermission.current = true;
      setAltCaptureBanner('Preparing voice recording…');
      return;
    }
    const granted = microphonePermission?.granted || (await requestMicrophonePermission()).granted;
    if (!granted) {
      setAltCaptureBanner('Microphone access was not allowed. Enable it in settings or type your meal.');
      setTextEntryKind('voice');
      setShowTextEntry(true);
      return;
    }
    try {
      setAltCaptureBanner('Listening… tap Voice again when you are done.');
      setCameraMode('video');
      setVoiceRecording(true);
    } catch (error) {
      setVoiceRecording(false);
      setCameraMode('picture');
      setHasScanned(false);
      setAltCaptureBanner(error instanceof Error ? `${error.message} Type your meal instead.` : 'Recording failed. Type your meal instead.');
    }
  };

  useEffect(() => {
    const routeRequested = params.capture === 'voice' && !voiceLaunchRequested.current;
    const permissionRequested = voicePendingAfterCameraPermission.current && permission?.granted;
    if ((!routeRequested && !permissionRequested) || voiceRecording || captureBusy) return;
    if (Platform.OS !== 'web' && !permission?.granted) return;
    if (Platform.OS !== 'web' && (!cameraRef.current || !cameraReady)) return;
    voiceLaunchRequested.current = routeRequested ? true : voiceLaunchRequested.current;
    voicePendingAfterCameraPermission.current = false;
    void startVoiceCapture();
  }, [cameraReady, captureBusy, params.capture, permission?.granted, voiceRecording]);

  const onVoicePress = () => {
    if (voiceRecording) {
      cameraRef.current?.stopRecording();
      setAltCaptureBanner('Finishing your recording…');
      return;
    }
    void startVoiceCapture();
  };

  const onReceiptPress = () => {
    setReceiptCapture(true);
    setShowTextEntry(false);
    setAltCaptureBanner('Keep receipt lines flat and readable, then use the camera or Library.');
  };

  const chooseReceiptFromLibrary = () => {
    if (Platform.OS === 'web') {
      setAltCaptureBanner('Receipt import is available in the mobile app. On web, type your meal.');
      return;
    }
    setReceiptCapture(true);
    void choosePhoto('receipt');
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (barcodeLockRef.current || hasScanned || captureBusy || mode === 'food' || mode === 'label') return;
    const barcode = result.data?.trim();
    if (!barcode) return;
    const sequence = ++barcodeSequenceRef.current;
    // Camera callbacks can repeat synchronously before React commits state.
    // Claim the sequence in a ref first, then update visible state.
    barcodeLockRef.current = { barcode, sequence };
    setHasScanned(true);
    void submitAnalysis({ mode, barcode }, undefined, sequence);
  };

  const takePhoto = async () => {
    if (captureBusy) return;
    if (!permission?.granted) {
      const operationId = beginCaptureOperation('preparing');
      failCaptureOperation(operationId, cameraError('Camera permission is required before taking a photo.'));
      return;
    }
    if (!cameraRef.current || !cameraReady) {
      const operationId = beginCaptureOperation('preparing');
      failCaptureOperation(operationId, cameraError('The camera is still starting. Wait for the preview, then try again.'));
      return;
    }
    const operationId = beginCaptureOperation('preparing');
    setHasScanned(true);
    setAltCaptureBanner(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!isCurrentOperation(operationId)) return;
      if (!photo?.uri) throw cameraError(`${BRAND.name} did not receive a photo from the camera. Retake it or choose one from your library.`);
      setCapturedPhotoUri(photo.uri);
      const prepared = await prepareCaptureImage({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg',
        fileName: photo.uri,
      });
      if (!isCurrentOperation(operationId)) return;
      setCapturedPhotoUri(prepared.uri);
      const captureMode = receiptCapture ? 'receipt' : mode === 'label' ? 'nutrition_label' : 'food';
      await submitAnalysis({ mode: captureMode, imageBase64: prepared.base64, imageMimeType: prepared.mimeType }, operationId);
    } catch (error) {
      failCaptureOperation(operationId, error);
    }
  };

  const choosePhoto = async (requestedMode?: 'receipt' | 'food' | 'nutrition_label') => {
    if (captureBusy) return;
    const operationId = beginCaptureOperation('preparing');
    setHasScanned(true);
    setAltCaptureBanner(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!isCurrentOperation(operationId)) return;
      if (result.canceled) {
        setHasScanned(false);
        dispatchCaptureFlow({ type: 'reset', operationId });
        return;
      }
      const asset = result.assets[0];
      if (!asset?.uri) throw cameraError('The selected photo is unavailable. Choose another image.');
      setCapturedPhotoUri(asset.uri);
      const prepared = await prepareCaptureImage(asset);
      if (!isCurrentOperation(operationId)) return;
      setCapturedPhotoUri(prepared.uri);
      const captureMode = requestedMode ?? (receiptCapture ? 'receipt' : mode === 'label' ? 'nutrition_label' : 'food');
      await submitAnalysis({ mode: captureMode, imageBase64: prepared.base64, imageMimeType: prepared.mimeType }, operationId);
    } catch (error) {
      failCaptureOperation(operationId, error);
    }
  };

  const updateComponent = (component: FoodMemoryComponent) => {
    if (!reviewDraft) return;
    updateFoodMemoryDraft(reviewDraft.id, reviewDraft.components.map((item) => item.id === component.id ? component : item));
  };

  const updateReviewMeal = (meal: MealType) => {
    if (!reviewDraft) return;
    setReviewMeal(meal);
    updateFoodMemoryDraftMeal(reviewDraft.id, meal);
  };

  const acceptDraft = async () => {
    if (!reviewDraft || isSavingReview) return;
    if (includedComponentCount(reviewDraft.components) === 0) {
      Alert.alert('Choose a food first', 'Include at least one food before adding this meal to your diary.');
      return;
    }
    setIsSavingReview(true);
    let accepted;
    try {
      // Pass the displayed object directly so a same-turn edit/create cannot
      // be lost to React's deferred state update.
      accepted = await acceptFoodMemory(reviewDraft.id, reviewDraft);
    } catch (error) {
      Alert.alert('Meal not saved', error instanceof Error ? error.message : 'Your meal could not be saved. Please try again.');
      setIsSavingReview(false);
      return;
    }
    // Local acceptance is durable before this non-blocking server acknowledgement.
    // The coordinator derives retries from the persisted captureSessionId, so
    // closing this screen can never abandon an accepted review.
    if (accepted?.captureSessionId) {
      void syncCaptureApprovals([accepted], session?.access_token ?? '');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAnalysis(null);
    setReviewDraftId(null);
    resetBarcodeCapture();
    setCapturedPhotoUri(null);
    retryInputRef.current = null;
    resetCaptureOperation();
    setIsSavingReview(false);
    router.replace({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  const dismissDraft = () => {
    if (isSavingReview) return;
    if (reviewDraft) rejectFoodMemory(reviewDraft.id);
    setAnalysis(null);
    setReviewDraftId(null);
    resetBarcodeCapture();
    setCapturedPhotoUri(null);
    setShowTextEntry(false);
    setAltCaptureBanner(null);
    retryInputRef.current = null;
    resetCaptureOperation();
    router.replace({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  const retryCapture = () => {
    const retry = retryInputRef.current;
    if (!retry || captureBusy) return;
    setCapturedPhotoUri(retry.previewUri);
    setAltCaptureBanner(null);
    void submitAnalysis(retry.input);
  };

  const requestCameraAccess = async () => {
    const next = await requestPermission();
    if (!next.granted && !next.canAskAgain) {
      setCameraIssue('Camera access is blocked. Open Settings to allow it, then return to Scan.');
    }
  };

  const openCameraSettings = () => {
    void Linking.openSettings().catch(() => setCameraIssue('Open your device Settings and allow Camera access for Calora.'));
  };

  const cameraPermissionBlocked = Boolean(permission && !permission.granted && !permission.canAskAgain);
  const approveDisabled = !reviewDraft || isSavingReview || includedComponentCount(reviewDraft.components) === 0;

  const modeEyebrow = (mode: string | undefined) => {
    if (mode === 'barcode') return 'BARCODE MATCH';
    if (mode === 'text') return 'TEXT ESTIMATE';
    if (mode === 'nutrition_label') return 'LABEL EXTRACT';
    if (mode === 'voice') return 'VOICE CAPTURE';
    if (mode === 'receipt') return 'RECEIPT SCAN';
    return 'PHOTO REVIEW';
  };
  const photoAnalysisPending = captureBusy && Boolean(capturedPhotoUri);

  if (!permission) {
    return <View style={[styles.page, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        leftAlignTitle
        title="Scan"
        action={
          <Pressable
            accessibilityLabel={`Open ${BRAND.name} Coach`}
            onPress={() => router.push('/coach')}
            style={({ pressed }) => [styles.coachHeaderButton, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: '#08160f', opacity: pressed ? 0.8 : 1 }]}
          >
            <CaloraFeatureIcon name="coach" size={22} primaryColor={colors.primary} accentColor={colors.accent} foregroundColor={colors.primary} highlightColor={colors.primaryForeground} />
            <Text style={[styles.coachHeaderButtonText, { color: colors.primaryForeground }]}>Ask {BRAND.name}</Text>
          </Pressable>
        }
      />
      <KeyboardAwareScrollViewCompat
        testID="scan-keyboard-safe-scroll"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        bottomOffset={insets.bottom + 80}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}><Text style={[styles.title, { color: colors.foreground }]}>Scan food</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Barcodes and photos, reviewed before logging.</Text></View>
          <View style={styles.scanHeaderRight}>
            <View style={[styles.liveBadge, { backgroundColor: colors.accent }]}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={[styles.liveText, { color: colors.accentForeground }]}>LIVE</Text></View>
          </View>
        </View>
        {!permission.granted ? (
          <>
            <PermissionState
              colors={colors}
              canAskAgain={!cameraPermissionBlocked}
              onRequest={() => { void requestCameraAccess(); }}
              onOpenSettings={openCameraSettings}
            />
            {cameraIssue ? <Text accessibilityLiveRegion="polite" style={[styles.permissionIssue, { color: colors.warning }]}>{cameraIssue}</Text> : null}
            <View style={[styles.permissionAlternatives, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.altCaptureHeading, { color: colors.mutedForeground }]}>WITHOUT CAMERA</Text>
              <View style={styles.altCaptureRow}>
                <Pressable accessibilityLabel="Type food description" onPress={() => { setShowTextEntry((v) => !v); setTextEntryKind('text'); setAltCaptureBanner(null); }} style={[styles.altCaptureButton, showTextEntry && { backgroundColor: colors.muted }, { borderColor: colors.border }]}><Feather name="edit-3" size={18} color={showTextEntry ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: showTextEntry ? colors.foreground : colors.mutedForeground }]}>Type it</Text></Pressable>
                <Pressable accessibilityLabel="Voice log" onPress={onVoicePress} style={[styles.altCaptureButton, { borderColor: colors.border }]}><CaloraFeatureIcon name="voice" size={25} primaryColor={colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.altCaptureLabel, { color: colors.mutedForeground }]}>Voice</Text></Pressable>
                <Pressable accessibilityLabel="Choose receipt from library" onPress={chooseReceiptFromLibrary} style={[styles.altCaptureButton, { borderColor: colors.border }]}><Feather name="clipboard" size={18} color={colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: colors.mutedForeground }]}>Receipt</Text></Pressable>
              </View>
              {altCaptureBanner ? <View style={[styles.altCaptureBanner, { backgroundColor: colors.accent }]}><Feather name="info" size={14} color={colors.accentForeground} /><Text style={[styles.altCaptureBannerText, { color: colors.foreground }]}>{altCaptureBanner}</Text></View> : null}
              {showTextEntry ? <View style={[styles.textEntryCard, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.textEntryHeading, { color: colors.foreground }]}>{textEntryKind === 'voice' ? 'Check what we heard' : 'Describe your meal'}</Text><TextInput accessibilityLabel={textEntryKind === 'voice' ? 'Editable meal transcript' : 'Describe what you ate'} placeholder="Describe what you ate — e.g. grilled chicken with rice and salad" placeholderTextColor={colors.mutedForeground} multiline value={textEntry} onChangeText={setTextEntry} style={[styles.textEntryInput, { color: colors.foreground }]} maxLength={2000} autoFocus /><Pressable accessibilityLabel="Estimate nutrition from description" onPress={() => void submitTextEntry()} disabled={!textEntry.trim() || captureBusy} style={[styles.textEntrySubmit, { backgroundColor: textEntry.trim() && !captureBusy ? colors.primary : colors.muted }]}><Text style={[styles.textEntrySubmitText, { color: textEntry.trim() && !captureBusy ? colors.primaryForeground : colors.mutedForeground }]}>{captureBusy ? 'Estimating…' : 'Estimate nutrition'}</Text></Pressable></View> : null}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.cameraFrame, { borderColor: colors.border }]}>
              {photoAnalysisPending ? <ProcessingPhoto colors={colors} uri={capturedPhotoUri!} /> : (
                <>
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    mode={cameraMode}
                    onCameraReady={() => { setCameraReady(true); setCameraIssue(null); }}
                    onMountError={({ message }) => { setCameraReady(false); setCameraIssue(message || 'The camera preview could not start.'); }}
                    onBarcodeScanned={cameraMode === 'video' || mode === 'food' || mode === 'label' || hasScanned || barcodeLockRef.current || !cameraReady ? undefined : onBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
                  />
                  <View style={styles.cameraOverlay}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, cornerPulseStyle]} pointerEvents="none">
                      <View style={[styles.corner, styles.cornerTL, { borderColor: colors.onHero }]} />
                      <View style={[styles.corner, styles.cornerTR, { borderColor: colors.onHero }]} />
                      <View style={[styles.corner, styles.cornerBL, { borderColor: colors.onHero }]} />
                      <View style={[styles.corner, styles.cornerBR, { borderColor: colors.onHero }]} />
                    </Animated.View>
                    <View style={[styles.scanHint, { backgroundColor: 'rgba(20,63,52,0.78)' }]}><CaloraFeatureIcon name={mode === 'barcode' ? 'barcode' : 'camera'} size={22} primaryColor={colors.heroMuted} accentColor={colors.accent} foregroundColor={colors.onHero} highlightColor={colors.onHero} /><Text style={[styles.scanHintText, { color: colors.onHero }]}>{receiptCapture ? 'Keep receipt lines flat and readable' : mode === 'food' ? 'Frame your food or meal' : mode === 'label' ? 'Frame the nutrition label' : 'Point at a barcode or food'}</Text></View>
                  </View>
                </>
              )}
            </View>
            {!cameraReady && !cameraIssue ? <Text accessibilityLiveRegion="polite" style={[styles.cameraStatus, { color: colors.mutedForeground }]}>Starting camera preview…</Text> : null}
            {cameraIssue ? <View style={[styles.captureFailureCard, { backgroundColor: colors.accent }]}><Feather name="camera-off" size={16} color={colors.accentForeground} /><Text accessibilityLiveRegion="assertive" style={[styles.captureFailureText, { color: colors.foreground }]}>{cameraIssue}</Text><Pressable accessibilityLabel="Open device settings for camera access" onPress={openCameraSettings}><Text style={[styles.captureRetryText, { color: colors.primary }]}>Settings</Text></Pressable></View> : null}
            {captureFlow.stage === 'error' && captureFlow.failure ? <View style={[styles.captureFailureCard, { backgroundColor: colors.accent }]}><Feather name="alert-circle" size={16} color={colors.accentForeground} /><Text accessibilityLiveRegion="assertive" style={[styles.captureFailureText, { color: colors.foreground }]}>{captureFlow.failure.message}</Text>{retryInputRef.current ? <Pressable accessibilityLabel="Retry capture analysis" onPress={retryCapture} disabled={captureBusy}><Text style={[styles.captureRetryText, { color: colors.primary }]}>Retry</Text></Pressable> : null}</View> : null}
            <View style={[styles.modePicker, { backgroundColor: colors.muted }]}>
              {(['auto', 'barcode', 'food', 'label'] as ScanMode[]).map((item) => <Pressable key={item} accessibilityLabel={`Scan mode ${item}`} disabled={captureBusy} onPress={() => { resetCaptureOperation(); setMode(item); setReceiptCapture(false); resetBarcodeCapture(); }} style={[styles.modeButton, mode === item && { backgroundColor: colors.card }]}>{item === 'barcode' ? <CaloraFeatureIcon name="barcode" size={21} primaryColor={mode === item ? colors.primary : colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /> : item === 'food' ? <CaloraFeatureIcon name="food" size={21} primaryColor={mode === item ? colors.primary : colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /> : <Feather name={item === 'auto' ? 'zap' : 'file-text'} size={14} color={mode === item ? colors.primary : colors.mutedForeground} />}<Text style={[styles.modeText, { color: mode === item ? colors.foreground : colors.mutedForeground }]}>{item === 'auto' ? 'Auto' : item === 'barcode' ? 'Barcode' : item === 'food' ? 'Food' : 'Label'}</Text></Pressable>)}
            </View>
            <View style={styles.captureActions}>
              <Pressable accessibilityLabel="Choose food photo from library" disabled={captureBusy} onPress={() => void choosePhoto()} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: captureBusy ? 0.55 : 1 }]}><Feather name="image" size={17} color={colors.foreground} /><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Library</Text></Pressable>
              <Pressable accessibilityLabel="Capture food photo" disabled={captureBusy || !cameraReady} onPress={() => void takePhoto()} style={[styles.shutter, { backgroundColor: colors.primary, opacity: captureBusy || !cameraReady ? 0.55 : 1 }]}>{captureBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <CaloraFeatureIcon name="camera" size={34} primaryColor={colors.primaryForeground} accentColor={colors.accent} foregroundColor={colors.primary} highlightColor={colors.primaryForeground} />}</Pressable>
              <Pressable accessibilityLabel="Search restaurant foods" disabled={captureBusy} onPress={() => router.push({ pathname: '/restaurants', params: { date: entryDate } })} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: captureBusy ? 0.55 : 1 }]}><CaloraFeatureIcon name="restaurant" size={23} primaryColor={colors.primary} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} /><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Restaurants</Text></Pressable>
            </View>
            <View style={[styles.trustCard, { backgroundColor: colors.hero }]}><Feather name="shield" size={17} color={colors.heroMuted} /><View style={{ flex: 1 }}><Text style={[styles.trustTitle, { color: colors.onHero }]}>Review before it counts</Text><Text style={[styles.trustBody, { color: colors.heroMuted }]}>Barcode matches use nutrition sources. Food photos are estimates. Nothing reaches your diary until you approve it.</Text></View></View>
            <View style={styles.altCaptureSection}>
              <Text style={[styles.altCaptureHeading, { color: colors.mutedForeground }]}>OTHER WAYS TO LOG</Text>
              <View style={styles.altCaptureRow}>
                <Pressable accessibilityLabel="Type food description" onPress={() => { setShowTextEntry((v) => !v); setTextEntryKind('text'); setReceiptCapture(false); setAltCaptureBanner(null); }} style={[styles.altCaptureButton, showTextEntry && { backgroundColor: colors.card }, { borderColor: colors.border }]}><Feather name="edit-3" size={18} color={showTextEntry ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: showTextEntry ? colors.foreground : colors.mutedForeground }]}>Type it</Text></Pressable>
                <Pressable accessibilityLabel={voiceRecording ? 'Stop voice recording' : 'Voice log'} onPress={onVoicePress} style={[styles.altCaptureButton, voiceRecording && { backgroundColor: colors.accent }, { borderColor: colors.border }]}>{voiceRecording ? <Feather name="square" size={18} color={colors.accentForeground} /> : <CaloraFeatureIcon name="voice" size={25} primaryColor={colors.mutedForeground} accentColor={colors.accent} foregroundColor={colors.foreground} highlightColor={colors.card} />}<Text style={[styles.altCaptureLabel, { color: voiceRecording ? colors.foreground : colors.mutedForeground }]}>{voiceRecording ? 'Stop' : 'Voice'}</Text></Pressable>
                <Pressable accessibilityLabel="Scan receipt" onPress={onReceiptPress} style={[styles.altCaptureButton, receiptCapture && { backgroundColor: colors.card }, { borderColor: colors.border }]}><Feather name="clipboard" size={18} color={receiptCapture ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: receiptCapture ? colors.foreground : colors.mutedForeground }]}>Receipt</Text></Pressable>
              </View>
              {altCaptureBanner ? <View style={[styles.altCaptureBanner, { backgroundColor: colors.accent }]}><Feather name="info" size={14} color={colors.accentForeground} /><Text style={[styles.altCaptureBannerText, { color: colors.foreground }]}>{altCaptureBanner}</Text></View> : null}
              {showTextEntry ? (
                <View style={[styles.textEntryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.textEntryHeading, { color: colors.foreground }]}>{textEntryKind === 'voice' ? 'Check what we heard' : 'Describe your meal'}</Text>
                  <TextInput accessibilityLabel={textEntryKind === 'voice' ? 'Editable meal transcript' : 'Describe what you ate'} placeholder="Describe what you ate — e.g. grilled chicken with rice and salad" placeholderTextColor={colors.mutedForeground} multiline value={textEntry} onChangeText={setTextEntry} style={[styles.textEntryInput, { color: colors.foreground }]} maxLength={2000} autoFocus />
                  <Pressable accessibilityLabel="Estimate nutrition from description" onPress={() => void submitTextEntry()} disabled={!textEntry.trim() || captureBusy} style={[styles.textEntrySubmit, { backgroundColor: textEntry.trim() && !captureBusy ? colors.primary : colors.muted }]}>{captureBusy ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <><Feather name="zap" size={14} color={textEntry.trim() ? colors.primaryForeground : colors.mutedForeground} /><Text style={[styles.textEntrySubmitText, { color: textEntry.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Estimate nutrition</Text></>}</Pressable>
                </View>
              ) : null}
            </View>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
        <Modal visible={analysis !== null} transparent animationType="slide" onRequestClose={dismissDraft}>
         <BottomSheetFrame overlayColor="rgba(0,0,0,0.45)" sheetStyle={{ backgroundColor: colors.background }}>
          <Animated.View entering={enterMotion('modal')} style={styles.resultSheet}>
            <View style={styles.sheetHandle} />
             <View style={styles.resultHeader}><View><Text style={[styles.resultEyebrow, { color: colors.primary }]}>{modeEyebrow(analysis?.mode)}</Text><Text style={[styles.resultTitle, { color: colors.foreground }]}>{analysis?.title}</Text></View><Pressable accessibilityLabel="Close scan result" onPress={dismissDraft} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable></View>
              {analysis?.status === 'unavailable' ? <View style={[styles.unavailableResult, { backgroundColor: colors.accent }]}><Feather name="help-circle" size={19} color={colors.accentForeground} /><Text style={[styles.unavailableResultText, { color: colors.foreground }]}>{analysis.reviewMessage}</Text></View> : <><Text style={[styles.reviewMessage, { color: colors.mutedForeground }]}>{analysis?.reviewMessage}</Text>{reviewDraft?.assumptions.length ? <View style={[styles.assumptionCard, { backgroundColor: colors.accent }]}><Feather name="info" size={15} color={colors.accentForeground} /><Text style={[styles.assumptionText, { color: colors.foreground }]}>{reviewDraft.assumptions.join(' · ')}</Text></View> : null}<KeyboardAwareScrollViewCompat style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent} showsVerticalScrollIndicator={false} bottomOffset={80}><Text style={[styles.mealLabel, { color: colors.mutedForeground }]}>ADD TO</Text><View style={[styles.mealPicker, { backgroundColor: colors.muted }]}>{(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((meal) => <Pressable key={meal} accessibilityLabel={`Add scan to ${meal}`} disabled={isSavingReview} onPress={() => updateReviewMeal(meal)} style={[styles.mealButton, reviewMeal === meal && { backgroundColor: colors.card }]}><Text style={[styles.mealButtonText, { color: reviewMeal === meal ? colors.foreground : colors.mutedForeground }]}>{meal}</Text></Pressable>)}</View>{reviewDraft?.components.map((component) => <CandidateCard key={component.id} component={component} colors={colors} onChange={updateComponent} />)}<Surface tier="raised" radius="lg" style={[styles.totalCard, { backgroundColor: colors.hero }]}><View><Text style={[styles.totalLabel, { color: colors.heroMuted }]}>REVIEW TOTAL</Text><Text style={[styles.totalValue, { color: colors.onHero }]}>{formatWhole(reviewDraft?.nutrition.calories)}</Text></View><Text style={[styles.totalMacro, { color: colors.heroMuted }]}>P {formatGrams(reviewDraft?.nutrition.proteinG)} · C {formatGrams(reviewDraft?.nutrition.carbsG)} · F {formatGrams(reviewDraft?.nutrition.fatG)}</Text></Surface>{reviewDraft && includedComponentCount(reviewDraft.components) === 0 ? <Text accessibilityLiveRegion="polite" style={[styles.reviewGuardText, { color: colors.warning }]}>Include at least one food before adding this meal.</Text> : null}<Pressable accessibilityLabel="Approve and add meal to diary" disabled={approveDisabled} onPress={acceptDraft} style={[styles.addButton, { backgroundColor: approveDisabled ? colors.muted : colors.primary }]}>{isSavingReview ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Feather name="check-circle" size={16} color={approveDisabled ? colors.mutedForeground : colors.primaryForeground} />}<Text style={[styles.addButtonText, { color: approveDisabled ? colors.mutedForeground : colors.primaryForeground }]}>{isSavingReview ? 'Saving meal…' : 'Approve and add to diary'}</Text></Pressable><Pressable accessibilityLabel="Discard food review" disabled={isSavingReview} onPress={dismissDraft} style={styles.discardButton}><Text style={[styles.discardText, { color: colors.mutedForeground }]}>{isSavingReview ? 'Saving…' : 'Not this meal'}</Text></Pressable></KeyboardAwareScrollViewCompat></>}
          </Animated.View>
        </BottomSheetFrame>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  scanHeaderRight: { alignItems: 'flex-end', gap: 10 },
  coachHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  coachHeaderButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, maxWidth: 245, marginTop: 7 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginTop: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  cameraFrame: { height: 390, marginHorizontal: 20, borderRadius: 25, overflow: 'hidden', borderWidth: 1, backgroundColor: '#10251f' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  processingShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,20,14,0.24)' },
  processingImageFallback: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  processingImageFallbackText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  scannerTrack: { position: 'absolute', top: 20, left: 0, right: 0, height: 350 },
  scannerGlow: { position: 'absolute', top: -20, left: 18, right: 18, height: 48, borderRadius: 24, opacity: 0.22 },
  scannerBeam: { position: 'absolute', top: 0, left: 18, right: 18, height: 3, borderRadius: 2, shadowColor: '#f4a261', shadowOpacity: 0.95, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  processingBadge: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  processingBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  processingFooter: { position: 'absolute', bottom: 18, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 8 },
  processingFooterText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  corner: { position: 'absolute', width: 42, height: 42, borderWidth: 3 },
  cornerTL: { top: 70, left: 42, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 70, right: 42, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 70, left: 42, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 70, right: 42, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 8 },
  scanHintText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  modePicker: { flexDirection: 'row', marginHorizontal: 20, marginTop: 13, padding: 4, borderRadius: 15, gap: 3 },
  modeButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 9, borderRadius: 11 },
  modeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  captureActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 17 },
  secondaryButton: { width: 92, height: 42, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  shutter: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: '#f7f8f3' },
  trustCard: { flexDirection: 'row', gap: 10, marginHorizontal: 20, borderRadius: 17, padding: 14, marginTop: 20 },
  trustTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  trustBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 4 },
  centerState: { alignItems: 'center', paddingHorizontal: 34, paddingTop: 100 },
  permissionIcon: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, textAlign: 'center', marginTop: 18 },
  centerBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  permissionIssue: { marginHorizontal: 28, marginTop: 14, fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  primaryButton: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, marginTop: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  permissionAlternatives: { marginHorizontal: 20, marginTop: 30, padding: 14, borderRadius: 18, borderWidth: 1 },
  resultSheet: { flexShrink: 1, minHeight: 0, paddingHorizontal: 20, paddingTop: 20 },
  resultScroll: { flexShrink: 1, minHeight: 0 },
  resultScrollContent: { paddingBottom: 4 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginBottom: 17 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  resultEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.4, marginTop: 5, maxWidth: 280 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reviewMessage: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 9, marginBottom: 14 },
  candidateCard: { padding: 14, marginBottom: 11 },
  candidateHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  candidateIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  candidateName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  candidateBrand: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 3 },
  confidence: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(120,120,120,0.15)' },
  nutritionValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  nutritionLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 12, marginBottom: 5 },
  servingInput: { height: 40, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 11 },
  fractionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fractionButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fractionValue: { width: 42, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 12 },
  includeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8, marginTop: 9 },
  includeButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  questionText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 15, marginTop: 9 },
  addButton: { height: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 11 },
  addButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  assumptionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 13, marginBottom: 12 },
  assumptionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  totalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, marginTop: 4 },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 3 },
  totalMacro: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'right' },
  mealLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1, marginBottom: 7 },
  mealPicker: { flexDirection: 'row', borderRadius: 13, padding: 3, gap: 2, marginBottom: 12 },
  mealButton: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8 },
  mealButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  reviewGuardText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 10, textAlign: 'center' },
  discardButton: { alignItems: 'center', paddingVertical: 13 },
  discardText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  unavailableResult: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 13, marginTop: 15 },
  unavailableResultText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  altCaptureSection: { marginHorizontal: 20, marginTop: 18 },
  altCaptureHeading: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 10 },
  altCaptureRow: { flexDirection: 'row', gap: 10 },
  altCaptureButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 6 },
  altCaptureLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  altCaptureBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 13, marginTop: 12 },
  altCaptureBannerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  textEntryCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginTop: 12, gap: 11 },
  textEntryHeading: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  textEntryInput: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, minHeight: 64 },
  textEntrySubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 12 },
  textEntrySubmitText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  cameraStatus: { fontFamily: 'Inter_500Medium', fontSize: 10, marginHorizontal: 20, marginTop: 9, textAlign: 'center' },
  captureFailureCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 11, marginHorizontal: 20, marginTop: 10 },
  captureFailureText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15 },
  captureRetryText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
});
