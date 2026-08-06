import { useAnalyzeCapture, type CaptureAnalysis } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';
import type { FoodMemoryComponent } from '@/lib/foodMemory';
import { router, useLocalSearchParams } from 'expo-router';

type ScanMode = 'auto' | 'barcode' | 'food';

function CandidateCard({ component, colors, onChange }: { component: FoodMemoryComponent; colors: ReturnType<typeof useCalora>['colors']; onChange: (component: FoodMemoryComponent) => void }) {
  return (
    <View style={[styles.candidateCard, { backgroundColor: component.included ? colors.card : colors.muted, borderColor: colors.border }]}>
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
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{Math.round(component.calories * component.eatenFraction)}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{Math.round(component.proteinG * component.eatenFraction)}g</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{Math.round(component.carbsG * component.eatenFraction)}g</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>carbs</Text></View>
        <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{Math.round(component.fatG * component.eatenFraction)}g</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>fat</Text></View>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>How much did you eat?</Text>
      <View style={styles.fractionRow}>
        <Pressable accessibilityLabel={`Decrease ${component.name} portion`} onPress={() => onChange({ ...component, eatenFraction: Math.max(0, component.eatenFraction - 0.25) })} style={[styles.fractionButton, { backgroundColor: colors.muted }]}><Feather name="minus" size={15} color={colors.foreground} /></Pressable>
        <Text style={[styles.fractionValue, { color: colors.foreground }]}>{Math.round(component.eatenFraction * 100)}%</Text>
        <Pressable accessibilityLabel={`Increase ${component.name} portion`} onPress={() => onChange({ ...component, eatenFraction: Math.min(1, component.eatenFraction + 0.25) })} style={[styles.fractionButton, { backgroundColor: colors.muted }]}><Feather name="plus" size={15} color={colors.foreground} /></Pressable>
        <TextInput accessibilityLabel={`Serving for ${component.name}`} value={component.serving} onChangeText={(serving) => onChange({ ...component, serving })} style={[styles.servingInput, { flex: 1, color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]} />
      </View>
      <Pressable accessibilityLabel={`${component.included ? 'Remove' : 'Include'} ${component.name}`} onPress={() => onChange({ ...component, included: !component.included })} style={[styles.includeButton, { borderColor: colors.border }]}><Feather name={component.included ? 'eye-off' : 'eye'} size={14} color={colors.mutedForeground} /><Text style={[styles.includeButtonText, { color: colors.mutedForeground }]}>{component.included ? 'Remove from meal' : 'Include in meal'}</Text></Pressable>
      {component.reviewQuestions.length ? <Text style={[styles.questionText, { color: colors.warning }]}>{component.reviewQuestions[0]}</Text> : null}
    </View>
  );
}

function PermissionState({ colors, onRequest }: { colors: ReturnType<typeof useCalora>['colors']; onRequest: () => void }) {
  return (
    <View style={styles.centerState}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.accent }]}><Feather name="camera" size={30} color={colors.accentForeground} /></View>
      <Text style={[styles.centerTitle, { color: colors.foreground }]}>Camera access keeps logging easy</Text>
      <Text style={[styles.centerBody, { color: colors.mutedForeground }]}>Allow camera access to scan barcodes and recognize any food or meal. Calora will always show a review before logging.</Text>
      <Pressable accessibilityLabel="Allow camera access" onPress={onRequest} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Allow camera access</Text></Pressable>
    </View>
  );
}

export default function ScanScreen() {
  const { colors, foodDrafts, createFoodMemoryDraft, updateFoodMemoryDraft, acceptFoodMemory, rejectFoodMemory } = useCalora();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; draftId?: string }>();
  const entryDate = typeof params.date === 'string' ? params.date : new Date().toISOString().slice(0, 10);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<ScanMode>('auto');
  const [hasScanned, setHasScanned] = useState(false);
  const [analysis, setAnalysis] = useState<CaptureAnalysis | null>(null);
  const [reviewDraftId, setReviewDraftId] = useState<string | null>(null);
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

  const analyze = async (input: { mode: ScanMode; barcode?: string; imageBase64?: string }) => {
    try {
      const next = await analyzeCapture.mutateAsync({ data: input });
      showAnalysis(next);
    } catch (error) {
      Alert.alert('Scan unavailable', error instanceof Error ? error.message : 'Try again or use search.');
      setHasScanned(false);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned || analyzeCapture.isPending || mode === 'food') return;
    const barcode = result.data?.trim();
    if (barcode) void analyze({ mode, barcode });
  };

  const takePhoto = async () => {
    if (!cameraRef.current || analyzeCapture.isPending) return;
    setHasScanned(true);
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.75, skipProcessing: Platform.OS === 'android' });
    if (photo?.base64) {
      await analyze({ mode: mode === 'barcode' ? 'food' : mode, imageBase64: photo.base64 });
    } else {
      setHasScanned(false);
      Alert.alert('Photo unavailable', 'Calora could not read that photo. Try again or choose a photo from your library.');
    }
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, base64: true });
    const base64 = result.canceled ? undefined : result.assets[0]?.base64;
    if (base64) await analyze({ mode: 'food', imageBase64: base64 });
  };

  const updateComponent = (component: FoodMemoryComponent) => {
    if (!reviewDraft) return;
    updateFoodMemoryDraft(reviewDraft.id, reviewDraft.components.map((item) => item.id === component.id ? component : item));
  };

  const acceptDraft = () => {
    if (!reviewDraft) return;
    acceptFoodMemory(reviewDraft.id);
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
    router.replace({ pathname: '/(tabs)/scan', params: { date: entryDate } });
  };

  if (!permission) {
    return <View style={[styles.page, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={[styles.eyebrow, { color: colors.primary }]}>CALORA SMART CAPTURE</Text><Text style={[styles.title, { color: colors.foreground }]}>Scan, then breathe.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Barcodes and food photos in one calm, reviewable flow.</Text></View>
          <View style={[styles.liveBadge, { backgroundColor: colors.accent }]}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={[styles.liveText, { color: colors.accentForeground }]}>LIVE</Text></View>
        </View>
        {!permission.granted ? <PermissionState colors={colors} onRequest={() => { void requestPermission(); }} /> : (
          <>
            <View style={[styles.cameraFrame, { borderColor: colors.border }]}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={mode === 'food' ? undefined : onBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }} />
              <View style={styles.cameraOverlay}><View style={[styles.corner, styles.cornerTL, { borderColor: colors.onHero }]} /><View style={[styles.corner, styles.cornerTR, { borderColor: colors.onHero }]} /><View style={[styles.corner, styles.cornerBL, { borderColor: colors.onHero }]} /><View style={[styles.corner, styles.cornerBR, { borderColor: colors.onHero }]} /><View style={[styles.scanHint, { backgroundColor: 'rgba(20,63,52,0.78)' }]}><Feather name="maximize" size={14} color={colors.heroMuted} /><Text style={[styles.scanHintText, { color: colors.onHero }]}>{mode === 'food' ? 'Frame your food or meal' : 'Point at a barcode or food'}</Text></View></View>
            </View>
            <View style={[styles.modePicker, { backgroundColor: colors.muted }]}>
              {(['auto', 'barcode', 'food'] as ScanMode[]).map((item) => <Pressable key={item} accessibilityLabel={`Scan mode ${item}`} onPress={() => { setMode(item); setHasScanned(false); }} style={[styles.modeButton, mode === item && { backgroundColor: colors.card }]}><Feather name={item === 'auto' ? 'zap' : item === 'barcode' ? 'maximize' : 'image'} size={14} color={mode === item ? colors.primary : colors.mutedForeground} /><Text style={[styles.modeText, { color: mode === item ? colors.foreground : colors.mutedForeground }]}>{item === 'auto' ? 'Auto' : item === 'barcode' ? 'Barcode' : 'Food'}</Text></Pressable>)}
            </View>
            <View style={styles.captureActions}>
              <Pressable accessibilityLabel="Choose food photo from library" onPress={() => void choosePhoto()} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="image" size={17} color={colors.foreground} /><Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Library</Text></Pressable>
              <Pressable accessibilityLabel="Capture food photo" onPress={() => void takePhoto()} style={[styles.shutter, { backgroundColor: colors.primary }]}>{analyzeCapture.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="camera" size={25} color={colors.primaryForeground} />}</Pressable>
              <View style={{ width: 92 }} />
            </View>
            <View style={[styles.trustCard, { backgroundColor: colors.hero }]}><Feather name="shield" size={17} color={colors.heroMuted} /><View style={{ flex: 1 }}><Text style={[styles.trustTitle, { color: colors.onHero }]}>Review before it counts</Text><Text style={[styles.trustBody, { color: colors.heroMuted }]}>Barcode matches use nutrition sources. Food photos are estimates. Nothing reaches your diary until you approve it.</Text></View></View>
          </>
        )}
      </ScrollView>
       <Modal visible={analysis !== null} transparent animationType="slide" onRequestClose={dismissDraft}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <View style={[styles.resultSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
             <View style={styles.resultHeader}><View><Text style={[styles.resultEyebrow, { color: colors.primary }]}>{analysis?.mode === 'barcode' ? 'BARCODE MATCH' : 'PHOTO REVIEW'}</Text><Text style={[styles.resultTitle, { color: colors.foreground }]}>{analysis?.title}</Text></View><Pressable accessibilityLabel="Close scan result" onPress={dismissDraft} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable></View>
             {analysis?.status === 'unavailable' ? <View style={[styles.unavailableResult, { backgroundColor: colors.accent }]}><Feather name="help-circle" size={19} color={colors.accentForeground} /><Text style={[styles.unavailableResultText, { color: colors.foreground }]}>{analysis.reviewMessage}</Text></View> : <><Text style={[styles.reviewMessage, { color: colors.mutedForeground }]}>{analysis?.reviewMessage}</Text>{reviewDraft?.assumptions.length ? <View style={[styles.assumptionCard, { backgroundColor: colors.accent }]}><Feather name="info" size={15} color={colors.accentForeground} /><Text style={[styles.assumptionText, { color: colors.foreground }]}>{reviewDraft.assumptions.join(' · ')}</Text></View> : null}<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 22 }}>{reviewDraft?.components.map((component) => <CandidateCard key={component.id} component={component} colors={colors} onChange={updateComponent} />)}<View style={[styles.totalCard, { backgroundColor: colors.hero }]}><View><Text style={[styles.totalLabel, { color: colors.heroMuted }]}>REVIEW TOTAL</Text><Text style={[styles.totalValue, { color: colors.onHero }]}>{Math.round(reviewDraft?.nutrition.calories ?? 0)} kcal</Text></View><Text style={[styles.totalMacro, { color: colors.heroMuted }]}>P {Math.round(reviewDraft?.nutrition.proteinG ?? 0)}g · C {Math.round(reviewDraft?.nutrition.carbsG ?? 0)}g · F {Math.round(reviewDraft?.nutrition.fatG ?? 0)}g</Text></View><Pressable accessibilityLabel="Approve and add meal to diary" onPress={acceptDraft} style={[styles.addButton, { backgroundColor: colors.primary }]}><Feather name="check-circle" size={16} color={colors.primaryForeground} /><Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>Approve and add to diary</Text></Pressable><Pressable accessibilityLabel="Discard food review" onPress={dismissDraft} style={styles.discardButton}><Text style={[styles.discardText, { color: colors.mutedForeground }]}>Not this meal</Text></Pressable></ScrollView></>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
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
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  resultSheet: { maxHeight: '90%', borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginBottom: 17 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  resultEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.4, marginTop: 5, maxWidth: 280 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reviewMessage: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 9, marginBottom: 14 },
  candidateCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 11 },
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
  totalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, padding: 14, marginTop: 4 },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 3 },
  totalMacro: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'right' },
  discardButton: { alignItems: 'center', paddingVertical: 13 },
  discardText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  unavailableResult: { flexDirection: 'row', gap: 9, padding: 12, borderRadius: 13, marginTop: 15 },
  unavailableResultText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});