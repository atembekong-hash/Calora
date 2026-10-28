import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_COLLECTIONS, LEARNING_LESSONS } from "@/content/learning";
import { getLearningEditorialImage } from "@/lib/learningImages";

const appRoot = path.resolve(__dirname, "../..");
const imageMapPath = path.join(appRoot, "lib", "learningImages.ts");
const learningScreenPath = path.join(appRoot, "app", "learning.tsx");
const learningReaderPath = path.join(
  appRoot,
  "app",
  "learning",
  "[lessonId].tsx",
);

describe("Learning editorial photography", () => {
  it("ships an offline photo source for every collection without external image URLs", () => {
    const imageMap = fs.readFileSync(imageMapPath, "utf8");
    const screen = fs.readFileSync(learningScreenPath, "utf8");
    const reader = fs.readFileSync(learningReaderPath, "utf8");

    expect(LEARNING_LESSONS).toHaveLength(50);
    expect(LEARNING_COLLECTIONS).toHaveLength(10);
    expect(imageMap).toContain("getLearningEditorialImage");
    expect(imageMap).not.toMatch(/https?:\/\//i);
    expect(imageMap).toContain("assets/images/learning/");
    expect(screen).toContain("getLearningEditorialImage(lesson)");
    expect(screen).toContain('resizeMode="cover"');
    expect(reader).toContain("getLearningEditorialImage(lesson)");
    expect(reader).toContain('testID="learning-reader-editorial-photo"');
    expect(reader).not.toMatch(/https?:\/\//i);
  });

  it("resolves a local image module for every Learning collection", () => {
    for (const collection of LEARNING_COLLECTIONS) {
      const lesson = LEARNING_LESSONS.find(
        (item) => item.collectionId === collection.id,
      );
      expect(lesson).toBeDefined();
      expect(getLearningEditorialImage(lesson!)).toBeTruthy();
    }
  });

  it("keeps the local Learning asset set small enough for a mobile editorial surface", () => {
    const assetRoot = path.join(appRoot, "assets", "images", "learning");
    const photos = fs
      .readdirSync(assetRoot)
      .filter((file) => file.endsWith("-mobile.jpg"));

    expect(photos).toHaveLength(6);
    for (const photo of photos) {
      const bytes = fs.statSync(path.join(assetRoot, photo)).size;
      expect(bytes).toBeLessThan(200_000);
    }
  });
});
