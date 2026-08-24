import { describe, expect, it } from "vitest";
import { getCoachFactAccountEligibility } from "../lib/supabase-auth.js";

const dedicatedMetadata = {
  internal_qa: true,
  coach_fact_context_v1_pilot: true,
};

describe("Coach Fact Context account eligibility", () => {
  it("allows only exact server-owned dedicated-pilot markers", () => {
    expect(getCoachFactAccountEligibility({ app_metadata: dedicatedMetadata })).toEqual({
      eligible: true,
      reason: "eligible",
    });
  });

  it.each([
    ["missing internal QA marker", { coach_fact_context_v1_pilot: true }],
    ["missing pilot marker", { internal_qa: true }],
    ["both markers false", { internal_qa: false, coach_fact_context_v1_pilot: false }],
    ["string marker", { internal_qa: "true", coach_fact_context_v1_pilot: true }],
    ["malformed metadata", null],
  ])("denies %s", (_label, app_metadata) => {
    expect(getCoachFactAccountEligibility({ app_metadata }).eligible).toBe(false);
  });

  it("denies deleted, banned, and indeterminate account states", () => {
    expect(getCoachFactAccountEligibility({
      app_metadata: dedicatedMetadata,
      deleted_at: "2026-08-24T00:00:00.000Z",
    })).toMatchObject({ eligible: false, reason: "deleted" });
    expect(getCoachFactAccountEligibility({
      app_metadata: dedicatedMetadata,
      banned_until: new Date(Date.now() + 60_000).toISOString(),
    })).toMatchObject({ eligible: false, reason: "banned" });
    expect(getCoachFactAccountEligibility({
      app_metadata: dedicatedMetadata,
      banned_until: "not-a-date",
    })).toMatchObject({ eligible: false, reason: "indeterminate_ban_status" });
  });

  it.each([
    ["suspended", { ...dedicatedMetadata, suspended: true }],
    ["disabled", { ...dedicatedMetadata, disabled: true }],
    ["non-active status", { ...dedicatedMetadata, status: "suspended" }],
    ["malformed disabled status", { ...dedicatedMetadata, disabled: "true" }],
  ])("denies explicit server-owned %s status", (_label, app_metadata) => {
    expect(getCoachFactAccountEligibility({ app_metadata }).eligible).toBe(false);
  });

  it("accepts an elapsed, well-formed temporary ban timestamp", () => {
    expect(getCoachFactAccountEligibility({
      app_metadata: dedicatedMetadata,
      banned_until: "2020-01-01T00:00:00.000Z",
    })).toEqual({ eligible: true, reason: "eligible" });
  });
});