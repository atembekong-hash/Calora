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
  reviewedAt: "2026-10-27",
  reviewedBy: "Calora editorial team",
  reviewStatus: "current",
  sourceNote:
    "Original Calora general-education content; not individualized guidance.",
};

const medicalEducationReview: LearningReviewMetadata = {
  reviewedAt: "2026-10-27",
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
] as const;
