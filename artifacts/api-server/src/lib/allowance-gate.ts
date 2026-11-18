import type { Request, Response } from "express";
import { hasActivePremiumEntitlement, RevenueCatProviderError } from "./revenuecat.js";
import {
  finalizeSuccessfulAllowance,
  releaseSuccessfulAllowance,
  reserveSuccessfulAllowance,
  type AllowanceFeature,
} from "./successful-allowance.js";
import {
  ALLOWANCE_PERIODS,
  FREE_ALLOWANCE_PERIODS,
  FREE_SUCCESSFUL_DAILY_ALLOWANCES,
  FREE_SUCCESSFUL_ROLLING_ALLOWANCES,
  PRO_SUCCESSFUL_MONTHLY_ALLOWANCES,
  type AllowancePeriod,
} from "./subscriptionPolicy.js";
import { getProAllowanceLimit } from "./adaptiveFairUse.js";
import { logger, safeErrorDetails } from "./logger.js";

export type AllowanceLease = {
  feature: AllowanceFeature;
  userId: string;
  key: string;
  period: AllowancePeriod;
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

function freeLimit(feature: AllowanceFeature): number | undefined {
  return FREE_SUCCESSFUL_DAILY_ALLOWANCES[feature as keyof typeof FREE_SUCCESSFUL_DAILY_ALLOWANCES]
    ?? FREE_SUCCESSFUL_ROLLING_ALLOWANCES[feature as keyof typeof FREE_SUCCESSFUL_ROLLING_ALLOWANCES];
}

function freePeriod(feature: AllowanceFeature): AllowancePeriod | undefined {
  return FREE_ALLOWANCE_PERIODS[feature];
}

export async function reserveFreeAllowance(
  req: Request,
  res: Response,
  input: { userId: string; feature: AllowanceFeature; key?: string },
): Promise<AllowanceLease | null> {
  let premium: boolean;
  try {
    premium = await hasActivePremiumEntitlement(input.userId);
    logger.info?.(
      { event: "ai_gate_entitlement", feature: input.feature, result: premium ? "premium" : "free" },
      "AI gate entitlement resolved",
    );
  } catch (error) {
    if (error instanceof RevenueCatProviderError) {
      premium = false;
      logger.warn(
        { event: "ai_gate_entitlement", feature: input.feature, result: "provider_fallback", ...safeErrorDetails(error) },
        "AI gate entitlement provider fallback",
      );
    } else {
      logger.error(
        { event: "ai_gate_entitlement", feature: input.feature, result: "failed", ...safeErrorDetails(error) },
        "AI gate entitlement failed",
      );
      throw error;
    }
  }

  const key = input.key ?? operationKey(req);
  const period = premium ? ALLOWANCE_PERIODS[input.feature] : freePeriod(input.feature);
  const limit = premium
    ? getProAllowanceLimit(input.feature, PRO_SUCCESSFUL_MONTHLY_ALLOWANCES[input.feature], undefined, input.userId)
    : freeLimit(input.feature);

  if (!period || limit === undefined) {
    if (!premium) {
      res.status(403).json({
        code: "pro_required",
        feature: input.feature,
        message: "An active Calora Pro subscription or Pro trial is required for this feature.",
      });
      return null;
    }
    logger.error(
      { event: "ai_gate_policy", feature: input.feature, result: "missing" },
      "AI gate policy missing",
    );
    throw new Error(`No allowance policy configured for ${input.feature}`);
  }

  let decision;
  try {
    logger.info?.(
      { event: "ai_gate_reservation", feature: input.feature, plan: premium ? "premium" : "free" },
      "AI gate reservation started",
    );
    decision = await reserveSuccessfulAllowance({
      userId: input.userId,
      feature: input.feature,
      limit,
      period,
      idempotencyKey: key,
    });
    logger.info?.(
      { event: "ai_gate_reservation", feature: input.feature, result: decision.allowed ? "allowed" : "exhausted" },
      "AI gate reservation completed",
    );
  } catch (error) {
    logger.error(
      { event: "ai_gate_reservation", feature: input.feature, result: "failed", ...safeErrorDetails(error) },
      "AI gate reservation failed",
    );
    throw error;
  }
  res.setHeader("X-Calora-Allowance-Plan", premium ? "pro" : "free");
  res.setHeader("X-Calora-Allowance-Feature", input.feature);
  res.setHeader("X-Calora-Allowance-Limit", String(limit));
  res.setHeader("X-Calora-Allowance-Remaining", String(decision.remaining));
  res.setHeader("X-Calora-Allowance-Reset-At", decision.resetAt);
  if (!decision.allowed) {
    res.setHeader("Retry-After", String(decision.retryAfterSecs));
    res.status(429).json({
      code: premium ? "pro_allowance_exhausted" : "free_allowance_exhausted",
      feature: input.feature,
      message: `You have used this period’s ${input.feature.replaceAll("_", " ")} allowance. Please try again after the reset time.`,
      retryAfterSecs: decision.retryAfterSecs,
      resetAt: decision.resetAt,
      remaining: decision.remaining,
    });
    return null;
  }
  return {
    feature: input.feature,
    userId: input.userId,
    key,
    period,
    finalize: () => finalizeSuccessfulAllowance({ userId: input.userId, feature: input.feature, period, idempotencyKey: key }),
    release: () => releaseSuccessfulAllowance({ userId: input.userId, feature: input.feature, period, idempotencyKey: key }),
  };
}

export async function finalizeAllowanceOrRelease(lease: AllowanceLease, succeeded: boolean): Promise<void> {
  if (succeeded) await lease.finalize();
  else await lease.release();
}
