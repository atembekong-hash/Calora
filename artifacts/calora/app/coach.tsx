import { Feather } from '@expo/vector-icons';
import {
  CoachAction,
  CoachMessage,
  CoachResponse,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@/lib/brand';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useCalora } from '@/context/CaloraContext';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppChrome';
import { CoachFactContextConsentPanel } from '@/components/CoachFactContextConsentPanel';
import {
  isIntelligenceFeatureEnabled,
  useCoachSendAdapter,
  buildDailyIntelligenceFacts,
  createIntelligenceContext,
} from '@/lib/intelligence';
import type { IntelligenceFact } from '@/lib/intelligence';
import { dateKey } from '@/lib/dates';

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

/**
 * Frozen approved daily calorie+protein fact types.
 * Only these fact types are extracted from the full daily intelligence fact
 * set and passed to the Coach send adapter.  No other content is included.
 */
const CALORIE_PROTEIN_FACT_TYPES = Object.freeze([
  'daily.calories_consumed',
  'daily.calorie_target',
  'daily.calories_remaining',
  'daily.protein_consumed',
  'daily.protein_target',
  'daily.protein_remaining',
] as const);

export default function CoachScreen() {
  const {
    colors,
    profile,
    logs,
    waterLogs,
    moodLogs,
    activityLogs,
    activityMinutesLogs,
    weights,
    plannerMeals,
    shoppingItems,
    savedMeals,
    localRecipes,
    savedRecipeIds,
    foodMemories,
    repeatPatterns,
    livingMemory,
    healthConnection,
    coachConsentAccepted,
    setCoachConsentAccepted,
    coachMessages,
    setCoachMessages,
    clearCoachHistory,
    hydrated,
    hydrationError,
  } = useCalora();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const coachSendAdapter = useCoachSendAdapter();
  // Track hydration generation: bumps whenever hydrated goes false→true or
  // hydrationError changes (covers retries and clear-data resets).
  const hydrationGenerationRef = useRef(0);
  const prevHydratedRef = useRef(hydrated);
  const prevHydrationErrorRef = useRef(hydrationError);
  if (prevHydratedRef.current !== hydrated || prevHydrationErrorRef.current !== hydrationError) {
    hydrationGenerationRef.current += 1;
    prevHydratedRef.current = hydrated;
    prevHydrationErrorRef.current = hydrationError;
  }
  const hydrationGeneration = hydrationGenerationRef.current;
  // Runs during the render that observes an identity, hydration, or consent
  // change, before a pending async Coach result can update this screen.
  coachSendAdapter.syncLiveState({
    accountId: user?.id ?? null,
    hydrationGeneration,
    consentAccepted: coachConsentAccepted,
  });

  const [composer, setComposer] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [turns, setTurns] = useState<DisplayTurn[]>(() => coachMessages.map((message, index) => ({
    id: `saved-${index}`,
    role: message.role,
    content: message.content,
  })));

  const sendMessage = async (value = composer.trim()) => {
    if (!value || isSending) return;
    const userMessage: CoachMessage = { role: 'user', content: value.slice(0, 3000) };
    // Capture current messages synchronously before any await so we use the
    // state at send-time, not whatever React committed after re-renders.
    const nextMessages = [...coachMessages, userMessage].slice(-11);
    const userTurn: DisplayTurn = { id: `user-${Date.now()}`, role: 'user', content: userMessage.content };
    setTurns((current) => [...current, userTurn]);
    setComposer('');

    // Capture epoch-relevant state synchronously at send-time.
    // Build and freeze only the approved daily calorie+protein facts.
    // These are the only facts fed to the Fact Context path; no other content
    // (mood, hydration, weight, planner, etc.) is included.
    let frozenFacts: readonly IntelligenceFact[] = Object.freeze([]);
    if (hydrated && user?.id) {
      try {
        const todayKey = dateKey();
        const intelligenceCtx = createIntelligenceContext(
          {
            logs,
            profile,
            weights,
            waterLogs,
            moodLogs,
            activityLogs,
            activityMinutesLogs,
            plannerMeals,
            shoppingItems,
            localRecipes,
            activeEnergyKcal: healthConnection.snapshot?.activeEnergyKcal ?? null,
          },
          { date: todayKey },
        );
        const allFacts = buildDailyIntelligenceFacts(intelligenceCtx);
        frozenFacts = Object.freeze(
          allFacts.filter((fact) =>
            (CALORIE_PROTEIN_FACT_TYPES as readonly string[]).includes(fact.factType),
          ),
        );
      } catch {
        // Fact build failure must never block the send path.
        frozenFacts = Object.freeze([]);
      }
    }
    const adapterInput = {
      accountId: user?.id ?? null,
      hydrationGeneration,
      hydrated,
      consentAccepted: coachConsentAccepted,
      facts: frozenFacts,
    };

    setIsSending(true);
    try {
      const result = await coachSendAdapter.sendWithArchitecture(
        nextMessages,
        // Retained only for the adapter's transitional type contract. The
        // adapter deliberately never invokes a Legacy Coach provider delegate.
        async () => { throw new Error('Legacy Coach is retired.'); },
        adapterInput,
      );

      if (result.kind === 'stale') {
        // Epoch advanced; a newer state now owns the visible conversation.
        return;
      }
      if (result.kind === 'unavailable') {
        // Fact Context is deliberately terminal while its restricted server
        // gates are closed. Explain that state instead of making Send appear
        // to do nothing; never fall back to Legacy Coach.
        setTurns((current) => [...current, {
          id: `unavailable-${Date.now()}`,
          role: 'assistant',
          content: 'Coach is not available for this account right now. Nothing was changed. Your local Progress data is still available.',
        }]);
        return;
      }

      // Only Fact Context responses can contain a provider result.
      const message = result.response.message;
      const assistantMessage: CoachMessage = { role: 'assistant', content: message };
      setCoachMessages([...nextMessages, assistantMessage].slice(-12));
      setTurns((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: message,
      }]);
    } catch {
      setTurns((current) => [...current, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I couldn\u2019t reach Coach just now. Nothing was changed. Your local Progress data is still available.',
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const startCoach = () => {
    setCoachConsentAccepted(true);
    void sendMessage('Give me a calm, useful read on my nutrition and wellness this week.');
  };

  const clearConversation = () => {
    clearCoachHistory();
    setTurns([]);
    setComposer('');
    setMenuVisible(false);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader
        back
        title={`${BRAND.name} Coach`}
        action={
          <Pressable
            accessibilityLabel="Open Coach main menu"
            testID="coach-main-menu"
            onPress={() => setMenuVisible(true)}
            hitSlop={10}
          >
            <Feather name="menu" size={21} color={colors.foreground} />
          </Pressable>
        }
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 118 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{BRAND.name.toUpperCase()} INTELLIGENCE</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A calm, focused read on your current nutrition.</Text>
        </View>
        {isIntelligenceFeatureEnabled('intelligence.coach.fact_context') && (
          <CoachFactContextConsentPanel colors={colors} />
        )}

        {!coachConsentAccepted ? (
          <View style={[styles.consentCard, { backgroundColor: colors.hero }]}>
            <View style={[styles.coachMark, { backgroundColor: 'rgba(157,215,189,0.16)' }]}>
              <Feather name="zap" size={24} color={colors.heroMuted} />
            </View>
            <Text style={[styles.consentTitle, { color: colors.onHero }]}>A focused nutrition read</Text>
            <Text style={[styles.consentBody, { color: colors.heroMuted }]}>
              Coach can use your logged calories and protein to help you make a thoughtful next choice. It does not use your mood, hydration, weight, plans, or Food Memory in this conversation.
            </Text>
            <View style={styles.scopeRow}>
              {['Calories logged', 'Protein logged', 'Your question'].map((item) => (
                <View key={item} style={[styles.scopePill, { backgroundColor: 'rgba(157,215,189,0.14)' }]}>
                  <Feather name="check" size={11} color={colors.heroMuted} />
                  <Text style={[styles.scopeText, { color: colors.heroMuted }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.consentNote, { color: colors.heroMuted }]}>Your request is sent to {BRAND.name}'s AI service. Coach does not replace medical care and never changes your data without your confirmation.</Text>
            <Pressable accessibilityLabel={`Continue to ${BRAND.name} Coach`} testID="coach-consent-continue" onPress={startCoach} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
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
              <Animated.View key={turn.id} entering={FadeInDown.springify().damping(16).duration(380)} style={turn.role === 'user' ? styles.userTurn : styles.assistantTurn}>
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
              </Animated.View>
            ))}
            {isSending && (
              <View style={[styles.loadingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Reading your {BRAND.name} context…</Text>
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
            editable={!isSending}
            placeholder="Ask about your nutrition…"
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={`Ask ${BRAND.name} Coach`}
            style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable accessibilityLabel="Send Coach message" testID="coach-send" onPress={() => void sendMessage()} disabled={!composer.trim() || isSending} style={[styles.sendButton, { backgroundColor: composer.trim() && !isSending ? colors.primary : colors.muted }]}>
            <Feather name="arrow-up" size={18} color={composer.trim() && !isSending ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Close Coach main menu"
            testID="coach-menu-backdrop"
            onPress={() => setMenuVisible(false)}
            style={styles.menuBackdrop}
          />
          <View style={[styles.menuSheet, { backgroundColor: colors.background, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuTitleGroup}>
                <View style={[styles.menuTitleIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="message-square" size={16} color={colors.accentForeground} />
                </View>
                <View>
                  <Text style={[styles.menuEyebrow, { color: colors.primary }]}>{BRAND.name.toUpperCase()} COACH</Text>
                  <Text style={[styles.menuTitle, { color: colors.foreground }]}>Chat history</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Close Coach menu"
                testID="coach-menu-close"
                onPress={() => setMenuVisible(false)}
                style={[styles.menuCloseButton, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={17} color={colors.foreground} />
              </Pressable>
            </View>

            {coachConsentAccepted ? (
              <>
                <Pressable
                  accessibilityLabel="Start a new Coach chat"
                  testID="coach-new-chat"
                  onPress={clearConversation}
                  style={({ pressed }) => [styles.newChatButton, { backgroundColor: colors.primary, opacity: pressed ? 0.72 : 1 }]}
                >
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.newChatText, { color: colors.primaryForeground }]}>New chat</Text>
                </Pressable>

                <Text style={[styles.historyLabel, { color: colors.mutedForeground }]}>THIS CHAT</Text>
                {coachMessages.length > 0 ? (
                  <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {coachMessages.slice(-8).map((message, index) => (
                      <View key={`${message.role}-${index}`} style={[styles.historyRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                        <View style={[styles.historyRole, { backgroundColor: message.role === 'user' ? colors.primary : colors.accent }]}>
                          <Feather name={message.role === 'user' ? 'user' : 'zap'} size={11} color={message.role === 'user' ? colors.primaryForeground : colors.accentForeground} />
                        </View>
                        <View style={styles.historyCopy}>
                          <Text style={[styles.historyRoleText, { color: colors.mutedForeground }]}>{message.role === 'user' ? 'You' : BRAND.name + ' Coach'}</Text>
                          <Text numberOfLines={2} style={[styles.historyMessage, { color: colors.foreground }]}>{message.content}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.emptyHistory, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="message-circle" size={20} color={colors.mutedForeground} />
                    <Text style={[styles.emptyHistoryTitle, { color: colors.foreground }]}>No chats yet</Text>
                    <Text style={[styles.emptyHistoryBody, { color: colors.mutedForeground }]}>Your Coach conversations will appear here on this device.</Text>
                  </View>
                )}

                {coachMessages.length > 0 && (
                  <Pressable
                    accessibilityLabel="Clear Coach chat history"
                    testID="coach-clear-history"
                    onPress={clearConversation}
                    style={({ pressed }) => [styles.clearHistoryButton, { borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.clearHistoryText, { color: colors.mutedForeground }]}>Clear chat history</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={[styles.emptyHistory, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.mutedForeground} />
                <Text style={[styles.emptyHistoryTitle, { color: colors.foreground }]}>Chat history is private</Text>
                <Text style={[styles.emptyHistoryBody, { color: colors.mutedForeground }]}>Continue to Coach to save and revisit conversations on this device.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerCopy: { marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
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
  menuOverlay: { flex: 1, flexDirection: 'row' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(8,22,15,0.46)' },
  menuSheet: { width: '86%', maxWidth: 390, paddingHorizontal: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: -5, height: 0 }, elevation: 12 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  menuTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuTitleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.15, marginBottom: 3 },
  menuTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  menuCloseButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  newChatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, paddingVertical: 13, marginBottom: 25 },
  newChatText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  historyLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.15, marginBottom: 9 },
  historyCard: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 11, paddingVertical: 11 },
  historyRole: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  historyCopy: { flex: 1 },
  historyRoleText: { fontFamily: 'Inter_700Bold', fontSize: 9, marginBottom: 3 },
  historyMessage: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  emptyHistory: { borderWidth: 1, borderRadius: 17, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 25 },
  emptyHistoryTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 10 },
  emptyHistoryBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  clearHistoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 13, paddingVertical: 12, marginTop: 14 },
  clearHistoryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});