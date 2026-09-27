export type CoachPlainTextOptions = {
  /**
   * Applies only to assistant-owned content. User-authored text retains emoji,
   * while decorative provider emoji are removed from Coach replies.
   */
  removeEmoji?: boolean;
};

const CONTROL_OR_SPOOFING_CHARACTERS =
  /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;
const DECORATIVE_EMOJI = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF]\uFE0F?/gu;
const HTML_PRESENTATION_TAG =
  /<\/?(?:b|strong|i|em|u|s|del|br|p|div|span|h[1-6]|ul|ol|li|code|pre)(?:\s[^<>]*)?\s*\/?>/gi;

function removePairedInlineMarkup(text: string): string {
  let formatted = text
    .replace(/!\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/``([^`\n]+)``/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1")
    .replace(/___([^_\n]+)___/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/~~([^~\n]+)~~/g, "$1");

  formatted = formatted
    .replace(/(^|[^\w])\*([^*\n]+)\*(?=$|[^\w])/g, "$1$2")
    .replace(/(^|[^\w])_([^_\n]+)_(?=$|[^\w])/g, "$1$2");

  return formatted.replace(/\\([\\`*_\[\]{}()#+.!-])/g, "$1");
}

function normalizeLine(line: string): string | null {
  const trimmedEnd = line.replace(/[ \t]+$/g, "");
  if (/^\s*```[^`]*$/.test(trimmedEnd)) return null;
  if (/^\s*(?:[-*_]\s*){3,}$/.test(trimmedEnd)) return null;

  return removePairedInlineMarkup(
    trimmedEnd
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s{0,3}>\s?/, "")
      .replace(/^(\s*)[-*+]\s+(?:\[[ xX]\]\s+)?/, "$1• ")
      .replace(/^(\s*)(\d{1,2})[.)]\s+/, "$1$2. ")
      .replace(HTML_PRESENTATION_TAG, ""),
  );
}

/**
 * Converts Coach-owned copy into a clean, human-readable plain-text display
 * representation. It is intentionally conservative: it recognizes structural
 * Markdown/HTML presentation syntax but preserves meaningful punctuation,
 * measurements, percentages, URLs, apostrophes, parentheses, and hyphens.
 *
 * This function does not rewrite stored user data or change model prompts.
 */
export function formatCoachPlainText(
  value: unknown,
  options: CoachPlainTextOptions = {},
): string {
  if (typeof value !== "string") return "";

  let text = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_OR_SPOOFING_CHARACTERS, "")
    .replace(/[\u2013\u2014]/g, "-");

  if (options.removeEmoji) {
    text = text.replace(DECORATIVE_EMOJI, "");
  }

  const lines = text
    .split("\n")
    .map(normalizeLine)
    .filter((line): line is string => line !== null);
  return lines
    .join("\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Normalizes a provider reply before it is returned or persisted. A null result
 * keeps the established provider-failure behavior for blank/invalid content.
 */
export function normalizeCoachAssistantReply(value: unknown): string | null {
  const formatted = formatCoachPlainText(value, { removeEmoji: true });
  return formatted.length > 0 && formatted.length <= 4000 ? formatted : null;
}
