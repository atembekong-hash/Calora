import { describe, expect, it } from "vitest";
import {
  LEARNING_COLLECTIONS,
  LEARNING_LESSONS,
  LEARNING_TOPICS,
} from "@/content/learning";
import {
  EMPTY_LEARNING_READER_STATE,
  getLearningCatalogIssues,
  getLearningJourneyProgress,
  getRelatedLearningLessons,
  groupLearningLessonsByCollection,
  hasLearningSafetyMetadata,
  markLearningLessonCompleted,
  normalizeLearningReaderState,
  searchLearningLessons,
  setLearningLessonProgress,
  toggleSavedLearningLesson,
} from "@/lib/learning";

describe("Learning catalog", () => {
  it("has a complete, unique initial editorial library across required topics", () => {
    expect(LEARNING_LESSONS).toHaveLength(50);
    expect(new Set(LEARNING_LESSONS.map((lesson) => lesson.id)).size).toBe(
      LEARNING_LESSONS.length,
    );
    expect(new Set(LEARNING_LESSONS.map((lesson) => lesson.topic))).toEqual(
      new Set(LEARNING_TOPICS.filter((topic) => topic !== "All")),
    );
    expect(
      new Set(LEARNING_LESSONS.map((lesson) => lesson.collectionId)),
    ).toEqual(new Set(LEARNING_COLLECTIONS.map((collection) => collection.id)));
    for (const collection of LEARNING_COLLECTIONS) {
      expect(
        LEARNING_LESSONS.filter(
          (lesson) => lesson.collectionId === collection.id,
        ),
      ).toHaveLength(5);
    }
    expect(getLearningCatalogIssues()).toEqual([]);
  });

  it("searches titles, editorial body copy, and collections with topic filters", () => {
    expect(
      searchLearningLessons({ query: "water" }).map((lesson) => lesson.id),
    ).toEqual(
      expect.arrayContaining([
        "hydration-check-in",
        "habit-cue-design",
        "drinks-that-fit-your-day",
        "gentle-evening-reset",
      ]),
    );
    expect(
      searchLearningLessons({ query: "nutrition facts", topic: "Labels" }).map(
        (lesson) => lesson.id,
      ),
    ).toEqual(["read-nutrition-facts"]);
    expect(
      searchLearningLessons({ query: "nutrition", topic: "Fasting" }),
    ).toEqual([]);
    expect(
      searchLearningLessons({ query: "  recipe  " }).length,
    ).toBeGreaterThan(1);
  });

  it("groups result sets in canonical collection order and omits empty collections", () => {
    const results = searchLearningLessons({ topic: "Planning" });
    const groups = groupLearningLessonsByCollection(results);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.collection.id).toBe("plan-with-less-pressure");
    expect(groups[0]?.lessons.map((lesson) => lesson.id)).toEqual([
      "week-with-one-anchor",
      "shopping-list-scaffold",
      "busy-day-backup",
      "make-the-next-step-specific",
      "plan-for-the-plan-to-change",
    ]);
  });

  it("uses curated related lessons first, never repeats the current lesson, and fills a shelf", () => {
    const lesson = LEARNING_LESSONS.find(
      (item) => item.id === "balanced-plate-basics",
    )!;
    const related = getRelatedLearningLessons(lesson, LEARNING_LESSONS, 3);

    expect(related.map((item) => item.id).slice(0, 2)).toEqual([
      "macro-map",
      "recipe-template",
    ]);
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.id)).not.toContain(lesson.id);
    expect(new Set(related.map((item) => item.id)).size).toBe(related.length);
  });

  it("requires conservative safety and review metadata for every medical-adjacent lesson", () => {
    const medicalAdjacent = LEARNING_LESSONS.filter(
      (lesson) => lesson.medicalAdjacent,
    );

    expect(medicalAdjacent.map((lesson) => lesson.id)).toEqual(
      expect.arrayContaining([
        "calories-are-context",
        "safe-prep-cook-and-save",
        "fasting-basics-and-boundaries",
        "fasting-defined-without-hype",
        "hot-and-active-day-hydration",
        "movement-snacks",
        "steady-sleep-window",
        "pause-notice-choose",
      ]),
    );
    for (const lesson of medicalAdjacent) {
      expect(hasLearningSafetyMetadata(lesson)).toBe(true);
      expect(lesson.safety?.body).toMatch(/qualified|professional|individual/i);
      expect(lesson.safety?.review.sourceNote).toMatch(/general education/i);
    }
  });
});

describe("Learning reader state", () => {
  it("normalizes bookmarks and reading progress from malformed or legacy payloads", () => {
    const normalized = normalizeLearningReaderState({
      bookmarkedLessonIds: [
        "balanced-plate-basics",
        "balanced-plate-basics",
        "unknown-lesson",
        42,
      ],
      lessonProgress: {
        "balanced-plate-basics": {
          completed: true,
          lastReadAt: "2026-10-27T12:00:00.000Z",
          lastSectionIndex: 2,
        },
        "macro-map": {
          completed: "yes",
          lastReadAt: "not a date",
          lastSectionIndex: -2,
        },
        "missing-lesson": { completed: true },
      },
    });

    expect(normalized).toEqual({
      version: 1,
      savedLessonIds: ["balanced-plate-basics"],
      progressByLessonId: {
        "balanced-plate-basics": {
          completed: true,
          lastReadAt: "2026-10-27T12:00:00.000Z",
          lastSectionIndex: 2,
        },
      },
    });
  });

  it("updates saved and completed state immutably and reports journey progress", () => {
    const saved = toggleSavedLearningLesson(
      EMPTY_LEARNING_READER_STATE,
      "balanced-plate-basics",
    );
    const completed = markLearningLessonCompleted(
      saved,
      "balanced-plate-basics",
      "2026-10-27T18:00:00.000Z",
    );
    const journey = getLearningJourneyProgress(completed);

    expect(EMPTY_LEARNING_READER_STATE.savedLessonIds).toEqual([]);
    expect(completed.savedLessonIds).toEqual(["balanced-plate-basics"]);
    expect(
      completed.progressByLessonId["balanced-plate-basics"]?.completed,
    ).toBe(true);
    expect(journey).toMatchObject({
      totalLessons: 50,
      startedLessons: 1,
      completedLessons: 1,
      savedLessons: 1,
      percentComplete: 2,
    });
  });

  it("records reader progress immutably and ignores unknown lesson IDs", () => {
    const progressed = setLearningLessonProgress(
      EMPTY_LEARNING_READER_STATE,
      "balanced-plate-basics",
      { lastReadAt: "2026-10-27T19:00:00.000Z", lastSectionIndex: 1 },
    );
    const rejectedUnknown = setLearningLessonProgress(
      progressed,
      "not-in-calora-catalog",
      { completed: true },
    );

    expect(EMPTY_LEARNING_READER_STATE.progressByLessonId).toEqual({});
    expect(progressed.progressByLessonId["balanced-plate-basics"]).toEqual({
      completed: false,
      lastReadAt: "2026-10-27T19:00:00.000Z",
      lastSectionIndex: 1,
    });
    expect(rejectedUnknown).toEqual(progressed);
  });
});
