import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_COLLECTIONS, LEARNING_LESSONS } from "@/content/learning";
import {
  getLearningEditorialImage,
  getLearningEditorialImageIdentity,
  getLearningEditorialImageKeys,
} from "@/lib/learningImages";

const appRoot = path.resolve(__dirname, "../..");
const imageMapPath = path.join(appRoot, "lib", "learningImages.ts");
const learningScreenPath = path.join(appRoot, "app", "learning.tsx");
const learningReaderPath = path.join(
  appRoot,
  "app",
  "learning",
  "[lessonId].tsx",
);
const articleAssetRoot = path.join(
  appRoot,
  "assets",
  "images",
  "learning",
  "articles",
);

describe("Learning editorial image identity", () => {
  it("ships one local, immutable editorial identity for every article with no collection fallback", () => {
    const imageMap = fs.readFileSync(imageMapPath, "utf8");

    expect(LEARNING_LESSONS).toHaveLength(105);
    expect(LEARNING_COLLECTIONS).toHaveLength(15);
    for (const collection of LEARNING_COLLECTIONS) {
      expect(
        LEARNING_LESSONS.filter(
          (lesson) => lesson.collectionId === collection.id,
        ),
      ).toHaveLength(7);
    }
    expect(
      new Set(LEARNING_LESSONS.map((lesson) => lesson.imageAssetKey)).size,
    ).toBe(LEARNING_LESSONS.length);
    expect(new Set(getLearningEditorialImageKeys()).size).toBe(
      LEARNING_LESSONS.length,
    );
    expect(getLearningEditorialImageKeys()).toEqual(
      expect.arrayContaining(
        LEARNING_LESSONS.map((lesson) => lesson.imageAssetKey),
      ),
    );
    expect(imageMap).not.toContain("collectionImages");
    expect(imageMap).not.toMatch(/collectionImages\s*\?\?|fallbackImages\s*\[/);
    expect(imageMap).not.toMatch(/https?:\/\//i);

    for (const lesson of LEARNING_LESSONS) {
      expect(lesson.imageAssetKey).toBe(lesson.id);
      expect(getLearningEditorialImageIdentity(lesson)).toBe(
        lesson.imageAssetKey,
      );
      expect(getLearningEditorialImage(lesson)).toBeTruthy();
    }
  });

  it("keeps article artwork local, complete, and visually non-duplicated", () => {
    const photos = fs
      .readdirSync(articleAssetRoot)
      .filter((file) => file.endsWith(".jpg"))
      .sort();

    expect(photos).toHaveLength(LEARNING_LESSONS.length);
    const expectedFiles = LEARNING_LESSONS.map(
      (lesson) => `${lesson.imageAssetKey}.jpg`,
    ).sort();
    expect(photos).toEqual(expectedFiles);

    const hashes = photos.map((file) =>
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(articleAssetRoot, file)))
        .digest("hex"),
    );
    expect(new Set(hashes).size).toBe(photos.length);
    for (const photo of photos) {
      expect(fs.statSync(path.join(articleAssetRoot, photo)).size).toBeLessThan(
        220_000,
      );
    }
  });

  it("renders the same local article asset across browse and opened-reader surfaces", () => {
    const screen = fs.readFileSync(learningScreenPath, "utf8");
    const reader = fs.readFileSync(learningReaderPath, "utf8");

    expect(screen).toContain("getLearningEditorialImage(lesson)");
    expect(screen).toContain('cachePolicy="memory-disk"');
    expect(screen).toContain('contentFit="contain"');
    expect(screen).toContain('testID="learning-lesson-editorial-photo"');
    expect(screen).toContain('testID="learning-featured-editorial-photo"');
    expect(reader).toContain("getLearningEditorialImage(lesson)");
    expect(reader).toContain('testID="learning-reader-editorial-photo"');
    expect(reader).toContain('testID="learning-related-editorial-photo"');
    expect(`${screen}\n${reader}`).not.toMatch(/https?:\/\//i);
  });
});
