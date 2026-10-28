import type { LearningLesson } from "@/content/learning";

type LocalImage = number;

/**
 * Each Learning article owns one immutable local editorial asset. This map is
 * deliberately keyed by the article's persisted imageAssetKey rather than its
 * collection, so browse, search, saved, related, and reader surfaces cannot
 * silently collapse into a repeated category fallback.
 */
const lessonImages: Readonly<Record<string, LocalImage>> = {
  "balanced-plate-basics": require("../assets/images/learning/articles/balanced-plate-basics.jpg"),
  "calories-are-context": require("../assets/images/learning/articles/calories-are-context.jpg"),
  "macro-map": require("../assets/images/learning/articles/macro-map.jpg"),
  "hydration-check-in": require("../assets/images/learning/articles/hydration-check-in.jpg"),
  "variety-without-rules": require("../assets/images/learning/articles/variety-without-rules.jpg"),
  "make-a-meal-satisfying": require("../assets/images/learning/articles/make-a-meal-satisfying.jpg"),
  "week-with-one-anchor": require("../assets/images/learning/articles/week-with-one-anchor.jpg"),
  "shopping-list-scaffold": require("../assets/images/learning/articles/shopping-list-scaffold.jpg"),
  "busy-day-backup": require("../assets/images/learning/articles/busy-day-backup.jpg"),
  "make-the-next-step-specific": require("../assets/images/learning/articles/make-the-next-step-specific.jpg"),
  "plan-for-the-plan-to-change": require("../assets/images/learning/articles/plan-for-the-plan-to-change.jpg"),
  "recipe-template": require("../assets/images/learning/articles/recipe-template.jpg"),
  "leftovers-by-design": require("../assets/images/learning/articles/leftovers-by-design.jpg"),
  "build-a-bowl-formula": require("../assets/images/learning/articles/build-a-bowl-formula.jpg"),
  "one-small-recipe-swap": require("../assets/images/learning/articles/one-small-recipe-swap.jpg"),
  "safe-prep-cook-and-save": require("../assets/images/learning/articles/safe-prep-cook-and-save.jpg"),
  "read-nutrition-facts": require("../assets/images/learning/articles/read-nutrition-facts.jpg"),
  "ingredient-list-first": require("../assets/images/learning/articles/ingredient-list-first.jpg"),
  "serving-size-reality-check": require("../assets/images/learning/articles/serving-size-reality-check.jpg"),
  "compare-with-percent-daily-value": require("../assets/images/learning/articles/compare-with-percent-daily-value.jpg"),
  "allergen-and-ingredient-scan": require("../assets/images/learning/articles/allergen-and-ingredient-scan.jpg"),
  "habit-cue-design": require("../assets/images/learning/articles/habit-cue-design.jpg"),
  "kind-feedback-loop": require("../assets/images/learning/articles/kind-feedback-loop.jpg"),
  "anchor-one-small-action": require("../assets/images/learning/articles/anchor-one-small-action.jpg"),
  "make-the-plan-easier-to-do": require("../assets/images/learning/articles/make-the-plan-easier-to-do.jpg"),
  "notice-progress-without-perfection": require("../assets/images/learning/articles/notice-progress-without-perfection.jpg"),
  "fasting-basics-and-boundaries": require("../assets/images/learning/articles/fasting-basics-and-boundaries.jpg"),
  "fasting-pause-signals": require("../assets/images/learning/articles/fasting-pause-signals.jpg"),
  "fasting-defined-without-hype": require("../assets/images/learning/articles/fasting-defined-without-hype.jpg"),
  "fasting-and-real-life": require("../assets/images/learning/articles/fasting-and-real-life.jpg"),
  "fasting-personal-guidance": require("../assets/images/learning/articles/fasting-personal-guidance.jpg"),
  "drinks-that-fit-your-day": require("../assets/images/learning/articles/drinks-that-fit-your-day.jpg"),
  "hydration-on-busy-days": require("../assets/images/learning/articles/hydration-on-busy-days.jpg"),
  "hot-and-active-day-hydration": require("../assets/images/learning/articles/hot-and-active-day-hydration.jpg"),
  "recognize-dehydration-signals": require("../assets/images/learning/articles/recognize-dehydration-signals.jpg"),
  "movement-breaks-count": require("../assets/images/learning/articles/movement-breaks-count.jpg"),
  "fuel-for-your-routine": require("../assets/images/learning/articles/fuel-for-your-routine.jpg"),
  "recovery-is-part-of-routine": require("../assets/images/learning/articles/recovery-is-part-of-routine.jpg"),
  "movement-snacks": require("../assets/images/learning/articles/movement-snacks.jpg"),
  "build-a-balanced-movement-week": require("../assets/images/learning/articles/build-a-balanced-movement-week.jpg"),
  "sleep-and-food-rhythm": require("../assets/images/learning/articles/sleep-and-food-rhythm.jpg"),
  "gentle-evening-reset": require("../assets/images/learning/articles/gentle-evening-reset.jpg"),
  "shift-the-plan-not-yourself": require("../assets/images/learning/articles/shift-the-plan-not-yourself.jpg"),
  "steady-sleep-window": require("../assets/images/learning/articles/steady-sleep-window.jpg"),
  "shape-a-calmer-sleep-runway": require("../assets/images/learning/articles/shape-a-calmer-sleep-runway.jpg"),
  "kind-check-in": require("../assets/images/learning/articles/kind-check-in.jpg"),
  "make-goals-flexible": require("../assets/images/learning/articles/make-goals-flexible.jpg"),
  "food-mood-observations": require("../assets/images/learning/articles/food-mood-observations.jpg"),
  "turn-not-yet-into-next-step": require("../assets/images/learning/articles/turn-not-yet-into-next-step.jpg"),
  "pause-notice-choose": require("../assets/images/learning/articles/pause-notice-choose.jpg"),
};

export function getLearningEditorialImageIdentity(
  lesson: LearningLesson,
): string {
  return lesson.imageAssetKey;
}

/**
 * Returns the article's statically bundled editorial image. There is no
 * collection fallback: a missing identity is a development error so semantic
 * mismatches cannot be hidden by a repeated generic photograph.
 */
export function getLearningEditorialImage(lesson: LearningLesson): LocalImage {
  const image = lessonImages[lesson.imageAssetKey];
  if (!image) {
    throw new Error(
      `Learning lesson "${lesson.id}" is missing its editorial image identity "${lesson.imageAssetKey}"`,
    );
  }
  return image;
}

export function getLearningEditorialImageKeys(): readonly string[] {
  return Object.keys(lessonImages);
}
