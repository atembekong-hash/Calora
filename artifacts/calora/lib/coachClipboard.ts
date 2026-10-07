import { formatCoachPlainText } from "@workspace/api-zod/coach-text-presentation";

type ClipboardWriter = {
  setStringAsync(value: string): Promise<boolean>;
};

/**
 * Copies only the same sanitized plain text that Coach renders in an assistant
 * bubble. The caller supplies already-rendered text so no raw provider content,
 * hidden context, or user-authored message can enter the clipboard action.
 */
export async function copyCoachResponseText(
  renderedAssistantText: string,
  clipboard: ClipboardWriter,
): Promise<void> {
  const text = formatCoachPlainText(renderedAssistantText, {
    removeEmoji: true,
    roundMeasurements: true,
  });
  if (!text) throw new Error("Coach response is empty");
  await clipboard.setStringAsync(text);
}
