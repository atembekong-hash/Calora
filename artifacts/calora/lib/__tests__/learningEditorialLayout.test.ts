import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../..");
const learningSource = () =>
  readFileSync(resolve(appRoot, "app/learning.tsx"), "utf8");
const readerSource = () =>
  readFileSync(resolve(appRoot, "app/learning/[lessonId].tsx"), "utf8");

describe("Learning editorial browse layout", () => {
  it("keeps a browse-first featured rail, visible topic filters, and collection shelves", () => {
    const source = learningSource();

    expect(source).toContain("featuredRail");
    expect(source).toContain("pagingEnabled");
    expect(source).toContain("Learning topics");
    expect(source).toContain("See all");
    expect(source).toContain("lessonRail");
  });

  it("keeps original visual treatments local and preserves the canonical reader route", () => {
    const source = learningSource();

    expect(source).toContain('pathname: "/learning/[lessonId]"');
    expect(source).toContain("LessonArtwork");
    expect(source).toContain("getLearningEditorialImage(lesson)");
    expect(source).toContain('resizeMode="cover"');
    expect(source).toContain("artworkCompact");
    expect(source).toContain("lessonCardCompact: { width: 160 }");
    expect(source).toContain("opacity: 0.24");
    expect(source).toContain("opacity: 0.04");
    expect(source).not.toMatch(/https?:\/\//i);
    expect(source).not.toMatch(/admob|earn cash|topapps|advert/i);
  });

  it("renders visible local editorial photography in the opened reader and related widgets", () => {
    const source = readerSource();

    expect(source).toContain("LessonEditorialHero");
    expect(source).toContain("getLearningEditorialImage(lesson)");
    expect(source).toContain('testID="learning-reader-editorial-photo"');
    expect(source).toContain('testID="learning-related-editorial-photo"');
    expect(source).toContain("articlePhoto: {");
    expect(source).toContain("opacity: 0.16");
    expect(source).not.toMatch(/https?:\/\//i);
  });

  it("retains local saves, completion marks, and the general-education boundary", () => {
    const source = learningSource();

    expect(source).toContain("toggleSavedLearningLesson");
    expect(source).toContain("ProgressMark");
    expect(source).toMatch(
      /general education—not individualized medical\s+advice/,
    );
  });
});
