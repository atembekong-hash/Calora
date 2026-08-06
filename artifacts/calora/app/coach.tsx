import { Feather } from '@expo/vector-icons';
import {
  CoachAction,
  CoachMessage,
  CoachResponse,
  useRespondCoach,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { buildCoachContext } from '@/lib/coachContext';
import { useCalora } from '@/context/CaloraContext';

type DisplayTurn = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: CoachResponse;
};

const starterPrompts = [
  'What should I focus on today?',
  'What patterns do you see this week?',
  'Help me improve protein.',
  'Find an easy dinner.',
  'Review my hydration.',
];

function actionIcon(destination: CoachAction['destination']): keyof typeof Feather.glyphMap {
  if (destination === 'recipes') return 'book-open';
  if (destination === 'planner') return 'calendar';
  if (destination === 'scan') return 'camera';
  if (destination === 'profile') return 'sliders';
  if (destination === 'home') return 'home';
  return 'bar-chart-2';
}

function navigateToAction(action: CoachAction) {
  if (action.kind !== 'navigate') return;
  if (action.destination === 'home') router.navigate('/(tabs)');
  if (action.destination === 'progress') router.navigate('/(tabs)/insights');
  if (action.destination === 'recipes') router.navigate('/(tabs)/recipes');
  if (action.destination === 'planner') router.navigate('/(tabs)/planner');
  if (action.destination === 'scan') router.navigate('/(tabs)/scan');
  if (action.destination === 'profile') router.navigate('/(tabs)/profile');
}

function EvidenceCard({ response, colors }: { response: CoachResponse; colors: ReturnType<typeof useCalora>['colors'] }) {
  if (!response.observations.length && !response.limitations.length) return null;
  return (
    <View style={[styles.evidenceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.evidenceHeader}>
        <View style={[styles.evidenceIcon, { backgroundColor: colors.accent }]}>
          <Feather name="activity" size={15} color={colors.accentForeground} />
        </View>
        <View>
          <Text style={[styles.evidenceTitle, { color: colors.foreground }]}>What I’m using</Text>
          <Text style={[styles.evidenceSubtitle, { color: colors.mutedForeground }]}>Signals, not scores</Text>
        </View>
      </View>
      {response.observations.map((observation, index) => (
        <View key={`${observation.text}-${index}`} style={[styles.observation, { borderTopColor: colors.border }]}>
          <View style={[styles.confidenceDot, { backgroundColor: observation.confidence === 'high' ? colors.success : observation.confidence === 'medium' ? colors.warning : colors.mutedForeground }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.observationText, { color: colors.foreground }]}>{observation.text}</Text>
            <Text style={[styles.observationMeta, { color: colors.mutedForeground }]}>
              {observation.confidence === 'limited' ? 'Early signal' : `${observation.confidence} confidence`}
            </Text>
          </View>
        </View>
      ))}
      {response.limitations.map((limitation, index) => (
        <Text key={`${limitation}-${index}`} style={[styles.limitation, { color: colors.mutedForeground }]}>{limitation}</Text>
      ))}
    </View>
  );
}

function ActionCard({ action, colors }: { action: CoachAction; colors: ReturnType<typeof useCalora>['colors'] }) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      testID={`coach-action-${action.destination}`}
      onPress={() => navigateToAction(action)}
      style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.accent, opacity: pressed ? 0.72 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.card }]}>
        <Feather name={actionIcon(action.destination)} size={15} color={colors.accentForeground} />
      </View>
      <Text style={[styles.actionText, { color: colors.accentForeground }]}>{action.label}</Text>
      <Feather name="arrow-up-right" size={15} color={colors.accentForeground} />
    </Pressable>
  );
}

export default function CoachScreen() {
  const {
    colors,
    profile,
    logs,
    waterLogs,
    moodLogs,
    activityLogs,
    weights,
    plannerMeals,
    shoppingItems,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    foodMemories,
    repeatPatterns,
    coachConsentAccepted,
    setCoachConsentAccepted,
    coachMessages,
    setCoachMessages,
    clearCoachHistory,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const respondCoach = useRespondCoach();
  const [composer, setComposer] = useState('');
  const [turns, setTurns] = useState<DisplayTurn[]>(() => coachMessages.map((message, index) => ({
    id: `saved-${index}`,
    role: message.role,
    content: message.content,
  })));

  const context = useMemo(() => buildCoachContext({
    profile,
    logs,
    waterLogs,
    moodLogs,
    activityLogs,
    weights,
    plannerMeals,
    shoppingItems,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    foodMemories,
    repeatPatterns,
  }), [activityLogs, foodMemories, localRecipes, logs, moodLogs, plannerMeals, profile, repeatPatterns, savedMeals, savedRecipeIds, shoppingItems, waterLogs, weights]);

  const sendMessage = async (value = composer.trim()) => {
    if (!value || respondCoach.isPending) return;
    const userMessage: CoachMessage = { role: 'user', content: value.slice(0, 3000) };
    const nextMessages = [...coachMessages, userMessage].slice(-11);
    const userTurn: DisplayTurn = { id: `user-${Date.now()}`, role: 'user', content: userMessage.content };
    setTurns((current) => [...current, userTurn]);
    setComposer('');
    try {
      const response = await respondCoach.mutateAsync({
        data: {
          context,
          messages: nextMessages,
          currentScreen: 'progress-coach',
        },
      });
      const assistantMessage: CoachMessage = { role: 'assistant', content: response.message };
      setCoachMessages([...nextMessages, assistantMessage].slice(-12));
      setTurns((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        response,
      }]);
    } catch {
      setTurns((current) => [...current, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I couldn’t reach Coach just now. Nothing was changed. Your local Progress data is still available.',
      }]);
    }
  };

  const startCoach = () => {
    setCoachConsentAccepted(true);
    void sendMessage('Give me a calm, useful read on my nutrition and wellness this week.');
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 118 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close Calora Coach" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>CALORA INTELLIGENCE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Calora Coach</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your food, wellness, and planning context in one place.</Text>
          </View>
          {coachConsentAccepted && (
            <Pressable accessibilityLabel="Clear Coach history" onPress={clearCoachHistory} style={[styles.clearButton, { backgroundColor: colors.muted }]}>
              <Feather name="trash-2" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {!coachConsentAccepted ? (
          <View style={[styles.consentCard, { backgroundColor: colors.hero }]}>
            <View style={[styles.coachMark, { backgroundColor: 'rgba(157,215,189,0.16)' }]}>
              <Feather name="zap" size={24} color={colors.heroMuted} />
            </View>
            <Text style={[styles.consentTitle, { color: colors.onHero }]}>A more personal read</Text>
            <Text style={[styles.consentBody, { color: colors.heroMuted }]}>
              Coach can use the nutrition, hydration, mood, activity, weight, Food Memory, and planning information saved in Calora to help you decide what to do next.
            </Text>
            <View style={styles.scopeRow}>
              {['Meals & macros', 'Wellness signals', 'Plans & memories'].map((item) => (
                <View key={item} style={[styles.scopePill, { backgroundColor: 'rgba(157,215,189,0.14)' }]}>
                  <Feather name="check" size={11} color={colors.heroMuted} />
                  <Text style={[styles.scopeText, { color: colors.heroMuted }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.consentNote, { color: colors.heroMuted }]}>Your request is sent to Calora’s AI service. Coach does not replace medical care and never changes your data without your confirmation.</Text>
            <Pressable accessibilityLabel="Continue to Calora Coach" testID="coach-consent-continue" onPress={startCoach} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>See my weekly read</Text>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </Pressable>
          </View>
        ) : (
          <>
            {turns.length === 0 && (
              <View style={[styles.briefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.briefIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="activity" size={20} color={colors.accentForeground} />
                </View>
                <Text style={[styles.briefEyebrow, { color: colors.primary }]}>YOUR WEEKLY READ</Text>
                <Text style={[styles.briefTitle, { color: colors.foreground }]}>Let’s make the signal useful.</Text>
                <Text style={[styles.briefBody, { color: colors.mutedForeground }]}>Ask about your meals, hydration, patterns, or what to do next. Coach will show what it is using and where you can go from here.</Text>
              </View>
            )}
            {turns.map((turn) => (
              <View key={turn.id} style={turn.role === 'user' ? styles.userTurn : styles.assistantTurn}>
                <View style={[styles.messageBubble, turn.role === 'user'
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.messageText, { color: turn.role === 'user' ? colors.primaryForeground : colors.foreground }]}>{turn.content}</Text>
                </View>
                {turn.response && (
                  <>
                    <EvidenceCard response={turn.response} colors={colors} />
                    {turn.response.actions.map((action) => <ActionCard key={action.id} action={action} colors={colors} />)}
                  </>
                )}
              </View>
            ))}
            {respondCoach.isPending && (
              <View style={[styles.loadingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Reading your Calora context…</Text>
              </View>
            )}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRY ASKING</Text>
            <View style={styles.promptWrap}>
              {starterPrompts.map((prompt) => (
                <Pressable key={prompt} accessibilityLabel={`Ask Coach: ${prompt}`} onPress={() => void sendMessage(prompt)} style={[styles.promptChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScrollViewCompat>

      {coachConsentAccepted && (
        <View style={[styles.composerDock, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={composer}
            onChangeText={setComposer}
            onSubmitEditing={() => void sendMessage()}
            returnKeyType="send"
            editable={!respondCoach.isPending}
            placeholder="Ask about your nutrition…"
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel="Ask Calora Coach"
            style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable accessibilityLabel="Send Coach message" testID="coach-send" onPress={() => void sendMessage()} disabled={!composer.trim() || respondCoach.isPending} style={[styles.sendButton, { backgroundColor: composer.trim() && !respondCoach.isPending ? colors.primary : colors.muted }]}>
            <Feather name="arrow-up" size={18} color={composer.trim() && !respondCoach.isPending ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 22 },
  backButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.6 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 },
  clearButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  consentCard: { borderRadius: 25, padding: 20 },
  coachMark: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  consentTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.4 },
  consentBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 },
  scopePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  scopeText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  consentNote: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 18 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, marginTop: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  briefCard: { borderWidth: 1, borderRadius: 22, padding: 17, marginBottom: 20 },
  briefIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  briefEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  briefTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 6 },
  briefBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 7 },
  userTurn: { alignItems: 'flex-end', marginBottom: 12 },
  assistantTurn: { alignItems: 'stretch', marginBottom: 18 },
  messageBubble: { maxWidth: '92%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  evidenceCard: { borderWidth: 1, borderRadius: 18, padding: 13, marginTop: 9 },
  evidenceHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  evidenceIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  evidenceTitle: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  evidenceSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  observation: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10, marginTop: 9 },
  confidenceDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  observationText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  observationMeta: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginTop: 3 },
  limitation: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 9 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 10, marginTop: 8 },
  actionIcon: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 11 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 17, padding: 13, marginBottom: 18 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1, marginBottom: 9 },
  promptWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 8 },
  promptChip: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  promptText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  composerDock: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 9 },
  composer: { flex: 1, minHeight: 45, maxHeight: 100, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, fontFamily: 'Inter_400Regular', fontSize: 13 },
  sendButton: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});