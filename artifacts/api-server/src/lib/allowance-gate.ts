import type { Request, Response } from "express";
import { hasActivePremiumEntitlement, RevenueCatProviderError } from "./revenuecat.js";
import {
  finalizeSuccessfulAllowance,
  releaseSuccessfulAllowance,
  reserveSuccessfulAllowance,
  type AllowanceFeature,
} from "./successful-allowance.js";
import { FREE_SUCCESSFUL_DAILY_ALLOWANCES } from "./subscriptionPolicy.js";

export type AllowanceLease = {
  feature: AllowanceFeature;
  userId: string;
  key: string;
  finalize: () => Promise<void>;
  release: () => Promise<void>;
};

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : undefined;
}

export function operationKey(req: Request, fallback?: string): string {
  return headerValue(req, "idempotency-key") ?? headerValue(req, "x-calora-operation-key") ?? fallback ?? `${req.method}:${req.originalUrl}:${Date.now()}`;
}

export async function reserveFreeAllowance(
  req: Request,
  res: Response,
  input: { userId: string; feature: AllowanceFeature; key?: string },
): Promise<AllowanceLease | null> {
  let premium: boolean;
  try {
    premium = await hasActivePremiumEntitlement(input.userId);
  } catch (error) {
    if (error instanceof RevenueCatProviderError) {
      res.status(503).json({ message: "Usage availability is temporarily unavailable. Please try again shortly." });
      return null;
    }
    throw error;
  }
  if (premium) {
    res.setHeader("X-Calora-Allowance-Plan", "pro");
    return {
      feature: input.feature,
      userId: input.userId,
      key: input.key ?? operationKey(req),
      finalize: async () => undefined,
      release: async () => undefined,
    };
  }

  const key = input.key ?? operationKey(req);
  const decision = await reserveSuccessfulAllowance({
    userId: input.userId,
    feature: input.feature,
    dailyLimit: FREE_SUCCESSFUL_DAILY_ALLOWANCES[input.feature],
    idempotencyKey: key,
  });
  res.setHeader("X-Calora-Allowance-Plan", "free");
  res.setHeader("X-Calora-Allowance-Feature", input.feature);
  res.setHeader("X-Calora-Allowance-Remaining", String(decision.remaining));
  res.setHeader("X-Calora-Allowance-Reset-At", decision.resetAt);
  if (!decision.allowed) {
    res.setHeader("Retry-After", String(decision.retryAfterSecs));
    res.status(429).json({
      code: "free_allowance_exhausted",
      feature: input.feature,
      message: "You have used today’s Free allowance for this feature. Please try again after the reset time.",
      retryAfterSecs: decision.retryAfterSecs,
    });
    return null;
  }
  return {
    feature: input.feature,
    userId: input.userId,
    key,
    finalize: () => finalizeSuccessfulAllowance({ userId: input.userId, feature: input.feature, idempotencyKey: key }),
    release: () => releaseSuccessfulAllowance({ userId: input.userId, feature: input.feature, idempotencyKey: key }),
  };
}

export async function finalizeAllowanceOrRelease(
  lease: AllowanceLease,
  succeeded: boolean,
): Promise<void> {
  if (succeeded) await lease.finalize();
  else await lease.release();
}
