export const LEARNING_TOPICS = [
  "All",
  "Fundamentals",
  "Planning",
  "Recipes",
  "Labels",
  "Habits",
  "Fasting",
  "Hydration",
  "Movement",
  "Sleep",
  "Mindset",
  "Fiber & digestion",
  "Budget & access",
  "Food safety",
  "Eating out",
  "Food culture & enjoyment",
] as const;

export type LearningTopic = (typeof LEARNING_TOPICS)[number];
export type LearningLessonTopic = Exclude<LearningTopic, "All">;

export const LEARNING_COLLECTION_IDS = [
  "nutrition-foundations",
  "plan-with-less-pressure",
  "cook-with-flexibility",
  "labels-with-context",
  "habits-that-fit",
  "meal-timing-basics",
  "hydration-everyday",
  "movement-and-recovery",
  "sleep-and-rhythm",
  "mindset-and-routine",
  "fiber-and-digestion",
  "budget-and-access",
  "food-safety",
  "eating-out",
  "food-culture-enjoyment",
] as const;

export type LearningCollectionId = (typeof LEARNING_COLLECTION_IDS)[number];
export type LearningRoute =
  "/fasting" | "/(tabs)/planner" | "/(tabs)/recipes" | "/(tabs)";
export type LearningIcon =
  | "activity"
  | "bookmark"
  | "book-open"
  | "calendar"
  | "check-circle"
  | "clock"
  | "coffee"
  | "droplet"
  | "layers"
  | "pie-chart"
  | "repeat"
  | "shopping-bag"
  | "sun"
  | "tag"
  | "heart"
  | "moon";

export type LearningReviewMetadata = {
  reviewedAt: string;
  reviewedBy: string;
  reviewStatus: "current" | "scheduled";
  sourceNote: string;
};

export type LearningSafetyNote = {
  heading: string;
  body: string;
  review: LearningReviewMetadata;
};

export type LearningSection = {
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type LearningCta = {
  label: string;
  route: LearningRoute;
  feature: "planner" | "recipes" | "fasting" | "home";
};

export type LearningLesson = {
  id: string;
  /** Immutable local editorial visual identity for this article. */
  imageAssetKey: string;
  title: string;
  dek: string;
  topic: LearningLessonTopic;
  collectionId: LearningCollectionId;
  readingMinutes: number;
  icon: LearningIcon;
  accent: "primary" | "success" | "warning" | "info";
  featured?: boolean;
  medicalAdjacent?: boolean;
  sections: readonly LearningSection[];
  tryThis: string;
  cta: LearningCta;
  relatedLessonIds: readonly string[];
  review: LearningReviewMetadata;
  safety?: LearningSafetyNote;
};

export type LearningCollection = {
  id: LearningCollectionId;
  title: string;
  eyebrow: string;
  description: string;
  topic: LearningLessonTopic;
  icon: LearningIcon;
};

const editorialReview: LearningReviewMetadata = {
  reviewedAt: "2026-10-28",
  reviewedBy: "Calora editorial team",
  reviewStatus: "current",
  sourceNote:
    "Original Calora general-education content; not individualized guidance.",
};

const medicalEducationReview: LearningReviewMetadata = {
  reviewedAt: "2026-10-28",
  reviewedBy: "Calora editorial team",
  reviewStatus: "current",
  sourceNote:
    "General education only. This topic includes a conservative safety note and is not medical guidance.",
};

export const LEARNING_COLLECTIONS: readonly LearningCollection[] = [
  {
    id: "nutrition-foundations",
    title: "Nutrition foundations",
    eyebrow: "START HERE",
    description:
      "A clear vocabulary for everyday food choices—without turning food into a test.",
    topic: "Fundamentals",
    icon: "pie-chart",
  },
  {
    id: "plan-with-less-pressure",
    title: "Plan with less pressure",
    eyebrow: "MAKE A PATH",
    description:
      "Small planning moves that can make a busy week easier to feed.",
    topic: "Planning",
    icon: "calendar",
  },
  {
    id: "cook-with-flexibility",
    title: "Cook with flexibility",
    eyebrow: "IN THE KITCHEN",
    description: "Use recipes as useful prompts, then make the meal your own.",
    topic: "Recipes",
    icon: "coffee",
  },
  {
    id: "labels-with-context",
    title: "Labels with context",
    eyebrow: "AT THE SHELF",
    description: "Read package information as a reference, not a scorecard.",
    topic: "Labels",
    icon: "tag",
  },
  {
    id: "habits-that-fit",
    title: "Habits that fit",
    eyebrow: "YOUR ROUTINE",
    description:
      "Build repeatable support around the routines you already have.",
    topic: "Habits",
    icon: "repeat",
  },
  {
    id: "meal-timing-basics",
    title: "Meal timing basics",
    eyebrow: "OPTIONAL EXPLORATION",
    description:
      "A cautious look at meal timing and fasting as personal routines, not requirements.",
    topic: "Fasting",
    icon: "clock",
  },
  {
    id: "hydration-everyday",
    title: "Hydration for real days",
    eyebrow: "SMALL SIPS",
    description:
      "Simple ways to make drinks easier to remember without turning hydration into a score.",
    topic: "Hydration",
    icon: "droplet",
  },
  {
    id: "movement-and-recovery",
    title: "Movement and recovery",
    eyebrow: "MOVE GENTLY",
    description:
      "Practical activity ideas that respect energy, access, and your changing routine.",
    topic: "Movement",
    icon: "activity",
  },
  {
    id: "sleep-and-rhythm",
    title: "Sleep and daily rhythm",
    eyebrow: "WIND DOWN",
    description:
      "Build steadier evenings and mornings without expecting a perfect routine.",
    topic: "Sleep",
    icon: "moon",
  },
  {
    id: "mindset-and-routine",
    title: "Mindset and routine",
    eyebrow: "KEEP IT KIND",
    description:
      "Use observations and flexible plans to support a sustainable relationship with food.",
    topic: "Mindset",
    icon: "heart",
  },
  {
    id: "fiber-and-digestion",
    title: "Fiber in everyday meals",
    eyebrow: "EVERYDAY COMFORT",
    description: "Practical ways to explore fiber with flexibility.",
    topic: "Fiber & digestion",
    icon: "layers",
  },
  {
    id: "budget-and-access",
    title: "Nourishment on your budget",
    eyebrow: "MAKE IT WORK",
    description: "Build nourishing options around real budgets, access, and changing weeks.",
    topic: "Budget & access",
    icon: "shopping-bag",
  },
  {
    id: "food-safety",
    title: "Safe food, simple systems",
    eyebrow: "HANDLE WITH CARE",
    description: "Everyday storage and preparation habits that reduce guesswork.",
    topic: "Food safety",
    icon: "check-circle",
  },
  {
    id: "eating-out",
    title: "Eating out with flexibility",
    eyebrow: "AT THE TABLE",
    description: "Use practical choices and enjoyment when meals happen away from home.",
    topic: "Eating out",
    icon: "coffee",
  },
  {
    id: "food-culture-enjoyment",
    title: "Food, culture, and enjoyment",
    eyebrow: "KEEP IT HUMAN",
    description: "Make room for connection, tradition, pleasure, and personal meaning.",
    topic: "Food culture & enjoyment",
    icon: "heart",
  },
] as const;

/**
 * Local editorial seed library. Copy is deliberately concise, original, and
 * written for general education; no network content or image provenance is
 * required for this offline-first destination.
 */
export const LEARNING_LESSONS: readonly LearningLesson[] = [
  {
    id: "balanced-plate-basics",
    imageAssetKey: "balanced-plate-basics",
    title: "Build a balanced plate",
    dek: "A flexible way to think about a meal's building blocks.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 3,
    icon: "pie-chart",
    accent: "success",
    featured: true,
    sections: [
      {
        heading: "Think in building blocks",
        paragraphs: [
          "A meal can be more satisfying when it combines a food that feels filling, a source of carbohydrate, and something with color or texture. The exact mix can change with the meal, your culture, your budget, and what is available.",
          "There is no requirement to make every plate identical. The goal is to notice what helps a meal feel practical and enjoyable for you.",
        ],
        bullets: [
          "Start with a familiar food you already enjoy.",
          "Add one element that supports staying power, such as beans, eggs, yogurt, tofu, fish, meat, or another favorite protein food.",
          "Use produce, grains, starchy vegetables, or another carbohydrate-rich food in a way that suits the meal.",
        ],
      },
      {
        heading: "Use the idea, not a rule",
        paragraphs: [
          "Some meals are assembled quickly, some are shared, and some come from a restaurant or package. A balanced-plate idea can still be a helpful question: what could make this meal feel a little more complete?",
        ],
      },
      {
        heading: "Let the meal fit the moment",
        paragraphs: [
          "A balanced meal can be understood as a flexible combination rather than a fixed picture. Foods can contribute different kinds of nourishment, flavor, texture, and staying power, and the useful combination may look different at breakfast, during a busy afternoon, or at a shared meal.",
          "Looking across several meals can be more helpful than evaluating one plate in isolation. Availability, culture, budget, appetite, and preferences all belong in the picture, so an imperfectly matched meal can still be a perfectly reasonable part of eating.",
        ],
        bullets: [
          "Start with the part of the meal that is already available, then consider what would make it feel more complete.",
          "Use fresh, frozen, canned, or shelf-stable options according to what is practical for you.",
          "Treat the plate idea as a prompt for options, not a requirement to include every category every time.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard.",
          "For build a balanced plate, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
      {
        heading: "Practice across different days",
        paragraphs: [
          "The same principle can look different in a packed lunch, a quick breakfast, a family dinner, or a meal built from what is left in the pantry. Comparing those examples helps you find patterns that are flexible rather than copying one picture of a balanced meal.",
          "Give yourself permission to use the easiest useful version today and revisit the idea when your time, appetite, ingredients, or support change.",
        ],
        bullets: [
          "Look for a satisfying combination over several meals rather than judging one plate.",
          "Keep convenience foods and familiar traditions in the range of reasonable options.",
        ],
      },
    ],
    tryThis:
      "At one meal you expect to eat soon, notice what is already working and choose one optional addition or swap that could make the meal more satisfying or convenient. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Browse recipe ideas",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["macro-map", "recipe-template"],
    review: editorialReview,
  },
  {
    id: "calories-are-context",
    imageAssetKey: "calories-are-context",
    title: "Calories are context, not a grade",
    dek: "What a calorie number can describe—and what it cannot decide for you.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 3,
    icon: "activity",
    accent: "primary",
    medicalAdjacent: true,
    sections: [
      {
        heading: "A unit, not a verdict",
        paragraphs: [
          "Calories describe energy in food and drink. A number can be one reference point when logging or comparing items, but it does not measure the full value of a meal, your hunger, your preferences, or how a day feels.",
          "Food labels and app estimates can vary. Treat a logged number as an approximation that can support awareness rather than a test you must pass.",
        ],
      },
      {
        heading: "Zoom out when helpful",
        paragraphs: [
          "Instead of judging a single meal, notice broader patterns such as regularity, satisfaction, variety, and the routines that make food easier to manage.",
        ],
      },
      {
        heading: "Read the number beside the bigger picture",
        paragraphs: [
          "A calorie value can help describe the energy provided by a food or drink, but it leaves out many parts of the eating experience. Taste, cultural meaning, satisfaction, access, ingredients, and how the food fits into the day may matter just as much for a practical choice.",
          "Numbers on labels, menus, and apps may be estimates or presented in different serving contexts. Using them as one piece of information can support curiosity; using them as a verdict can crowd out hunger, enjoyment, and flexibility.",
        ],
        bullets: [
          "Check the serving context before comparing two numbers.",
          "Pair a number with a non-number observation such as flavor, convenience, or satisfaction.",
          "Step back from a single item and consider the overall pattern that helps meals feel workable.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard.",
          "For calories are context, not a grade, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "When you notice a calorie number today, record or mentally name one other piece of context—such as serving information, satisfaction, or convenience—without turning either observation into a pass-or-fail judgment. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["macro-map", "kind-feedback-loop"],
    review: medicalEducationReview,
    safety: {
      heading: "A gentle boundary",
      body: "There is no single calorie target that suits every person. If food tracking feels distressing, rigid, or disruptive, it is okay to pause it and seek individualized support from a qualified professional.",
      review: medicalEducationReview,
    },
  },
  {
    id: "macro-map",
    imageAssetKey: "macro-map",
    title: "A simple map of macros",
    dek: "Protein, carbohydrates, and fats are categories—not a menu of rules.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Three broad categories",
        paragraphs: [
          "Protein, carbohydrates, and fats are often called macronutrients. Many foods contain more than one, which is why a meal rarely fits into just one box.",
        ],
        bullets: [
          "Protein foods can include beans, lentils, dairy, eggs, tofu, fish, meat, and many other foods.",
          "Carbohydrate-rich foods include grains, fruit, starchy vegetables, beans, milk, and sweets.",
          "Fats occur in foods such as nuts, seeds, oils, avocado, dairy, fish, and many prepared foods.",
        ],
      },
      {
        heading: "Use labels for curiosity",
        paragraphs: [
          "Macro information can help you compare products or plan a meal, but it is not a measure of whether a food is good or bad. A useful question is simply: does this option fit the meal I want to make?",
        ],
      },
      {
        heading: "See how foods overlap",
        paragraphs: [
          "Macronutrient categories are a shorthand for talking about broad components of food, not separate lanes that every meal must follow. A single food can contribute protein, carbohydrate, fat, fiber, flavor, and other qualities at the same time.",
          "This overlap is one reason a simple category map works best as a way to notice possibilities. It can help you understand a label or think through a meal while leaving room for mixed dishes, familiar traditions, and foods chosen for enjoyment or convenience.",
        ],
        bullets: [
          "Look for the combination already present in mixed foods such as soups, sandwiches, yogurt bowls, or grain dishes.",
          "Compare products using the information that matters for the choice you are making, rather than scanning every number.",
          "Let taste, budget, availability, and the rest of the meal influence what fits.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard.",
          "For a simple map of macros, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
      {
        heading: "Connect the pieces to a real meal",
        paragraphs: [
          "A macro map is most helpful when it explains a meal you already enjoy, not when it turns eating into a calculation exercise. Use it to notice what contributes energy, staying power, texture, and pleasure, then choose the level of detail that supports your decision.",
          "You do not need to identify every component perfectly. A broad understanding can be enough to make a practical swap or add a food that helps the meal work better for you.",
        ],
        bullets: [
          "Use the map to build curiosity about meals, not to create a pass-or-fail score.",
          "Let appetite, culture, access, and enjoyment remain part of the picture.",
        ],
      },
    ],
    tryThis:
      "Choose one familiar mixed dish and identify two or three contributions it makes before deciding whether any optional change would better suit the moment. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["balanced-plate-basics", "read-nutrition-facts"],
    review: editorialReview,
  },
  {
    id: "hydration-check-in",
    imageAssetKey: "hydration-check-in",
    title: "Make hydration a small check-in",
    dek: "Build an easy cue for drinking without chasing a universal number.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 2,
    icon: "droplet",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Use a cue you already have",
        paragraphs: [
          "A water bottle on your desk, a drink with a meal, or a refill after a walk can be simple reminders. The best cue is one that fits into a routine you already repeat.",
          "Water is one option among many beverages and foods that contribute fluid. Preferences, weather, activity, and meals can all shape what feels practical.",
        ],
      },
      {
        heading: "Keep it ordinary",
        paragraphs: [
          "Hydration does not need to become a performance metric. Notice what helps you feel prepared for the parts of your day where a drink is easy to forget.",
        ],
      },
      {
        heading: "Make the cue easy to notice",
        paragraphs: [
          "A reminder works best when it is connected to something already visible or routine, such as a meal, a commute, or settling into work. The point is to reduce remembering effort, not to create another task to complete perfectly.",
          "A quick check-in can include access, preference, and context: is a drink available, does it suit you, and has the day changed because of heat or activity?",
        ],
        bullets: [
          "Keep a preferred cup or bottle where the next routine happens.",
          "Pair the check-in with a transition you already make, such as leaving home or starting lunch.",
          "If the cue is missed, simply use the next convenient moment rather than trying to catch up.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day.",
          "For make hydration a small check-in, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one familiar transition today, place a preferred drink within reach before it happens, and notice whether the cue feels useful. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "busy-day-backup"],
    review: medicalEducationReview,
    safety: {
      heading: "Personal needs vary",
      body: "Fluid needs and any fluid limits are personal. If you have been given individual guidance about fluids or have a health concern, follow that guidance and ask a qualified professional before making changes.",
      review: medicalEducationReview,
    },
  },
  {
    id: "week-with-one-anchor",
    imageAssetKey: "week-with-one-anchor",
    title: "Plan a week with one anchor",
    dek: "A single repeatable meal can reduce decisions without filling every slot.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 3,
    icon: "calendar",
    accent: "success",
    featured: true,
    sections: [
      {
        heading: "Choose the moment that gets busy",
        paragraphs: [
          "Planning works best when it solves a real friction point. Think about a day or time when choosing food feels rushed, then choose one meal or snack you can repeat, adapt, or keep ready.",
        ],
      },
      {
        heading: "Leave space around the plan",
        paragraphs: [
          "A plan can be a note, a grocery item, or one recipe saved for later. It does not need to account for every appetite, invitation, or schedule change before it becomes useful.",
        ],
        bullets: [
          "Name one fallback meal.",
          "Choose one ingredient to keep on hand.",
          "Plan one meal early enough that you can change it if needed.",
        ],
      },
      {
        heading: "Give the anchor a little support",
        paragraphs: [
          "One repeatable meal becomes easier to use when the surrounding details are visible. A short note about the ingredients, preparation, or likely timing can turn an idea into a practical option without requiring the rest of the week to be decided.",
          "Treat the anchor as a starting point rather than a promise. If appetite, access, company, or the schedule changes, the same planning work can point you toward a different meal or a simpler backup.",
        ],
        bullets: [
          "Write down the few ingredients or components the anchor needs.",
          "Choose whether it is easiest to prepare ahead, assemble quickly, or keep ready to buy.",
          "Add one acceptable swap for a day when the original version does not fit.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort.",
          "For plan a week with one anchor, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one busy moment, note the simplest anchor that could support it, and add one flexible swap beside it. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["busy-day-backup", "shopping-list-scaffold"],
    review: editorialReview,
  },
  {
    id: "shopping-list-scaffold",
    imageAssetKey: "shopping-list-scaffold",
    title: "Build a flexible shopping list",
    dek: "Shop from a few categories instead of a rigid set of meals.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 3,
    icon: "shopping-bag",
    accent: "primary",
    sections: [
      {
        heading: "Start with what you use",
        paragraphs: [
          "A useful list often begins with familiar ingredients rather than an idealized menu. Scan your week for a few items that make breakfast, lunches, dinners, or snacks easier to assemble.",
        ],
        bullets: [
          "A few produce items you genuinely like.",
          "One or two protein foods you know how to use.",
          "A staple that makes a quick meal easier, such as bread, rice, pasta, beans, or frozen vegetables.",
        ],
      },
      {
        heading: "Plan for substitutions",
        paragraphs: [
          "Availability changes. Writing a backup next to an item can keep a missing ingredient from derailing the whole plan.",
        ],
      },
      {
        heading: "Match the list to the week you actually have",
        paragraphs: [
          "A shopping list is more useful when it reflects the time, storage, cooking access, and company available in the days ahead. Looking at those conditions first can help you choose ingredients that are likely to be used rather than building an ambitious menu that creates extra pressure.",
          "Categories can stay broad while the list remains concrete. A few ready-to-use, shelf-stable, frozen, or fresh choices may cover several meals and leave room for preferences to change.",
        ],
        bullets: [
          "Scan the week for meals away from home, late evenings, or limited cooking time.",
          "Include at least one option that needs little preparation or can wait safely.",
          "Group interchangeable items by role, such as a quick base, a topping, or a meal component.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort.",
          "For build a flexible shopping list, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before your next shop, scan the week for one constraint and add two ingredients or options that can work around it. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["week-with-one-anchor", "recipe-template"],
    review: editorialReview,
  },
  {
    id: "busy-day-backup",
    imageAssetKey: "busy-day-backup",
    title: "Keep a busy-day backup",
    dek: "A fallback is not settling; it is a plan for a real day.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 2,
    icon: "check-circle",
    accent: "success",
    sections: [
      {
        heading: "Make the easy option visible",
        paragraphs: [
          "Busy-day food can be a repeat meal, a freezer option, a sandwich, leftovers, or a combination of simple ingredients. The point is to remove one decision when time or energy is short.",
        ],
      },
      {
        heading: "Define success realistically",
        paragraphs: [
          "A backup meal does not need to look impressive. If it is available, appealing enough, and helps you move through the day, it has done its job.",
        ],
      },
      {
        heading: "Put the backup where the decision happens",
        paragraphs: [
          "A fallback is easier to use when it is visible at the moment a busy choice arrives. The useful location depends on the plan: a freezer shelf, work bag, phone note, pantry area, or a familiar nearby option can all serve as reminders.",
          "The backup can also have levels. One choice might need a little assembly, while another is available with almost no preparation. Keeping more than one route open makes the plan less dependent on a single ingredient or energy level.",
        ],
        bullets: [
          "Store or note the key item where you are likely to look for food.",
          "Write the smallest preparation step next to the option.",
          "Keep a second route for a day when the first backup is unavailable or unappealing.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort.",
          "For keep a busy-day backup, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Pick one likely busy moment, place a low-effort food option where you will notice it, and record one alternate route. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Plan your next meal",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["week-with-one-anchor", "hydration-check-in"],
    review: editorialReview,
  },
  {
    id: "recipe-template",
    imageAssetKey: "recipe-template",
    title: "Use recipes as templates",
    dek: "Keep the structure, then make practical swaps with what you have.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 3,
    icon: "book-open",
    accent: "primary",
    featured: true,
    sections: [
      {
        heading: "Keep the job of each ingredient",
        paragraphs: [
          "A recipe can be a useful starting point even when you do not have every ingredient. Before swapping, notice what the original item contributes: crunch, flavor, creaminess, bulk, or a protein element.",
        ],
      },
      {
        heading: "Change one thing at a time",
        paragraphs: [
          "Simple swaps make it easier to learn what you like. Use a familiar grain, vegetable, seasoning, or protein in a dish that already makes sense to you.",
        ],
        bullets: [
          "Trade one leafy green for another you enjoy.",
          "Use a pantry grain in place of a similar grain.",
          "Choose a seasoning blend that matches your taste.",
        ],
      },
      {
        heading: "Make the template fit the moment",
        paragraphs: [
          "A recipe can guide the shape of a meal without deciding every detail. Consider the time available, the ingredients already in your kitchen, and the people eating; a useful adaptation may be simpler, more familiar, or easier to share.",
          "When changing a recipe, keep the parts that make it recognizable and adjust the parts that create friction. Flexible cooking can include using a prepared ingredient, leaving out an optional topping, or changing the amount to suit the meal you are making.",
        ],
        bullets: [
          "Check which ingredients are essential to the dish and which mainly add flavor, texture, or decoration.",
          "Keep one convenient substitute nearby when shopping for the original item is difficult.",
          "Write down adaptations that made the recipe easier to repeat, without treating them as permanent rules.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal.",
          "For use recipes as templates, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one saved recipe, mark its essential parts, and note one optional swap or shortcut that could make it workable with what you have. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["shopping-list-scaffold", "balanced-plate-basics"],
    review: editorialReview,
  },
  {
    id: "leftovers-by-design",
    imageAssetKey: "leftovers-by-design",
    title: "Make leftovers useful on purpose",
    dek: "Cook once, then leave room for a second easy decision.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 2,
    icon: "repeat",
    accent: "success",
    sections: [
      {
        heading: "Plan the second use",
        paragraphs: [
          "Leftovers are easier to use when you decide their next role before putting them away. A cooked grain can become a bowl, a soup side, or part of a quick breakfast. Roasted vegetables can move into a wrap or pasta.",
        ],
      },
      {
        heading: "Store the idea with the food",
        paragraphs: [
          "A short note in your planner or on a container can turn a vague leftover into a ready option. Keep the next step modest and flexible.",
        ],
      },
      {
        heading: "Give leftovers a clear next step",
        paragraphs: [
          "Leftovers often become easier to use when they are visible, identified, and connected to a familiar meal idea. The next use can be different from the first meal: a cooked ingredient might become part of a wrap, soup, grain bowl, or quick plate.",
          "Planning the second use does not mean committing to an exact schedule. It simply gives the food a possible place in the week while leaving room for appetite, invitations, and changing plans.",
        ],
        bullets: [
          "Store a component in a container that makes its contents easy to recognize.",
          "Add a short note such as ‘wrap filling’ or ‘add to soup’ if the next use is not obvious.",
          "Keep a shelf-stable or ready-to-eat companion available for days when reheating or assembling feels like too much.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal.",
          "For make leftovers useful on purpose, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "After your next cooking session, label one leftover with a possible second use and place any companion ingredient where you can easily see it. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Browse recipe ideas",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["recipe-template", "busy-day-backup"],
    review: editorialReview,
  },
  {
    id: "read-nutrition-facts",
    imageAssetKey: "read-nutrition-facts",
    title: "Read Nutrition Facts with context",
    dek: "Find the serving information first, then look for the details that matter to you.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 4,
    icon: "tag",
    accent: "info",
    sections: [
      {
        heading: "Begin with serving information",
        paragraphs: [
          "Package information is usually presented for a stated serving amount. Before comparing numbers, notice how that serving relates to the amount you expect to eat or drink.",
        ],
      },
      {
        heading: "Choose a question",
        paragraphs: [
          "A label becomes more useful when you have a reason for reading it. You might compare fiber between two cereals, look at protein when choosing a snack, or check ingredients for a personal preference.",
          "You do not need to review every line every time. Pick the information that supports the choice in front of you.",
        ],
      },
      {
        heading: "Follow the label in a useful order",
        paragraphs: [
          "Once you have found the serving information, scan only the parts that connect to the choice in front of you. The calories, nutrients, ingredients, and package details can answer different questions, so reading them in a simple order may make the label feel less crowded.",
          "A label is a snapshot of one packaged food, not a summary of your whole way of eating. Use it alongside taste, price, availability, and how the food fits the meal or snack you are considering.",
        ],
        bullets: [
          "Notice the serving basis before comparing two products.",
          "Choose one or two details that match your question.",
          "Pause when you have enough information to make the choice feel clear.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number.",
          "For read nutrition facts with context, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one packaged food and follow this order: serving information, one detail you care about, then one practical note about how you might use it. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["ingredient-list-first", "macro-map"],
    review: editorialReview,
  },
  {
    id: "ingredient-list-first",
    imageAssetKey: "ingredient-list-first",
    title: "Let the ingredient list tell a story",
    dek: "Use familiar language and personal preferences to compare packaged foods.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 2,
    icon: "book-open",
    accent: "primary",
    sections: [
      {
        heading: "Look for what you recognize",
        paragraphs: [
          "An ingredient list can show you the components of a product in order by weight. It can be helpful when you are comparing flavors, checking for an ingredient you avoid, or looking for a food that fits a meal idea.",
        ],
      },
      {
        heading: "Avoid turning it into a score",
        paragraphs: [
          "Long or unfamiliar names do not automatically make a food right or wrong. The useful question is whether the product fits your preferences, access, budget, and the way you plan to use it.",
        ],
      },
      {
        heading: "Connect ingredients to the way you will use the food",
        paragraphs: [
          "Ingredient lists can be most useful when connected to a real decision, such as choosing a flavor for breakfast, finding a product that works in a recipe, or checking for something you prefer to avoid. The same list may matter differently depending on the meal and the people sharing it.",
          "Ingredient names can vary in familiarity, and a longer list does not by itself explain whether a product will suit you. Let the list provide information without turning it into a test of the food or of your choices.",
        ],
        bullets: [
          "Read enough of the list to answer the question you brought to the package.",
          "Compare products by one feature that matters for the intended use.",
          "Keep price, access, taste, and convenience in the comparison too.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number.",
          "For let the ingredient list tell a story, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For one food you may use this week, read the ingredient list with a specific purpose and write down one practical difference that could affect your choice. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["read-nutrition-facts", "shopping-list-scaffold"],
    review: editorialReview,
  },
  {
    id: "habit-cue-design",
    imageAssetKey: "habit-cue-design",
    title: "Design a cue for a new habit",
    dek: "Attach one small action to a moment that already happens.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 3,
    icon: "sun",
    accent: "success",
    featured: true,
    sections: [
      {
        heading: "Make the cue specific",
        paragraphs: [
          "A vague intention can be hard to remember. A cue gives it a home: after I make coffee, when I close my laptop, or before I start dinner.",
        ],
      },
      {
        heading: "Make the action small enough",
        paragraphs: [
          "The first version of a habit can be very small. Saving a recipe, filling a water bottle, or putting one item on a shopping list can be enough to build a repeatable signal.",
        ],
        bullets: [
          "Name the existing moment.",
          "Pick an action that takes a minute or less.",
          "Decide what counts as done before the day gets busy.",
        ],
      },
      {
        heading: "Make the cue visible and flexible",
        paragraphs: [
          "A cue is easier to use when it is connected to a moment, place, or object you already notice. A note beside the kettle, a recipe saved where you plan meals, or a bottle placed near your work area can make the next action easier to remember without requiring constant attention.",
          "Cues can shift as your day shifts. If a usual moment disappears, choosing another ordinary transition keeps the idea useful rather than turning one missed opportunity into a failed habit.",
        ],
        bullets: [
          "Put the reminder where the action is likely to happen.",
          "Use a cue that fits the routine you actually have this week.",
          "Keep a second, lower-effort cue available for changing days.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan.",
          "For design a cue for a new habit, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one existing moment and place a simple reminder for a small action there; if that moment changes, note one alternate cue you could try instead. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "hydration-check-in"],
    review: editorialReview,
  },
  {
    id: "kind-feedback-loop",
    imageAssetKey: "kind-feedback-loop",
    title: "Use feedback, not punishment",
    dek: "Notice what happened, adjust one thing, and keep the next step kind.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 3,
    icon: "repeat",
    accent: "primary",
    sections: [
      {
        heading: "Patterns are information",
        paragraphs: [
          "A meal plan that did not happen or a habit you skipped can be useful feedback. Maybe the timing was unrealistic, the ingredients were not ready, or the action was too large for that day.",
        ],
      },
      {
        heading: "Change the setup, not your worth",
        paragraphs: [
          "Try making one part easier: move the reminder, lower the effort, choose a different meal, or prepare one item earlier. A plan that adapts can be more durable than one that demands perfect follow-through.",
        ],
      },
      {
        heading: "Turn observations into one small experiment",
        paragraphs: [
          "Reviewing a routine can be more useful when it leads to a modest experiment rather than a verdict. Look for one detail—timing, access, energy, or competing demands—that may have shaped what happened, then change only that detail for the next attempt.",
          "An experiment does not need to prove that a routine works. It can simply help you learn whether a different setup feels easier, more convenient, or more compatible with your day.",
        ],
        bullets: [
          "Describe what happened without labeling it as success or failure.",
          "Change one part of the setup at a time.",
          "Keep the version that feels useful, or revise it again.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan.",
          "For use feedback, not punishment, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "After one difficult or easy attempt, name the most noticeable condition and test one small setup change at the next suitable opportunity. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["habit-cue-design", "calories-are-context"],
    review: editorialReview,
  },
  {
    id: "fasting-basics-and-boundaries",
    imageAssetKey: "fasting-basics-and-boundaries",
    title: "Fasting basics and boundaries",
    dek: "Meal timing is optional, and a fasting routine is not appropriate for everyone.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 4,
    icon: "clock",
    accent: "warning",
    featured: true,
    medicalAdjacent: true,
    sections: [
      {
        heading: "Understand the term",
        paragraphs: [
          "Fasting generally describes planned time without caloric intake. People use the word for different patterns, from an overnight gap between meals to longer scheduled windows.",
          "Meal timing is an optional routine, not a measure of commitment or health. Regular eating, hydration, sleep, access to food, and the demands of daily life still matter.",
        ],
      },
      {
        heading: "Plan before experimenting",
        paragraphs: [
          "If you choose to explore a meal-timing routine, think through the meals and drinks you will have available. Keep the plan flexible and stop rather than pushing through if it does not feel right for you.",
        ],
      },
      {
        heading: "Check the practical fit",
        paragraphs: [
          "Before treating meal timing as a new routine, look at the conditions around it. Work hours, sleep, caregiving, social meals, food access, and the timing of medicines can all affect whether a plan is workable.",
          "A useful plan leaves room for ordinary variation. Thinking through what you will do when hunger, a schedule change, or an unexpected meal appears can help you notice whether the idea supports your day or adds pressure.",
        ],
        bullets: [
          "List the meals, drinks, and food access you expect on a typical day.",
          "Notice whether work, sleep, caregiving, or social plans make the proposed timing hard to adjust.",
          "Name a flexible alternative, including eating normally or choosing not to continue.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes.",
          "For fasting basics and boundaries, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Sketch the meal-timing idea alongside tomorrow’s actual schedule, then note one point where you could pause, adapt, or decide not to change anything. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Open Fasting", route: "/fasting", feature: "fasting" },
    relatedLessonIds: ["fasting-pause-signals", "week-with-one-anchor"],
    review: medicalEducationReview,
    safety: {
      heading: "Consider safety first",
      body: "Fasting is not appropriate for everyone. If you are under 18, pregnant or breastfeeding, have a history of disordered eating, manage a medical condition, or take medication affected by food timing, speak with a qualified health professional before changing your eating routine.",
      review: medicalEducationReview,
    },
  },

  {
    id: "drinks-that-fit-your-day",
    imageAssetKey: "drinks-that-fit-your-day",
    title: "Choose drinks that fit your day",
    dek: "Use preference, access, and routine to make hydration feel less like a task.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 3,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with what is available",
        paragraphs: [
          "Water, tea, coffee, milk, soups, and many foods can all fit into a day. The most useful option is often one you enjoy and can reach when you need it.",
          "You do not need a perfect beverage routine to be prepared. A drink at a familiar moment can be enough of a starting point.",
        ],
      },
      {
        heading: "Make the next choice easy",
        paragraphs: [
          "Keep a cup, bottle, or preferred drink where you already spend time. A visible option can remove one small barrier on a busy day.",
        ],
      },
      {
        heading: "Include more than one comfortable option",
        paragraphs: [
          "Hydration can be supported by different drinks and fluid-containing foods, so flexibility may make access easier. Taste, temperature, culture, budget, and what is available can all reasonably shape the choice.",
          "Thinking in options can help on days when a usual drink is unappealing or unavailable. A practical choice is one you can access and enjoy without turning the choice into a judgment about the rest of the day.",
        ],
        bullets: [
          "Keep two familiar beverage options available when that makes routines easier.",
          "Try a temperature or flavor variation that fits the moment.",
          "Notice whether soups, fruit, or other fluid-containing foods are already part of the day.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day.",
          "For choose drinks that fit your day, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "List two drinks or fluid-containing foods you already enjoy, then make one of them easy to reach during an upcoming routine. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "habit-cue-design"],
    review: medicalEducationReview,
  },
  {
    id: "hydration-on-busy-days",
    imageAssetKey: "hydration-on-busy-days",
    title: "Hydration on busy days",
    dek: "Build a flexible reminder around the moments that already happen.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 2,
    icon: "repeat",
    accent: "success",
    sections: [
      {
        heading: "Use recurring cues",
        paragraphs: [
          "Meetings, commutes, meals, and breaks can all become gentle cues to check in. The goal is not to hit a perfect schedule, but to notice when a small pause would help.",
        ],
      },
      {
        heading: "Adapt instead of catching up",
        paragraphs: [
          "If a day gets away from you, start again at the next cue. There is no need to compensate or turn one missed moment into a rule.",
        ],
      },
      {
        heading: "Build a backup for disrupted routines",
        paragraphs: [
          "Busy days often change the places and times where a drink is normally available. A small backup plan can protect flexibility without requiring a fixed schedule or a running tally.",
          "Think ahead about the next realistic access point: a workplace, transit stop, meeting room, store, or home return. Planning for access is different from trying to force a particular amount.",
        ],
        bullets: [
          "Identify one place where a drink will be available if the usual plan changes.",
          "Use a meal, break, or arrival as a reset point rather than watching the clock.",
          "Keep the backup simple enough to repeat on another busy day.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day.",
          "For hydration on busy days, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before your next busy stretch, choose one likely drink-access point and one ordinary transition where you can pause for a check-in. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "busy-day-backup"],
    review: medicalEducationReview,
  },
  {
    id: "movement-breaks-count",
    imageAssetKey: "movement-breaks-count",
    title: "Movement breaks count",
    dek: "Short walks, stretches, and daily tasks can all be meaningful ways to move.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 3,
    icon: "activity",
    accent: "success",
    sections: [
      {
        heading: "Look for what fits today",
        paragraphs: [
          "Movement does not need one format to be worthwhile. A walk, a stretch, dancing, chores, mobility work, or rest can each fit differently depending on your energy and access.",
        ],
      },
      {
        heading: "Keep the threshold approachable",
        paragraphs: [
          "A small movement break can be easier to repeat than an ambitious plan. Choose a version that feels safe and realistic for the day in front of you.",
        ],
      },
      {
        heading: "Make everyday movement easier to notice",
        paragraphs: [
          "Movement can happen in more places than a dedicated workout. Walking between rooms, wheeling, carrying groceries, changing position, tending to a home, or choosing an active way to travel can all be part of an ordinary day. Seeing these options as movement can make the idea feel more available and less tied to one setting or skill level.",
          "A useful choice is one that matches the time, access, energy, and surroundings you have today. You can collect several small possibilities without turning them into a quota or treating a missed opportunity as a problem.",
        ],
        bullets: [
          "Notice one transition where a little movement already fits, such as before a meal or after a phone call.",
          "Keep a seated, standing, wheeling, walking, or mobility-based option available so you can choose what works in the moment.",
          "Treat changing, shortening, or skipping an option as information about the day rather than a failure.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure.",
          "For movement breaks count, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "During one ordinary transition today, notice two movement options and choose the one that feels accessible and comfortable, with permission to adapt or stop. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "fuel-for-your-routine",
    imageAssetKey: "fuel-for-your-routine",
    title: "Fuel for your routine",
    dek: "Plan meals and snacks around your actual schedule, not an idealized one.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 3,
    icon: "shopping-bag",
    accent: "primary",
    sections: [
      {
        heading: "Notice the practical moments",
        paragraphs: [
          "A long commute, a workout, a shift, or an errand day can change what food feels convenient. Packing a familiar option or identifying a nearby choice can make a routine easier to support.",
        ],
      },
      {
        heading: "Keep it personal",
        paragraphs: [
          "People have different appetites, schedules, cultures, and activity patterns. Use your own experience as useful information rather than copying someone else’s template.",
        ],
      },
      {
        heading: "Match food support to the day ahead",
        paragraphs: [
          "Activity and appetite do not follow one universal schedule. A commute, shift, class, outing, caregiving task, or movement session may make certain foods easier to carry, find, or enjoy at a particular time. Planning around the actual day can be more useful than building an ideal menu.",
          "A small amount of preparation can preserve choice when plans change. The point is not to predict exactly what you will need, but to make one familiar option easier to access while leaving room for preferences and appetite.",
        ],
        bullets: [
          "Check the day for a long gap, travel segment, or place where food choices may be limited.",
          "Choose one portable or nearby option that you would genuinely consider eating.",
          "Add a backup plan, such as a shelf-stable item, a planned stop, or a flexible meal at home.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure.",
          "For fuel for your routine, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Look at one upcoming busy stretch, choose a familiar food option and a backup location, and revise the plan if your schedule or appetite changes. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["week-with-one-anchor", "busy-day-backup"],
    review: editorialReview,
  },
  {
    id: "recovery-is-part-of-routine",
    imageAssetKey: "recovery-is-part-of-routine",
    title: "Make room for recovery",
    dek: "Rest and lower-energy days belong in a sustainable movement routine.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 2,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Plan for variation",
        paragraphs: [
          "Energy and availability change. A routine that includes lighter options, rest, and adjustment can be easier to continue than one that treats every day the same.",
        ],
      },
      {
        heading: "Use a supportive question",
        paragraphs: [
          "Instead of asking what you should force yourself to do, ask what amount of movement or rest would support you today.",
        ],
      },
      {
        heading: "Use recovery as useful information",
        paragraphs: [
          "Recovery is not separate from movement; it helps a routine respond to real life. Sleep, stress, illness, soreness, workload, access, and enjoyment can all change what feels manageable. Making room for lower-effort choices or rest keeps a plan from assuming that every day has the same capacity.",
          "You can review a movement plan by asking what supported you and what created friction. That kind of observation can guide a gentler next choice without requiring a judgment about how productive the day was.",
        ],
        bullets: [
          "Keep a few lower-effort choices in the same menu as more active options.",
          "Notice signals such as unusual tiredness, discomfort, or reduced interest before deciding what fits.",
          "After a change or rest day, return with a comfortable option rather than trying to make up for it.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure.",
          "For make room for recovery, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before your next planned movement, name one option, one recovery alternative, and one sign that would prompt you to pause or change course. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "sleep-and-food-rhythm",
    imageAssetKey: "sleep-and-food-rhythm",
    title: "Notice your sleep and food rhythm",
    dek: "Observe patterns without turning an imperfect night into a food rule.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 3,
    icon: "moon",
    accent: "info",
    sections: [
      {
        heading: "Patterns can be useful data",
        paragraphs: [
          "Sleep, meals, stress, work, and caregiving can all influence how a day feels. A short observation can help you plan with more kindness without needing to solve everything at once.",
        ],
      },
      {
        heading: "Avoid all-or-nothing rules",
        paragraphs: [
          "One restless night does not need a punishment plan the next day. Keep meals and routines flexible, and choose one small support you can actually use.",
        ],
      },
      {
        heading: "Connect the pattern to tomorrow’s support",
        paragraphs: [
          "Sleep can shape how much effort a day feels like it asks for, while meals, stress, light, activity, and responsibilities can shape the evening that follows. Looking at these pieces together can make planning more realistic without implying that one factor explains every difficult day.",
          "Use the observation to prepare support rather than to judge the night. A simple option for food, a lower-demand task, or a little extra transition time may be useful even when sleep does not follow a predictable pattern.",
        ],
        bullets: [
          "Note one context around the night, such as a late shift, worry, caregiving, travel, or a changed meal time.",
          "Choose one practical support to make available the next day.",
          "Treat the note as information to revisit, not a score or a rule.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection.",
          "For notice your sleep and food rhythm, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "After one night that feels different, note one context and arrange one flexible support for the next day without changing meals or routines as punishment. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["busy-day-backup", "kind-feedback-loop"],
    review: medicalEducationReview,
  },
  {
    id: "gentle-evening-reset",
    imageAssetKey: "gentle-evening-reset",
    title: "Create a gentle evening reset",
    dek: "A simple transition can make tomorrow feel easier without needing a perfect bedtime routine.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 2,
    icon: "sun",
    accent: "warning",
    sections: [
      {
        heading: "Choose one closing cue",
        paragraphs: [
          "A short cue—putting away dishes, filling a water bottle, setting out breakfast items, or writing tomorrow’s first task—can help close the day without asking for a long routine.",
        ],
      },
      {
        heading: "Let small be enough",
        paragraphs: [
          "The purpose is to make the next moment easier, not to earn rest. If you skip it, begin again when it is useful.",
        ],
      },
      {
        heading: "Make the transition easy to repeat",
        paragraphs: [
          "An evening transition works best when it lowers the number of decisions between daytime activity and rest. The cue might be connected to the household, the space, or the next morning rather than to a fixed bedtime.",
          "There is no single routine that suits every person. A transition can be shortened, moved, or skipped when life requires it; its value comes from making the next step feel more approachable, not from completing a checklist.",
        ],
        bullets: [
          "Keep one calming or practical item where you will notice it.",
          "Link the action to an existing event, such as finishing dinner or plugging in a device.",
          "Choose a backup version for nights when the usual cue is unavailable.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection.",
          "For create a gentle evening reset, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one visible evening cue and pair it with a brief transition you can use, shorten, or skip according to the night. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "week-with-one-anchor"],
    review: editorialReview,
  },
  {
    id: "shift-the-plan-not-yourself",
    imageAssetKey: "shift-the-plan-not-yourself",
    title: "Shift the plan, not yourself",
    dek: "When schedules change, revise the setup instead of judging the outcome.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 3,
    icon: "calendar",
    accent: "primary",
    sections: [
      {
        heading: "Plan for real constraints",
        paragraphs: [
          "Travel, illness, shift changes, children, deadlines, and social plans can all reshape a routine. A realistic plan names a backup rather than pretending those changes will not happen.",
        ],
      },
      {
        heading: "Keep the next decision small",
        paragraphs: [
          "When a plan changes, choose the next useful action: save a meal, set out one item, or decide on a convenient breakfast. The next step can be enough.",
        ],
      },
      {
        heading: "Build a backup for changing schedules",
        paragraphs: [
          "Sleep routines are shaped by work hours, family needs, travel, illness, and the timing of light and activity. A backup plan acknowledges those conditions instead of treating a changed schedule as a personal failure.",
          "Keep the backup small enough to use when energy is limited. It might protect a quiet transition, prepare the next morning, or identify when drowsiness makes driving or equipment use unsafe; it does not need to recreate an ideal routine.",
        ],
        bullets: [
          "Name the schedule change most likely to disrupt your usual evening.",
          "Pick one low-effort cue that can travel with you or work in a different setting.",
          "Decide what task can wait when you are too drowsy to do it safely.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection.",
          "For shift the plan, not yourself, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For one likely schedule change, write a small backup cue and one task you will postpone rather than do while drowsy. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["week-with-one-anchor", "busy-day-backup"],
    review: editorialReview,
  },
  {
    id: "kind-check-in",
    imageAssetKey: "kind-check-in",
    title: "Build a kinder check-in",
    dek: "Use curiosity to learn from a day without turning observations into a grade.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 3,
    icon: "heart",
    accent: "success",
    sections: [
      {
        heading: "Ask a useful question",
        paragraphs: [
          "A check-in can be as simple as asking what felt easy, what felt difficult, and what support would help next time. It does not need to turn into a score or a list of failures.",
        ],
      },
      {
        heading: "Let the answer be specific",
        paragraphs: [
          "A practical observation—such as needing an afternoon snack or a simpler dinner—can lead to a small change that fits your real life.",
        ],
      },
      {
        heading: "Turn observations into support",
        paragraphs: [
          "A kind check-in becomes more useful when it connects an observation with the conditions around it. Time, energy, access, company, and competing responsibilities can all shape how a routine goes, so one moment does not need to explain the whole day.",
          "Try treating the answer as information for the next choice rather than a judgment about consistency. A support might be a reminder, a simpler option, a prepared item, or permission to leave the plan open.",
        ],
        bullets: [
          "Separate what happened from the story you are telling about it.",
          "Name one condition that made the routine easier or harder.",
          "Choose a support that reduces friction without requiring a perfect repeat.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict.",
          "For build a kinder check-in, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before bed or at another natural pause, write one neutral observation, one factor that shaped it, and one small support you might make available next time. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "habit-cue-design"],
    review: editorialReview,
  },
  {
    id: "make-goals-flexible",
    imageAssetKey: "make-goals-flexible",
    title: "Make goals flexible enough to live with",
    dek: "A goal can offer direction without becoming a rule you cannot revise.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 3,
    icon: "check-circle",
    accent: "primary",
    sections: [
      {
        heading: "Choose the direction, not perfection",
        paragraphs: [
          "A flexible goal describes what you want to practice, such as cooking at home more often or planning one lunch. It leaves room for different days, budgets, appetites, and needs.",
        ],
      },
      {
        heading: "Revise as you learn",
        paragraphs: [
          "If a goal is not working, the setup can change. A smaller step, different reminder, or new definition of success may make it more useful.",
        ],
      },
      {
        heading: "Build in a reset point",
        paragraphs: [
          "A flexible goal can include a planned moment to review whether the wording, timing, or surrounding setup still fits. Reviewing is not abandoning the direction; it is a way to keep the goal responsive to changing circumstances.",
          "A reset point can also protect a goal from becoming an all-or-nothing test. If the original version is too demanding, keep the general direction and adjust the size, frequency, cue, or available options.",
        ],
        bullets: [
          "Choose a review moment that is easy to remember.",
          "Ask what helped, what got in the way, and what could be made simpler.",
          "Keep the part that remains useful and revise the rest without self-criticism.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict.",
          "For make goals flexible enough to live with, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Pick one flexible goal and set a low-pressure review point; at that point, keep, shrink, shift, or pause the goal based on what you learned. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "week-with-one-anchor"],
    review: editorialReview,
  },
  {
    id: "food-mood-observations",
    imageAssetKey: "food-mood-observations",
    title: "Notice food and mood with curiosity",
    dek: "Use gentle observations to learn what supports you, without assuming a simple cause.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 3,
    icon: "bookmark",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Many factors shape a day",
        paragraphs: [
          "Mood and energy can be affected by sleep, stress, relationships, schedules, health, food, and many other factors. A note can help you notice a pattern, but it cannot diagnose a cause.",
        ],
      },
      {
        heading: "Keep observations gentle",
        paragraphs: [
          "If tracking makes you feel rigid or distressed, it is okay to stop. Individualized concerns deserve support from a qualified professional rather than a self-imposed rule.",
        ],
      },
      {
        heading: "Keep a wider lens",
        paragraphs: [
          "A food-and-mood note is only one small view of a changing day. Sleep, stress, relationships, health, workload, surroundings, and chance events may overlap, so a single observation is not evidence of a definite cause.",
          "Use notes to ask gentle questions rather than to prove a theory. Brief, occasional observations may be enough; more detail is not automatically more helpful, especially if recording starts to take over attention or increases worry.",
        ],
        bullets: [
          "Record what you noticed without assigning blame or certainty.",
          "Include one relevant context detail, such as sleep, stress, schedule, or social setting.",
          "Stop or simplify the practice if it becomes rigid, upsetting, or hard to put down.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict.",
          "For notice food and mood with curiosity, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "If it feels comfortable, make one brief neutral note about a meal, mood, and surrounding context, then leave the note without trying to diagnose a pattern. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-check-in", "calories-are-context"],
    review: medicalEducationReview,
    safety: {
      heading: "Support matters",
      body: "This general education content cannot assess mood or eating concerns. If food, body image, or mood feels distressing or hard to manage, consider reaching out to a qualified health professional or a trusted support person.",
      review: medicalEducationReview,
    },
  },
  {
    id: "fasting-pause-signals",
    imageAssetKey: "fasting-pause-signals",
    title: "Know when to pause a fasting plan",
    dek: "A routine should be flexible enough to stop, change, or not begin.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 3,
    icon: "bookmark",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Flexibility is part of the plan",
        paragraphs: [
          "A schedule can conflict with travel, family meals, shift changes, social plans, or simply how a day unfolds. Deciding to eat outside a planned window is an adjustment, not a failure.",
        ],
      },
      {
        heading: "Choose care over completion",
        paragraphs: [
          "Do not treat a timer as an instruction to ignore discomfort or personal needs. When a routine feels rigid, stressful, or hard to manage, pause it and consider whether a different approach—or no fasting approach—would fit better.",
        ],
      },
      {
        heading: "Make stopping easy",
        paragraphs: [
          "A pause is easier to take when it has been considered before the routine begins. Decide what kinds of physical, emotional, or practical changes would tell you that the plan needs to stop or be reconsidered.",
          "Stopping does not erase anything or require compensation later. It is a way to respond to current information and return to a pattern that feels more supportive, including regular eating if that is what fits.",
        ],
        bullets: [
          "Keep a convenient meal or snack option available for an unplanned change.",
          "Treat persistent discomfort, distress, or difficulty managing daily responsibilities as reasons to stop and seek appropriate guidance.",
          "After pausing, review what made the routine difficult without turning the review into a pass-or-fail judgment.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes.",
          "For know when to pause a fasting plan, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Write down one personal pause cue and one easy food option you could use, then give yourself permission to stop without compensating if that cue appears. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Open Fasting", route: "/fasting", feature: "fasting" },
    relatedLessonIds: ["fasting-basics-and-boundaries", "kind-feedback-loop"],
    review: medicalEducationReview,
    safety: {
      heading: "Get individual guidance when needed",
      body: "This lesson cannot tell you whether fasting is suitable for you. If you have health concerns, are managing a condition, or are unsure about medication and meal timing, consult a qualified health professional before starting or continuing a fasting routine.",
      review: medicalEducationReview,
    },
  },

  {
    id: "variety-without-rules",
    imageAssetKey: "variety-without-rules",
    title: "Build variety without rules",
    dek: "Use color, texture, and familiar foods to make meals more interesting—not more restrictive.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 3,
    icon: "layers",
    accent: "success",
    sections: [
      {
        heading: "Think across a week",
        paragraphs: [
          "Variety can come from different vegetables, fruit, grains, proteins, flavors, and ways of cooking. It does not require a perfect plate at every meal or a long list of unfamiliar ingredients.",
          "Fresh, frozen, canned, and shelf-stable foods can all make variety more available. Culture, budget, access, allergies, and personal preference belong in the decision.",
        ],
      },
      {
        heading: "Add, do not grade",
        paragraphs: [
          "A useful approach is to ask what one addition could bring to a meal: color, crunch, a familiar protein, or a favorite fruit. The goal is a meal that works for you, not a scorecard.",
        ],
      },
      {
        heading: "Make variety easier to reach",
        paragraphs: [
          "Variety does not have to mean constantly buying new foods or changing every meal. It can grow through small differences in color, texture, flavor, ingredients, or preparation across the meals that naturally occur in your week.",
          "Keeping more than one form of a familiar food available can make this idea more realistic. A choice from the freezer, pantry, market, or leftovers can all contribute to a varied pattern when it fits your access and preferences.",
        ],
        bullets: [
          "Change the preparation or seasoning of a familiar ingredient if that feels easier than finding a new one.",
          "Keep one flexible option available for a day when shopping or cooking is difficult.",
          "Notice variety over several meals rather than expecting each meal to demonstrate it.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard.",
          "For build variety without rules, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "During the next few days, choose one low-effort way to vary a familiar food—such as a different texture, flavor, or form—and notice whether it makes the meal more enjoyable or useful. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Browse recipe ideas",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["balanced-plate-basics", "macro-map"],
    review: editorialReview,
  },
  {
    id: "make-a-meal-satisfying",
    imageAssetKey: "make-a-meal-satisfying",
    title: "Make a meal satisfying",
    dek: "Use taste, timing, and staying power as useful clues—not food rules.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 3,
    icon: "heart",
    accent: "primary",
    sections: [
      {
        heading: "Satisfaction is practical information",
        paragraphs: [
          "A meal can be easier to return to when it has enough flavor, texture, and substance for the moment. What feels satisfying can change with appetite, schedule, culture, activity, and the foods you have on hand.",
        ],
      },
      {
        heading: "Notice one helpful detail",
        paragraphs: [
          "Instead of judging a meal, notice a specific detail: perhaps it was convenient, filling enough for the afternoon, easy to share, or something you want to make again. That observation can guide the next choice.",
        ],
      },
      {
        heading: "Use satisfaction as information",
        paragraphs: [
          "Satisfaction can include more than fullness. Flavor, texture, temperature, familiarity, convenience, social connection, and how long the meal needs to carry you can all shape whether it feels worthwhile in that moment.",
          "These clues are observations, not a formula. A meal that works well one day may need a different balance on another day, and noticing that difference can support flexible choices without turning eating into a performance review.",
        ],
        bullets: [
          "Before eating, consider what would make the meal enjoyable or practical right now.",
          "Afterward, identify one feature worth repeating and one change that is optional rather than required.",
          "Include convenience and pleasure alongside nutrition when deciding what fits the day.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard.",
          "For make a meal satisfying, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "After your next meal, note one feature that supported satisfaction and one small, optional adjustment you might try another time if the same situation comes up. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["balanced-plate-basics", "calories-are-context"],
    review: editorialReview,
  },
  {
    id: "make-the-next-step-specific",
    imageAssetKey: "make-the-next-step-specific",
    title: "Make the next step specific",
    dek: "Give one useful action a time, place, and cue so it is easier to remember.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 2,
    icon: "check-circle",
    accent: "success",
    sections: [
      {
        heading: "Shrink the plan",
        paragraphs: [
          "A broad intention can be hard to begin. A smaller plan names what you will do, when it can happen, and where the needed item will be. It can be as simple as adding a snack to your bag before a commute.",
        ],
      },
      {
        heading: "Use a cue already in your day",
        paragraphs: [
          "Connect the action to something that already happens, such as making coffee, ending a meeting, or putting away groceries. A familiar cue can lower the work of remembering.",
        ],
      },
      {
        heading: "Check whether the plan fits the moment",
        paragraphs: [
          "Specificity helps only when the proposed action belongs in the day you have. Before settling on a time and place, consider transitions, access to food, privacy, transport, and the amount of attention available; these details can reveal a simpler version that is easier to try.",
          "A plan can be specific without being fixed. Leaving a small window or an alternate cue allows the action to move when the day changes, while still giving it a recognizable place to begin.",
        ],
        bullets: [
          "Name the first visible step rather than the whole project.",
          "Choose a cue that is likely to happen even on an ordinary disrupted day.",
          "Write a flexible alternative time or location if the first setting is unavailable.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort.",
          "For make the next step specific, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Write one small action, its most realistic cue, and one backup cue; then choose whichever fits the day when you reach that moment. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["week-with-one-anchor", "habit-cue-design"],
    review: editorialReview,
  },
  {
    id: "plan-for-the-plan-to-change",
    imageAssetKey: "plan-for-the-plan-to-change",
    title: "Plan for the plan to change",
    dek: "A backup choice can keep a schedule shift from becoming a full reset.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 3,
    icon: "repeat",
    accent: "primary",
    sections: [
      {
        heading: "Name a likely barrier",
        paragraphs: [
          "Time, weather, energy, availability, invitations, and changing work can all alter a plan. Naming one predictable barrier makes it easier to choose a backup before you are already rushed.",
        ],
      },
      {
        heading: "Keep the backup genuinely easy",
        paragraphs: [
          "A fallback can be leftovers, a nearby option, a freezer meal, a different shopping choice, or a simpler version of the original plan. It does not need to match the first idea exactly to be useful.",
        ],
      },
      {
        heading: "Review the backup without grading yourself",
        paragraphs: [
          "A changed plan can show which parts of the setup were useful and which barrier was stronger than expected. Looking back with curiosity helps distinguish a missing resource, an inconvenient time, a preference shift, or an overly complicated step from any judgment about the person making the plan.",
          "The review can stay brief. Keep what helped, adjust one detail, and retire a backup that no longer fits; flexible planning includes updating the plan after real experience.",
        ],
        bullets: [
          "Notice what changed and whether it was predictable or unexpected.",
          "Keep one part that made the next choice easier.",
          "Change or replace only one backup detail before the next similar day.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort.",
          "For plan for the plan to change, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "After a plan changes, note one barrier and one helpful detail, then revise a single part of the backup for next time. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["busy-day-backup", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "build-a-bowl-formula",
    imageAssetKey: "build-a-bowl-formula",
    title: "Use a build-a-bowl formula",
    dek: "Combine a base, something colorful, a protein choice, and flavor in your own way.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 3,
    icon: "layers",
    accent: "success",
    sections: [
      {
        heading: "Choose a flexible structure",
        paragraphs: [
          "A bowl, salad, wrap, or skillet can start with a grain or starchy vegetable, a colorful fruit or vegetable, and a protein food such as beans, lentils, eggs, tofu, fish, meat, yogurt, or another favorite.",
        ],
      },
      {
        heading: "Let flavor make it yours",
        paragraphs: [
          "Herbs, spices, citrus, sauces, crunchy toppings, and a familiar seasoning can make a simple formula feel personal. Use what is available and repeat combinations that work for your household.",
        ],
      },
      {
        heading: "Build for texture and contrast",
        paragraphs: [
          "A flexible bowl becomes more inviting when its parts offer different textures, temperatures, or flavors. Creamy, crisp, soft, fresh, savory, or bright elements can each contribute something without requiring a fixed combination.",
          "Use the formula as a starting point rather than a checklist. A bowl can be assembled from leftovers, prepared foods, or a single component you enjoy, and the balance can change with the occasion and what is available.",
        ],
        bullets: [
          "Add one contrasting texture, such as toasted seeds, crunchy vegetables, or a crisp topping.",
          "Use a sauce, herb, spice, or acidic flavor to connect the ingredients.",
          "Keep separate components apart until serving if that helps preserve the texture you prefer.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal.",
          "For use a build-a-bowl formula, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Assemble one bowl from ingredients you already have, then add one contrasting texture or flavor and make a brief note about the combination. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["balanced-plate-basics", "recipe-template"],
    review: editorialReview,
  },
  {
    id: "one-small-recipe-swap",
    imageAssetKey: "one-small-recipe-swap",
    title: "Try one small recipe swap",
    dek: "Change one ingredient at a time so you can learn what still works for you.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 3,
    icon: "repeat",
    accent: "info",
    sections: [
      {
        heading: "Keep the recipe recognizable",
        paragraphs: [
          "A small swap can be adding a vegetable you like, using beans in a familiar meal, choosing a different grain, or trying herbs and citrus for flavor. One change is enough to learn from.",
        ],
      },
      {
        heading: "Make a note for next time",
        paragraphs: [
          "Notice texture, flavor, cost, timing, and whether the swap felt practical. A change does not have to become a permanent rule; it can simply be another option in your kitchen.",
        ],
      },
      {
        heading: "Test a swap for practical fit",
        paragraphs: [
          "A useful swap is not only about matching ingredients; it also needs to work for taste, time, cost, equipment, and the people sharing the meal. Looking at these practical details can make experimentation feel more informative and less like a pass-or-fail test.",
          "One attempt gives you information, not a verdict. If a change is inconvenient or unappealing, you can return to the original, try a different option, or keep only the part that helped.",
        ],
        bullets: [
          "Choose a swap with a similar role, such as one grain for another or one herb for another seasoning.",
          "Check whether the replacement changes cooking time, moisture, texture, or the need for extra preparation.",
          "Record one observation about flavor, convenience, or cost so the next choice can be easier.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal.",
          "For try one small recipe swap, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before making a familiar recipe, choose one optional swap, check its cooking or texture differences, and decide afterward whether it is worth keeping as another option. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["recipe-template", "leftovers-by-design"],
    review: editorialReview,
  },
  {
    id: "safe-prep-cook-and-save",
    imageAssetKey: "safe-prep-cook-and-save",
    title: "Prep, cook, and save safely",
    dek: "Keep food safety part of the recipe routine, especially with raw foods and leftovers.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Separate the jobs",
        paragraphs: [
          "Start with clean hands and surfaces. Keep raw animal foods and their utensils away from ready-to-eat foods, then clean the workspace before moving on to the next task.",
        ],
      },
      {
        heading: "Make storage part of the plan",
        paragraphs: [
          "Follow package and local food-safety guidance for cooking and storage. Refrigerate perishable leftovers promptly in practical portions so a future meal stays easy to use.",
        ],
      },
      {
        heading: "Use a simple safety sequence",
        paragraphs: [
          "Food-safety habits are part of flexible cooking because they reduce avoidable uncertainty around raw ingredients, cooked food, and storage. A short sequence—clean, separate, cook, and chill—can help organize the work without turning a meal into a test.",
          "Use current package instructions and local public-health guidance for foods that need specific handling. When there is uncertainty about storage, cooking, allergies, pregnancy, immune concerns, or individualized dietary directions, pause and seek guidance from an appropriate qualified professional or public-health source.",
        ],
        bullets: [
          "Wash hands and clean surfaces before and after handling raw ingredients.",
          "Use separate utensils or boards for raw animal foods and ready-to-eat foods, then clean them before reuse.",
          "Label leftovers with the date and refrigerate or freeze them promptly according to current food-safety guidance.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal.",
          "For prep, cook, and save safely, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before your next cooking session, set up a clean preparation area, identify anything that must stay separate, and choose a storage plan that follows current package or local public-health guidance. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Browse recipe ideas",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["leftovers-by-design", "recipe-template"],
    review: medicalEducationReview,
    safety: {
      heading: "Food safety first",
      body: "This is general education, not individualized food-safety advice. Follow current package and local public-health guidance, especially for pregnancy, immune concerns, allergies, or a qualified health professional’s dietary directions.",
      review: medicalEducationReview,
    },
  },
  {
    id: "serving-size-reality-check",
    imageAssetKey: "serving-size-reality-check",
    title: "Check the serving-size context",
    dek: "See what a label describes before comparing the numbers on it.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 3,
    icon: "pie-chart",
    accent: "info",
    sections: [
      {
        heading: "Read the package setup",
        paragraphs: [
          "Nutrition information is listed for a stated serving amount, and a package can contain more than one serving. The label describes that setup; it is not an instruction about how much you must eat.",
        ],
      },
      {
        heading: "Compare like with like",
        paragraphs: [
          "When you compare two products, look at their serving information first. It can explain why two numbers that look similar actually describe different amounts of food.",
        ],
      },
      {
        heading:
          "Put the serving information beside the amount you expect to use",
        paragraphs: [
          "Serving information helps describe the numbers on a package, while your actual portion may be smaller, larger, or different from the listed amount. Looking at both can clarify what the label is describing without turning the listed serving into a requirement.",
          "This context is especially useful when a package is likely to be shared, used across several meals, or added as one ingredient in a larger dish. The goal is understanding the package setup, not finding a correct amount for everyone.",
        ],
        bullets: [
          "Check whether the package contains one serving or several.",
          "Notice whether the listed serving resembles the amount you expect to use.",
          "When comparing products, compare amounts described on a similar basis.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number.",
          "For check the serving-size context, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose a package you already plan to use, note its serving setup, and briefly describe how that setup relates to the amount you expect to use. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Explore recipes",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["read-nutrition-facts", "ingredient-list-first"],
    review: editorialReview,
  },
  {
    id: "compare-with-percent-daily-value",
    imageAssetKey: "compare-with-percent-daily-value",
    title: "Compare labels with % Daily Value",
    dek: "Use one label tool to compare similar products—not to rank your whole diet.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 3,
    icon: "activity",
    accent: "primary",
    sections: [
      {
        heading: "Choose one reason to compare",
        paragraphs: [
          "Percent Daily Value can help you compare similar products on the same serving basis. You might look at fiber, sodium, added sugars, or another detail that matters for the choice in front of you.",
        ],
      },
      {
        heading: "Keep the comparison small",
        paragraphs: [
          "One number cannot tell the whole story of a food or a meal. Use the label alongside taste, price, ingredients, access, and how you plan to use the product.",
        ],
      },
      {
        heading: "Use one comparison, then zoom back out",
        paragraphs: [
          "Percent Daily Value can provide a common reference when similar products use the same serving basis. It is one way to organize a comparison, not a complete description of the food or a score for the meal.",
          "After checking the detail that prompted your comparison, return to the wider decision. Ingredients, flavor, cost, access, preparation, and personal preferences may all be relevant, and no single number needs to settle the choice.",
        ],
        bullets: [
          "Select one nutrient or label detail before comparing.",
          "Confirm that the serving information is comparable.",
          "Name one non-label factor that also matters for the decision.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number.",
          "For compare labels with % daily value, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Compare two similar products on one % Daily Value detail after checking their serving basis, then record one non-number factor you want to consider. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Browse recipe ideas",
      route: "/(tabs)/recipes",
      feature: "recipes",
    },
    relatedLessonIds: ["read-nutrition-facts", "serving-size-reality-check"],
    review: editorialReview,
  },
  {
    id: "allergen-and-ingredient-scan",
    imageAssetKey: "allergen-and-ingredient-scan",
    title: "Scan ingredients with a purpose",
    dek: "Use package details for an ingredient or preference you actually need to check.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 3,
    icon: "tag",
    accent: "success",
    sections: [
      {
        heading: "Start with your question",
        paragraphs: [
          "You might read an ingredient list to compare flavors, find an ingredient you avoid, or understand what a packaged item contains. A focused question keeps the label useful instead of overwhelming.",
        ],
      },
      {
        heading: "Use the full package information",
        paragraphs: [
          "Ingredient order, allergen statements, and preparation instructions each offer different information. Front-of-package phrases can be useful prompts, but they do not replace the full label.",
        ],
      },
      {
        heading: "Make the scan specific and repeatable",
        paragraphs: [
          "A focused label scan can help when you need to check an ingredient, an allergen statement, or preparation information. Looking at the full package information is more useful than relying only on a front-of-package phrase, especially when the same product may be purchased again in a different size or version.",
          "For a recurring concern, create a calm routine for checking the package each time rather than assuming a familiar product has unchanged information. A label can inform a choice, while individualized allergy or dietary guidance belongs with a qualified professional.",
        ],
        bullets: [
          "Check the ingredient list and the allergen statement separately.",
          "Look for package-version or preparation details that affect your question.",
          "If the information is unclear, set the product aside while you seek clarification from an appropriate source.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number.",
          "For scan ingredients with a purpose, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For one packaged food, check the ingredient list, allergen statement, and relevant preparation directions in that order, then note what remains clear or needs clarification. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["ingredient-list-first", "read-nutrition-facts"],
    review: editorialReview,
  },
  {
    id: "anchor-one-small-action",
    imageAssetKey: "anchor-one-small-action",
    title: "Anchor one small action",
    dek: "Attach a useful action to a stable part of your day instead of relying on willpower.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 3,
    icon: "sun",
    accent: "success",
    sections: [
      {
        heading: "Choose the smallest useful version",
        paragraphs: [
          "A habit can begin with filling a bottle, checking a grocery note, saving one recipe, or setting out tomorrow’s breakfast item. The first version should feel possible on an ordinary day.",
        ],
      },
      {
        heading: "Give it a dependable home",
        paragraphs: [
          "Pair the action with something that already happens in the same place or time. Repetition can make a cue easier to notice, but a missed day is simply information about the setup.",
        ],
      },
      {
        heading: "Let the anchor travel with you",
        paragraphs: [
          "An anchor can be a flexible connection rather than a fixed clock time. Linking an action to breakfast, arriving at work, opening a planner, or another recurring event may help it remain recognizable when the schedule is different.",
          "The action can also change form while keeping the same purpose. A full preparation step might become a quick note, a shorter check-in, or simply gathering what will be needed later.",
        ],
        bullets: [
          "Choose an event that happens often enough to notice.",
          "Define a shorter version for rushed moments.",
          "Keep the purpose of the action separate from one exact method.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan.",
          "For anchor one small action, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Pick one recurring event, write a full and a shorter version of the same useful action, and try whichever version fits the next occurrence. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "hydration-check-in"],
    review: editorialReview,
  },
  {
    id: "make-the-plan-easier-to-do",
    imageAssetKey: "make-the-plan-easier-to-do",
    title: "Make the plan easier to do",
    dek: "Remove one point of friction before expecting yourself to follow through.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 3,
    icon: "layers",
    accent: "primary",
    sections: [
      {
        heading: "Look for the friction",
        paragraphs: [
          "A routine can be difficult because the item is out of sight, the action takes too long, the timing is awkward, or the first step is unclear. That is a setup problem you can experiment with.",
        ],
      },
      {
        heading: "Design a backup cue",
        paragraphs: [
          "Choose a simple if–then option for days when the first cue disappears. A second cue, an easier version, or a ready-to-use item can keep a routine flexible.",
        ],
      },
      {
        heading: "Reduce the first decision",
        paragraphs: [
          "Friction often appears before an action begins: deciding what to use, finding an item, or working out the first step. Preparing one small choice in advance can leave more attention for the rest of the day and make a plan feel less demanding.",
          "Reducing friction is not the same as making a rigid system. You can keep several acceptable options, change the setup when it stops helping, and use a backup that matches your access and energy.",
        ],
        bullets: [
          "Put one needed item in an easy-to-see place.",
          "Write the next step in plain, brief language.",
          "Keep an alternate option that uses fewer steps.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan.",
          "For make the plan easier to do, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Before a routine you want to support, remove one decision from its first minute and leave yourself an easy alternate if the original setup is unavailable. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: {
      label: "Open weekly planner",
      route: "/(tabs)/planner",
      feature: "planner",
    },
    relatedLessonIds: ["kind-feedback-loop", "busy-day-backup"],
    review: editorialReview,
  },
  {
    id: "notice-progress-without-perfection",
    imageAssetKey: "notice-progress-without-perfection",
    title: "Notice progress without perfection",
    dek: "Use a simple private check-in to learn what supports a routine.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 3,
    icon: "bookmark",
    accent: "info",
    sections: [
      {
        heading: "Track one useful signal",
        paragraphs: [
          "A checkmark, a short note, or a reminder can show you when an action was easy, missed, or adapted. The purpose is to see patterns, not to create a streak you are afraid to break.",
        ],
      },
      {
        heading: "Review with kindness",
        paragraphs: [
          "At the end of a few days, ask what helped, what got in the way, and whether the action should stay, shrink, move, or change. Support from a trusted person can be optional, not required.",
        ],
      },
      {
        heading: "Review the pattern, not the score",
        paragraphs: [
          "A private record can show more than whether an action happened. You might notice that it was easier after a particular cue, harder during a demanding part of the day, or more workable when you used a smaller version.",
          "Looking at those conditions keeps reflection connected to learning rather than comparison. If tracking starts to feel pressuring or distracting, you can stop, shorten the record, or use a less formal way to notice what supports you.",
        ],
        bullets: [
          "Record one context alongside the action when useful.",
          "Look for supports and obstacles rather than streak length.",
          "Change or pause the tracking method if it adds pressure.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan.",
          "For notice progress without perfection, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For a few suitable days, note whether the action felt easy, neutral, or difficult and add one brief context detail; review only for a pattern that could inform your next step. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "anchor-one-small-action"],
    review: editorialReview,
  },
  {
    id: "fasting-defined-without-hype",
    imageAssetKey: "fasting-defined-without-hype",
    title: "Define fasting without hype",
    dek: "Meal timing is one optional pattern, not a measure of discipline or health.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 4,
    icon: "clock",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Understand the choice",
        paragraphs: [
          "Fasting describes planned time without caloric intake, but people use the word for very different patterns. It is not required for nourishment, and a longer or stricter window is not automatically better.",
        ],
      },
      {
        heading: "Observe before changing",
        paragraphs: [
          "You can notice your ordinary meal timing, work, sleep, social meals, hunger, and energy without changing anything. That observation may show that no new fasting routine is needed.",
        ],
      },
      {
        heading: "Separate observation from claims",
        paragraphs: [
          "Descriptions of fasting can sound persuasive when they connect a timing pattern with broad promises. General information cannot establish what a particular routine will do for your body, mood, energy, or relationship with food.",
          "Observation can be more useful than adopting a label. You can notice when you usually eat, how the timing fits your responsibilities, and whether outside messages are creating pressure, without treating any pattern as a test of discipline.",
        ],
        bullets: [
          "Write down the practical reason a timing pattern interests you, if there is one.",
          "Separate your own observations from claims made in posts, plans, or conversations.",
          "Ask whether the same goal could be supported by a less restrictive routine or no timing change.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes.",
          "For define fasting without hype, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For one ordinary day, note your eating rhythm and the reason you are considering fasting, without lengthening gaps, compensating, or rating the day. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Open Fasting", route: "/fasting", feature: "fasting" },
    relatedLessonIds: [
      "fasting-basics-and-boundaries",
      "fasting-pause-signals",
    ],
    review: medicalEducationReview,
    safety: {
      heading: "Optional, not universal",
      body: "Fasting is not suitable for everyone. If you have a medical condition, take medication affected by meals, are pregnant or breastfeeding, are under 18, or have a history of disordered eating, consult a qualified health professional before changing meal timing.",
      review: medicalEducationReview,
    },
  },
  {
    id: "fasting-and-real-life",
    imageAssetKey: "fasting-and-real-life",
    title: "Keep fasting flexible in real life",
    dek: "A social meal, shift change, or hungry day is information—not a reason to push through.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 3,
    icon: "calendar",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Routines must fit the day",
        paragraphs: [
          "Work, travel, caregiving, celebrations, sleep changes, and access to food can all shape when eating feels practical. A routine that cannot flex may create more stress than support.",
        ],
      },
      {
        heading: "Keep nourishment ordinary",
        paragraphs: [
          "Choosing to eat outside a plan does not require a correction later. Return to your next regular meal or snack when it makes sense, and keep drinks and daily needs in view.",
        ],
      },
      {
        heading: "Plan for interruptions",
        paragraphs: [
          "Real routines include celebrations, travel, shift changes, illness, caregiving, and days when food is available at an unexpected time. A timing plan that has no room for these events can turn normal life into a source of pressure.",
          "Planning an interruption is not planning to fail. It is deciding in advance that flexibility is part of the routine and that eating outside a planned window does not call for punishment or correction.",
        ],
        bullets: [
          "Identify one upcoming event that may change when food is available.",
          "Choose a neutral response, such as eating when it makes sense or returning to your usual pattern later.",
          "Keep the plan separate from moral labels like success, failure, good, or bad.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes.",
          "For keep fasting flexible in real life, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one upcoming schedule change and write a flexible response that prioritizes your needs without requiring a later restriction or correction. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Open Fasting", route: "/fasting", feature: "fasting" },
    relatedLessonIds: ["fasting-pause-signals", "week-with-one-anchor"],
    review: medicalEducationReview,
    safety: {
      heading: "Do not push through symptoms",
      body: "This general education lesson cannot assess whether fasting is safe for you. End a fasting plan and seek a qualified health professional’s advice if it feels physically or emotionally unsafe, especially with ongoing dizziness, fainting, or medication questions.",
      review: medicalEducationReview,
    },
  },
  {
    id: "fasting-personal-guidance",
    imageAssetKey: "fasting-personal-guidance",
    title: "Know when to get personal guidance",
    dek: "Some questions about meal timing belong with a clinician, not an app timer.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 3,
    icon: "book-open",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Bring the whole context",
        paragraphs: [
          "Medication schedules, health conditions, pregnancy or breastfeeding, injury, eating concerns, and changing energy needs can make meal timing more personal. A general guide cannot account for those details.",
        ],
      },
      {
        heading: "Ask a practical question",
        paragraphs: [
          "If you seek guidance, ask how meal timing interacts with your existing care, medication, sleep, activity, and daily responsibilities. The safest plan may be a different pattern—or no fasting plan at all.",
        ],
      },
      {
        heading: "Prepare for a useful conversation",
        paragraphs: [
          "Questions about meal timing are easier to discuss when they include the wider context. A qualified professional may need to understand health conditions, medicines, pregnancy or breastfeeding, eating concerns, activity, sleep, and day-to-day responsibilities.",
          "You do not need to arrive with a decision already made. The purpose of a conversation can be to understand whether a timing change is relevant at all, what questions apply to your situation, and whether another approach would be more appropriate.",
        ],
        bullets: [
          "Write down the timing change you are considering and what prompted the question.",
          "Bring relevant questions about medicines, existing care, symptoms, eating concerns, and daily responsibilities.",
          "Be open to guidance that keeps your current routine, changes it, or recommends no fasting plan.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes.",
          "For know when to get personal guidance, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Draft two questions about how meal timing might interact with your health context or medicines, and take them to a qualified professional instead of testing the change alone. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Open Fasting", route: "/fasting", feature: "fasting" },
    relatedLessonIds: [
      "fasting-basics-and-boundaries",
      "fasting-defined-without-hype",
    ],
    review: medicalEducationReview,
    safety: {
      heading: "Individual advice matters",
      body: "Do not use this lesson to change medication, manage a condition, or start a restrictive eating pattern. Consult a qualified health professional for individualized guidance before changing meal timing when health factors apply.",
      review: medicalEducationReview,
    },
  },
  {
    id: "hot-and-active-day-hydration",
    imageAssetKey: "hot-and-active-day-hydration",
    title: "Match drinks to a hot or active day",
    dek: "Plan easy access to fluids when heat, activity, or illness changes the usual routine.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 3,
    icon: "sun",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Context changes the routine",
        paragraphs: [
          "Heat, prolonged activity, sweating, fever, vomiting, and diarrhea can change how prepared you feel with drinks. A helpful plan is about access and regular check-ins, not a universal bottle count.",
        ],
      },
      {
        heading: "Set up the next interval",
        paragraphs: [
          "Before a hot commute, an active errand, or time outdoors, choose where a drink will be available and when you can pause. Start again at the next opportunity if a plan changes.",
        ],
      },
      {
        heading: "Prepare for changing conditions",
        paragraphs: [
          "Heat, exertion, and illness can make a familiar routine feel different. Preparation can focus on shade or cooling, access to preferred fluids, and opportunities to pause, while recognizing that individual needs are not the same.",
          "If symptoms or illness are part of the picture, general tips are not a substitute for individualized advice. Keep the plan adaptable and use qualified guidance when health conditions, medicines, or ongoing symptoms affect fluid decisions.",
        ],
        bullets: [
          "Check where fluids and a cooler or shaded break will be available before going out.",
          "Allow extra opportunities to pause during prolonged heat or activity.",
          "If vomiting, diarrhea, fever, or concerning symptoms are present, prioritize appropriate professional guidance over experimenting alone.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day.",
          "For match drinks to a hot or active day, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "For one upcoming hot or active period, note your drink-access point, a cooling break, and the person or service you would contact if symptoms become concerning. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "hydration-on-busy-days"],
    review: medicalEducationReview,
    safety: {
      heading: "Needs can be personal",
      body: "This is general education, not a fluid prescription. If you have heart, kidney, or other health concerns, take medicines that affect fluid balance, or have ongoing illness, ask a qualified health professional about fluids and activity.",
      review: medicalEducationReview,
    },
  },
  {
    id: "recognize-dehydration-signals",
    imageAssetKey: "recognize-dehydration-signals",
    title: "Recognize when to check in",
    dek: "Notice concerning dehydration signals without trying to diagnose yourself from a single cue.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 3,
    icon: "droplet",
    accent: "warning",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Look at the bigger picture",
        paragraphs: [
          "Thirst, dry mouth, fatigue, dizziness, less frequent urination, or darker urine can be reasons to pause and consider fluids, heat, activity, and illness. One sign alone cannot diagnose dehydration.",
        ],
      },
      {
        heading: "Choose a safer next step",
        paragraphs: [
          "Move to a cooler setting if heat is involved, take a break, and seek help when symptoms are concerning, persistent, or make it hard to keep fluids down. An app lesson should not replace assessment.",
        ],
      },
      {
        heading: "Treat symptoms as information, not a diagnosis",
        paragraphs: [
          "Thirst, dry mouth, tiredness, dizziness, changes in urination, and darker urine can have more than one explanation. Consider the wider context, including heat, activity, illness, and how long the change has lasted, instead of relying on one sign.",
          "When symptoms are persistent, worsening, severe, or make it difficult to keep fluids down, a qualified health professional can help determine the safer next step. Serious symptoms should not be managed by an app lesson alone.",
        ],
        bullets: [
          "Pause and move somewhere cooler when heat may be contributing.",
          "Tell a trusted person if symptoms feel concerning or you are alone.",
          "Seek urgent help for confusion, fainting, difficulty breathing, severe weakness, or inability to keep fluids down.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day.",
          "For recognize when to check in, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Save one trusted contact or local service now, and use it for guidance if heat- or illness-related symptoms become persistent, severe, or difficult to manage. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "hot-and-active-day-hydration"],
    review: medicalEducationReview,
    safety: {
      heading: "Get urgent help for serious symptoms",
      body: "Confusion, fainting, difficulty breathing, severe weakness, or inability to keep fluids down may need urgent care. Seek a qualified health professional’s guidance for persistent symptoms or personal fluid needs.",
      review: medicalEducationReview,
    },
  },
  {
    id: "movement-snacks",
    imageAssetKey: "movement-snacks",
    title: "Make room for movement snacks",
    dek: "A few comfortable minutes can fit between the larger parts of a real day.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 3,
    icon: "activity",
    accent: "success",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Short bouts still count",
        paragraphs: [
          "Walking, wheeling, gentle mobility, standing, chores, dancing, and other everyday movement can be divided across a day. You do not need a full workout block for a movement choice to be meaningful.",
        ],
      },
      {
        heading: "Choose comfort and access",
        paragraphs: [
          "Pick an option that suits your space, energy, ability, and surroundings. A brief change of position or an accessible route can be enough for today.",
        ],
      },
      {
        heading: "Build a menu of small movement moments",
        paragraphs: [
          "Short bouts can be placed around the shape of a day: a few minutes of walking, wheeling, stretching, standing, household movement, or comfortable mobility may be easier to access than one uninterrupted block. Different forms can serve different spaces, abilities, and energy levels.",
          "A movement snack is an invitation, not a prescribed dose. Keeping the choice brief and adjustable can help it remain compatible with work, study, caregiving, weather, and rest.",
        ],
        bullets: [
          "Choose one cue, such as a break, transition, or waiting period, where a brief option might fit.",
          "Prepare two versions, such as a seated option and a route-based option, so access can guide the choice.",
          "Stop, slow down, or switch to rest whenever the option no longer feels comfortable.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure.",
          "For make room for movement snacks, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Pick one predictable cue today, try a brief movement option at a comfortable pace, and decide in the moment whether to continue, adapt, or rest. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "recovery-is-part-of-routine"],
    review: medicalEducationReview,
    safety: {
      heading: "Start gently",
      body: "Adapt movement to your ability and current health. Stop for pain, dizziness, feeling unwell, chest pressure, fainting, or severe shortness of breath, and seek guidance from a qualified health professional when needed.",
      review: medicalEducationReview,
    },
  },
  {
    id: "build-a-balanced-movement-week",
    imageAssetKey: "build-a-balanced-movement-week",
    title: "Build a flexible movement week",
    dek: "Mix options you enjoy with recovery instead of copying an idealized workout plan.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 4,
    icon: "calendar",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Create a menu, not a mandate",
        paragraphs: [
          "A week can include aerobic activity, strengthening, mobility, play, active travel, household movement, and rest. Listing a few options lets you choose what suits a particular day instead of treating one format as required.",
        ],
      },
      {
        heading: "Leave room to adjust",
        paragraphs: [
          "Energy, weather, work, caregiving, injury, and access can all change a plan. Replacing, shortening, or resting is an adjustment—not a failed week.",
        ],
      },
      {
        heading: "Arrange a week that can change",
        paragraphs: [
          "A flexible week can hold several kinds of activity alongside recovery: everyday movement, aerobic options, strengthening, mobility, play, active travel, or rest. The mix will depend on interests, access, experience, health, time, and the demands of the week, so a useful plan leaves more than one route forward.",
          "Instead of measuring success by completing a fixed schedule, make a short menu and identify how it can be adjusted. A plan that can be shortened, moved, replaced, or paused is better suited to changing energy and circumstances.",
        ],
        bullets: [
          "List two movement options with different time, space, or effort demands.",
          "Add at least one recovery choice and one fallback for weather, pain, schedule changes, or limited access.",
          "Review the plan after the week by noting what felt supportive, not by assigning a pass-or-fail score.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure.",
          "For build a flexible movement week, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Sketch a flexible week with two personally accessible movement options, a recovery option, and a fallback; use it as a menu and adjust it as circumstances change. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "recovery-is-part-of-routine"],
    review: medicalEducationReview,
    safety: {
      heading: "Personalize intensity",
      body: "This lesson does not prescribe exercise. If you have symptoms, a recent injury or surgery, a health condition, pregnancy or postpartum concerns, or questions about activity, consult a qualified health professional before making substantial changes.",
      review: medicalEducationReview,
    },
  },
  {
    id: "steady-sleep-window",
    imageAssetKey: "steady-sleep-window",
    title: "Build a steadier sleep window",
    dek: "Use a realistic wake-time anchor to make nights and mornings more predictable.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 3,
    icon: "moon",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Start with a realistic anchor",
        paragraphs: [
          "A repeatable wake time can give a day some structure, even when bedtime shifts. The aim is a steadier rhythm that respects work, caregiving, travel, and the fact that some nights do not go as planned.",
        ],
      },
      {
        heading: "Protect the opportunity, not perfection",
        paragraphs: [
          "Give yourself enough room for rest when you can, then return to the next helpful cue after a disrupted night. A single short night does not require a strict correction the next day.",
        ],
      },
      {
        heading: "Use anchors without forcing a timetable",
        paragraphs: [
          "A repeated wake-time cue can add structure, but the useful anchor is the one that fits your responsibilities and can be adjusted when circumstances change. Sleep opportunity is also shaped by when the day ends, so notice whether the plan leaves reasonable room for rest rather than chasing a precise schedule.",
          "If an anchor creates pressure or conflicts with care, work, travel, or recovery, that is information about the setup. A gentler version may be more appropriate, and persistent or safety-affecting concerns belong with qualified professional support rather than self-experimentation.",
        ],
        bullets: [
          "Choose a morning cue that is realistic for the days you are considering.",
          "Notice whether the evening leaves enough space for rest without assigning a universal target.",
          "Review the plan after disruptions and adjust it instead of compensating harshly.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection.",
          "For build a steadier sleep window, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Test one realistic morning cue for a few days, note whether it fits your life and leaves room for rest, and revise it without forcing a fixed target. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["gentle-evening-reset", "sleep-and-food-rhythm"],
    review: medicalEducationReview,
    safety: {
      heading: "Sleep concerns deserve support",
      body: "This lesson is general education, not diagnosis or treatment. Do not drive or operate equipment when drowsy, and talk with a qualified health professional about persistent, severe, or safety-affecting sleep concerns.",
      review: medicalEducationReview,
    },
  },
  {
    id: "shape-a-calmer-sleep-runway",
    imageAssetKey: "shape-a-calmer-sleep-runway",
    title: "Shape a calmer sleep runway",
    dek: "Use a short pre-bed transition and a supportive space without chasing a perfect routine.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 3,
    icon: "moon",
    accent: "success",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Choose one transition",
        paragraphs: [
          "A short wind-down can be dimming screens, doing a quiet activity, preparing one item for morning, or making the room feel calmer. Choose a version that fits your household and does not turn rest into another task to perform.",
        ],
      },
      {
        heading: "Let the environment help",
        paragraphs: [
          "A dark, quiet, and comfortable space may be useful when it is available, but no room needs to be perfect. Small changes such as a routine light cue or a consistent place for devices can be enough.",
        ],
      },
      {
        heading: "Reduce stimulation in the space you have",
        paragraphs: [
          "A calmer sleep setting can come from small environmental choices rather than a complete room makeover. Light, noise, temperature, comfort, and device placement may each affect how easy it feels to shift into rest, but their importance varies across people and homes.",
          "Treat the environment as an invitation, not a requirement. If a change is unavailable or unhelpful, keep the part that supports comfort and let the rest go; a routine cannot diagnose or treat an underlying sleep problem.",
        ],
        bullets: [
          "Identify one source of light, noise, heat, or interruption that you can reasonably change.",
          "Place one frequently used item where it is easy to reach without adding extra decisions.",
          "Keep a quieter or lower-stimulation alternative ready for nights when the usual setup is not possible.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection.",
          "For shape a calmer sleep runway, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Choose one small change to make your sleep space more comfortable or less stimulating, then keep it only if it feels practical and calming. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["gentle-evening-reset", "steady-sleep-window"],
    review: medicalEducationReview,
    safety: {
      heading: "Keep expectations gentle",
      body: "A wind-down routine cannot diagnose or treat a sleep condition. If sleep problems persist, breathing concerns occur, or daytime sleepiness affects safety, seek a qualified health professional’s guidance.",
      review: medicalEducationReview,
    },
  },
  {
    id: "turn-not-yet-into-next-step",
    imageAssetKey: "turn-not-yet-into-next-step",
    title: "Turn ‘not yet’ into a next step",
    dek: "Make a challenge specific enough to practice instead of using it as a verdict about yourself.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 3,
    icon: "check-circle",
    accent: "success",
    sections: [
      {
        heading: "Name the skill, not your worth",
        paragraphs: [
          "A difficult routine can reflect missing time, tools, support, practice, or a strategy that does not fit. Reframing the problem as a skill or setup question leaves room to learn without promising that effort alone solves everything.",
        ],
      },
      {
        heading: "Practice a five-minute version",
        paragraphs: [
          "Choose a next action that is small enough to try: save one recipe, prepare one ingredient, write one reminder, or ask one person for help. You can revise the step when you learn more.",
        ],
      },
      {
        heading: "Match the step to the moment",
        paragraphs: [
          "A next step is easier to approach when it matches the time, energy, tools, and support available right now. The smallest useful version may be different on a busy day than on a day with more room.",
          "Choosing a smaller version is not a statement about ability. It is a way to gather information about what is workable, then decide whether to repeat it, adapt it, or ask for help.",
        ],
        bullets: [
          "Name the time and place where the step could happen.",
          "Remove one barrier by preparing an item, shortening the task, or changing the cue.",
          "Decide in advance what a workable smaller version could look like.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict.",
          "For turn ‘not yet’ into a next step, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "Write one ‘not yet’ statement, then choose a version that fits the next available five minutes and leave yourself permission to revise it afterward. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["make-goals-flexible", "kind-check-in"],
    review: editorialReview,
  },
  {
    id: "pause-notice-choose",
    imageAssetKey: "pause-notice-choose",
    title: "Pause, notice, choose",
    dek: "A short nonjudgmental pause can make room for one supportive next action.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 3,
    icon: "heart",
    accent: "info",
    medicalAdjacent: true,
    sections: [
      {
        heading: "Notice without solving everything",
        paragraphs: [
          "For a moment, notice what you can sense, name a feeling if you want to, and acknowledge the situation without grading it. The goal is awareness, not a perfect calm state.",
        ],
      },
      {
        heading: "Choose one gentle response",
        paragraphs: [
          "A next action might be a pause, a glass of water, a short walk, a note, a meal plan change, or reaching out to someone trusted. If a practice feels more distressing than helpful, choose a different support.",
        ],
      },
      {
        heading: "Make the pause feel safe enough",
        paragraphs: [
          "A pause does not have to be silent, formal, or perfectly calm. Looking around the room, placing both feet on the floor, taking a sip, writing a few words, or contacting someone trusted can all create a little space before the next choice.",
          "The purpose is to notice enough to choose—not to force a particular feeling. If attention inward feels uncomfortable, an outward-focused or social support may be a better fit.",
        ],
        bullets: [
          "Choose a pause method that feels familiar and easy to stop.",
          "Name one immediate need or practical constraint without judging it.",
          "Select the gentlest available next action, including doing nothing for the moment or reaching out.",
        ],
      },
      {
        heading: "Make it work in your context",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict.",
          "For pause, notice, choose, the useful question is not whether one approach is universally right. Notice the setting, ingredients, time, access, and feedback that shape this choice, then keep the part that makes the idea easier to use in a real week.",
        ],
        bullets: [
          "Start with the smallest version that still feels useful and easy to repeat.",
          "Adjust the idea for your culture, budget, schedule, preferences, and available support.",
          "Review the result with curiosity and change one detail rather than abandoning the whole approach.",
        ],
      },
    ],
    tryThis:
      "At a manageable moment, try a brief pause using one grounding or outward-focused cue, name one immediate need, and choose the next small action only if the pause feels supportive. If the first version feels awkward, make the next version smaller, more familiar, or easier to access before deciding whether the idea belongs in your routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-check-in", "food-mood-observations"],
    review: medicalEducationReview,
    safety: {
      heading: "Support is available",
      body: "This general education exercise is not mental-health treatment. Stop if it increases distress, use another support, and contact a qualified health professional or local urgent service if mood or safety concerns interfere with daily life.",
      review: medicalEducationReview,
    },
  },
  {
    id: "food-variety-in-practice",
    imageAssetKey: "food-variety-in-practice",
    title: "Variety without rules",
    dek: "A broader view of variety that leaves room for culture, budget, and preference.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 4,
    icon: "pie-chart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Variety without rules can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. A broader view of variety that leaves room for culture, budget, and preference.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["balanced-plate-basics", "calories-are-context"],
    review: editorialReview,
  },
  {
    id: "satisfaction-and-staying-power",
    imageAssetKey: "satisfaction-and-staying-power",
    title: "Make a meal satisfying",
    dek: "Use taste, texture, and staying power to understand what helps a meal work.",
    topic: "Fundamentals",
    collectionId: "nutrition-foundations",
    readingMinutes: 4,
    icon: "pie-chart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Make a meal satisfying can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use taste, texture, and staying power to understand what helps a meal work.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Use the idea as a flexible lens for noticing nourishment, satisfaction, and variety rather than as a scorecard. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["balanced-plate-basics", "calories-are-context"],
    review: editorialReview,
  },
  {
    id: "plan-for-real-energy",
    imageAssetKey: "plan-for-real-energy",
    title: "Plan for your available energy",
    dek: "Build options that match the energy and time you actually have.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 4,
    icon: "calendar",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Plan for your available energy can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Build options that match the energy and time you actually have.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["week-with-one-anchor", "shopping-list-scaffold"],
    review: editorialReview,
  },
  {
    id: "flexible-meal-rhythm",
    imageAssetKey: "flexible-meal-rhythm",
    title: "Create a flexible meal rhythm",
    dek: "Use gentle anchors without making a schedule more rigid than life allows.",
    topic: "Planning",
    collectionId: "plan-with-less-pressure",
    readingMinutes: 4,
    icon: "calendar",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Create a flexible meal rhythm can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use gentle anchors without making a schedule more rigid than life allows.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the plan small enough to survive a busy day, and use prepared, frozen, canned, or repeated options when they reduce effort. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["week-with-one-anchor", "shopping-list-scaffold"],
    review: editorialReview,
  },
  {
    id: "cook-with-what-you-have",
    imageAssetKey: "cook-with-what-you-have",
    title: "Cook with what you have",
    dek: "Turn the ingredients already around you into a useful starting point.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Cook with what you have can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Turn the ingredients already around you into a useful starting point.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["recipe-template", "leftovers-by-design"],
    review: editorialReview,
  },
  {
    id: "flavor-without-perfection",
    imageAssetKey: "flavor-without-perfection",
    title: "Build flavor without perfection",
    dek: "Use simple flavor choices to make practical meals more enjoyable.",
    topic: "Recipes",
    collectionId: "cook-with-flexibility",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Build flavor without perfection can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use simple flavor choices to make practical meals more enjoyable.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Treat the recipe as a starting point that can change with ingredients, equipment, culture, appetite, and the people sharing the meal. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["recipe-template", "leftovers-by-design"],
    review: editorialReview,
  },
  {
    id: "marketing-language-with-context",
    imageAssetKey: "marketing-language-with-context",
    title: "Look past marketing language",
    dek: "Separate persuasive packaging language from the details that support your choice.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 4,
    icon: "tag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Look past marketing language can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Separate persuasive packaging language from the details that support your choice.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-nutrition-facts", "ingredient-list-first"],
    review: editorialReview,
  },
  {
    id: "label-comparisons-made-simple",
    imageAssetKey: "label-comparisons-made-simple",
    title: "Compare labels simply",
    dek: "Choose the few label details that matter for the decision in front of you.",
    topic: "Labels",
    collectionId: "labels-with-context",
    readingMinutes: 4,
    icon: "tag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Compare labels simply can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Choose the few label details that matter for the decision in front of you.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Read the information in context, checking serving details and the decision you are actually trying to make instead of chasing a perfect number. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-nutrition-facts", "ingredient-list-first"],
    review: editorialReview,
  },
  {
    id: "restart-without-resetting",
    imageAssetKey: "restart-without-resetting",
    title: "Restart without starting over",
    dek: "Use a missed day as information rather than proof that a routine failed.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 4,
    icon: "repeat",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Restart without starting over can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use a missed day as information rather than proof that a routine failed.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "environment-design",
    imageAssetKey: "environment-design",
    title: "Design your environment kindly",
    dek: "Make the helpful option easier to notice without relying on willpower alone.",
    topic: "Habits",
    collectionId: "habits-that-fit",
    readingMinutes: 4,
    icon: "repeat",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Design your environment kindly can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Make the helpful option easier to notice without relying on willpower alone.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Design the next step around an existing cue and make it forgiving enough to continue when the day does not follow the plan. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "fasting-and-medications",
    imageAssetKey: "fasting-and-medications",
    title: "Fasting and individualized needs",
    dek: "Keep medication, health conditions, and professional guidance ahead of a fasting plan.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 4,
    icon: "clock",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Fasting and individualized needs can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Keep medication, health conditions, and professional guidance ahead of a fasting plan.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fasting-basics-and-boundaries", "fasting-pause-signals"],
    review: editorialReview,
  },
  {
    id: "ending-a-fast-comfortably",
    imageAssetKey: "ending-a-fast-comfortably",
    title: "End a fasting window comfortably",
    dek: "Return to eating with attention to comfort, appetite, and personal context.",
    topic: "Fasting",
    collectionId: "meal-timing-basics",
    readingMinutes: 4,
    icon: "clock",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "End a fasting window comfortably can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Return to eating with attention to comfort, appetite, and personal context.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep personal comfort, medication needs, energy, and professional guidance ahead of a rigid schedule or a promise about outcomes. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fasting-basics-and-boundaries", "fasting-pause-signals"],
    review: editorialReview,
  },
  {
    id: "fluid-rich-foods",
    imageAssetKey: "fluid-rich-foods",
    title: "Find fluids in food",
    dek: "Notice soups, fruit, vegetables, and other foods that contribute fluid.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 4,
    icon: "droplet",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Find fluids in food can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Notice soups, fruit, vegetables, and other foods that contribute fluid.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "drinks-that-fit-your-day"],
    review: editorialReview,
  },
  {
    id: "hydration-cues-at-home",
    imageAssetKey: "hydration-cues-at-home",
    title: "Place hydration cues at home",
    dek: "Use visible, convenient reminders that support drinking without pressure.",
    topic: "Hydration",
    collectionId: "hydration-everyday",
    readingMinutes: 4,
    icon: "droplet",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Place hydration cues at home can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use visible, convenient reminders that support drinking without pressure.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Use ordinary routines and varied drinks or fluid-rich foods as reminders, while allowing needs and preferences to change from day to day. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "drinks-that-fit-your-day"],
    review: editorialReview,
  },
  {
    id: "accessible-movement-options",
    imageAssetKey: "accessible-movement-options",
    title: "Find accessible movement",
    dek: "Explore movement options that fit ability, space, equipment, and energy.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 4,
    icon: "activity",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Find accessible movement can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Explore movement options that fit ability, space, equipment, and energy.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "fuel-for-your-routine"],
    review: editorialReview,
  },
  {
    id: "rest-days-are-data",
    imageAssetKey: "rest-days-are-data",
    title: "Let rest days teach you",
    dek: "Use recovery feedback to shape a sustainable movement pattern.",
    topic: "Movement",
    collectionId: "movement-and-recovery",
    readingMinutes: 4,
    icon: "activity",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Let rest days teach you can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use recovery feedback to shape a sustainable movement pattern.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Choose an option that matches current energy, access, ability, and enjoyment, then treat recovery as part of the plan rather than a failure. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "fuel-for-your-routine"],
    review: editorialReview,
  },
  {
    id: "morning-light-and-rhythm",
    imageAssetKey: "morning-light-and-rhythm",
    title: "Use morning light and rhythm",
    dek: "Create a gentle cue for the beginning of the day and the evening that follows.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 4,
    icon: "moon",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Use morning light and rhythm can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Create a gentle cue for the beginning of the day and the evening that follows.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["sleep-and-food-rhythm", "gentle-evening-reset"],
    review: editorialReview,
  },
  {
    id: "nighttime-food-and-sleep",
    imageAssetKey: "nighttime-food-and-sleep",
    title: "Notice evening food and sleep patterns",
    dek: "Observe how timing, comfort, and routine interact without assigning blame.",
    topic: "Sleep",
    collectionId: "sleep-and-rhythm",
    readingMinutes: 4,
    icon: "moon",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Notice evening food and sleep patterns can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Observe how timing, comfort, and routine interact without assigning blame.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Look for one repeatable environmental or scheduling adjustment and allow the routine to be gradual instead of demanding immediate perfection. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["sleep-and-food-rhythm", "gentle-evening-reset"],
    review: editorialReview,
  },
  {
    id: "replace-all-or-nothing",
    imageAssetKey: "replace-all-or-nothing",
    title: "Replace all-or-nothing thinking",
    dek: "Make room for partial progress and useful middle steps.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Replace all-or-nothing thinking can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Make room for partial progress and useful middle steps.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-check-in", "make-goals-flexible"],
    review: editorialReview,
  },
  {
    id: "self-talk-that-supports-action",
    imageAssetKey: "self-talk-that-supports-action",
    title: "Use self-talk that supports action",
    dek: "Choose language that helps you continue rather than making the next step heavier.",
    topic: "Mindset",
    collectionId: "mindset-and-routine",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Use self-talk that supports action can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Choose language that helps you continue rather than making the next step heavier.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Describe what happened with curiosity and kindness, then choose a manageable next action without turning one moment into a verdict. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-check-in", "make-goals-flexible"],
    review: editorialReview,
  },
  {
    id: "what-fiber-brings-to-a-meal",
    imageAssetKey: "what-fiber-brings-to-a-meal",
    title: "What fiber brings to a meal",
    dek: "Notice the many foods that contribute fiber and how they add texture, satisfaction, and variety.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "What fiber brings to a meal can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Notice the many foods that contribute fiber and how they add texture, satisfaction, and variety.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["add-fiber-gradually", "beans-lentils-and-practical-portions"],
    review: editorialReview,
  },
  {
    id: "add-fiber-gradually",
    imageAssetKey: "add-fiber-gradually",
    title: "Add fiber gradually",
    dek: "Use small changes and patience when increasing fiber rather than making an abrupt overhaul.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Add fiber gradually can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use small changes and patience when increasing fiber rather than making an abrupt overhaul.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "beans-lentils-and-practical-portions"],
    review: editorialReview,
  },
  {
    id: "beans-lentils-and-practical-portions",
    imageAssetKey: "beans-lentils-and-practical-portions",
    title: "Beans, lentils, and practical portions",
    dek: "Build confidence with affordable, versatile plant foods in familiar meals.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Beans, lentils, and practical portions can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Build confidence with affordable, versatile plant foods in familiar meals.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "add-fiber-gradually"],
    review: editorialReview,
  },
  {
    id: "fruit-vegetables-and-grains",
    imageAssetKey: "fruit-vegetables-and-grains",
    title: "Fruit, vegetables, and grains",
    dek: "Find approachable combinations across fresh, frozen, canned, and shelf-stable options.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Fruit, vegetables, and grains can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Find approachable combinations across fresh, frozen, canned, and shelf-stable options.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "add-fiber-gradually"],
    review: editorialReview,
  },
  {
    id: "fiber-and-fluid-together",
    imageAssetKey: "fiber-and-fluid-together",
    title: "Fiber and fluid together",
    dek: "Pair higher-fiber choices with comfortable drinking habits and observe what works for you.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Fiber and fluid together can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Pair higher-fiber choices with comfortable drinking habits and observe what works for you.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "add-fiber-gradually"],
    review: editorialReview,
  },
  {
    id: "a-comfortable-meal-experiment",
    imageAssetKey: "a-comfortable-meal-experiment",
    title: "A comfortable meal experiment",
    dek: "Try one gentle change and learn from your experience without treating it as a test.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "A comfortable meal experiment can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Try one gentle change and learn from your experience without treating it as a test.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "add-fiber-gradually"],
    review: editorialReview,
  },
  {
    id: "when-digestion-needs-support",
    imageAssetKey: "when-digestion-needs-support",
    title: "When digestion needs support",
    dek: "Recognize when persistent discomfort deserves individualized guidance from a qualified professional.",
    topic: "Fiber & digestion",
    collectionId: "fiber-and-digestion",
    readingMinutes: 4,
    icon: "layers",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "When digestion needs support can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Recognize when persistent discomfort deserves individualized guidance from a qualified professional.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["what-fiber-brings-to-a-meal", "add-fiber-gradually"],
    review: editorialReview,
  },
  {
    id: "build-a-flexible-low-cost-pattern",
    imageAssetKey: "build-a-flexible-low-cost-pattern",
    title: "Build a flexible low-cost pattern",
    dek: "Choose a few dependable meal anchors that can stretch across different days.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Build a flexible low-cost pattern can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Choose a few dependable meal anchors that can stretch across different days.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["compare-cost-per-serving", "frozen-canned-and-shelf-stable-options"],
    review: editorialReview,
  },
  {
    id: "compare-cost-per-serving",
    imageAssetKey: "compare-cost-per-serving",
    title: "Compare cost per serving",
    dek: "Use simple comparisons without assuming the cheapest option is always the best fit.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Compare cost per serving can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use simple comparisons without assuming the cheapest option is always the best fit.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "frozen-canned-and-shelf-stable-options"],
    review: editorialReview,
  },
  {
    id: "frozen-canned-and-shelf-stable-options",
    imageAssetKey: "frozen-canned-and-shelf-stable-options",
    title: "Frozen, canned, and shelf-stable options",
    dek: "Keep practical ingredients available when fresh shopping is difficult.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Frozen, canned, and shelf-stable options can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Keep practical ingredients available when fresh shopping is difficult.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "compare-cost-per-serving"],
    review: editorialReview,
  },
  {
    id: "make-a-backup-meal-list",
    imageAssetKey: "make-a-backup-meal-list",
    title: "Make a backup meal list",
    dek: "Prepare a short list of meals for low-energy or low-time moments.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Make a backup meal list can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Prepare a short list of meals for low-energy or low-time moments.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "compare-cost-per-serving"],
    review: editorialReview,
  },
  {
    id: "shop-from-what-you-already-have",
    imageAssetKey: "shop-from-what-you-already-have",
    title: "Shop from what you already have",
    dek: "Turn pantry and freezer ingredients into useful starting points.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Shop from what you already have can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Turn pantry and freezer ingredients into useful starting points.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "compare-cost-per-serving"],
    review: editorialReview,
  },
  {
    id: "budget-friendly-protein-choices",
    imageAssetKey: "budget-friendly-protein-choices",
    title: "Budget-friendly protein choices",
    dek: "Explore varied protein foods and combinations that fit your preferences and budget.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Budget-friendly protein choices can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Explore varied protein foods and combinations that fit your preferences and budget.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "compare-cost-per-serving"],
    review: editorialReview,
  },
  {
    id: "when-access-changes",
    imageAssetKey: "when-access-changes",
    title: "When access changes",
    dek: "Adapt routines compassionately when time, money, equipment, or availability shifts.",
    topic: "Budget & access",
    collectionId: "budget-and-access",
    readingMinutes: 4,
    icon: "shopping-bag",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "When access changes can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Adapt routines compassionately when time, money, equipment, or availability shifts.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-flexible-low-cost-pattern", "compare-cost-per-serving"],
    review: editorialReview,
  },
  {
    id: "fridge-freezer-and-pantry-basics",
    imageAssetKey: "fridge-freezer-and-pantry-basics",
    title: "Fridge, freezer, and pantry basics",
    dek: "Give common foods a clear home and make safe storage easier to remember.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Fridge, freezer, and pantry basics can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Give common foods a clear home and make safe storage easier to remember.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["leftovers-and-storage-timing", "reheating-meals-with-confidence"],
    review: editorialReview,
  },
  {
    id: "leftovers-and-storage-timing",
    imageAssetKey: "leftovers-and-storage-timing",
    title: "Leftovers and storage timing",
    dek: "Use simple labels and timely refrigeration to make leftovers more predictable.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Leftovers and storage timing can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use simple labels and timely refrigeration to make leftovers more predictable.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "reheating-meals-with-confidence"],
    review: editorialReview,
  },
  {
    id: "reheating-meals-with-confidence",
    imageAssetKey: "reheating-meals-with-confidence",
    title: "Reheating meals with confidence",
    dek: "Warm leftovers thoughtfully while preserving texture and reducing uncertainty.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Reheating meals with confidence can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Warm leftovers thoughtfully while preserving texture and reducing uncertainty.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "leftovers-and-storage-timing"],
    review: editorialReview,
  },
  {
    id: "prevent-cross-contamination",
    imageAssetKey: "prevent-cross-contamination",
    title: "Prevent cross-contamination",
    dek: "Separate raw and ready-to-eat foods with a few repeatable kitchen habits.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Prevent cross-contamination can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Separate raw and ready-to-eat foods with a few repeatable kitchen habits.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "leftovers-and-storage-timing"],
    review: editorialReview,
  },
  {
    id: "handling-produce-safely",
    imageAssetKey: "handling-produce-safely",
    title: "Handling produce safely",
    dek: "Rinse, store, and prepare produce in ways that fit the food and your kitchen.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Handling produce safely can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Rinse, store, and prepare produce in ways that fit the food and your kitchen.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "leftovers-and-storage-timing"],
    review: editorialReview,
  },
  {
    id: "packing-food-for-work-or-travel",
    imageAssetKey: "packing-food-for-work-or-travel",
    title: "Packing food for work or travel",
    dek: "Plan temperature and timing when a meal leaves the home.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Packing food for work or travel can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Plan temperature and timing when a meal leaves the home.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "leftovers-and-storage-timing"],
    review: editorialReview,
  },
  {
    id: "when-to-discard-rather-than-guess",
    imageAssetKey: "when-to-discard-rather-than-guess",
    title: "When to discard rather than guess",
    dek: "Choose caution when food safety is uncertain, especially for vulnerable people.",
    topic: "Food safety",
    collectionId: "food-safety",
    readingMinutes: 4,
    icon: "check-circle",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "When to discard rather than guess can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Choose caution when food safety is uncertain, especially for vulnerable people.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["fridge-freezer-and-pantry-basics", "leftovers-and-storage-timing"],
    review: editorialReview,
  },
  {
    id: "read-menus-without-overthinking",
    imageAssetKey: "read-menus-without-overthinking",
    title: "Read menus without overthinking",
    dek: "Find the information that helps you choose without turning ordering into an exam.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Read menus without overthinking can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Find the information that helps you choose without turning ordering into an exam.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["build-a-satisfying-restaurant-meal", "shared-meals-and-family-style"],
    review: editorialReview,
  },
  {
    id: "build-a-satisfying-restaurant-meal",
    imageAssetKey: "build-a-satisfying-restaurant-meal",
    title: "Build a satisfying restaurant meal",
    dek: "Combine taste, appetite, social context, and convenience in a way that feels workable.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Build a satisfying restaurant meal can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Combine taste, appetite, social context, and convenience in a way that feels workable.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "shared-meals-and-family-style"],
    review: editorialReview,
  },
  {
    id: "shared-meals-and-family-style",
    imageAssetKey: "shared-meals-and-family-style",
    title: "Shared meals and family style",
    dek: "Participate in shared food while staying connected to preference and comfort.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Shared meals and family style can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Participate in shared food while staying connected to preference and comfort.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "build-a-satisfying-restaurant-meal"],
    review: editorialReview,
  },
  {
    id: "flexible-ordering-and-swaps",
    imageAssetKey: "flexible-ordering-and-swaps",
    title: "Flexible ordering and swaps",
    dek: "Ask for simple changes when they genuinely improve the meal for you.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Flexible ordering and swaps can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Ask for simple changes when they genuinely improve the meal for you.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "build-a-satisfying-restaurant-meal"],
    review: editorialReview,
  },
  {
    id: "fast-food-with-practical-choices",
    imageAssetKey: "fast-food-with-practical-choices",
    title: "Fast food with practical choices",
    dek: "Use familiar options and realistic expectations when speed is the priority.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Fast food with practical choices can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use familiar options and realistic expectations when speed is the priority.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "build-a-satisfying-restaurant-meal"],
    review: editorialReview,
  },
  {
    id: "enjoying-food-without-compensation",
    imageAssetKey: "enjoying-food-without-compensation",
    title: "Enjoying food without compensation",
    dek: "Return to your normal rhythm without trying to undo a social meal.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Enjoying food without compensation can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Return to your normal rhythm without trying to undo a social meal.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "build-a-satisfying-restaurant-meal"],
    review: editorialReview,
  },
  {
    id: "a-gentle-return-to-routine",
    imageAssetKey: "a-gentle-return-to-routine",
    title: "A gentle return to routine",
    dek: "Let the next meal be an ordinary opportunity rather than a correction.",
    topic: "Eating out",
    collectionId: "eating-out",
    readingMinutes: 4,
    icon: "coffee",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "A gentle return to routine can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Let the next meal be an ordinary opportunity rather than a correction.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["read-menus-without-overthinking", "build-a-satisfying-restaurant-meal"],
    review: editorialReview,
  },
  {
    id: "food-traditions-belong-here",
    imageAssetKey: "food-traditions-belong-here",
    title: "Food traditions belong here",
    dek: "Keep cultural foods and family traditions inside a flexible definition of nourishment.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Food traditions belong here can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Keep cultural foods and family traditions inside a flexible definition of nourishment.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["pleasure-is-useful-information", "sharing-meals-and-connection"],
    review: editorialReview,
  },
  {
    id: "pleasure-is-useful-information",
    imageAssetKey: "pleasure-is-useful-information",
    title: "Pleasure is useful information",
    dek: "Notice flavor, texture, satisfaction, and enjoyment as part of a practical meal.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Pleasure is useful information can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Notice flavor, texture, satisfaction, and enjoyment as part of a practical meal.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "sharing-meals-and-connection"],
    review: editorialReview,
  },
  {
    id: "sharing-meals-and-connection",
    imageAssetKey: "sharing-meals-and-connection",
    title: "Sharing meals and connection",
    dek: "Use shared food as a chance to belong without requiring everyone to eat identically.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Sharing meals and connection can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Use shared food as a chance to belong without requiring everyone to eat identically.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "pleasure-is-useful-information"],
    review: editorialReview,
  },
  {
    id: "adapt-familiar-dishes-thoughtfully",
    imageAssetKey: "adapt-familiar-dishes-thoughtfully",
    title: "Adapt familiar dishes thoughtfully",
    dek: "Change a recipe only when it helps, without erasing what makes it meaningful.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Adapt familiar dishes thoughtfully can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Change a recipe only when it helps, without erasing what makes it meaningful.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "pleasure-is-useful-information"],
    review: editorialReview,
  },
  {
    id: "cooking-with-family-and-community",
    imageAssetKey: "cooking-with-family-and-community",
    title: "Cooking with family and community",
    dek: "Share skills, responsibilities, and stories around food preparation.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Cooking with family and community can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Share skills, responsibilities, and stories around food preparation.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "pleasure-is-useful-information"],
    review: editorialReview,
  },
  {
    id: "food-memories-and-meaning",
    imageAssetKey: "food-memories-and-meaning",
    title: "Food memories and meaning",
    dek: "Recognize how memory and identity shape what feels nourishing and familiar.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Food memories and meaning can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Recognize how memory and identity shape what feels nourishing and familiar.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "pleasure-is-useful-information"],
    review: editorialReview,
  },
  {
    id: "make-room-for-spontaneity",
    imageAssetKey: "make-room-for-spontaneity",
    title: "Make room for spontaneity",
    dek: "Allow flexible choices and variety without turning an unplanned meal into a problem.",
    topic: "Food culture & enjoyment",
    collectionId: "food-culture-enjoyment",
    readingMinutes: 4,
    icon: "heart",
    accent: "info",
    sections: [
      {
        heading: "Start with the useful idea",
        paragraphs: [
          "Make room for spontaneity can be a practical way to notice what supports a meal or routine, without turning one choice into a rule. Allow flexible choices and variety without turning an unplanned meal into a problem.",
          "The best version depends on your culture, preferences, budget, equipment, schedule, appetite, and the people sharing the moment. Use this lesson as a prompt for options rather than a standard you must meet.",
        ],
        bullets: [
          "Begin with one familiar example instead of changing everything at once.",
          "Notice what makes the option easier, more enjoyable, or more satisfying to use.",
          "Keep the parts that fit and leave the rest without treating that as failure.",
        ],
      },
      {
        heading: "Look for the real-life version",
        paragraphs: [
          "A helpful experiment is usually small enough to fit into an ordinary day. You might change one ingredient, prepare one backup, ask one question, or make one part of the environment easier to use.",
          "There may be several good ways to apply the idea. What works on a quiet day may need to change during travel, busy work, limited access, social meals, or a different energy level.",
        ],
      },
      {
        heading: "Keep the next step kind and specific",
        paragraphs: [
          "Keep the idea flexible and adapt it to your real context, preferences, access, and support. This keeps the lesson connected to the whole person rather than a single number, food, or moment.",
          "Before you finish, name the smallest next step you could actually try and the signal that would tell you it needs adjusting. A flexible plan can be both intentional and open to change.",
        ],
        bullets: [
          "Choose a version that is realistic for this week, not an idealized future week.",
          "Make a note of what you learned so the next attempt can be more personal.",
          "If the idea causes distress, persistent discomfort, or confusion, pause and seek individualized support when appropriate.",
        ],
      },
    ],
    tryThis: "Choose one small, low-pressure version of this idea to try in a real meal or routine. Notice what felt useful, what felt inconvenient, and one adjustment that would make the next attempt easier without turning the result into a pass-or-fail judgment.",
    cta: { label: "Explore more Learning", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["food-traditions-belong-here", "pleasure-is-useful-information"],
    review: editorialReview,
  },
] as const;
