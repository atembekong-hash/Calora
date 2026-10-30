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
  "food-variety-in-practice": require("../assets/images/learning/articles/food-variety-in-practice.jpg"),
  "satisfaction-and-staying-power": require("../assets/images/learning/articles/satisfaction-and-staying-power.jpg"),
  "plan-for-real-energy": require("../assets/images/learning/articles/plan-for-real-energy.jpg"),
  "flexible-meal-rhythm": require("../assets/images/learning/articles/flexible-meal-rhythm.jpg"),
  "cook-with-what-you-have": require("../assets/images/learning/articles/cook-with-what-you-have.jpg"),
  "flavor-without-perfection": require("../assets/images/learning/articles/flavor-without-perfection.jpg"),
  "marketing-language-with-context": require("../assets/images/learning/articles/marketing-language-with-context.jpg"),
  "label-comparisons-made-simple": require("../assets/images/learning/articles/label-comparisons-made-simple.jpg"),
  "restart-without-resetting": require("../assets/images/learning/articles/restart-without-resetting.jpg"),
  "environment-design": require("../assets/images/learning/articles/environment-design.jpg"),
  "fasting-and-medications": require("../assets/images/learning/articles/fasting-and-medications.jpg"),
  "ending-a-fast-comfortably": require("../assets/images/learning/articles/ending-a-fast-comfortably.jpg"),
  "fluid-rich-foods": require("../assets/images/learning/articles/fluid-rich-foods.jpg"),
  "hydration-cues-at-home": require("../assets/images/learning/articles/hydration-cues-at-home.jpg"),
  "accessible-movement-options": require("../assets/images/learning/articles/accessible-movement-options.jpg"),
  "rest-days-are-data": require("../assets/images/learning/articles/rest-days-are-data.jpg"),
  "morning-light-and-rhythm": require("../assets/images/learning/articles/morning-light-and-rhythm.jpg"),
  "nighttime-food-and-sleep": require("../assets/images/learning/articles/nighttime-food-and-sleep.jpg"),
  "replace-all-or-nothing": require("../assets/images/learning/articles/replace-all-or-nothing.jpg"),
  "self-talk-that-supports-action": require("../assets/images/learning/articles/self-talk-that-supports-action.jpg"),
  "what-fiber-brings-to-a-meal": require("../assets/images/learning/articles/what-fiber-brings-to-a-meal.jpg"),
  "add-fiber-gradually": require("../assets/images/learning/articles/add-fiber-gradually.jpg"),
  "beans-lentils-and-practical-portions": require("../assets/images/learning/articles/beans-lentils-and-practical-portions.jpg"),
  "fruit-vegetables-and-grains": require("../assets/images/learning/articles/fruit-vegetables-and-grains.jpg"),
  "fiber-and-fluid-together": require("../assets/images/learning/articles/fiber-and-fluid-together.jpg"),
  "a-comfortable-meal-experiment": require("../assets/images/learning/articles/a-comfortable-meal-experiment.jpg"),
  "when-digestion-needs-support": require("../assets/images/learning/articles/when-digestion-needs-support.jpg"),
  "build-a-flexible-low-cost-pattern": require("../assets/images/learning/articles/build-a-flexible-low-cost-pattern.jpg"),
  "compare-cost-per-serving": require("../assets/images/learning/articles/compare-cost-per-serving.jpg"),
  "frozen-canned-and-shelf-stable-options": require("../assets/images/learning/articles/frozen-canned-and-shelf-stable-options.jpg"),
  "make-a-backup-meal-list": require("../assets/images/learning/articles/make-a-backup-meal-list.jpg"),
  "shop-from-what-you-already-have": require("../assets/images/learning/articles/shop-from-what-you-already-have.jpg"),
  "budget-friendly-protein-choices": require("../assets/images/learning/articles/budget-friendly-protein-choices.jpg"),
  "when-access-changes": require("../assets/images/learning/articles/when-access-changes.jpg"),
  "fridge-freezer-and-pantry-basics": require("../assets/images/learning/articles/fridge-freezer-and-pantry-basics.jpg"),
  "leftovers-and-storage-timing": require("../assets/images/learning/articles/leftovers-and-storage-timing.jpg"),
  "reheating-meals-with-confidence": require("../assets/images/learning/articles/reheating-meals-with-confidence.jpg"),
  "prevent-cross-contamination": require("../assets/images/learning/articles/prevent-cross-contamination.jpg"),
  "handling-produce-safely": require("../assets/images/learning/articles/handling-produce-safely.jpg"),
  "packing-food-for-work-or-travel": require("../assets/images/learning/articles/packing-food-for-work-or-travel.jpg"),
  "when-to-discard-rather-than-guess": require("../assets/images/learning/articles/when-to-discard-rather-than-guess.jpg"),
  "read-menus-without-overthinking": require("../assets/images/learning/articles/read-menus-without-overthinking.jpg"),
  "build-a-satisfying-restaurant-meal": require("../assets/images/learning/articles/build-a-satisfying-restaurant-meal.jpg"),
  "shared-meals-and-family-style": require("../assets/images/learning/articles/shared-meals-and-family-style.jpg"),
  "flexible-ordering-and-swaps": require("../assets/images/learning/articles/flexible-ordering-and-swaps.jpg"),
  "fast-food-with-practical-choices": require("../assets/images/learning/articles/fast-food-with-practical-choices.jpg"),
  "enjoying-food-without-compensation": require("../assets/images/learning/articles/enjoying-food-without-compensation.jpg"),
  "a-gentle-return-to-routine": require("../assets/images/learning/articles/a-gentle-return-to-routine.jpg"),
  "food-traditions-belong-here": require("../assets/images/learning/articles/food-traditions-belong-here.jpg"),
  "pleasure-is-useful-information": require("../assets/images/learning/articles/pleasure-is-useful-information.jpg"),
  "sharing-meals-and-connection": require("../assets/images/learning/articles/sharing-meals-and-connection.jpg"),
  "adapt-familiar-dishes-thoughtfully": require("../assets/images/learning/articles/adapt-familiar-dishes-thoughtfully.jpg"),
  "cooking-with-family-and-community": require("../assets/images/learning/articles/cooking-with-family-and-community.jpg"),
  "food-memories-and-meaning": require("../assets/images/learning/articles/food-memories-and-meaning.jpg"),
  "make-room-for-spontaneity": require("../assets/images/learning/articles/make-room-for-spontaneity.jpg"),
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
