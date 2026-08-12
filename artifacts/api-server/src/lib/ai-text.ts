const INVISIBLE_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFE00-\uFE0F\uFEFF]/g;
const PLACEHOLDER_LINE = /^(?:\[?\s*(?:todo|tbd|n\/a|none|placeholder|insert(?:\s+\w+){0,3}|replace(?:\s+\w+){0,3}|internal(?:\s+\w+){0,3}|system(?:\s+\w+){0,3})\s*\]?|\{\{[^}]*\}\}|\[\[[^\]]*\]\]|<\s*(?:placeholder|internal|system)[^>]*>)$/i;
const INTERNAL_NOTE_PREFIX = /^(?:\[?\s*)?(?:todo|tbd|placeholder|internal(?:\s+(?:note|instruction|only))?|system\s+note|model\s+note)\b/i;

/**
 * Converts model-generated prose into predictable plain text before it leaves
 * the API. It deliberately preserves paragraphs and numbered lists, while
 * removing formatting residue that has no meaning in a native text surface.
 */
export function sanitizeAiText(value: unknown, fallback = "", maxLength = 2_000): string {
  if (typeof value !== "string") return fallback;

  const normalized = value
    .normalize("NFKC")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/\\u(?:000[0-8BCEF]|001[0-9A-F]|007F|008[0-9A-F]|009[0-9A-F]|00AD|034F|061C|115F|1160|17B[45]|180E|200[B-F]|202[A-E]|206[0-F]|FE0[0-F]|FEFF)/gi, "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[–—]/g, ", ")
    .replace(/```(?:\w+)?/gi, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*|__(.*?)__/g, "$1$2")
    .replace(/(?<!\w)[*_]([^*_]+)[*_](?!\w)/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "");

  const lines = normalized
    .split("\n")
    .map((line) => line
      .replace(/\{\{[^}]*\}\}|\[\[[^\]]*\]\]|<\s*(?:placeholder|internal|system)[^>]*>/gi, "")
      .replace(/^\s*>\s?/, "")
      .replace(/^\s*(?:[-*•]+)\s+/, "• ")
      .replace(/^\s*(\d+)[.)]\s+/, "$1. ")
      .replace(/\s{2,}/g, " ")
      .trim())
    .filter((line) => !/^(?:[-_=*•]\s*){3,}$/.test(line))
    .filter((line) => !/^[,.;:!?]+$/.test(line))
    .filter((line) => !INTERNAL_NOTE_PREFIX.test(line))
    .filter((line) => !PLACEHOLDER_LINE.test(line));

  const clean = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,+/g, ",")
    .trim()
    .slice(0, maxLength)
    .trim();

  return clean || fallback;
}

export function sanitizeAiTextList(value: unknown, maxItems: number, maxLength = 600): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeAiText(item, "", maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}