import { approveCapture, useAnalyzeCapture, type CaptureAnalysis, type CaptureAnalyzeInput } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type BarcodeScanningResult } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';
import { AppHeader } from '@/components/AppChrome';
import { BRAND } from '@/lib/brand';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { router, useLocalSearchParams } from 'expo-router';
import { dateKey } from '@/lib/dates';
import { formatGrams, formatPercent, formatWhole } from '@/lib/formatters';
import { Surface } from '@/components/Surface';
import { enterMotion } from '@/lib/motion';

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

function PermissionState({ colors, onRequest }: { colors: ReturnType<typeof useCalora>['colors']; onRequest: () => void }) {
  return (
    <View style={styles.centerState}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.accent }]}><Feather name="camera" size={30} color={colors.accentForeground} /></View>
      <Text style={[styles.centerTitle, { color: colors.foreground }]}>Camera access keeps logging easy</Text>
      <Text style={[styles.centerBody, { color: colors.mutedForeground }]}>Allow camera access to scan barcodes and recognize any food or meal. {BRAND.name} will always show a review before logging.</Text>
      <Pressable accessibilityLabel="Allow camera access" onPress={onRequest} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Allow camera access</Text></Pressable>
    </View>
  );
}

export default function ScanScreen() {
  const { colors, foodDrafts, createFoodMemoryDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory } = useCalora();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; draftId?: string }>();
  const entryDate = typeof params.date === 'string' ? params.date : dateKey();
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<ScanMode>('auto');
  const [hasScanned, setHasScanned] = useState(false);

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
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [textEntry, setTextEntry] = useState('');
  const [textEntryKind, setTextEntryKind] = useState<TextEntryKind>('text');
  const [altCaptureBanner, setAltCaptureBanner] = useState<string | null>(null);
  const [receiptCapture, setReceiptCapture] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const analyzeCapture = useAnalyzeCapture();
  const routeDraftId = typeof params.draftId === 'string' ? params.draftId : undefined;
  const reviewDraft = foodDrafts.find((draft) => draft.status === 'draft' && (draft.id === reviewDraftId || draft.id === routeDraftId)) ?? null;

  useEffect(() => {
    const draftId = routeDraftId;
    if (!draftId || !reviewDraft || reviewDraftId === draftId || analysis) return;
    setReviewDraftId(draftId);
    setAnalysis({
      sessionId: draftId,
      mode: 'food',
      status: 'review',
      title: reviewDraft.title,
      reviewMessage: 'Review this meal before adding it. You can adjust servings or remove anything you did not eat.',
      provider: reviewDraft.sourceLabel,
      candidates: [],
    });
  }, [analysis, reviewDraft, reviewDraftId, routeDraftId]);

  const showAnalysis = (next: CaptureAnalysis) => {
    setAnalysis(next);
    if (next.status === 'review') setReviewDraftId(createFoodMemoryDraft(next, entryDate).id);
    setHasScanned(true);
    Haptics.notificationAsync(next.status === 'review' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  };

  const analyze = async (input: Omit<CaptureAnalyzeInput, 'clientSessionId'>): Promise<CaptureAnalysis | null> => {
    try {
      const next = await analyzeCapture.mutateAsync({ data: input });
      if (next.status !== 'transcript') showAnalysis(next);
      return next;
    } catch (error) {
      Alert.alert('Scan unavailable', error instanceof Error ? error.message : 'Try again or use search.');
      setHasScanned(false);
      return null;
    }
  };

  const submitTextEntry = async () => {
    const text = textEntry.trim();
    if (!text || analyzeCapture.isPending) return;
    setHasScanned(true);
    setAltCaptureBanner(null);
    const next = await analyze({ mode: 'text', textInput: text });
    if (next?.status === 'review') {
      setShowTextEntry(false);
      setTextEntry('');
      setTextEntryKind('text');
    }
  };

  const startVoiceCapture = async () => {
    if (Platform.OS === 'web') {
      setAltCaptureBanner('Voice recording works in the CaloraApp mobile build. You can type your meal description here instead.');
      setTextEntryKind('voice');
      setShowTextEntry(true);
      return;
    }
    if (!cameraRef.current) {
      setAltCaptureBanner('Open the camera first, then try recording your meal description again.');
      return;
    }
    const granted = microphonePermission?.granted || (await requestMicrophonePermission()).granted;
    if (!granted) {
      setAltCaptureBanner('Microphone access was not allowed. You can enable it in device settings or type your meal description instead.');
      setTextEntryKind('voice');
      setShowTextEntry(true);
      return;
    }
    try {
      setAltCaptureBanner('Listening… tap Voice again when you are done.');
      setVoiceRecording(true);
      const recording = await cameraRef.current.recordAsync({ maxDuration: 12, maxFileSize: 6 * 1024 * 1024 });
      setVoiceRecording(false);
      if (!recording?.uri) {
        setAltCaptureBanner('No recording was captured. Try again, or type your meal description instead.');
        return;
      }
      const audioBase64 = await FileSystem.readAsStringAsync(recording.uri, { encoding: FileSystem.EncodingType.Base64 });
      if (!audioBase64) throw new Error('The recording could not be read');
      setHasScanned(true);
      const next = await analyze({ mode: 'voice', audioBase64, audioFormat: 'mp4' });
      if (next?.status === 'transcript' && next.transcript) {
        setTextEntry(next.transcript);
        setTextEntryKind('voice');
        setShowTextEntry(true);
        setAltCaptureBanner('Transcript ready. Edit anything that was misheard, then estimate nutrition.');
        setHasScanned(false);
      }
    } catch (error) {
      setVoiceRecording(false);
      setHasScanned(false);
      setAltCaptureBanner(error instanceof Error ? `${error.message} You can type your meal description instead.` : 'Recording failed. You can type your meal description instead.');
    }
  };

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
    setAltCaptureBanner('Receipt mode is ready. Keep the item lines flat and readable, then use the camera or Library.');
  };

  const chooseReceiptFromLibrary = () => {
    if (Platform.OS === 'web') {
      setAltCaptureBanner('Receipt import is available in the CaloraApp mobile build. On web, type your meal description instead.');
      return;
    }
    setReceiptCapture(true);
    void choosePhoto();
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned || analyzeCapture.isPending || mode === 'food' || mode === 'label') return;
    const barcode = result.data?.trim();
    if (barcode) void analyze({ mode, barcode });
  };

  const takePhoto = async () => {
    if (!cameraRef.current || analyzeCapture.isPending) return;
    setHasScanned(true);
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.75, skipProcessing: Platform.OS === 'android' });
    if (photo?.base64) {
      const captureMode = receiptCapture ? 'receipt' : mode === 'barcode' ? 'food' : mode === 'label' ? 'nutrition_label' : mode;
      await analyze({ mode: captureMode, imageBase64: photo.base64 });
    } else {
      setHasScanned(false);
      Alert.alert('Photo unavailable', `${BRAND.name} could not read that photo. Try again or choose a photo from your library.`);
    }
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, base64: true });
    const base64 = result.canceled ? undefined : result.assets[0]?.base64;
    if (base64) {
      const captureMode = receiptCapture ? 'receipt' : mode === 'label' ? 'nutrition_label' : 'food';
      await analyze({ mode: captureMode, imageBase64: base64 });
    } else if (!result.canceled) {
      setAltCaptureBanner('That image could not be read. Choose another receipt or food photo.');
    }
  };

  const updateComponent = (component: FoodMemoryComponent) => {
    if (!reviewDraft) return;
    updateFoodMemoryDraft(reviewDraft.id, reviewDraft.components.map((item) => item.id === component.id ? component : item));
  };

  const acceptDraft = async () => {
    if (!reviewDraft) return;
    const accepted = acceptFoodMemory(reviewDraft.id);
    // Authenticated photo/barcode analyses receive a server proof after the
    // user explicitly accepts the review. Local logging remains available
    // offline regardless of capture approval.
    if (accepted && (analysis?.mode === 'food' || analysis?.mode === 'barcode')) {
      try {
        await approveCapture(analysis.sessionId);
      } catch (error) {
        console.warn('[capture] approval confirmation failed', error);
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAnalysis(null);
    setReviewDraftId(null);
    setHasScanned(false);
    router.replace({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  const dismissDraft = () => {
    if (reviewDraft) rejectFoodMemory(reviewDraft.id);
    setAnalysis(null);
    setReviewDraftId(null);
    setHasScanned(false);
    setShowTextEntry(false);
    setAltCaptureBanner(null);
    router.replace({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  const modeEyebrow = (mode: string | undefined) => {
    if (mode === 'barcode') return 'BARCODE MATCH';
    if (mode === 'text') return 'TEXT ESTIMATE';
    if (mode === 'nutrition_label') return 'LABEL EXTRACT';
    if (mode === 'voice') return 'VOICE CAPTURE';
    if (mode === 'receipt') return 'RECEIPT SCAN';
    return 'PHOTO REVIEW';
  };

  if (!permission) {
    return <View style={[styles.page, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Scan"
        action={
          <Pressable
            accessibilityLabel={`Open ${BRAND.name} Coach`}
            onPress={() => router.push('/coach')}
            style={({ pressed }) => [styles.coachHeaderButton, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: '#08160f', opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="zap" size={14} color={colors.primaryForeground} />
            <Text style={[styles.coachHeaderButtonText, { color: colors.primaryForeground }]}>Ask {BRAND.name}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}><Text style={[styles.eyebrow, { color: colors.primary }]}>{BRAND.name.toUpperCase()} SMART CAPTURE</Text><Text style={[styles.title, { color: colors.foreground }]}>Scan, then breathe.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Barcodes and food photos in one calm, reviewable flow.</Text></View>
          <View style={styles.scanHeaderRight}>
            <View style={[styles.liveBadge, { backgroundColor: colors.accent }]}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={[styles.liveText, { color: colors.accentForeground }]}>LIVE</Text></View>
          </View>
        </View>
        {!permission.granted ? (
          <>
            <PermissionState colors={colors} onRequest={() => { void requestPermission(); }} />
            <View style={[styles.permissionAlternatives, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.altCaptureHeading, { color: colors.mutedForeground }]}>LOG WITHOUT CAMERA</Text>
              <View style={styles.altCaptureRow}>
                <Pressable accessibilityLabel="Type food description" onPress={() => { setShowTextEntry((v) => !v); setTextEntryKind('text'); setAltCaptureBanner(null); }} style={[styles.altCaptureButton, showTextEntry && { backgroundColor: colors.muted }, { borderColor: colors.border }]}><Feather name="edit-3" size={18} color={showTextEntry ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: showTextEntry ? colors.foreground : colors.mutedForeground }]}>Type it</Text></Pressable>
                <Pressable accessibilityLabel="Voice log" onPress={onVoicePress} style={[styles.altCaptureButton, { borderColor: colors.border }]}><Feather name="mic" size={18} color={colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: colors.mutedForeground }]}>Voice</Text></Pressable>
                <Pressable accessibilityLabel="Choose receipt from library" onPress={chooseReceiptFromLibrary} style={[styles.altCaptureButton, { borderColor: colors.border }]}><Feather name="clipboard" size={18} color={colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: colors.mutedForeground }]}>Receipt</Text></Pressable>
              </View>
              {altCaptureBanner ? <View style={[styles.altCaptureBanner, { backgroundColor: colors.accent }]}><Feather name="info" size={14} color={colors.accentForeground} /><Text style={[styles.altCaptureBannerText, { color: colors.foreground }]}>{altCaptureBanner}</Text></View> : null}
              {showTextEntry ? <View style={[styles.textEntryCard, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.textEntryHeading, { color: colors.foreground }]}>{textEntryKind === 'voice' ? 'Check what we heard' : 'Describe your meal'}</Text><TextInput accessibilityLabel={textEntryKind === 'voice' ? 'Editable meal transcript' : 'Describe what you ate'} placeholder="Describe what you ate — e.g. grilled chicken with rice and salad" placeholderTextColor={colors.mutedForeground} multiline value={textEntry} onChangeText={setTextEntry} style={[styles.textEntryInput, { color: colors.foreground }]} maxLength={2000} autoFocus /><Pressable accessibilityLabel="Estimate nutrition from description" onPress={() => void submitTextEntry()} disabled={!textEntry.trim() || analyzeCapture.isPending} style={[styles.textEntrySubmit, { backgroundColor: textEntry.trim() ? colors.primary : colors.muted }]}><Text style={[styles.textEntrySubmitText, { color: textEntry.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Estimate nutrition</Text></Pressable></View> : null}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.cameraFrame, { borderColor: colors.border }]}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={mode === 'food' || mode === 'label' ? undefined : onBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }} />
              <View style={styles.cameraOverlay}>
                <Animated.View style={[StyleSheet.absoluteFillObject, cornerPulseStyle]} pointerEvents="none">
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.onHero }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.onHero }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.onHero }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.onHero }]} />
                </Animated.View>
                <View style={[styles.scanHint, { backgroundColor: 'rgba(20,63,52,0.78)' }]}><Feather name="maximize" size={14} color={colors.heroMuted} /><Text style={[styles.scanHintText, { color: colors.onHero }]}>{receiptCapture ? 'Keep receipt lines flat and readable' : mode === 'food' ? 'Frame your food or meal' : mode === 'label' ? 'Frame the nutrition label' : 'Point at a barcode or food'}</Text></View>
              </View>
            </View>
            <View style={[styles.modePicker, { backgroundColor: colors.muted }]}>
              {(['auto', 'barcode', 'food', 'label'] as ScanMode[]).map((item) => <Pressable key={item} accessibilityLabel={`Scan mode ${item}`} onPress={() => { setMode(item); setHasScanned(false); }} style={[styles.modeButton, mode === item && { backgroundColor: colors.card }]}><Feather name={item === 'auto' ? 'zap' : item === 'barcode' ? 'maximize' : item === 'food' ? 'image' : 'file-text'} size={14} color={mode === item ? colors.primary : colors.mutedForeground} /><Text style={[styles.modeText, { color: mode === item ? colors.foreground : colors.mutedForeground }]}>{item === 'auto' ? 'Auto' : item === 'barcode' ? 'Barcode' : item === 'food' ? 'Food' : 'Label'}</Text></Pressable>)}
            </View>
            <View style={styles.captureActions}>
              <Pressable accessibilityLabel="Choose food photo from library" onPress={() => void choosePhoto()} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="image" size={17} color={colors.foreground} /><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Library</Text></Pressable>
              <Pressable accessibilityLabel="Capture food photo" onPress={() => void takePhoto()} style={[styles.shutter, { backgroundColor: colors.primary }]}>{analyzeCapture.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="camera" size={25} color={colors.primaryForeground} />}</Pressable>
              <Pressable accessibilityLabel="Search restaurant foods" onPress={() => router.push({ pathname: '/restaurants', params: { date: entryDate } })} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="coffee" size={17} color={colors.foreground} /><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Restaurants</Text></Pressable>
            </View>
            <View style={[styles.trustCard, { backgroundColor: colors.hero }]}><Feather name="shield" size={17} color={colors.heroMuted} /><View style={{ flex: 1 }}><Text style={[styles.trustTitle, { color: colors.onHero }]}>Review before it counts</Text><Text style={[styles.trustBody, { color: colors.heroMuted }]}>Barcode matches use nutrition sources. Food photos are estimates. Nothing reaches your diary until you approve it.</Text></View></View>
            <View style={styles.altCaptureSection}>
              <Text style={[styles.altCaptureHeading, { color: colors.mutedForeground }]}>MORE WAYS TO LOG</Text>
              <View style={styles.altCaptureRow}>
                <Pressable accessibilityLabel="Type food description" onPress={() => { setShowTextEntry((v) => !v); setTextEntryKind('text'); setReceiptCapture(false); setAltCaptureBanner(null); }} style={[styles.altCaptureButton, showTextEntry && { backgroundColor: colors.card }, { borderColor: colors.border }]}><Feather name="edit-3" size={18} color={showTextEntry ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: showTextEntry ? colors.foreground : colors.mutedForeground }]}>Type it</Text></Pressable>
                <Pressable accessibilityLabel={voiceRecording ? 'Stop voice recording' : 'Voice log'} onPress={onVoicePress} style={[styles.altCaptureButton, voiceRecording && { backgroundColor: colors.accent }, { borderColor: colors.border }]}><Feather name={voiceRecording ? 'square' : 'mic'} size={18} color={voiceRecording ? colors.accentForeground : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: voiceRecording ? colors.foreground : colors.mutedForeground }]}>{voiceRecording ? 'Stop' : 'Voice'}</Text></Pressable>
                <Pressable accessibilityLabel="Scan receipt" onPress={onReceiptPress} style={[styles.altCaptureButton, receiptCapture && { backgroundColor: colors.card }, { borderColor: colors.border }]}><Feather name="clipboard" size={18} color={receiptCapture ? colors.primary : colors.mutedForeground} /><Text style={[styles.altCaptureLabel, { color: receiptCapture ? colors.foreground : colors.mutedForeground }]}>Receipt</Text></Pressable>
              </View>
              {altCaptureBanner ? <View style={[styles.altCaptureBanner, { backgroundColor: colors.accent }]}><Feather name="info" size={14} color={colors.accentForeground} /><Text style={[styles.altCaptureBannerText, { color: colors.foreground }]}>{altCaptureBanner}</Text></View> : null}
              {showTextEntry ? (
                <View style={[styles.textEntryCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.textEntryHeading, { color: colors.foreground }]}>{textEntryKind === 'voice' ? 'Check what we heard' : 'Describe your meal'}</Text>
                  <TextInput accessibilityLabel={textEntryKind === 'voice' ? 'Editable meal transcript' : 'Describe what you ate'} placeholder="Describe what you ate — e.g. grilled chicken with rice and salad" placeholderTextColor={colors.mutedForeground} multiline value={textEntry} onChangeText={setTextEntry} style={[styles.textEntryInput, { color: colors.foreground }]} maxLength={2000} autoFocus />
                  <Pressable accessibilityLabel="Estimate nutrition from description" onPress={() => void submitTextEntry()} disabled={!textEntry.trim() || analyzeCapture.isPending} style={[styles.textEntrySubmit, { backgroundColor: textEntry.trim() ? colors.primary : colors.muted }]}>{analyzeCapture.isPending ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <><Feather name="zap" size={14} color={textEntry.trim() ? colors.primaryForeground : colors.mutedForeground} /><Text style={[styles.textEntrySubmitText, { color: textEntry.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Estimate nutrition</Text></>}</Pressable>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
       <Modal visible={analysis !== null} transparent animationType="slide" onRequestClose={dismissDraft}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <Animated.View entering={enterMotion('modal')} style={[styles.resultSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
             <View style={styles.resultHeader}><View><Text style={[styles.resultEyebrow, { color: colors.primary }]}>{modeEyebrow(analysis?.mode)}</Text><Text style={[styles.resultTitle, { color: colors.foreground }]}>{analysis?.title}</Text></View><Pressable accessibilityLabel="Close scan result" onPress={dismissDraft} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable></View>
             {analysis?.status === 'unavailable' ? <View style={[styles.unavailableResult, { backgroundColor: colors.accent }]}><Feather name="help-circle" size={19} color={colors.accentForeground} /><Text style={[styles.unavailableResultText, { color: colors.foreground }]}>{analysis.reviewMessage}</Text></View> : <><Text style={[styles.reviewMessage, { color: colors.mutedForeground }]}>{analysis?.reviewMessage}</Text>{reviewDraft?.assumptions.length ? <View style={[styles.assumptionCard, { backgroundColor: colors.accent }]}><Feather name="info" size={15} color={colors.accentForeground} /><Text style={[styles.assumptionText, { color: colors.foreground }]}>{reviewDraft.assumptions.join(' · ')}</Text></View> : null}<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 22 }}>{reviewDraft?.components.map((component) => <CandidateCard key={component.id} component={component} colors={colors} onChange={updateComponent} />)}<Surface tier="raised" radius="lg" style={[styles.totalCard, { backgroundColor: colors.hero }]}><View><Text style={[styles.totalLabel, { color: colors.heroMuted }]}>REVIEW TOTAL</Text><Text style={[styles.totalValue, { color: colors.onHero }]}>{formatWhole(reviewDraft?.nutrition.calories)}</Text></View><Text style={[styles.totalMacro, { color: colors.heroMuted }]}>P {formatGrams(reviewDraft?.nutrition.proteinG)} · C {formatGrams(reviewDraft?.nutrition.carbsG)} · F {formatGrams(reviewDraft?.nutrition.fatG)}</Text></Surface><Pressable accessibilityLabel="Approve and add meal to diary" onPress={acceptDraft} style={[styles.addButton, { backgroundColor: colors.primary }]}><Feather name="check-circle" size={16} color={colors.primaryForeground} /><Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>Approve and add to diary</Text></Pressable><Pressable accessibilityLabel="Discard food review" onPress={dismissDraft} style={styles.discardButton}><Text style={[styles.discardText, { color: colors.mutedForeground }]}>Not this meal</Text></Pressable></ScrollView></>}
          </Animated.View>
        </View>
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
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, maxWidth: 245, marginTop: 7 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginTop: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  cameraFrame: { height: 390, marginHorizontal: 20, borderRadius: 25, overflow: 'hidden', borderWidth: 1, backgroundColor: '#10251f' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
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
  primaryButton: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, marginTop: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  permissionAlternatives: { marginHorizontal: 20, marginTop: 30, padding: 14, borderRadius: 18, borderWidth: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  resultSheet: { maxHeight: '90%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
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
});