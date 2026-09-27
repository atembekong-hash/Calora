import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/coach.tsx"), "utf8");
const coachContractSource = readFileSync(
  resolve(process.cwd(), "../../lib/api-zod/src/coach-v2.ts"),
  "utf8",
);

describe("clean-room Coach screen", () => {
  it("uses only the new server-owned Coach API", () => {
    expect(source).toContain("sendCoachV2Message");
    expect(source).toContain("getCoachV2Conversation");
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
    expect(source).toContain("if (!signedIn || isClearing) return;");
    expect(source).toContain("Clear chat history");
  });

  it("includes an explicit compact personalization control and a clear-history confirmation", () => {
    expect(source).toContain("Use my logged app summary");
    expect(source).toContain("personalizationEnabled");
    expect(source).toContain("Clear Coach chat history?");
    expect(source).toContain(
      "This permanently removes your saved Coach conversation from your",
    );
    expect(source).toContain("account.");
  });
});
