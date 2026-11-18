export type ProviderTextPart = {
  type?: unknown;
  text?: unknown;
};

/**
 * Chat Completions may return content as a string or as text content parts.
 * Only text fields are accepted; refusal/tool content is never coerced into
 * user-facing nutrition or Coach text.
 */
export function providerTextContent(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return null;

  const text = value
    .filter(
      (part): part is ProviderTextPart =>
        Boolean(part) && typeof part === "object" && !Array.isArray(part),
    )
    .filter((part) => part.type === undefined || part.type === "text")
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("");

  return text.length > 0 ? text : null;
}

/**
 * Extract one complete JSON object from a provider response. This accepts
 * fenced JSON and short explanatory text around the object, but never repairs
 * truncated or malformed JSON and never fabricates nutrition fields.
 */
export function extractJsonObjectText(value: unknown): string | null {
  const text = providerTextContent(value)?.trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const source = fenced || text;
  const start = source.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
      if (depth < 0) return null;
    }
  }
  return null;
}
