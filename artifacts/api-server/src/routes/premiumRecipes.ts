import { Router, type IRouter } from "express";
import { FatSecretProviderError, getPremiumRecipe, listPremiumRecipes, premiumProviderStatus } from "../lib/premiumRecipes";
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
    const status = premiumProviderStatus();
    if (error instanceof FatSecretProviderError) {
      (req.log ?? logger).warn(
        { kind: error.kind, providerCode: error.providerCode, httpStatus: error.httpStatus },
        "premium recipe provider unavailable",
      );
      const restricted = error.kind === "restricted" || error.kind === "authentication";
      res.status(restricted ? 200 : 502).json({
        ...status,
        status: restricted ? "restricted" : "error",
        recipes: [],
        nextOffset: null,
        message: restricted
          ? "Premium recipes are not enabled for this provider account."
          : error.kind === "rate_limited"
            ? "Premium recipes are busy right now. Try again later."
            : "Premium recipes are unavailable right now. Try again shortly.",
      });
      return;
    }
    (req.log ?? logger).warn({ err: error }, "premium recipe provider unavailable");
    res.status(502).json({ ...status, status: "error", recipes: [], nextOffset: null, message: "Premium recipes are unavailable right now. Try again shortly." });
  }
});

router.get("/v1/premium-recipes/:sourceId", async (req, res): Promise<void> => {
  const sourceId = Array.isArray(req.params.sourceId) ? req.params.sourceId[0] : req.params.sourceId;
  try {
    const recipe = await getPremiumRecipe(sourceId);
    if (!recipe) {
      const status = premiumProviderStatus();
      res.status(status.status === "restricted" ? 403 : 404).json({ message: status.message ?? "Premium recipe is unavailable", status: status.status });
      return;
    }
    res.json(recipe);
  } catch (error) {
    if (error instanceof FatSecretProviderError) {
      (req.log ?? logger).warn(
        { kind: error.kind, providerCode: error.providerCode, httpStatus: error.httpStatus },
        "premium recipe detail unavailable",
      );
      const restricted = error.kind === "restricted" || error.kind === "authentication";
      res.status(restricted ? 503 : 502).json({
        message: restricted
          ? "Premium recipes are not enabled for this provider account."
          : "Premium recipe provider unavailable",
      });
      return;
    }
    (req.log ?? logger).warn({ err: error }, "premium recipe detail unavailable");
    res.status(502).json({ message: "Premium recipe provider unavailable" });
  }
});

export default router;