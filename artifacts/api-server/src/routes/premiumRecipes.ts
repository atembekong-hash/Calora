import { Router, type IRouter, type Request, type Response } from "express";
import { FatSecretProviderError, getPremiumRecipe, listPremiumRecipes, premiumProviderStatus } from "../lib/premiumRecipes";
import { logger } from "../lib/logger";
import { verifyBearerToken } from "../lib/supabase-auth";
import { hasActivePremiumEntitlement } from "../lib/revenuecat";
import { checkRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();
const RATE_WINDOW_SECONDS = 60 * 60;
const ACCOUNT_RATE_LIMIT = 60;
const IP_RATE_LIMIT = 120;

type PremiumAccess =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 429 | 503; message: string; retryAfterSecs?: number };

function requestIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

async function authorizePremiumAccess(req: Request): Promise<PremiumAccess> {
  let user;
  try {
    user = await verifyBearerToken(req);
  } catch {
    user = null;
  }
  if (!user) {
    return { allowed: false, status: 401, message: "Sign in to access Premium recipes." };
  }

  try {
    if (!await hasActivePremiumEntitlement(user.id)) {
      return { allowed: false, status: 403, message: "Premium access is not available for this account." };
    }
  } catch (error) {
    (req.log ?? logger).warn({ err: error }, "premium entitlement verification unavailable");
    return { allowed: false, status: 503, message: "Premium recipes are temporarily unavailable. Please try again shortly." };
  }

  const [accountRate, ipRate] = await Promise.all([
    checkRateLimit(`premium-recipes:user:${user.id}`, ACCOUNT_RATE_LIMIT, RATE_WINDOW_SECONDS),
    checkRateLimit(`premium-recipes:ip:${requestIp(req)}`, IP_RATE_LIMIT, RATE_WINDOW_SECONDS, { failClosed: true }),
  ]);
  const deniedRate = !accountRate.allowed ? accountRate : !ipRate.allowed ? ipRate : null;
  if (deniedRate) {
    return {
      allowed: false,
      status: deniedRate.degraded ? 503 : 429,
      message: deniedRate.degraded
        ? "Premium recipes are temporarily unavailable. Please try again shortly."
        : "Too many Premium recipe requests. Please wait before trying again.",
      retryAfterSecs: deniedRate.retryAfterSecs,
    };
  }
  return { allowed: true };
}

async function requirePremiumAccess(req: Request, res: Response): Promise<boolean> {
  const access = await authorizePremiumAccess(req);
  if (access.allowed) return true;
  if (access.retryAfterSecs) res.setHeader("Retry-After", String(access.retryAfterSecs));
  res.status(access.status).json({ message: access.message });
  return false;
}

router.get("/v1/premium-recipes", async (req, res): Promise<void> => {
  if (!await requirePremiumAccess(req, res)) return;
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
        { kind: error.kind, providerCode: error.providerCode, httpStatus: error.httpStatus, providerMessage: error.providerMessage },
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
  if (!await requirePremiumAccess(req, res)) return;
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
        { kind: error.kind, providerCode: error.providerCode, httpStatus: error.httpStatus, providerMessage: error.providerMessage },
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