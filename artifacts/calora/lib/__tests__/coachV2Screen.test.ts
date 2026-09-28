import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/coach.tsx"), "utf8");
const coachContractSource = readFileSync(
  resolve(process.cwd(), "../../lib/api-zod/src/coach-v2.ts"),
  "utf8",
);
const coachPresentationSource = readFileSync(
  resolve(process.cwd(), "../../lib/api-zod/src/coach-text-presentation.ts"),
  "utf8",
);

describe("clean-room Coach screen", () => {
  it("uses only the new server-owned Coach API", () => {
    expect(source).toContain("sendCoachV2Message");
    expect(source).toContain("getCoachV2Conversation");
    expect(source).toContain("listCoachV2Conversations");
    expect(source).toContain("openCoachV2Conversation");
    expect(source).toContain("startNewCoachV2Conversation");
    expect(source).toContain("clearCoachV2Conversation");
    expect(source).toContain("updateCoachV2Settings");
    expect(source).not.toContain("useCoachSendAdapter");
    expect(source).not.toContain("CoachFactContextConsentPanel");
    expect(source).not.toContain("guestCoachReply");
    expect(source).not.toContain("createIntelligenceContext");
    expect(source).not.toContain("buildDailyIntelligenceFacts");
    expect(coachContractSource).toContain('from "./generated/api"');
    expect(coachContractSource).not.toContain('from "./generated/api.js"');
  });

  it("keeps guest chat ephemeral and presents account history controls only when signed in", () => {
    expect(source).toContain("if (!signedIn) {");
    expect(source).toContain(
      "Guest messages are not saved and do not use personal app data.",
    );
    expect(source).toContain("if (!signedIn || isManagingChat) return;");
    expect(source).toContain("Clear all chat history");
  });

  it("includes an explicit compact personalization control and a clear-history confirmation", () => {
    expect(source).toContain("Use my logged app summary");
    expect(source).toContain("personalizationEnabled");
    expect(source).toContain("Clear Coach chat history?");
    expect(source).toContain(
      "This permanently removes all saved Coach chats from your account.",
    );
  });

  it("renders live, hydrated, and error Coach copy through the shared plain-text boundary", () => {
    expect(source).toContain("formatCoachPlainText(response.message");
    expect(source).toContain("formatCoachPlainText(turn.content");
    expect(source).toContain("formatCoachPlainText(notice");
    expect(source).toContain('turn.role === "assistant"');
    expect(coachPresentationSource).toContain("normalizeCoachAssistantReply");
    expect(coachPresentationSource).toContain("HTML_PRESENTATION_TAG");
  });

  it("clears an existing transcript before switching signed-in account history", () => {
    expect(source).toContain(
      "setTurns([]);\n    setSavedChats([]);\n    setIsLoadingHistory(true);",
    );
  });

  it("archives instead of deleting when starting a new saved chat", () => {
    expect(source).toContain('testID="coach-new-chat"');
    expect(source).toContain('testID="coach-menu-new-chat"');
    expect(source).toContain("const startNewChat = () => {");
    expect(source).toContain('setConfirmAction("new")');
    expect(source).toContain("const createNewChat = async () => {");
    expect(source).toContain("await startNewCoachV2Conversation()");
    expect(source).toContain("Your current chat will be saved in Saved chats");
    expect(source).toContain("await clearCoachV2Conversation()");
  });

  it("lists and reopens archived account chats without exposing them to guests", () => {
    expect(source).toContain("const archivedChats = savedChats.filter");
    expect(source).toContain("Saved chats");
    expect(source).toContain("No earlier chats saved yet.");
    expect(source).toContain("const openSavedChat = async");
    expect(source).toContain("await openCoachV2Conversation(conversationId)");
    expect(source).toContain("testID={`coach-saved-chat-${conversation.id}`}");
  });

  it("uses the requested three-line main-menu affordance", () => {
    expect(source).toContain('accessibilityLabel="Open Coach main menu"');
    expect(source).toContain('testID="coach-main-menu"');
    expect(source).toContain('<Feather name="menu" size={23}');
    expect(source).not.toContain('testID="coach-settings"');
  });

  it("keeps the composer in the keyboard-resized Coach layout", () => {
    expect(source).toContain("import { KeyboardAvoidingView }");
    expect(source).toContain('<KeyboardAvoidingView\n      behavior="height"');
    expect(source).toContain("style={styles.transcript}");
    expect(source).toContain("ref={composerRef}");
    expect(source).toContain("transcript: { flex: 1 }");
    expect(source).not.toContain('composerDock: {\n    position: "absolute"');
  });
});
