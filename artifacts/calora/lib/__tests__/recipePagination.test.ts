import { describe, expect, it } from "vitest";
import { shouldLoadMoreRecipePage } from "../recipePagination";

describe("recipe pagination threshold", () => {
  const base = {
    activeSection: "discover" as const,
    offsetY: 900,
    viewportHeight: 800,
    contentHeight: 2600,
    nextOffset: 18,
    isFetching: false,
    isLoadingMore: false,
    prefetchDistance: 1600,
  };

  it("loads when the native viewport enters the prefetch window", () => {
    expect(shouldLoadMoreRecipePage({ ...base, section: "discover" })).toBe(
      true,
    );
  });

  it("does not let a retained neighboring pane request another page", () => {
    expect(shouldLoadMoreRecipePage({ ...base, section: "premium" })).toBe(
      false,
    );
  });

  it("does not duplicate an in-flight request or revive an exhausted cursor", () => {
    expect(
      shouldLoadMoreRecipePage({
        ...base,
        section: "discover",
        isLoadingMore: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadMoreRecipePage({
        ...base,
        section: "discover",
        nextOffset: null,
      }),
    ).toBe(false);
    expect(
      shouldLoadMoreRecipePage({
        ...base,
        section: "discover",
        isFetching: true,
      }),
    ).toBe(false);
  });

  it("waits for valid native layout metrics instead of loading from a zero-height event", () => {
    expect(
      shouldLoadMoreRecipePage({
        ...base,
        section: "discover",
        viewportHeight: 0,
      }),
    ).toBe(false);
    expect(
      shouldLoadMoreRecipePage({
        ...base,
        section: "discover",
        contentHeight: 0,
      }),
    ).toBe(false);
  });
});
