import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { GeneratePlannerBody } from "@workspace/api-zod";
import {
  PLANNER_CATALOG,
  type PlannerCatalogMeal,
  type PlannerDiet,
} from "@workspace/api-zod/planner-catalog";
import { plannerImageKeyForMeal } from "@workspace/api-zod/planner-image-identity";
import {
  orderProgramMeals,
  selectDiverseProgramMeal,
} from "@workspace/api-zod/planner-program-eligibility";
import type { PlannerProgramId } from "@workspace/api-zod/planner-program-pools";
import { openai } from "@workspace/integrations-openai-ai-server";
import { BRAND_NAME } from "../lib/brand.js";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { logger } from "../lib/logger.js";
import {
  accountDeletionFenceSignal,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";

// Meal-plan generation is an expensive AI call. Cap per-account volume so a
// signed-in caller cannot drive unbounded provider cost.
const PLANNER_RATE_LIMIT = 20;
const PLANNER_RATE_WINDOW_SECS = 60 * 60; // 1 hour

const router: IRouter = Router();
const VISION_MODEL = "gpt-5.6-terra";

type PlannerProfile = {
  goal: "lose" | "maintain" | "gain";
  activity: "low" | "moderate" | "high";
  diet: PlannerDiet;
  calorieTarget: number;
};

type CatalogMeal = PlannerCatalogMeal;

const catalog: CatalogMeal[] = PLANNER_CATALOG;

function dateFromWeekStart(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function makeMeal(meal: CatalogMeal, day: string, index: number) {
  return {
    ...meal,
    imageAssetKey: plannerImageKeyForMeal(meal.id, meal.name),
    id: `planner-${day}-${meal.id}-${index}-${randomUUID().slice(0, 6)}`,
    day,
  };
}

function catalogForPlanType(meals: CatalogMeal[], planType: string | null): CatalogMeal[] {
  if (!planType) return meals;
  return orderProgramMeals(planType as PlannerProgramId, meals);
}

const plannerMealRoles = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

function buildDiverseStarterWeek(catalog: CatalogMeal[], weekStart: string) {
  const choicesByRole = new Map(
    plannerMealRoles.map((role) => [role, catalog.filter((meal) => meal.meal === role)]),
  );
  return Array.from({ length: 7 }, (_, dayIndex) =>
    plannerMealRoles.map((role, mealIndex) => {
      const choice = selectDiverseProgramMeal(choicesByRole.get(role) ?? [], dayIndex + mealIndex);
      if (!choice) throw new Error(`No eligible ${role} meals are available for this Program.`);
      return makeMeal(choice, dateFromWeekStart(weekStart, dayIndex), mealIndex);
    }),
  ).flat();
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

  let rate;
  try {
    rate = await checkRateLimit(
      `planner:user:${user.id}`,
      PLANNER_RATE_LIMIT,
      PLANNER_RATE_WINDOW_SECS,
      { failClosed: true, rethrowAccountDeletionFence: true },
    );
  } catch (error) {
    if (classifyAccountDeletionError(error)) {
      logger.warn(
        accountDeletionFenceSignal("/v1/planner/generate"),
        "Account deletion fence rejected planner request",
      );
      res.status(503).json({ message: "Meal-plan generation is temporarily unavailable. Please try again shortly." });
      return;
    }
    throw error;
  }
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSecs));
    res.status(rate.degraded ? 503 : 429).json({
      message: rate.degraded
        ? "Meal-plan generation is temporarily unavailable. Please try again shortly."
        : "Too many meal-plan requests. Please wait before trying again.",
      retryAfterSecs: rate.retryAfterSecs,
    });
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
    const choicesByRole = new Map(
      plannerMealRoles.map((role) => [role, programCatalog.filter((meal) => meal.meal === role)]),
    );
    const previousByRole = new Map<(typeof plannerMealRoles)[number], string>();
    const meals = Array.from({ length: 7 }, (_, dayIndex) => {
      const chosen = selection.days?.[dayIndex] ?? {};
      const requestedByRole = [chosen.breakfast, chosen.lunch, chosen.dinner, chosen.snack];
      return plannerMealRoles.map((role, mealIndex) => {
        const candidates = choicesByRole.get(role) ?? [];
        const requested = byId.get(requestedByRole[mealIndex] ?? "");
        const choice = requested
          && requested.meal === role
          && (candidates.length === 1 || requested.id !== previousByRole.get(role))
          ? requested
          : selectDiverseProgramMeal(candidates, dayIndex + mealIndex);
        if (!choice) throw new Error(`No eligible ${role} meals are available for this Program.`);
        previousByRole.set(role, choice.id);
        return makeMeal(choice, dateFromWeekStart(weekStart, dayIndex), mealIndex);
      });
    }).flat();
    res.json({ weekStart, provider: `${BRAND_NAME} AI planner`, message: "Your week is balanced around your goals and preferences.", meals });
  } catch (error) {
    // A generated plan is a convenience, not a reason to leave the planning
    // workspace in an error state. Keep the response contract intact when the
    // upstream model is slow or unavailable so local-first clients can proceed
    // with an editable starter week instead of receiving a transport failure.
    const meals = buildDiverseStarterWeek(programCatalog, weekStart);
    res.json({
      weekStart,
      provider: `${BRAND_NAME} starter planner`,
      message: "Starter week ready. Customize anything that does not fit your day.",
      meals,
    });
  }
});

export default router;