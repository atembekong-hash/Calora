import { describe, expect, it } from "vitest";
import { getCoachFactAccountEligibility } from "../lib/supabase-auth.js";

const activeMetadata = {};

describe("Coach Fact Context account eligibility", () => {
  it("allows an ordinary active signed-in account without pilot markers", () => {
    expect(getCoachFactAccountEligibility({ app_metadata: activeMetadata })).toEqual({
      eligible: true,
      reason: "eligible",
    });
  });

  it.each([
    ["missing former markers", {}],
    ["former markers false", { internal_qa: false, coach_fact_context_v1_pilot: false }],
    ["former markers malformed", { internal_qa: "true", coach_fact_context_v1_pilot: 1 }],
  ])("ignores %s for broad consent-gated activation", (_label, app_metadata) => {
    expect(getCoachFactAccountEligibility({ app_metadata })).toEqual({ eligible: true, reason: "eligible" });
  });

  it("denies malformed server-owned metadata", () => {
    expect(getCoachFactAccountEligibility({ app_metadata: null })).toEqual({
      eligible: false,
      reason: "missing_or_malformed_metadata",
    });
  });

  it("denies deleted, banned, and indeterminate account states", () => {
    expect(getCoachFactAccountEligibility({
      app_metadata: activeMetadata,
      deleted_at: "2026-08-24T00:00:00.000Z",
    })).toMatchObject({ eligible: false, reason: "deleted" });
    expect(getCoachFactAccountEligibility({
      app_metadata: activeMetadata,
      banned_until: new Date(Date.now() + 60_000).toISOString(),
    })).toMatchObject({ eligible: false, reason: "banned" });
    expect(getCoachFactAccountEligibility({
      app_metadata: activeMetadata,
      banned_until: "not-a-date",
    })).toMatchObject({ eligible: false, reason: "indeterminate_ban_status" });
  });

  it.each([
    ["suspended", { ...activeMetadata, suspended: true }],
    ["disabled", { ...activeMetadata, disabled: true }],
    ["non-active status", { ...activeMetadata, status: "suspended" }],
    ["malformed disabled status", { ...activeMetadata, disabled: "true" }],
  ])("denies explicit server-owned %s status", (_label, app_metadata) => {
    expect(getCoachFactAccountEligibility({ app_metadata }).eligible).toBe(false);
  });

  it("accepts an elapsed, well-formed temporary ban timestamp", () => {
    expect(getCoachFactAccountEligibility({
      app_metadata: activeMetadata,
      banned_until: "2020-01-01T00:00:00.000Z",
    })).toEqual({ eligible: true, reason: "eligible" });
  });
});