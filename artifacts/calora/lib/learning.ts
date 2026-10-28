import {
  LEARNING_COLLECTIONS,
  LEARNING_LESSONS,
  LEARNING_TOPICS,
  type LearningCollection,
  type LearningLesson,
  type LearningLessonTopic,
  type LearningReviewMetadata,
  type LearningSafetyNote,
  type LearningTopic,
} from "@/content/learning";

export type LearningSearchInput = {
  query?: string;
  topic?: LearningTopic;
};

export type LearningCollectionGroup = {
  collection: LearningCollection;
  lessons: readonly LearningLesson[];
};

export type LearningLessonProgress = {
  completed: boolean;
  lastReadAt: string | null;
  lastSectionIndex: number;
};

/**
 * Device-persistable UI state. This intentionally contains no React or storage
 * dependency so CaloraContext can own persistence later without changing the
 * learning catalogue or screen behavior.
 */
export type LearningReaderState = {
  version: 1;
  savedLessonIds: readonly string[];
  progressByLessonId: Readonly<Record<string, LearningLessonProgress>>;
};

export type LearningReaderActions = {
  toggleSavedLesson: (lessonId: string) => void;
  setLessonProgress: (
    lessonId: string,
    update: Partial<LearningLessonProgress>,
  ) => void;
  markLessonCompleted: (lessonId: string) => void;
};

export type LearningJourneyProgress = {
  totalLessons: number;
  startedLessons: number;
  completedLessons: number;
  savedLessons: number;
  percentComplete: number;
};

export type LearningCatalogIssue = {
  lessonId: string;
  field: string;
  message: string;
};

export const EMPTY_LEARNING_READER_STATE: LearningReaderState = {
  version: 1,
  savedLessonIds: [],
  progressByLessonId: {},
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validLessonIdSet(
  catalog: readonly LearningLesson[],
): ReadonlySet<string> {
  return new Set(catalog.map((lesson) => lesson.id));
}

function normalizeLessonIdList(
  value: unknown,
  validIds: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !validIds.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.push(item);
  }
  return result;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function normalizeSectionIndex(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function searchableLessonText(lesson: LearningLesson): string {
  const collection = LEARNING_COLLECTIONS.find(
    (item) => item.id === lesson.collectionId,
  );
  return normalizeSearchText(
    [
      lesson.title,
      lesson.dek,
      lesson.topic,
      collection?.title ?? "",
      collection?.description ?? "",
      lesson.tryThis,
      ...lesson.sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ]),
    ].join(" "),
  );
}

/** Returns the catalog lesson with this ID, if it exists. */
export function getLearningLesson(
  lessonId: string | undefined | null,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningLesson | undefined {
  return catalog.find((lesson) => lesson.id === lessonId);
}

/**
 * Searches all editorial fields using AND semantics for multiple terms, then
 * filters by the selected topic. The source catalogue order is preserved.
 */
export function searchLearningLessons(
  input: LearningSearchInput = {},
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningLesson[] {
  const topic = input.topic ?? "All";
  const terms = normalizeSearchText(input.query ?? "")
    .split(/\s+/)
    .filter(Boolean);

  return catalog.filter((lesson) => {
    if (topic !== "All" && lesson.topic !== topic) return false;
    if (!terms.length) return true;
    const haystack = searchableLessonText(lesson);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Groups a supplied lesson list by the canonical collection display order. */
export function groupLearningLessonsByCollection(
  lessons: readonly LearningLesson[],
  collections: readonly LearningCollection[] = LEARNING_COLLECTIONS,
): LearningCollectionGroup[] {
  const lessonsByCollection = new Map<string, LearningLesson[]>();
  for (const lesson of lessons) {
    const group = lessonsByCollection.get(lesson.collectionId) ?? [];
    group.push(lesson);
    lessonsByCollection.set(lesson.collectionId, group);
  }

  return collections.flatMap((collection) => {
    const collectionLessons = lessonsByCollection.get(collection.id) ?? [];
    return collectionLessons.length
      ? [{ collection, lessons: collectionLessons }]
      : [];
  });
}

/** Selects a compact featured shelf, falling back to the first editorial items. */
export function getFeaturedLearningLessons(
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
  limit = 3,
): LearningLesson[] {
  const boundedLimit = Math.max(0, Math.floor(limit));
  const explicit = catalog.filter((lesson) => lesson.featured);
  const featuredIds = new Set(explicit.map((lesson) => lesson.id));
  return [
    ...explicit,
    ...catalog.filter((lesson) => !featuredIds.has(lesson.id)),
  ].slice(0, boundedLimit);
}

/**
 * Uses editorial links first, then collection and topic neighbours to make a
 * stable, varied related shelf when a new lesson has only a few hand-curated
 * references.
 */
export function getRelatedLearningLessons(
  lesson: LearningLesson,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
  limit = 3,
): LearningLesson[] {
  const boundedLimit = Math.max(0, Math.floor(limit));
  const byId = new Map(catalog.map((candidate) => [candidate.id, candidate]));
  const candidates = [
    ...lesson.relatedLessonIds
      .map((id) => byId.get(id))
      .filter((item): item is LearningLesson => Boolean(item)),
    ...catalog.filter(
      (candidate) =>
        candidate.id !== lesson.id &&
        candidate.collectionId === lesson.collectionId,
    ),
    ...catalog.filter(
      (candidate) =>
        candidate.id !== lesson.id && candidate.topic === lesson.topic,
    ),
  ];
  const usedIds = new Set<string>([lesson.id]);
  return candidates
    .filter((candidate) => {
      if (usedIds.has(candidate.id)) return false;
      usedIds.add(candidate.id);
      return true;
    })
    .slice(0, boundedLimit);
}

export function hasLearningSafetyMetadata(
  lesson: LearningLesson,
): lesson is LearningLesson & { safety: LearningSafetyNote } {
  return Boolean(
    lesson.safety &&
    lesson.safety.heading.trim() &&
    lesson.safety.body.trim() &&
    lesson.safety.review.sourceNote.trim(),
  );
}

export function getLearningReviewMetadata(
  lesson: LearningLesson,
): LearningReviewMetadata {
  return lesson.safety?.review ?? lesson.review;
}

/**
 * Removes unknown lesson IDs, duplicates, malformed progress, and legacy data
 * fields. Safe to call after loading storage, receiving a sync payload, or
 * before rendering a reader state.
 */
export function normalizeLearningReaderState(
  value: unknown,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningReaderState {
  if (!isRecord(value)) return EMPTY_LEARNING_READER_STATE;
  const validIds = validLessonIdSet(catalog);
  const savedInput = value.savedLessonIds ?? value.bookmarkedLessonIds;
  const savedLessonIds = normalizeLessonIdList(savedInput, validIds);
  const progressInput = isRecord(value.progressByLessonId)
    ? value.progressByLessonId
    : isRecord(value.lessonProgress)
      ? value.lessonProgress
      : {};
  const progressByLessonId: Record<string, LearningLessonProgress> = {};

  for (const [lessonId, rawProgress] of Object.entries(progressInput)) {
    if (!validIds.has(lessonId) || !isRecord(rawProgress)) continue;
    const completed = rawProgress.completed === true;
    const lastReadAt = normalizeTimestamp(rawProgress.lastReadAt);
    const lastSectionIndex = normalizeSectionIndex(
      rawProgress.lastSectionIndex,
    );
    if (completed || lastReadAt || lastSectionIndex > 0) {
      progressByLessonId[lessonId] = {
        completed,
        lastReadAt,
        lastSectionIndex,
      };
    }
  }

  return { version: 1, savedLessonIds, progressByLessonId };
}

/** Returns a new state with one valid lesson bookmarked or removed. */
export function toggleSavedLearningLesson(
  state: LearningReaderState,
  lessonId: string,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningReaderState {
  const normalized = normalizeLearningReaderState(state, catalog);
  if (!getLearningLesson(lessonId, catalog)) return normalized;
  const isSaved = normalized.savedLessonIds.includes(lessonId);
  return {
    ...normalized,
    savedLessonIds: isSaved
      ? normalized.savedLessonIds.filter((id) => id !== lessonId)
      : [...normalized.savedLessonIds, lessonId],
  };
}

/** Merges a partial progress update into a valid lesson without mutation. */
export function setLearningLessonProgress(
  state: LearningReaderState,
  lessonId: string,
  update: Partial<LearningLessonProgress>,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningReaderState {
  const normalized = normalizeLearningReaderState(state, catalog);
  if (!getLearningLesson(lessonId, catalog)) return normalized;
  const previous = normalized.progressByLessonId[lessonId] ?? {
    completed: false,
    lastReadAt: null,
    lastSectionIndex: 0,
  };
  const next: LearningLessonProgress = {
    completed:
      update.completed === undefined
        ? previous.completed
        : update.completed === true,
    lastReadAt:
      update.lastReadAt === undefined
        ? previous.lastReadAt
        : normalizeTimestamp(update.lastReadAt),
    lastSectionIndex:
      update.lastSectionIndex === undefined
        ? previous.lastSectionIndex
        : normalizeSectionIndex(update.lastSectionIndex),
  };
  return {
    ...normalized,
    progressByLessonId: { ...normalized.progressByLessonId, [lessonId]: next },
  };
}

/** Marks a lesson complete using an optional caller-owned timestamp. */
export function markLearningLessonCompleted(
  state: LearningReaderState,
  lessonId: string,
  lastReadAt: string | null = null,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningReaderState {
  return setLearningLessonProgress(
    state,
    lessonId,
    { completed: true, lastReadAt },
    catalog,
  );
}

export function getLearningJourneyProgress(
  state: LearningReaderState,
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningJourneyProgress {
  const normalized = normalizeLearningReaderState(state, catalog);
  const entries = Object.values(normalized.progressByLessonId);
  const totalLessons = catalog.length;
  const completedLessons = entries.filter((entry) => entry.completed).length;
  const startedLessons = entries.length;
  return {
    totalLessons,
    startedLessons,
    completedLessons,
    savedLessons: normalized.savedLessonIds.length,
    percentComplete:
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100),
  };
}

/** Returns editorial data problems for tests and future CMS import validation. */
export function getLearningCatalogIssues(
  catalog: readonly LearningLesson[] = LEARNING_LESSONS,
): LearningCatalogIssue[] {
  const issues: LearningCatalogIssue[] = [];
  const ids = new Set<string>();
  const knownIds = validLessonIdSet(catalog);
  const validTopics = new Set<LearningLessonTopic>(
    LEARNING_TOPICS.filter(
      (topic): topic is LearningLessonTopic => topic !== "All",
    ),
  );
  const knownCollectionIds = new Set(
    LEARNING_COLLECTIONS.map((item) => item.id),
  );

  for (const lesson of catalog) {
    if (!lesson.id.trim() || ids.has(lesson.id)) {
      issues.push({
        lessonId: lesson.id,
        field: "id",
        message: "Lesson IDs must be present and unique.",
      });
    }
    ids.add(lesson.id);
    if (!validTopics.has(lesson.topic)) {
      issues.push({
        lessonId: lesson.id,
        field: "topic",
        message: "Lesson topic must be a supported Learning topic.",
      });
    }
    if (!knownCollectionIds.has(lesson.collectionId)) {
      issues.push({
        lessonId: lesson.id,
        field: "collectionId",
        message: "Lesson must belong to a canonical collection.",
      });
    }
    if (
      !lesson.title.trim() ||
      !lesson.dek.trim() ||
      lesson.readingMinutes < 1
    ) {
      issues.push({
        lessonId: lesson.id,
        field: "editorial",
        message: "Lesson needs a title, dek, and positive reading time.",
      });
    }
    if (
      !lesson.sections.length ||
      lesson.sections.some(
        (section) => !section.heading.trim() || !section.paragraphs.length,
      )
    ) {
      issues.push({
        lessonId: lesson.id,
        field: "sections",
        message: "Lesson sections need headings and at least one paragraph.",
      });
    }
    if (lesson.medicalAdjacent && !hasLearningSafetyMetadata(lesson)) {
      issues.push({
        lessonId: lesson.id,
        field: "safety",
        message: "Medical-adjacent lessons need conservative safety metadata.",
      });
    }
    for (const relatedId of lesson.relatedLessonIds) {
      if (relatedId === lesson.id || !knownIds.has(relatedId)) {
        issues.push({
          lessonId: lesson.id,
          field: "relatedLessonIds",
          message: "Related lesson IDs must refer to another catalog lesson.",
        });
      }
    }
  }

  return issues;
}
