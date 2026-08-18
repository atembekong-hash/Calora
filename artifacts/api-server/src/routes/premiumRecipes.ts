import { Router, type IRouter } from "express";
import { getPremiumRecipe, listPremiumRecipes, premiumProviderStatus } from "../lib/premiumRecipes";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/v1/premium-recipes", async (req, res): Promise<void> => {
  const parsedLimit = Number(req.query.limit ?? 18);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 30) : 18;
  const parsedOffset = Number(req.query.offset ?? 0);
  const offset = Number.isFinite(parsedOffset) ? Math.max(Math.floor(parsedOffset), 0) : 0;
  try {
    const result = await listPremiumRecipes({
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      category: typeof req.query.category === "string" ? req.query.category.trim() : undefined,
      limit,
      offset,
    });
    res.json(result);
  } catch (error) {
    (req.log ?? logger).warn({ err: error }, "premium recipe provider unavailable");
    const status = premiumProviderStatus();
    res.status(502).json({ ...status, status: "error", recipes: [], nextOffset: null, message: "Premium recipes are unavailable right now. Try again shortly." });
  }
});

router.get("/v1/premium-recipes/:sourceId", async (req, res): Promise<void> => {
  const sourceId = Array.isArray(req.params.sourceId) ? req.params.sourceId[0] : req.params.sourceId;
  try {
    const recipe = await getPremiumRecipe(sourceId);
    if (!recipe) {
      res.status(404).json({ message: "Premium recipe is unavailable" });
      return;
    }
    res.json(recipe);
  } catch (error) {
    (req.log ?? logger).warn({ err: error }, "premium recipe detail unavailable");
    res.status(502).json({ message: "Premium recipe provider unavailable" });
  }
});

export default router;