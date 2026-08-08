import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { GeneratePlannerBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

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
    description: "Creamy oats layered with bright berries and a little crunch.",
    prepMinutes: 8,
    diets: ["Everything", "Vegetarian", "Vegan", "High protein"],
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
    description: "Jammy eggs, avocado, and greens on toasted sourdough.",
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
    description: "A cool, bright parfait with tropical fruit and seeds.",
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
    ingredients: ["blueberries", "banana", "Greek yogurt", "granola", "chia seeds", "honey"],
    description: "A thick, vibrant smoothie bowl topped with crunch and fresh fruit.",
    prepMinutes: 8,
    diets: ["Everything", "Vegetarian", "High protein"],
  },
  {
    id: "avo-toast-egg",
    meal: "Breakfast",
    name: "Avocado toast with poached egg",
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?auto=format&fit=crop&w=1000&q=88",
    serving: "1 slice + 1 egg",
    calories: 420,
    proteinG: 18,
    carbsG: 36,
    fatG: 24,
    ingredients: ["sourdough bread", "avocado", "eggs", "cherry tomatoes", "chili flakes"],
    description: "Creamy avocado and a perfectly poached egg on toasted sourdough.",
    prepMinutes: 14,
    diets: ["Everything", "Vegetarian", "High protein"],
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
    ingredients: ["rolled oats", "banana", "eggs", "almond milk", "vanilla", "maple syrup"],
    description: "Fluffy, naturally sweet pancakes made from oats and ripe banana.",
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
    description: "Silky overnight pudding with berries — ready when you wake up.",
    prepMinutes: 5,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
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
    description: "A crisp, satisfying salad with roasted chicken and seasonal crunch.",
    prepMinutes: 18,
    diets: ["Everything", "Vegetarian", "High protein"],
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
    description: "Roasted salmon over quinoa with cool vegetables and sesame.",
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
    description: "A golden, lemony lentil soup that holds up beautifully for lunch.",
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
    description: "A portable wrap with peppery greens and creamy hummus.",
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
    description: "A bright, no-cook salad with creamy feta and bold herbs.",
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
    ingredients: ["tuna", "sushi rice", "avocado", "cucumber", "edamame", "sesame", "soy sauce"],
    description: "Fresh tuna over seasoned rice with cool vegetables and sesame.",
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
    description: "Hearty grains and crispy chickpeas with a rich tahini dressing.",
    prepMinutes: 30,
    diets: ["Everything", "Vegetarian", "Vegan"],
  },
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
    description: "Caramelized tofu and bright vegetables over fluffy brown rice.",
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
    description: "A saucy, weeknight pasta with beans, greens, and basil.",
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
    description: "A comforting plate of herby chicken, rice, and roasted vegetables.",
    prepMinutes: 35,
    diets: ["Everything", "High protein"],
  },
  {
    id: "thai-curry",
    meal: "Dinner",
    name: "Vegetable Thai curry",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1000&q=88",
    serving: "1 bowl with rice",
    calories: 490,
    proteinG: 15,
    carbsG: 56,
    fatG: 20,
    ingredients: ["tofu", "broccoli", "bell pepper", "coconut milk", "Thai curry paste", "jasmine rice"],
    description: "A creamy, fragrant curry with vegetables and jasmine rice.",
    prepMinutes: 25,
    diets: ["Everything", "Vegetarian", "Vegan"],
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
    description: "A rich, slow-cooked bolognese over al dente spaghetti.",
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
    description: "Seasoned beef in warm tortillas with bright toppings and lime.",
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
    description: "Juicy prawns and crisp greens tossed through silky garlic noodles.",
    prepMinutes: 18,
    diets: ["Everything", "High protein"],
  },
  {
    id: "apple-yogurt",
    meal: "Snack",
    name: "Apple with almond butter",
    image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=1000&q=88",
    serving: "1 apple + 1 tbsp",
    calories: 210,
    proteinG: 5,
    carbsG: 29,
    fatG: 10,
    ingredients: ["apple", "almond butter", "cinnamon"],
    description: "A simple, crisp snack with just enough richness.",
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
    description: "A protein-forward snack with bright lemon and sea salt.",
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
    description: "A balanced handful of nuts and fruit for steady energy.",
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
    description: "Creamy hummus with crisp vegetables — satisfying and light.",
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
    description: "Quick natural energy with protein and healthy fats.",
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

function parseSelection(content: string) {
  const clean = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(clean) as { days?: Array<{ breakfast?: string; lunch?: string; dinner?: string; snack?: string }> };
}

router.post("/v1/planner/generate", async (req, res) => {
  const parsed = GeneratePlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid planner input" });
    return;
  }

  const weekStart = parsed.data.weekStart.toISOString().slice(0, 10);
  const profile = parsed.data.profile;
  const planType = parsed.data.planType ?? null;
  const available = catalog.filter((meal) => meal.diets.includes(profile.diet) || profile.diet === "Everything");
  const catalogPrompt = available.map((meal) => `${meal.id}: ${meal.name} (${meal.meal}, ${meal.calories} kcal, ${meal.proteinG}g protein, ${meal.carbsG}g carbs, ${meal.fatG}g fat, ${meal.prepMinutes} min prep)`).join("\n");

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
            "You are Calora's weekly meal planner.",
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
    const byId = new Map(available.map((meal) => [meal.id, meal]));
    const fallback = {
      breakfast: available.find((meal) => meal.meal === "Breakfast") ?? catalog[0],
      lunch: available.find((meal) => meal.meal === "Lunch") ?? catalog[3],
      dinner: available.find((meal) => meal.meal === "Dinner") ?? catalog[7],
      snack: available.find((meal) => meal.meal === "Snack") ?? catalog[10],
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
    res.json({ weekStart, provider: "Calora AI planner", message: "Your week is balanced around your goals and preferences.", meals });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Planner provider unavailable" });
  }
});

export default router;