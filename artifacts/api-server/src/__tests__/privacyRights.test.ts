import { describe, expect, it } from "vitest";
import { PrivacyRightsRequestBody } from "../routes/privacyRights";

describe("privacy rights request contract", () => {
  it("accepts the supported request types", () => {
    for (const requestType of [
      "access",
      "correct",
      "delete",
      "portability",
      "restrict",
      "withdraw_consent",
    ]) {
      expect(PrivacyRightsRequestBody.safeParse({ requestType }).success).toBe(
        true,
      );
    }
  });

  it("rejects unknown types and oversized notes", () => {
    expect(
      PrivacyRightsRequestBody.safeParse({ requestType: "export" }).success,
    ).toBe(false);
    expect(
      PrivacyRightsRequestBody.safeParse({
        requestType: "access",
        note: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("trims an optional note and does not require one", () => {
    const result = PrivacyRightsRequestBody.safeParse({
      requestType: "correct",
      note: "  Please correct my display name.  ",
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.note).toBe("Please correct my display name.");
    expect(
      PrivacyRightsRequestBody.safeParse({ requestType: "access" }).success,
    ).toBe(true);
  });
});
