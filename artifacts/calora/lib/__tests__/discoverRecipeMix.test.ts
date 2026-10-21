import { describe, expect, it } from "vitest";
import {
  appendDiscoverVisitComposition,
  createDiscoverVisitComposition,
  type DiscoverVisitEntry,
} from "../discoverRecipeMix";

const curated: DiscoverVisitEntry[] = Array.from(
  { length: 28 },
  (_, index) => ({
    key: `calora:${index + 1}`,
    source: "calora",
  }),
);

const remote: DiscoverVisitEntry[] = Array.from({ length: 36 }, (_, index) => ({
  key: `remote:${index + 1}`,
  source: "remote",
}));

function sources(entries: readonly DiscoverVisitEntry[]) {
  return entries.map((entry) => entry.source);
}

describe("Discover visit composition", () => {
  it("mixes verified Calora and provider recipes in the first native viewport rather than retaining a fixed curated prefix", () => {
    const visit = createDiscoverVisitComposition({
      curated,
      remote: remote.slice(0, 18),
      seed: "qa-session:visit-1",
    });

    expect(new Set(sources(visit.slice(0, 12)))).toEqual(
      new Set(["calora", "remote"]),
    );
    expect(visit.slice(0, 12).map((entry) => entry.key)).not.toEqual(
      curated.slice(0, 12).map((entry) => entry.key),
    );
  });

  it("changes a later visit deterministically while keeping a visit stable across ordinary renders", () => {
    const first = createDiscoverVisitComposition({
      curated,
      remote: remote.slice(0, 18),
      seed: "qa-session:visit-1",
    });
    const firstRerender = createDiscoverVisitComposition({
      curated,
      remote: remote.slice(0, 18),
      seed: "qa-session:visit-1",
    });
    const second = createDiscoverVisitComposition({
      curated,
      remote: remote.slice(0, 18),
      seed: "qa-session:visit-2",
    });

    expect(first.map((entry) => entry.key)).toEqual(
      firstRerender.map((entry) => entry.key),
    );
    expect(second.slice(0, 12).map((entry) => entry.key)).not.toEqual(
      first.slice(0, 12).map((entry) => entry.key),
    );
  });

  it("appends subsequent cursor pages without moving cards already being read", () => {
    const firstPage = createDiscoverVisitComposition({
      curated,
      remote: remote.slice(0, 18),
      seed: "qa-session:visit-1",
    });
    const extended = appendDiscoverVisitComposition({
      current: firstPage,
      curated,
      remote,
    });

    expect(
      extended.slice(0, firstPage.length).map((entry) => entry.key),
    ).toEqual(firstPage.map((entry) => entry.key));
    expect(extended.slice(firstPage.length).map((entry) => entry.key)).toEqual(
      remote.slice(18).map((entry) => entry.key),
    );
  });

  it("deduplicates by stable source identity so a continuous provider wrap cannot duplicate cards inside one visit", () => {
    const visit = createDiscoverVisitComposition({
      curated: curated.slice(0, 2),
      remote: [remote[0], remote[1], remote[0]],
      seed: "qa-session:visit-1",
    });

    expect(visit.map((entry) => entry.key)).toHaveLength(4);
    expect(new Set(visit.map((entry) => entry.key))).toHaveLength(4);
  });
});
