import { Router, type IRouter, type Request } from "express";
import { verifyBearerToken, type VerifiedUser } from "../lib/supabase-auth.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import {
  FatSecretProviderError,
  getRestaurantFood,
  listRestaurantFoods,
  restaurantProviderStatus,
} from "../lib/premiumRecipes.js";

const router: IRouter = Router();
const WINDOW_SECONDS = 60 * 60;
const REQUEST_LIMIT = 80;

async function authorizeAndLimit(req: Request) {
  let user: VerifiedUser | null = null;
  try {
    user = await verifyBearerToken(req);
  } catch {
    user = null;
  }
  if (!user) return { status: 401 as const, retryAfterSecs: 0 };
  const rate = await checkRateLimit(`restaurant-foods:user:${user.id}`, REQUEST_LIMIT, WINDOW_SECONDS);
  return rate.allowed
    ? { status: 200 as const, retryAfterSecs: 0 }
    : { status: rate.degraded ? 503 as const : 429 as const, retryAfterSecs: rate.retryAfterSecs };
}

function safeProviderState(error: unknown) {
  if (error instanceof FatSecretProviderError) {
    console.warn("[restaurant-foods] provider request failed", {
      kind: error.kind,
      providerCode: error.providerCode,
      httpStatus: error.httpStatus,
    });
    const restricted = error.kind === "restricted" || error.kind === "authentication";
    return {
      status: restricted ? "restricted" as const : "error" as const,
      provider: "FatSecret",
      message: restricted
        ? "Restaurant nutrition is not enabled for this provider account."
        : error.kind === "rate_limited"
          ? "Restaurant nutrition is busy right now. Please try again later."
          : "Restaurant nutrition is temporarily unavailable.",
      foods: [],
      nextOffset: null,
    };
  }
  console.warn("[restaurant-foods] unexpected provider failure");
  return {
    status: "error" as const,
    provider: "FatSecret",
    message: "Restaurant nutrition is temporarily unavailable.",
    foods: [],
    nextOffset: null,
  };
}

router.get("/v1/restaurant-foods", async (req, res) => {
  const access = await authorizeAndLimit(req);
  if (access.status !== 200) {
    if (access.retryAfterSecs) res.setHeader("Retry-After", String(access.retryAfterSecs));
    res.status(access.status).json({ message: access.status === 401 ? "Sign in to search restaurant foods." : "Restaurant search is temporarily unavailable." });
    return;
  }
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 30);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  if (query.length < 2 || query.length > 120) {
    res.status(400).json({ message: "Enter at least 2 characters to search restaurant foods." });
    return;
  }
  try {
    res.json(await listRestaurantFoods({ query, limit, offset }));
  } catch (error) {
    res.json(safeProviderState(error));
  }
});

router.get("/v1/restaurant-foods/:sourceId", async (req, res) => {
  const access = await authorizeAndLimit(req);
  if (access.status !== 200) {
    if (access.retryAfterSecs) res.setHeader("Retry-After", String(access.retryAfterSecs));
    res.status(access.status).json({ message: access.status === 401 ? "Sign in to view restaurant nutrition." : "Restaurant nutrition is temporarily unavailable." });
    return;
  }
  if (restaurantProviderStatus().status !== "available") {
    res.status(503).json({ message: "Restaurant nutrition is not connected yet." });
    return;
  }
  try {
    const food = await getRestaurantFood(req.params.sourceId);
    if (!food) {
      res.status(404).json({ message: "Restaurant food not found." });
      return;
    }
    res.json(food);
  } catch (error) {
    const state = safeProviderState(error);
    res.status(state.status === "restricted" ? 503 : 502).json({ message: state.message });
  }
});

export default router;