import { Router, type IRouter } from "express";

const router: IRouter = Router();
const API_ROOT = "https://www.themealdb.com/api/json/v1/1";
const SOURCE = "TheMealDB";
const SOURCE_URL = "https://www.themealdb.com/";

type Meal = {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strTags?: string | null;
  [key: string]: string | null | undefined;
};

function toRecipe(meal: Meal) {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const ingredient = meal[`strIngredient${index + 1}`]?.trim();
    const measure = meal[`strMeasure${index + 1}`]?.trim();
    return ingredient ? `${measure ? `${measure} ` : ""}${ingredient}` : null;
  }).filter((value): value is string => Boolean(value));

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb ?? null,
    category: meal.strCategory ?? null,
    area: meal.strArea ?? null,
    description: null,
    instructions: meal.strInstructions ?? null,
    ingredients,
    tags: meal.strTags ? meal.strTags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    prepMinutes: null,
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recipe provider returned ${response.status}`);
  return response.json() as Promise<{ meals?: Meal[] | null }>;
}

router.get("/v1/recipes", async (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const parsedLimit = Number(req.query.limit ?? 12);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 30) : 12;
    const parsedOffset = Number(req.query.offset ?? 0);
    const offset = Number.isFinite(parsedOffset) ? Math.max(Math.floor(parsedOffset), 0) : 0;
    const url = query
      ? `${API_ROOT}/search.php?s=${encodeURIComponent(query)}`
      : category
        ? `${API_ROOT}/filter.php?c=${encodeURIComponent(category)}`
        : `${API_ROOT}/filter.php?c=Vegetarian`;
    const data = await fetchJson(url);
    const recipes = (data.meals ?? []).slice(offset, offset + limit).map(toRecipe);
    res.json({ source: SOURCE, recipes });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Recipe provider unavailable" });
  }
});

router.get("/v1/recipes/:recipeId", async (req, res) => {
  try {
    const data = await fetchJson(`${API_ROOT}/lookup.php?i=${encodeURIComponent(req.params.recipeId)}`);
    const meal = data.meals?.[0];
    if (!meal) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }
    res.json(toRecipe(meal));
    return;
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Recipe provider unavailable" });
    return;
  }
});

export default router;