import { Feather } from "@expo/vector-icons";
import {
  clearCoachV2Conversation,
  deleteCoachV2Conversation,
  getCoachV2Conversation,
  getCoachV2Settings,
  listCoachV2Conversations,
  openCoachV2Conversation,
  sendCoachV2Message,
  startNewCoachV2Conversation,
  updateCoachV2Settings,
  ApiError,
  type CoachV2ConversationSummary,
  type CoachV2Turn,
} from "@workspace/api-client-react";
import { formatCoachPlainText } from "@workspace/api-zod/coach-text-presentation";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { CaloraFeatureIcon } from "@/components/CaloraFeatureIcon";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/context/AuthContext";
import { useCalora } from "@/context/CaloraContext";
import { BRAND } from "@/lib/brand";
import { copyCoachResponseText } from "@/lib/coachClipboard";
import { dateKey } from "@/lib/dates";
import { reconcileDiaryState } from "@/lib/diarySync";

type DisplayTurn = Pick<CoachV2Turn, "id" | "role" | "content"> & {
  announce?: boolean;
};
type ConfirmAction =
  "new" | "clear" | { type: "delete"; conversationId: string } | null;

const starterPrompts = [
  "How is my nutrition today?",
  "Help me plan a balanced dinner.",
  "What can I focus on this week?",
  "How do I use Calora to log a meal?",
];
const guestChatDescription =
  "Guest messages are not saved and do not use personal app data.";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400)
      return "Please enter a valid Coach message and try again.";
    if (error.status === 401)
      return "Your account session needs to be refreshed. Please sign in again.";
    if (error.status === 409)
      return "Only completed saved Coach chats can be deleted. Please wait for Coach to finish replying.";
    if (error.status === 429)
      return "Coach is busy right now. Please wait a moment and try again.";
    if (error.status === 404)
      return "That saved Coach chat is no longer available.";
  }
  return "Coach is temporarily unavailable. Please try again.";
}

function toDisplayTurns(coachTurns: CoachV2Turn[]): DisplayTurn[] {
  return coachTurns.map((turn) => ({
    id: turn.id,
    role: turn.role,
    content:
      turn.role === "assistant"
        ? formatCoachPlainText(turn.content, {
            removeEmoji: true,
            roundMeasurements: true,
          })
        : turn.content,
  }));
}

function savedChatPreview(conversation: CoachV2ConversationSummary): string {
  return conversation.preview?.replace(/\s+/g, " ").trim() || "New Coach chat";
}

export default function CoachScreen() {
  const { colors, logs, hydrated, applySyncedDiaryLogs } = useCalora();
  const { user, session, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const transcriptRef = useRef<ScrollView>(null);
  const composerRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);
  const signedIn = !authLoading && Boolean(user?.id);
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [composer, setComposer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<CoachV2ConversationSummary[]>(
    [],
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isManagingChat, setIsManagingChat] = useState(false);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadId = ++requestIdRef.current;
    if (!signedIn) {
      setTurns([]);
      setSavedChats([]);
      setPersonalizationEnabled(true);
      setNotice(null);
      return;
    }
    setTurns([]);
    setSavedChats([]);
    setIsLoadingHistory(true);
    setNotice(null);
    void Promise.all([
      getCoachV2Conversation(),
      getCoachV2Settings(),
      listCoachV2Conversations(),
    ])
      .then(([conversation, settings, conversations]) => {
        if (loadId !== requestIdRef.current) return;
        setTurns(toDisplayTurns(conversation.turns));
        setPersonalizationEnabled(settings.personalizationEnabled);
        setSavedChats(conversations.conversations);
      })
      .catch(() => {
        if (loadId !== requestIdRef.current) return;
        setNotice(
          "Your Coach history could not be loaded. You can still try a new message.",
        );
      })
      .finally(() => {
        if (loadId === requestIdRef.current) setIsLoadingHistory(false);
      });
  }, [signedIn, user?.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      transcriptRef.current?.scrollToEnd({ animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, [turns.length, isSending]);

  const sendMessage = async (value = composer.trim()) => {
    const message = value.trim();
    if (!message || isSending) return;
    const requestId = ++requestIdRef.current;
    const userTurn: DisplayTurn = {
      id: `local-user-${requestId}`,
      role: "user",
      content: message.slice(0, 1200),
    };
    setNotice(null);
    setIsSending(true);
    try {
      // The dashboard is intentionally local-first. Before a personalized
      // Coach question, complete the owner-scoped outbox reconciliation so the
      // server-owned snapshot cannot lag behind the visible Today totals.
      if (signedIn && personalizationEnabled) {
        if (!hydrated || !session?.access_token) {
          setNotice(
            "Your logged nutrition is still loading. Please try Coach again in a moment.",
          );
          return;
        }
        try {
          const mergedLogs = await reconcileDiaryState(
            logs,
            session.access_token,
          );
          if (requestId !== requestIdRef.current) return;
          applySyncedDiaryLogs(mergedLogs);
        } catch {
          if (requestId === requestIdRef.current) {
            setNotice(
              "Your logged nutrition has not synced yet. Check your connection and try Coach again.",
            );
          }
          return;
        }
      }
      if (requestId !== requestIdRef.current) return;
      setTurns((current) => [...current, userTurn]);
      setComposer("");
      const response = await sendCoachV2Message({
        message: userTurn.content,
        // `dateKey` intentionally uses the device's local calendar date rather
        // than UTC so the server totals the same day displayed in Today.
        snapshotDate: signedIn ? dateKey() : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setTurns((current) => [
        ...current,
        {
          id: `coach-${requestId}`,
          role: "assistant",
          content: formatCoachPlainText(response.message, {
            removeEmoji: true,
            roundMeasurements: true,
          }),
          announce: true,
        },
      ]);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setNotice(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setIsSending(false);
    }
  };

  const focusComposer = () => {
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const startNewChat = () => {
    if (isManagingChat || isSending) return;
    setMenuVisible(false);
    if (!signedIn) {
      requestIdRef.current += 1;
      setIsSending(false);
      setTurns([]);
      setComposer("");
      setNotice(null);
      focusComposer();
      return;
    }
    setConfirmAction("new");
  };

  const createNewChat = async () => {
    if (!signedIn || isManagingChat || isSending) return;
    const requestId = ++requestIdRef.current;
    setIsSending(false);
    setIsManagingChat(true);
    setNotice(null);
    try {
      await startNewCoachV2Conversation();
      const conversations = await listCoachV2Conversations();
      if (requestId !== requestIdRef.current) return;
      setTurns([]);
      setComposer("");
      setSavedChats(conversations.conversations);
      setMenuVisible(false);
      setConfirmAction(null);
      focusComposer();
    } catch (error) {
      if (requestId === requestIdRef.current) setNotice(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setIsManagingChat(false);
    }
  };

  const clearHistory = async () => {
    if (!signedIn || isManagingChat) return;
    const requestId = ++requestIdRef.current;
    setIsSending(false);
    setIsManagingChat(true);
    setNotice(null);
    try {
      await clearCoachV2Conversation();
      if (requestId !== requestIdRef.current) return;
      setTurns([]);
      setComposer("");
      setSavedChats([]);
      setMenuVisible(false);
      setConfirmAction(null);
    } catch (error) {
      if (requestId === requestIdRef.current) setNotice(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setIsManagingChat(false);
    }
  };

  const deleteSavedChat = async (conversationId: string) => {
    if (!signedIn || isManagingChat || isSending) return;
    const requestId = ++requestIdRef.current;
    setIsManagingChat(true);
    setNotice(null);
    try {
      await deleteCoachV2Conversation(conversationId);
      if (requestId !== requestIdRef.current) return;
      setSavedChats((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      );
      setConfirmAction(null);
      setNotice("Saved Coach chat deleted.");
    } catch (error) {
      if (requestId === requestIdRef.current) setNotice(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setIsManagingChat(false);
    }
  };

  const openSavedChat = async (conversationId: string) => {
    if (!signedIn || isManagingChat || isSending) return;
    const requestId = ++requestIdRef.current;
    setIsManagingChat(true);
    setIsLoadingHistory(true);
    setNotice(null);
    try {
      const conversation = await openCoachV2Conversation(conversationId);
      const conversations = await listCoachV2Conversations();
      if (requestId !== requestIdRef.current) return;
      setTurns(toDisplayTurns(conversation.turns));
      setPersonalizationEnabled(conversation.personalizationEnabled);
      setSavedChats(conversations.conversations);
      setComposer("");
      setMenuVisible(false);
      focusComposer();
    } catch (error) {
      if (requestId === requestIdRef.current) setNotice(errorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsManagingChat(false);
        setIsLoadingHistory(false);
      }
    }
  };

  const changePersonalization = async (nextValue: boolean) => {
    if (!signedIn || isUpdatingSettings) return;
    setIsUpdatingSettings(true);
    setNotice(null);
    try {
      const settings = await updateCoachV2Settings({
        personalizationEnabled: nextValue,
      });
      setPersonalizationEnabled(settings.personalizationEnabled);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const archivedChats = savedChats.filter(
    (conversation) => !conversation.active,
  );
  const isDeleteConfirmation =
    typeof confirmAction === "object" && confirmAction !== null;

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={[styles.page, { backgroundColor: colors.background }]}
    >
      <AppHeader
        back
        title={`${BRAND.name} Coach`}
        action={
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Start a new Coach chat"
              testID="coach-new-chat"
              onPress={startNewChat}
              hitSlop={10}
            >
              <Feather name="edit-3" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              accessibilityLabel="Open Coach main menu"
              testID="coach-main-menu"
              onPress={() => setMenuVisible(true)}
              hitSlop={10}
            >
              <Feather name="menu" size={23} color={colors.foreground} />
            </Pressable>
          </View>
        }
      />
      <KeyboardAwareScrollViewCompat
        ref={transcriptRef}
        style={styles.transcript}
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ask about nutrition, Calora features, or everyday wellness. Coach is
            not medical care.
          </Text>
        </View>

        {turns.length === 0 && !isLoadingHistory ? (
          <View style={[styles.welcomeCard, { backgroundColor: colors.hero }]}>
            <View
              style={[
                styles.coachMark,
                { backgroundColor: "rgba(157,215,189,0.16)" },
              ]}
            >
              <CaloraFeatureIcon
                name="coach"
                size={36}
                primaryColor={colors.primary}
                accentColor={colors.accent}
                foregroundColor={colors.heroMuted}
                highlightColor={colors.onHero}
              />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.onHero }]}>
              A simpler way to ask
            </Text>
            <Text style={[styles.welcomeBody, { color: colors.heroMuted }]}>
              {signedIn
                ? "Coach can use a compact server-side summary of your profile and logged nutrition when personalization is on."
                : "Guest chats are temporary and use general wellness information only."}
            </Text>
            {signedIn ? (
              <Text style={[styles.welcomeNote, { color: colors.heroMuted }]}>
                Your chat history is saved to your account. You can clear it
                anytime.
              </Text>
            ) : (
              <Pressable
                accessibilityLabel="Sign in for personalized Coach"
                onPress={() => router.push("/auth/sign-in")}
                style={[
                  styles.signInButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.signInText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Sign in for personal context
                </Text>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={colors.primaryForeground}
                />
              </Pressable>
            )}
          </View>
        ) : null}

        {isLoadingHistory ? (
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.mutedForeground }]}
            >
              Loading your conversation…
            </Text>
          </View>
        ) : null}

        {turns.map((turn) => {
          const displayContent =
            turn.role === "assistant"
              ? formatCoachPlainText(turn.content, {
                  removeEmoji: true,
                  roundMeasurements: true,
                })
              : turn.content;
          return (
            <View
              key={turn.id}
              style={
                turn.role === "user" ? styles.userTurn : styles.assistantTurn
              }
            >
              <View
                accessibilityLiveRegion={turn.announce ? "polite" : "none"}
                style={[
                  styles.messageBubble,
                  turn.role === "user"
                    ? { backgroundColor: colors.primary }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color:
                        turn.role === "user"
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {displayContent}
                </Text>
                {turn.role === "assistant" ? (
                  <Pressable
                    accessibilityLabel="Copy Coach response"
                    testID={`coach-copy-response-${turn.id}`}
                    onPress={() => {
                      void copyCoachResponseText(displayContent, Clipboard)
                        .then(() => setNotice("Coach response copied."))
                        .catch(() =>
                          setNotice(
                            "Coach response could not be copied. Please try again.",
                          ),
                        );
                    }}
                    style={[
                      styles.copyResponseButton,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Feather name="copy" size={13} color={colors.foreground} />
                    <Text
                      style={[
                        styles.copyResponseText,
                        { color: colors.foreground },
                      ]}
                    >
                      Copy
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        {isSending ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.loadingCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={[styles.loadingText, { color: colors.mutedForeground }]}
            >
              Coach is thinking…
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.noticeCard,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={15} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {formatCoachPlainText(notice, { removeEmoji: true })}
            </Text>
          </View>
        ) : null}

        {turns.length === 0 && !isLoadingHistory ? (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              SUGGESTIONS
            </Text>
            <View style={styles.promptWrap}>
              {starterPrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  accessibilityLabel={`Ask Coach: ${prompt}`}
                  onPress={() => void sendMessage(prompt)}
                  style={[styles.promptChip, { backgroundColor: colors.muted }]}
                >
                  <Text
                    style={[styles.promptText, { color: colors.foreground }]}
                  >
                    {prompt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.composerDock,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          ref={composerRef}
          value={composer}
          onChangeText={setComposer}
          onSubmitEditing={() => void sendMessage()}
          returnKeyType="send"
          editable={!isSending}
          maxLength={1200}
          placeholder="Ask Calora Coach…"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel={`Ask ${BRAND.name} Coach`}
          style={[
            styles.composer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
        />
        <Pressable
          accessibilityLabel="Send Coach message"
          testID="coach-send"
          onPress={() => void sendMessage()}
          disabled={!composer.trim() || isSending}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                composer.trim() && !isSending ? colors.primary : colors.muted,
            },
          ]}
        >
          <Feather
            name="arrow-up"
            size={18}
            color={
              composer.trim() && !isSending
                ? colors.primaryForeground
                : colors.mutedForeground
            }
          />
        </Pressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Close Coach settings"
            onPress={() => setMenuVisible(false)}
            style={styles.menuBackdrop}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.menuSheet,
              {
                backgroundColor: colors.background,
                paddingTop: insets.top + 14,
                paddingBottom: insets.bottom + 14,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <View>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>
                  Coach settings
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Simple controls for your chat
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close Coach settings"
                onPress={() => setMenuVisible(false)}
                style={[styles.menuClose, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={17} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.menuScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {signedIn ? (
                <>
                  <Pressable
                    accessibilityLabel="Start a new Coach chat"
                    testID="coach-menu-new-chat"
                    onPress={startNewChat}
                    style={[
                      styles.newChatButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Feather
                      name="edit-3"
                      size={15}
                      color={colors.primaryForeground}
                    />
                    <Text
                      style={[
                        styles.newChatButtonText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Start a new chat
                    </Text>
                  </Pressable>
                  <View
                    style={[
                      styles.savedChatsCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Saved chats
                    </Text>
                    <Text
                      style={[
                        styles.settingBody,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Starting a new chat saves the current one here. You can
                      reopen it any time.
                    </Text>
                    {archivedChats.length > 0 ? (
                      <View style={styles.savedChatsList}>
                        {archivedChats.map((conversation) => (
                          <View
                            key={conversation.id}
                            style={styles.savedChatRow}
                          >
                            <Pressable
                              accessibilityLabel={`Open saved Coach chat: ${savedChatPreview(conversation)}`}
                              testID={`coach-saved-chat-${conversation.id}`}
                              disabled={isManagingChat || isSending}
                              onPress={() =>
                                void openSavedChat(conversation.id)
                              }
                              style={[
                                styles.savedChatButton,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                  opacity:
                                    isManagingChat || isSending ? 0.6 : 1,
                                },
                              ]}
                            >
                              <Feather
                                name="message-circle"
                                size={15}
                                color={colors.primary}
                              />
                              <View style={styles.savedChatCopy}>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.savedChatPreview,
                                    { color: colors.foreground },
                                  ]}
                                >
                                  {savedChatPreview(conversation)}
                                </Text>
                                <Text
                                  style={[
                                    styles.savedChatMeta,
                                    { color: colors.mutedForeground },
                                  ]}
                                >
                                  {conversation.turnCount} message
                                  {conversation.turnCount === 1 ? "" : "s"}
                                </Text>
                              </View>
                              <Feather
                                name="chevron-right"
                                size={16}
                                color={colors.mutedForeground}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel="Delete saved Coach chat"
                              testID={`coach-delete-saved-chat-${conversation.id}`}
                              disabled={isManagingChat || isSending}
                              onPress={() =>
                                setConfirmAction({
                                  type: "delete",
                                  conversationId: conversation.id,
                                })
                              }
                              style={[
                                styles.deleteSavedChatButton,
                                {
                                  backgroundColor: colors.muted,
                                  opacity:
                                    isManagingChat || isSending ? 0.6 : 1,
                                },
                              ]}
                            >
                              <Feather
                                name="trash-2"
                                size={15}
                                color={colors.destructive}
                              />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.savedChatsEmpty,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        No earlier chats saved yet.
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.settingCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.settingCopy}>
                      <Text
                        style={[
                          styles.settingTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Use my logged app summary
                      </Text>
                      <Text
                        style={[
                          styles.settingBody,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Lets Coach use your server-side profile and logged
                        nutrition summary. It does not receive food names,
                        notes, photos, or raw timelines.
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Use my logged app summary"
                      value={personalizationEnabled}
                      disabled={isUpdatingSettings}
                      onValueChange={(value) =>
                        void changePersonalization(value)
                      }
                      trackColor={{ false: colors.muted, true: colors.primary }}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Clear Coach chat history"
                    testID="coach-clear-history"
                    onPress={() => {
                      setMenuVisible(false);
                      setConfirmAction("clear");
                    }}
                    style={[styles.clearButton, { borderColor: colors.border }]}
                  >
                    <Feather
                      name="trash-2"
                      size={15}
                      color={colors.destructive}
                    />
                    <Text
                      style={[
                        styles.clearButtonText,
                        { color: colors.destructive },
                      ]}
                    >
                      Clear all chat history
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View
                  style={[
                    styles.settingCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.settingTitle, { color: colors.foreground }]}
                  >
                    Guest chat
                  </Text>
                  <Text
                    style={[
                      styles.settingBody,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {guestChatDescription}
                  </Text>
                  <Pressable
                    accessibilityLabel="Sign in for personalized Coach"
                    onPress={() => {
                      setMenuVisible(false);
                      router.push("/auth/sign-in");
                    }}
                    style={[
                      styles.signInButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.signInText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Sign in
                    </Text>
                    <Feather
                      name="arrow-right"
                      size={16}
                      color={colors.primaryForeground}
                    />
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View
            accessibilityViewIsModal
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              {confirmAction === "new"
                ? "Start a new Coach chat?"
                : isDeleteConfirmation
                  ? "Delete saved Coach chat?"
                  : "Clear Coach chat history?"}
            </Text>
            <Text
              style={[styles.confirmBody, { color: colors.mutedForeground }]}
            >
              {confirmAction === "new"
                ? "Your current chat will be saved in Saved chats, where you can reopen it any time."
                : isDeleteConfirmation
                  ? "This permanently removes only this saved Coach chat from your account."
                  : "This permanently removes all saved Coach chats from your account."}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityLabel={
                  confirmAction === "new"
                    ? "Cancel starting a new Coach chat"
                    : isDeleteConfirmation
                      ? "Cancel deleting saved Coach chat"
                      : "Cancel clearing Coach history"
                }
                onPress={() => setConfirmAction(null)}
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    { color: colors.foreground },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={
                  confirmAction === "new"
                    ? "Confirm starting a new Coach chat"
                    : isDeleteConfirmation
                      ? "Confirm deleting saved Coach chat"
                      : "Confirm clear Coach history"
                }
                onPress={() => {
                  if (confirmAction === "new") void createNewChat();
                  if (confirmAction === "clear") void clearHistory();
                  if (isDeleteConfirmation)
                    void deleteSavedChat(confirmAction.conversationId);
                }}
                disabled={isManagingChat}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor:
                      confirmAction === "new"
                        ? colors.primary
                        : colors.destructive,
                    opacity: isManagingChat ? 0.6 : 1,
                  },
                ]}
              >
                {isManagingChat ? (
                  <ActivityIndicator
                    color={
                      confirmAction === "new"
                        ? colors.primaryForeground
                        : colors.destructiveForeground
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.confirmButtonText,
                      {
                        color:
                          confirmAction === "new"
                            ? colors.primaryForeground
                            : colors.destructiveForeground,
                      },
                    ]}
                  >
                    {confirmAction === "new"
                      ? "Start new"
                      : isDeleteConfirmation
                        ? "Delete chat"
                        : "Clear history"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerCopy: { marginBottom: 16 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  welcomeCard: { borderRadius: 24, padding: 20, marginBottom: 18 },
  coachMark: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    letterSpacing: -0.4,
  },
  welcomeBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  welcomeNote: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 14,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    paddingVertical: 12,
    marginTop: 18,
  },
  signInText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  userTurn: { alignItems: "flex-end", marginBottom: 12 },
  assistantTurn: { alignItems: "flex-start", marginBottom: 14 },
  messageBubble: {
    maxWidth: "92%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  copyResponseButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  copyResponseText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    marginBottom: 16,
  },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  noticeCard: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 9,
  },
  promptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    paddingBottom: 8,
  },
  promptChip: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  promptText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  transcript: { flex: 1 },
  composerDock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 9,
  },
  composer: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  menuOverlay: { flex: 1, flexDirection: "row" },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(8,22,15,0.46)" },
  menuSheet: {
    width: "86%",
    maxWidth: 390,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: -5, height: 0 },
    elevation: 12,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  menuTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  menuSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 },
  menuScrollContent: { paddingBottom: 4 },
  menuClose: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  settingCard: { borderWidth: 1, borderRadius: 17, padding: 14 },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 13,
    paddingVertical: 12,
    marginBottom: 14,
  },
  newChatButtonText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  savedChatsCard: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    marginBottom: 14,
  },
  savedChatsList: { gap: 8, marginTop: 12 },
  savedChatRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedChatButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  deleteSavedChatButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  savedChatCopy: { flex: 1, minWidth: 0 },
  savedChatPreview: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  savedChatMeta: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 3 },
  savedChatsEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 12,
  },
  settingCopy: { marginBottom: 14 },
  settingTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  settingBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 12,
    marginTop: 14,
  },
  clearButtonText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  confirmBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    padding: 22,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  confirmBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  confirmButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  confirmButtonText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});
