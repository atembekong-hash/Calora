import { describe, expect, it } from "vitest";
import { LEARNING_LESSONS } from "@/content/learning";
import { LEARNING_CONTENT_BASELINE } from "./fixtures/learningContentBaseline";

function instructionalCharacters(lesson: (typeof LEARNING_LESSONS)[number]): number {
  return lesson.sections.reduce((total, section) => {
    const paragraphChars = section.paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
    const bulletChars = (section.bullets ?? []).reduce((sum, bullet) => sum + bullet.length, 0);
    return total + paragraphChars + bulletChars;
  }, lesson.tryThis.length);
}

describe("Learning editorial content depth", () => {
  it("expands every existing lesson to at least 1.5x its protected-main copy depth", () => {
    for (const [lessonId, baseline] of Object.entries(LEARNING_CONTENT_BASELINE)) {
      const lesson = LEARNING_LESSONS.find((item) => item.id === lessonId);
      expect(lesson, lessonId).toBeTruthy();
      expect(instructionalCharacters(lesson!), lessonId).toBeGreaterThanOrEqual(Math.ceil(baseline * 1.5));
    }
  });

  it("gives every new lesson the same expanded editorial floor", () => {
    const newLessons = LEARNING_LESSONS.filter((lesson) => !(lesson.id in LEARNING_CONTENT_BASELINE));
    expect(newLessons).toHaveLength(55);
    for (const lesson of newLessons) {
      expect(instructionalCharacters(lesson), lesson.id).toBeGreaterThanOrEqual(1800);
    }
  });
});
