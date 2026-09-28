import { describe, expect, it } from "vitest";
import {
  formatCoachPlainText,
  normalizeCoachAssistantReply,
} from "@workspace/api-zod/coach-text-presentation";

describe("Coach plain-text presentation", () => {
  it("removes recognized Markdown structure while retaining readable list content", () => {
    const raw = [
      "## Dinner plan",
      "",
      "**Protein:** 45 g",
      "- Greek yogurt",
      "- **Lean chicken**",
      "---",
      "[View recipe](https://example.test/recipe) and `1,200 kcal/day`.",
    ].join("\r\n");

    expect(normalizeCoachAssistantReply(raw)).toBe(
      [
        "Dinner plan",
        "",
        "Protein: 45 g",
        "• Greek yogurt",
        "• Lean chicken",
        "View recipe (https://example.test/recipe) and 1,200 kcal/day.",
      ].join("\n"),
    );
  });

  it("preserves meaningful punctuation, nutrition values, URLs, and ordinary user text", () => {
    const input =
      "I’m at -2 kg with 45% protein, 12 fl oz water, 10–15 g fiber, low-carb meals, and https://example.test/a-b?x=1#goal. #1 *unmatched";

    expect(formatCoachPlainText(input)).toBe(
      "I’m at -2 kg with 45% protein, 12 fl oz water, 10-15 g fiber, low-carb meals, and https://example.test/a-b?x=1#goal. #1 *unmatched",
    );
  });

  it("removes invisible controls and decorative assistant emoji without changing ordinary words", () => {
    const input = "Great\u200B work\u202E - keep going! 👍";

    expect(formatCoachPlainText(input)).toBe("Great work - keep going! 👍");
    expect(normalizeCoachAssistantReply(input)).toBe(
      "Great work - keep going!",
    );
  });

  it("rounds assistant nutrition and health measurements without changing user-authored copy", () => {
    const response = "You logged 12.6 g protein, burned 104.5 kcal, and changed 1.5 kg.";

    expect(formatCoachPlainText(response)).toBe(response);
    expect(normalizeCoachAssistantReply(response)).toBe(
      "You logged 13 g protein, burned 105 kcal, and changed 2 kg.",
    );
  });

  it("leaves unmatched formatting punctuation visible and is idempotent", () => {
    const once = formatCoachPlainText(
      "Use *one* snack, `if needed, and 2\n\n\n\nservings.",
    );

    expect(once).toBe("Use one snack, `if needed, and 2\n\nservings.");
    expect(formatCoachPlainText(once)).toBe(once);
  });

  it("returns null only when assistant content becomes empty after cleanup", () => {
    expect(normalizeCoachAssistantReply("\u200B\u202E\n\t")).toBeNull();
  });
});
