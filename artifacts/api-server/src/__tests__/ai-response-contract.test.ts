import { describe, expect, it } from "vitest";
import {
  extractJsonObjectText,
  providerTextContent,
} from "../lib/ai-response-contract.js";
import { parseVisionResponse } from "../routes/capture.js";

describe("AI provider response contracts", () => {
  it("joins Chat Completions text parts without coercing non-text content", () => {
    expect(
      providerTextContent([
        { type: "text", text: "{\"components\":[" },
        { type: "text", text: "{\"name\":\"oats\"}]}" },
      ]),
    ).toBe('{"components":[{"name":"oats"}]}');
    expect(providerTextContent([{ type: "refusal", refusal: "not allowed" }])).toBeNull();
  });

  it("extracts a complete object when the vision provider wraps JSON in prose or fences", () => {
    const content = [
      { type: "text", text: "Here is the review:\n```json\n" },
      { type: "text", text: '{"title":"Oats","components":[]}\n```' },
    ];
    expect(extractJsonObjectText(content)).toBe(
      '{"title":"Oats","components":[]}',
    );
    expect(parseVisionResponse(content)).toMatchObject({
      title: "Oats",
      candidates: [],
      components: [],
    });
  });

  it("rejects truncated JSON rather than fabricating a review", () => {
    expect(extractJsonObjectText([{ type: "text", text: '{"components":[' }])).toBeNull();
    expect(() => parseVisionResponse([{ type: "text", text: '{"components":[' }])).toThrow(
      /invalid JSON/i,
    );
  });
});
