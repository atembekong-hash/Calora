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
  const available = catalog.filter((meal) => meal.diets.includes(profile.diet) || profile.diet === "Everything");
  const catalogPrompt = available.map((meal) => `${meal.id}: ${meal.name} (${meal.meal}, ${meal.calories} kcal, ${meal.proteinG}g protein)`).join("\n");

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
            "Balance variety, protein, vegetables, and realistic preparation. Match the calorie target without making medical claims.",
            `Goal: ${profile.goal}; activity: ${profile.activity}; diet: ${profile.diet}; daily calorie target: ${profile.calorieTarget}.`,
            "Catalog:",
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