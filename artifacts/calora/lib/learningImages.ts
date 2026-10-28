import type { LearningCollectionId, LearningLesson } from "@/content/learning";

type LocalImage = number;

const collectionImages: Record<LearningCollectionId, LocalImage> = {
  "nutrition-foundations": require("../assets/images/learning/balanced-meal-unsplash-mobile.jpg"),
  "plan-with-less-pressure": require("../assets/images/learning/tea-journal-unsplash-mobile.jpg"),
  "cook-with-flexibility": require("../assets/images/learning/colorful-plate-unsplash-mobile.jpg"),
  "labels-with-context": require("../assets/images/learning/grain-bowl-unsplash-mobile.jpg"),
  "habits-that-fit": require("../assets/images/learning/wellness-yoga-unsplash-mobile.jpg"),
  "meal-timing-basics": require("../assets/images/learning/coffee-morning-unsplash-mobile.jpg"),
  "hydration-everyday": require("../assets/images/foods/berry-protein-smoothie.jpg"),
  "movement-and-recovery": require("../assets/images/learning/wellness-yoga-unsplash-mobile.jpg"),
  "sleep-and-rhythm": require("../assets/images/foods/overnight-oats.jpg"),
  "mindset-and-routine": require("../assets/images/meals/yogurt-parfait.jpg"),
};

const lessonImageOverrides: Partial<Record<LearningLesson["id"], LocalImage>> =
  {
    "balanced-plate-basics": require("../assets/images/learning/balanced-meal-unsplash-mobile.jpg"),
    "fasting-basics-and-boundaries": require("../assets/images/learning/coffee-morning-unsplash-mobile.jpg"),
    "week-with-one-anchor": require("../assets/images/learning/tea-journal-unsplash-mobile.jpg"),
    "recipe-template": require("../assets/images/learning/colorful-plate-unsplash-mobile.jpg"),
  };

/**
 * Returns a statically bundled local image. No lesson image is fetched at
 * runtime, which keeps the Learning library private, offline-capable, and
 * free of third-party image tracking.
 */
export function getLearningEditorialImage(lesson: LearningLesson): LocalImage {
  return (
    lessonImageOverrides[lesson.id] ?? collectionImages[lesson.collectionId]
  );
}
