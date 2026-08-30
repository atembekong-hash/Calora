import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { GeneratePlannerBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { BRAND_NAME } from "../lib/brand.js";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";

// Meal-plan generation is an expensive AI call. Cap per-account volume so a
// signed-in caller cannot drive unbounded provider cost.
const PLANNER_RATE_LIMIT = 20;
const PLANNER_RATE_WINDOW_SECS = 60 * 60; // 1 hour

const router: IRouter = Router();
const VISION_MODEL = "gpt-5.6-terra";

type PlannerProfile = {
  goal: "lose" | "maintain" | "gain";
  activity: "low" | "moderate" | "high";
  diet: "Everything" | "Vegetarian" | "Vegan" | "High protein";
  calorieTarget: number;
};

type CatalogMeal = {
  id: string;
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  name: string;
  image: string;
  serving: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: string[];
  description: string;
  prepMinutes: number;
  diets: PlannerProfile["diet"][];
};

const catalog: CatalogMeal[] = [
  // ── Breakfasts ──────────────────────────────────────────────────────────────
  {
    id: "berry-oats",
    meal: "Breakfast",
    name: "Overnight oats with berries",
    image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 420,
    proteinG: 18,
    carbsG: 58,
    fatG: 14,
    ingredients: ["rolled oats", "Greek yogurt", "mixed berries", "chia seeds", "almond milk"],
    description: "Rolled oats soaked overnight with berries, yogurt and chia seeds.",
    prepMinutes: 8,
    diets: ["Everything", "Vegetarian", "High protein"],
  },
  {
    id: "egg-toast",
    meal: "Breakfast",
    name: "Eggs on sourdough",
    image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1000&q=88",
    serving: "2 eggs + 1 slice",
    calories: 380,
    proteinG: 22,
    carbsG: 31,
    fatG: 18,
    ingredients: ["eggs", "sourdough bread", "avocado", "baby greens", "chili flakes"],
    description: "Scrambled eggs and avocado on toasted sourdough with chili.",
    prepMinutes: 12,
    diets: ["Everything", "Vegetarian", "High protein"],
  },
  {
    id: "yogurt-parfait",
    meal: "Breakfast",
    name: "Mango yogurt parfait",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=88",
    serving: "1 glass",
    calories: 310,
    proteinG: 20,
    carbsG: 42,
    fatG: 7,
    ingredients: ["Greek yogurt", "mango", "granola", "pumpkin seeds", "lime"],
    description: "Greek yogurt layered with mango, granola and pumpkin seeds.",
    prepMinutes: 6,
    diets: ["Everything", "Vegetarian", "High protein"],
  },
  {
    id: "smoothie-bowl",
    meal: "Breakfast",
    name: "Blueberry smoothie bowl",
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 360,
    proteinG: 14,
    carbsG: 54,
    fatG: 10,
    // Greek yogurt and chia seeds are already in berry-oats — use almond milk + honey here instead
    ingredients: ["blueberries", "banana", "almond milk", "granola", "honey"],
    description: "Blended blueberry and banana bowl with granola and honey.",
    prepMinutes: 8,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  {
    id: "avo-toast-egg",
    meal: "Breakfast",
    // Replaced avocado toast (too similar to egg-toast) with a clearly distinct option
    name: "Smoked salmon rye toast",
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?auto=format&fit=crop&w=1000&q=88",
    serving: "1 slice",
    calories: 340,
    proteinG: 24,
    carbsG: 28,
    fatG: 16,
    ingredients: ["rye bread", "smoked salmon", "cream cheese", "capers", "red onion", "lemon"],
    description: "Smoked salmon and cream cheese on rye toast with capers.",
    prepMinutes: 8,
    diets: ["Everything", "High protein"],
  },
  {
    id: "banana-pancakes",
    meal: "Breakfast",
    name: "Banana oat pancakes",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1000&q=88",
    serving: "3 pancakes",
    calories: 390,
    proteinG: 12,
    carbsG: 64,
    fatG: 9,
    // Changed almond milk to milk to avoid overlap with berry-oats
    ingredients: ["rolled oats", "banana", "eggs", "milk", "vanilla", "maple syrup"],
    description: "Oat and banana pancakes with vanilla and maple syrup.",
    prepMinutes: 18,
    diets: ["Everything", "Vegetarian"],
  },
  {
    id: "chia-pudding",
    meal: "Breakfast",
    name: "Chia seed pudding",
    image: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=88",
    serving: "1 jar",
    calories: 320,
    proteinG: 11,
    carbsG: 38,
    fatG: 14,
    ingredients: ["chia seeds", "coconut milk", "mixed berries", "agave", "vanilla"],
    description: "Coconut chia pudding set overnight with mixed berries.",
    prepMinutes: 5,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  // ── Lunches ─────────────────────────────────────────────────────────────────
  {
    id: "harvest-salad",
    meal: "Lunch",
    name: "Chicken harvest salad",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=88",
    serving: "1 large bowl",
    calories: 510,
    proteinG: 38,
    carbsG: 34,
    fatG: 25,
    ingredients: ["chicken breast", "mixed greens", "apple", "walnuts", "feta", "mustard dressing"],
    description: "Grilled chicken, mixed greens, apple, walnuts and feta.",
    prepMinutes: 18,
    // Fixed: chicken breast is not vegetarian
    diets: ["Everything", "High protein"],
  },
  {
    id: "salmon-quinoa",
    meal: "Lunch",
    name: "Salmon quinoa bowl",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 590,
    proteinG: 39,
    carbsG: 48,
    fatG: 24,
    ingredients: ["salmon", "quinoa", "cucumber", "edamame", "avocado", "sesame"],
    description: "Roasted salmon over quinoa with edamame, avocado and sesame.",
    prepMinutes: 24,
    diets: ["Everything", "High protein"],
  },
  {
    id: "lentil-soup",
    meal: "Lunch",
    name: "Lemon lentil soup",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=88",
    serving: "2 cups",
    calories: 430,
    proteinG: 24,
    carbsG: 61,
    fatG: 9,
    ingredients: ["green lentils", "carrots", "celery", "lemon", "spinach", "vegetable stock"],
    description: "Green lentil soup with carrots, lemon and spinach.",
    prepMinutes: 32,
    diets: ["Everything", "Vegetarian", "Vegan", "High protein"],
  },
  {
    id: "hummus-wrap",
    meal: "Lunch",
    name: "Turkey hummus wrap",
    image: "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=1000&q=88",
    serving: "1 wrap",
    calories: 480,
    proteinG: 34,
    carbsG: 46,
    fatG: 17,
    ingredients: ["whole wheat wrap", "turkey", "hummus", "tomato", "cucumber", "greens"],
    description: "Turkey, hummus, tomato and greens in a whole wheat wrap.",
    prepMinutes: 10,
    diets: ["Everything", "High protein"],
  },
  {
    id: "greek-salad",
    meal: "Lunch",
    name: "Greek salad with feta",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=88",
    serving: "1 large bowl",
    calories: 380,
    proteinG: 12,
    carbsG: 24,
    fatG: 26,
    ingredients: ["cucumber", "tomato", "kalamata olives", "feta", "red onion", "olive oil", "oregano"],
    description: "Tomato, cucumber and feta with kalamata olives and oregano.",
    prepMinutes: 10,
    diets: ["Everything", "Vegetarian"],
  },
  {
    id: "tuna-poke",
    meal: "Lunch",
    name: "Tuna poke bowl",
    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 520,
    proteinG: 36,
    carbsG: 54,
    fatG: 16,
    // Replaced avocado, cucumber, edamame, sesame (all in salmon-quinoa) with distinct ingredients
    ingredients: ["tuna", "sushi rice", "mango", "radish", "spring onion", "sesame oil", "soy sauce"],
    description: "Soy-marinated tuna over sushi rice with mango and radish.",
    prepMinutes: 15,
    diets: ["Everything", "High protein"],
  },
  {
    id: "chickpea-bowl",
    meal: "Lunch",
    name: "Roasted chickpea grain bowl",
    image: "https://images.unsplash.com/photo-1529059997568-3d847b1154f0?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 490,
    proteinG: 19,
    carbsG: 68,
    fatG: 16,
    ingredients: ["chickpeas", "farro", "roasted sweet potato", "kale", "tahini", "lemon"],
    description: "Roasted chickpeas on farro with kale, sweet potato and tahini.",
    prepMinutes: 30,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  // ── Dinners ─────────────────────────────────────────────────────────────────
  {
    id: "stir-fry",
    meal: "Dinner",
    name: "Tofu vegetable stir-fry",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 540,
    proteinG: 27,
    carbsG: 67,
    fatG: 18,
    ingredients: ["tofu", "broccoli", "bell pepper", "brown rice", "ginger", "tamari"],
    description: "Stir-fried tofu with broccoli and bell pepper over brown rice.",
    prepMinutes: 25,
    diets: ["Everything", "Vegetarian", "Vegan", "High protein"],
  },
  {
    id: "med-pasta",
    meal: "Dinner",
    name: "Mediterranean tomato pasta",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl",
    calories: 620,
    proteinG: 23,
    carbsG: 84,
    fatG: 21,
    ingredients: ["whole wheat pasta", "cherry tomatoes", "white beans", "spinach", "parmesan", "basil"],
    description: "Cherry tomato pasta with white beans, spinach and parmesan.",
    prepMinutes: 22,
    diets: ["Everything", "Vegetarian"],
  },
  {
    id: "chicken-rice",
    meal: "Dinner",
    name: "Herby chicken rice plate",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=88",
    serving: "1 plate",
    calories: 670,
    proteinG: 46,
    carbsG: 62,
    fatG: 24,
    ingredients: ["chicken thigh", "brown rice", "zucchini", "yogurt sauce", "parsley", "lemon"],
    description: "Roasted chicken thigh with brown rice, zucchini and yogurt sauce.",
    prepMinutes: 35,
    diets: ["Everything", "High protein"],
  },
  {
    id: "thai-curry",
    meal: "Dinner",
    // Changed from tofu/broccoli/bell pepper (same as stir-fry) to chicken with different vegetables
    name: "Thai green curry",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl with rice",
    calories: 520,
    proteinG: 34,
    carbsG: 52,
    fatG: 18,
    ingredients: ["chicken breast", "eggplant", "snap peas", "coconut milk", "Thai curry paste", "jasmine rice"],
    description: "Thai green curry with chicken, eggplant and jasmine rice.",
    prepMinutes: 28,
    diets: ["Everything", "High protein"],
  },
  {
    id: "spaghetti-bol",
    meal: "Dinner",
    name: "Spaghetti bolognese",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1000&q=88",
    serving: "1 large plate",
    calories: 620,
    proteinG: 38,
    carbsG: 72,
    fatG: 22,
    ingredients: ["lean beef mince", "spaghetti", "crushed tomatoes", "carrot", "celery", "parmesan"],
    description: "Beef bolognese on spaghetti with parmesan.",
    prepMinutes: 40,
    diets: ["Everything", "High protein"],
  },
  {
    id: "beef-tacos",
    meal: "Dinner",
    name: "Beef and veggie tacos",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=88",
    serving: "3 tacos",
    calories: 560,
    proteinG: 32,
    carbsG: 52,
    fatG: 22,
    ingredients: ["lean beef", "corn tortillas", "cabbage slaw", "avocado", "pico de gallo", "lime"],
    description: "Spiced beef in corn tortillas with slaw, avocado and lime.",
    prepMinutes: 20,
    diets: ["Everything", "High protein"],
  },
  {
    id: "prawn-stirfry",
    meal: "Dinner",
    name: "Garlic prawn stir-fry",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl with noodles",
    calories: 440,
    proteinG: 34,
    carbsG: 42,
    fatG: 14,
    ingredients: ["prawns", "bok choy", "snap peas", "ginger", "garlic", "noodles", "oyster sauce"],
    description: "Garlic prawns with bok choy over noodles in oyster sauce.",
    prepMinutes: 18,
    diets: ["Everything", "High protein"],
  },
  // ── Snacks ──────────────────────────────────────────────────────────────────
  {
    // Fixed: was "apple-yogurt" (wrong id) — now matches client catalog
    id: "apple-almond",
    meal: "Snack",
    name: "Apple with almond butter",
    image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=1000&q=88",
    serving: "1 apple + 1 tbsp",
    calories: 210,
    proteinG: 5,
    carbsG: 29,
    fatG: 10,
    ingredients: ["apple", "almond butter", "cinnamon"],
    description: "Apple slices with almond butter and cinnamon.",
    prepMinutes: 3,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  {
    id: "edamame",
    meal: "Snack",
    name: "Sea salt edamame",
    image: "https://images.unsplash.com/photo-1607301406259-dfb186f9e7a7?auto=format&fit=crop&w=1000&q=88",
    serving: "1 cup",
    calories: 190,
    proteinG: 17,
    carbsG: 15,
    fatG: 8,
    ingredients: ["edamame", "flaky sea salt", "lemon"],
    description: "Steamed edamame with flaky sea salt and lemon.",
    prepMinutes: 5,
    diets: ["Everything", "Vegetarian", "Vegan", "High protein"],
  },
  {
    id: "trail-mix",
    meal: "Snack",
    name: "Mixed nuts and dried fruit",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=1000&q=88",
    serving: "1 small handful (30g)",
    calories: 175,
    proteinG: 5,
    carbsG: 16,
    fatG: 11,
    ingredients: ["almonds", "cashews", "walnuts", "dried cranberries", "pumpkin seeds"],
    description: "Almonds, cashews, walnuts and dried cranberries.",
    prepMinutes: 1,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  {
    id: "hummus-veggies",
    meal: "Snack",
    name: "Hummus with veggie sticks",
    image: "https://images.unsplash.com/photo-1576400883215-7083980b6674?auto=format&fit=crop&w=1000&q=88",
    serving: "3 tbsp hummus + veg",
    calories: 165,
    proteinG: 6,
    carbsG: 18,
    fatG: 8,
    ingredients: ["hummus", "carrot", "cucumber", "celery", "bell pepper"],
    description: "Hummus with carrot, cucumber, celery and bell pepper.",
    prepMinutes: 5,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
  {
    id: "banana-pb",
    meal: "Snack",
    name: "Banana with peanut butter",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1000&q=88",
    serving: "1 medium banana + 1 tbsp",
    calories: 220,
    proteinG: 7,
    carbsG: 32,
    fatG: 8,
    ingredients: ["banana", "peanut butter", "chia seeds"],
    description: "Banana with peanut butter and chia seeds.",
    prepMinutes: 2,
    diets: ["Everything", "Vegetarian", "Vegan", "High protein"],
  },
];

function dateFromWeekStart(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function makeMeal(meal: CatalogMeal, day: string, index: number) {
  return {
    ...meal,
    id: `planner-${day}-${meal.id}-${index}-${randomUUID().slice(0, 6)}`,
    day,
  };
}

function catalogForPlanType(meals: CatalogMeal[], planType: string | null): CatalogMeal[] {
  if (planType === "plant-based-week") {
    return meals.filter((meal) => meal.diets.includes("Vegetarian") || meal.diets.includes("Vegan"));
  }
  if (planType === "quick-and-easy") {
    return meals.filter((meal) => meal.prepMinutes <= 20);
  }
  return meals;
}

function parseSelection(content: string) {
  const clean = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(clean) as { days?: Array<{ breakfast?: string; lunch?: string; dinner?: string; snack?: string }> };
}

router.post("/v1/planner/generate", async (req, res) => {
  // Meal-plan generation calls an expensive AI provider. Require a verified
  // account so anonymous callers cannot drive cost/DoS abuse.
  const user = await verifyBearerToken(req);
  if (!user) {
    res.status(401).json({ message: "Please sign in to generate a meal plan." });
    return;
  }

  const rate = await checkRateLimit(`planner:user:${user.id}`, PLANNER_RATE_LIMIT, PLANNER_RATE_WINDOW_SECS);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSecs));
    res.status(429).json({ message: "Too many meal-plan requests. Please wait before trying again.", retryAfterSecs: rate.retryAfterSecs });
    return;
  }

  const parsed = GeneratePlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid planner input" });
    return;
  }

  const weekStart = parsed.data.weekStart.toISOString().slice(0, 10);
  const profile = parsed.data.profile;
  const planType = parsed.data.planType ?? null;
  const available = catalog.filter((meal) => meal.diets.includes(profile.diet) || profile.diet === "Everything");
  const programCatalog = catalogForPlanType(available, planType);
  if (programCatalog.length === 0) {
    res.status(400).json({ message: "No catalog meals satisfy the selected Program and dietary preference." });
    return;
  }
  const catalogPrompt = programCatalog.map((meal) => `${meal.id}: ${meal.name} (${meal.meal}, ${meal.calories} kcal, ${meal.proteinG}g protein, ${meal.carbsG}g carbs, ${meal.fatG}g fat, ${meal.prepMinutes} min prep)`).join("\n");

  // Plan-type-specific AI guidance — each entry maps a plan type id to
  // a targeted instruction that steers meal selection from the catalog.
  const PLAN_TYPE_PROMPTS: Record<string, string> = {
    "balanced-nutrition": "Prioritise balanced macronutrients across all meals. Vary protein sources, include plenty of vegetables, and distribute carbohydrates evenly. Maximise variety across the week.",
    "high-protein-power": "Maximise protein in every meal and snack. Strongly prefer the highest-protein options in the catalog. Target at least 35–40% of calories from protein across the week.",
    "low-carb-living": "Minimise carbohydrate-heavy meals. Avoid meals where pasta, oats, or rice is the primary ingredient wherever alternatives exist. Favour protein and fat-forward meals with non-starchy vegetables.",
    "mediterranean-diet": "Select meals inspired by Mediterranean eating: fish, legumes, whole grains, and abundant colourful vegetables. Limit red meat. Prioritise variety and colour across the week.",
    "plant-based-week": "Select only vegetarian or vegan meals from the catalog. Prioritise plant protein sources such as legumes, tofu, and nuts. Ensure adequate protein across the week with no meat or fish.",
    "keto-kickstart": "Prioritise the lowest-carbohydrate meals available. Strongly avoid grain- or starch-based meals. Favour high-fat, moderate-protein options across the entire week.",
    "intermittent-fasting": "Structure meals to support an intermittent fasting eating window. Keep breakfast lighter and lower in calories. Concentrate more nutrition in lunch and dinner. Snacks should be protein-forward and satisfying.",
    "budget-friendly": "Prioritise cost-effective meals using affordable, widely available ingredients: eggs, lentils, oats, beans, and vegetables. Minimise expensive proteins. Favour simple recipes that reduce waste.",
    "quick-and-easy": "Prioritise the meals with the shortest preparation times in the catalog. Avoid anything complex or time-consuming. Every meal should be achievable in 20 minutes or less.",
    "athletic-performance": "Optimise for athletic performance. Prioritise higher-calorie, higher-protein meals with adequate carbohydrates for sustained energy. Support both pre- and post-workout nutrition across the week.",
    "anti-inflammatory": "Select meals rich in anti-inflammatory foods: fatty fish, berries, leafy greens, nuts, seeds, and colourful vegetables. Minimise processed or heavily fried options. Emphasise variety and colour.",
    "healthy-habits-week": "Create a simple, balanced week of whole-food meals. Prioritise familiar, easy-to-eat foods from across all food groups. Avoid extremes in any macro. This is about building sustainable habits with nourishing, approachable meals.",
  };

  const planTypeInstruction = planType && PLAN_TYPE_PROMPTS[planType]
    ? `Plan type: ${planType}. Specific guidance: ${PLAN_TYPE_PROMPTS[planType]}`
    : "Balance variety, protein, vegetables, and realistic preparation.";

  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            `You are ${BRAND_NAME}'s weekly meal planner.`,
            "Select meals only from the supplied catalog. Return JSON only.",
            "Return { days: [{ breakfast: id, lunch: id, dinner: id, snack: id }] } with exactly 7 day objects.",
            "Match the calorie target without making medical claims. Do not repeat the same meal on consecutive days.",
            `User profile — Goal: ${profile.goal}; activity: ${profile.activity}; diet: ${profile.diet}; daily calorie target: ${profile.calorieTarget} kcal.`,
            planTypeInstruction,
            "Catalog (id: name, type, calories, protein, carbs, fat, prep time):",
            catalogPrompt,
          ].join("\n"),
        },
        { role: "user", content: "Generate this week's plan." },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Planner provider returned no plan");
    const selection = parseSelection(content);
     const byId = new Map(programCatalog.map((meal) => [meal.id, meal]));
    const fallback = {
       breakfast: programCatalog.find((meal) => meal.meal === "Breakfast") ?? programCatalog[0],
       lunch: programCatalog.find((meal) => meal.meal === "Lunch") ?? programCatalog[3],
       dinner: programCatalog.find((meal) => meal.meal === "Dinner") ?? programCatalog[7],
       snack: programCatalog.find((meal) => meal.meal === "Snack") ?? programCatalog[10],
    };
    const meals = Array.from({ length: 7 }, (_, dayIndex) => {
      const chosen = selection.days?.[dayIndex] ?? {};
      return [
        byId.get(chosen.breakfast ?? "") ?? fallback.breakfast,
        byId.get(chosen.lunch ?? "") ?? fallback.lunch,
        byId.get(chosen.dinner ?? "") ?? fallback.dinner,
        byId.get(chosen.snack ?? "") ?? fallback.snack,
      ].map((meal, mealIndex) => makeMeal(meal, dateFromWeekStart(weekStart, dayIndex), mealIndex));
    }).flat();
    res.json({ weekStart, provider: `${BRAND_NAME} AI planner`, message: "Your week is balanced around your goals and preferences.", meals });
  } catch (error) {
    // A generated plan is a convenience, not a reason to leave the planning
    // workspace in an error state. Keep the response contract intact when the
    // upstream model is slow or unavailable so local-first clients can proceed
    // with an editable starter week instead of receiving a transport failure.
    const fallback = {
       breakfast: programCatalog.find((meal) => meal.meal === "Breakfast") ?? programCatalog[0],
       lunch: programCatalog.find((meal) => meal.meal === "Lunch") ?? programCatalog[3],
       dinner: programCatalog.find((meal) => meal.meal === "Dinner") ?? programCatalog[7],
       snack: programCatalog.find((meal) => meal.meal === "Snack") ?? programCatalog[10],
    };
    const meals = Array.from({ length: 7 }, (_, dayIndex) => [
      makeMeal(fallback.breakfast, dateFromWeekStart(weekStart, dayIndex), 0),
      makeMeal(fallback.lunch, dateFromWeekStart(weekStart, dayIndex), 1),
      makeMeal(fallback.dinner, dateFromWeekStart(weekStart, dayIndex), 2),
      makeMeal(fallback.snack, dateFromWeekStart(weekStart, dayIndex), 3),
    ]).flat();
    res.json({
      weekStart,
      provider: `${BRAND_NAME} starter planner`,
      message: "Starter week ready. Customize anything that does not fit your day.",
      meals,
    });
  }
});

export default router;