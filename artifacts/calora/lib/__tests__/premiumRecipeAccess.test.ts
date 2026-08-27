import { describe, expect, it } from "vitest";
import {
  canDisplayPremiumCatalogue,
  hasCurrentPremiumAccess,
} from "../premiumRecipeAccess";

describe("Premium recipe display authorization", () => {
  it("hides a populated catalogue while a same-user entitlement revalidation is pending or denied", () => {
    // The caller may still have loaded recipe cards in component state, but a
    // new validation starts by locking that data until it succeeds.
    expect(hasCurrentPremiumAccess({
      isSuccess: true,
      isFetchedAfterMount: true,
      isFetching: true,
    })).toBe(false);

    // A 401/403 transition leaves no successful current authorization result.
    expect(hasCurrentPremiumAccess({
      isSuccess: false,
      isFetchedAfterMount: true,
      isFetching: false,
    })).toBe(false);
  });

  it("allows rendering only after the mounted entitlement request succeeds", () => {
    expect(hasCurrentPremiumAccess({
      isSuccess: true,
      isFetchedAfterMount: true,
      isFetching: false,
    })).toBe(true);
  });

  it("keeps an already verified same-account catalogue visible during revalidation", () => {
    expect(canDisplayPremiumCatalogue({
      hasCurrentAccess: false,
      isFetching: true,
      hasVerifiedCurrentAccount: true,
    })).toBe(true);
  });

  it("does not reveal an unverified or different-account catalogue", () => {
    expect(canDisplayPremiumCatalogue({
      hasCurrentAccess: false,
      isFetching: true,
      hasVerifiedCurrentAccount: false,
    })).toBe(false);

    expect(canDisplayPremiumCatalogue({
      hasCurrentAccess: false,
      isFetching: false,
      hasVerifiedCurrentAccount: true,
    })).toBe(false);
  });
});