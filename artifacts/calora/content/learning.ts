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
] as const;

/**
 * Local editorial seed library. Copy is deliberately concise, original, and
 * written for general education; no network content or image provenance is
 * required for this offline-first destination.
 */
export const LEARNING_LESSONS: readonly LearningLesson[] = [
  {
    id: "balanced-plate-basics",
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
    ],
    tryThis:
      "Look at one upcoming meal and name one addition that would make it more satisfying—not more perfect.",
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
    ],
    tryThis:
      "When you log a meal, add one non-number observation: taste, fullness, convenience, or what you would repeat.",
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
    ],
    tryThis:
      "Choose one regular meal and notice the different categories already present before deciding whether you want to add anything.",
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
    ],
    tryThis:
      "Pair a drink you enjoy with one predictable moment today, such as opening your laptop or sitting down for lunch.",
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
    ],
    tryThis:
      "Add one low-effort meal to the day that usually asks the most of you.",
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
    ],
    tryThis:
      "Add one backup choice beside an item you often cannot find or do not feel like using.",
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
    ],
    tryThis:
      "Write down one meal you can make or buy with very little preparation, then make sure its key ingredient is easy to find.",
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
    ],
    tryThis:
      "Open a saved recipe and identify one ingredient you could swap without changing the whole meal.",
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
    ],
    tryThis:
      "When you cook next, name one easy second meal before you clean up.",
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
    ],
    tryThis:
      "Pick one package at home and locate the serving information before reading any other number.",
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
    ],
    tryThis:
      "Compare two versions of a food you buy and name one practical difference you notice beyond the front-of-package claim.",
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
    ],
    tryThis: "Finish this sentence: After I ___, I will ___ for one minute.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "hydration-check-in"],
    review: editorialReview,
  },
  {
    id: "kind-feedback-loop",
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
    ],
    tryThis:
      "Think of one routine that felt difficult this week. Name one setup change that could make the next attempt easier.",
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
    ],
    tryThis:
      "Before changing meal timing, write down what a realistic next day of meals would look like. You may decide no change is needed.",
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
    ],
    tryThis:
      "Put one drink you enjoy where you will see it during your next regular routine.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "habit-cue-design"],
    review: medicalEducationReview,
  },
  {
    id: "hydration-on-busy-days",
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
    ],
    tryThis:
      "Choose one daily cue and pair it with a drink for the next three days.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["hydration-check-in", "busy-day-backup"],
    review: medicalEducationReview,
  },
  {
    id: "movement-breaks-count",
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
    ],
    tryThis:
      "Add one five-minute movement option to a regular break in your day.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "fuel-for-your-routine",
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
    ],
    tryThis:
      "Name one place in your routine where having a snack or meal option ready would reduce stress.",
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
    ],
    tryThis:
      "Write down one low-energy movement option and one rest option that both feel caring.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["movement-breaks-count", "kind-feedback-loop"],
    review: editorialReview,
  },
  {
    id: "sleep-and-food-rhythm",
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
    ],
    tryThis:
      "After a busy or short-sleep night, write down one practical support you want available the next day.",
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
    ],
    tryThis:
      "Pick one two-minute evening action that will help your morning feel lighter.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "week-with-one-anchor"],
    review: editorialReview,
  },
  {
    id: "shift-the-plan-not-yourself",
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
    ],
    tryThis:
      "Choose one fallback meal or routine for a day when your plan changes unexpectedly.",
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
    ],
    tryThis:
      "At the end of today, name one thing that helped and one support you would like tomorrow.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "habit-cue-design"],
    review: editorialReview,
  },
  {
    id: "make-goals-flexible",
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
    ],
    tryThis:
      "Rewrite one goal so it names a direction you can revisit, not a rule you must never change.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "week-with-one-anchor"],
    review: editorialReview,
  },
  {
    id: "food-mood-observations",
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
    ],
    tryThis:
      "Write one neutral observation about a meal or routine, using words like ‘noticed’ instead of ‘good’ or ‘bad.’",
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
    ],
    tryThis:
      "Write a permission statement for yourself: “I can pause or change this plan when my day or needs change.”",
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
    ],
    tryThis:
      "At one meal this week, add one familiar plant food or a different texture and notice what you enjoy about it.",
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
    ],
    tryThis:
      "After one meal, name one detail you would keep and one optional change that could make it fit your day even better.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["balanced-plate-basics", "calories-are-context"],
    review: editorialReview,
  },
  {
    id: "make-the-next-step-specific",
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
    ],
    tryThis:
      "Complete this sentence: ‘When I ___, I will ___ at ___.’ Keep the action small enough to try this week.",
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
    ],
    tryThis:
      "Write one if–then note: ‘If my first plan is not workable, then I will ___.’ Put it beside the plan it supports.",
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
    ],
    tryThis:
      "Choose one item from each part of the formula and save the combination as a low-effort meal idea.",
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
    ],
    tryThis:
      "Pick a recipe you already know and write down one optional swap you would feel comfortable trying.",
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
    ],
    tryThis:
      "Before your next cook, choose a separate prep space for raw ingredients and decide how you will label or portion leftovers.",
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
    ],
    tryThis:
      "Pick one packaged food, find its servings per container, and make one neutral note about the difference between a serving and the whole package.",
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
    ],
    tryThis:
      "Compare two similar products on one label detail and name one practical reason either option could fit your day.",
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
    ],
    tryThis:
      "Choose one package and locate its ingredient list and allergen statement before deciding what information matters to you.",
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
    ],
    tryThis:
      "Name one cue you already have and one action that takes less than two minutes to pair with it.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["habit-cue-design", "hydration-check-in"],
    review: editorialReview,
  },
  {
    id: "make-the-plan-easier-to-do",
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
    ],
    tryThis:
      "Write one if–then backup for a routine: ‘If my usual cue is unavailable, then I will ___.’",
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
    ],
    tryThis:
      "For three days, make one private checkmark when your small action happens, then write one sentence about what made it easier.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-feedback-loop", "anchor-one-small-action"],
    review: editorialReview,
  },
  {
    id: "fasting-defined-without-hype",
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
    ],
    tryThis:
      "For one day, notice your usual eating rhythm without trying to lengthen a gap or compensate for a meal.",
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
    ],
    tryThis:
      "Write one permission statement: ‘I can change this timing plan when my day, social life, or needs change.’",
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
    ],
    tryThis:
      "If meal timing raises a health or medication question, write it down for a qualified professional instead of testing it alone.",
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
    ],
    tryThis:
      "For one upcoming hot or active period, decide where your preferred drink will be and one moment you can check in.",
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
    ],
    tryThis:
      "Write down one trusted person, local service, or qualified professional you could contact if illness or heat-related symptoms feel concerning.",
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
    ],
    tryThis:
      "Choose one sitting-heavy moment and add a short, comfortable movement option you can stop or adapt at any time.",
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
    ],
    tryThis:
      "Write down two movement options and one recovery option that fit your own space, schedule, and current energy.",
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
    ],
    tryThis:
      "Choose one realistic wake-time anchor for the next three days and note whether it makes the morning feel more predictable.",
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
    ],
    tryThis:
      "Try one 10-minute transition before bed this week and keep only the part that feels genuinely calming or practical.",
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
    ],
    tryThis:
      "Rewrite one ‘I can’t’ thought as ‘I can’t do this yet, so my next small step is ___.’",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["make-goals-flexible", "kind-check-in"],
    review: editorialReview,
  },
  {
    id: "pause-notice-choose",
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
    ],
    tryThis:
      "Take 60 seconds to name one feeling and one small supportive action you can choose next—without needing to explain or fix the whole day.",
    cta: { label: "Return to today", route: "/(tabs)", feature: "home" },
    relatedLessonIds: ["kind-check-in", "food-mood-observations"],
    review: medicalEducationReview,
    safety: {
      heading: "Support is available",
      body: "This general education exercise is not mental-health treatment. Stop if it increases distress, use another support, and contact a qualified health professional or local urgent service if mood or safety concerns interfere with daily life.",
      review: medicalEducationReview,
    },
  },
] as const;
