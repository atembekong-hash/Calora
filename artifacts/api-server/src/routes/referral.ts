/**
 * Referral program routes — "1 completed referral = 30 days of Pro for both sides."
 *
 * Flow:
 *   1. Every authenticated user gets a stable invite code (GET /v1/referral).
 *   2. A new user redeems a code once (POST /v1/referral/redeem) → pending.
 *   3. After the new user confirms a capture-backed meal, the client calls
 *      POST /v1/referral/activate. The server verifies the capture anchor
 *      before both parties receive 30 days of Pro via RevenueCat.
 *
 * Anti-abuse rules:
 *   • One redemption per referred account (unique index on referred_user_id).
 *   • Self-referrals rejected.
 *   • Rewards extend existing entitlement end dates, never replace them.
 */

import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import {
  db,
  referralCodesTable,
  referralRedemptionsTable,
  type CaloraDatabase,
} from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { grantPromoDays } from "../lib/revenuecat.js";
import {
  accountDeletionFenceSignal,
  assertAccountWritable,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";
import { hasSavedDiaryEntry } from "../lib/referral-qualification.js";
import { REFERRAL_REWARD_DAYS } from "../lib/referral-config.js";
import { logger, safeErrorDetails } from "../lib/logger.js";
import { withVerifiedDatabaseIdentity } from "../lib/database-identity.js";
import {
  claimReferralReward,
  completeReferralReward,
  failReferralReward,
} from "../lib/referral-reward-state.js";

const router: IRouter = Router();
const INVITE_BASE_URL = "https://mycaloraapp.com/invite";

/** Unambiguous alphabet (no 0/O/1/I) for human-readable invite codes. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const DELETED_ACCOUNT_REFERENCE_PREFIX = "deleted:";

function referralDurabilityMode(): "legacy" | "staged" {
  return process.env.CALORA_REFERRAL_DURABILITY_MODE === "staged"
    ? "staged"
    : "legacy";
}

type ReferralExecutor =
  CaloraDatabase | Parameters<Parameters<CaloraDatabase["transaction"]>[0]>[0];

async function withReferralIdentity<T>(
  externalUserId: string,
  operation: (database: ReferralExecutor) => Promise<T>,
): Promise<T> {
  return withVerifiedDatabaseIdentity(
    externalUserId,
    async (database, inTransaction) =>
      inTransaction
        ? operation(database)
        : database.transaction((tx) => operation(tx)),
  );
}

function isDeletedAccountReference(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.startsWith(DELETED_ACCOUNT_REFERENCE_PREFIX)
  );
}

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Returns the caller's referral code row, creating one on first access. */
async function ensureCode(
  userId: string,
  database: ReferralExecutor,
): Promise<string> {
  const existing = await database
    .select()
    .from(referralCodesTable)
    .where(eq(referralCodesTable.userId, userId))
    .limit(1);
  if (existing.length > 0) return existing[0].code;

  // Retry on the (vanishingly rare) code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await database.insert(referralCodesTable).values({ userId, code });
      return code;
    } catch (err) {
      if (classifyAccountDeletionError(err)) throw err;
      // Unique violation on user_id means a concurrent insert won — reuse it.
      const again = await database
        .select()
        .from(referralCodesTable)
        .where(eq(referralCodesTable.userId, userId))
        .limit(1);
      if (again.length > 0) return again[0].code;
      // Otherwise assume a code collision and retry with a fresh code.
    }
  }
  throw new Error("Failed to allocate a referral code");
}

// ── GET /v1/referral ────────────────────────────────────────────────────────
router.get("/v1/referral", async (req, res) => {
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res
        .status(401)
        .json({ message: "Please sign in to view your invite code." });
      return;
    }
    const summary = await withReferralIdentity(user.id, async (database) => {
      await assertAccountWritable(user.id, database, true);
      const code = await ensureCode(user.id, database);
      const [statRows, ownRedemption] = await Promise.all([
        database
          .select({ status: referralRedemptionsTable.status, value: count() })
          .from(referralRedemptionsTable)
          .where(eq(referralRedemptionsTable.referrerUserId, user.id))
          .groupBy(referralRedemptionsTable.status),
        database
          .select()
          .from(referralRedemptionsTable)
          .where(eq(referralRedemptionsTable.referredUserId, user.id))
          .limit(1),
      ]);
      const pendingCount =
        statRows.find((r) => r.status === "pending")?.value ?? 0;
      const rewardedCount =
        statRows.find((r) => r.status === "rewarded")?.value ?? 0;
      return {
        code,
        inviteUrl: `${INVITE_BASE_URL}/${code}`,
        rewardDays: REFERRAL_REWARD_DAYS,
        stats: { pendingCount, rewardedCount },
        redemption:
          ownRedemption.length === 0
            ? { status: "none" as const }
            : {
                status:
                  ownRedemption[0].status === "rewarded"
                    ? ("rewarded" as const)
                    : ("pending" as const),
                code: ownRedemption[0].code,
              },
      };
    });
    res.json(summary);
  } catch (err) {
    if (classifyAccountDeletionError(err)) {
      logger.warn(
        accountDeletionFenceSignal("/v1/referral"),
        "Account deletion fence rejected referral summary",
      );
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    logger.error(safeErrorDetails(err), "Referral summary failed");
    res.status(503).json({
      message: "Referrals are unavailable right now. Please try again later.",
    });
  }
});

// ── POST /v1/referral/redeem ────────────────────────────────────────────────
router.post("/v1/referral/redeem", async (req, res) => {
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res
        .status(401)
        .json({ message: "Please sign in to redeem an invite code." });
      return;
    }
    const rawCode =
      typeof req.body?.code === "string"
        ? req.body.code.trim().toUpperCase()
        : "";
    if (rawCode.length < 4 || rawCode.length > 16) {
      res.status(400).json({ message: "That invite code doesn't look right." });
      return;
    }

    const redemption = await withReferralIdentity(user.id, async (database) => {
      await assertAccountWritable(user.id, database, true);
      const codeRows = await database
        .select()
        .from(referralCodesTable)
        .where(eq(referralCodesTable.code, rawCode))
        .limit(1);
      if (codeRows.length === 0) return { kind: "not_found" as const };
      const referrerUserId = codeRows[0].userId;
      if (referrerUserId === user.id) return { kind: "self" as const };
      const existing = await database
        .select()
        .from(referralRedemptionsTable)
        .where(eq(referralRedemptionsTable.referredUserId, user.id))
        .limit(1);
      if (existing.length > 0) return { kind: "duplicate" as const };
      try {
        await database.insert(referralRedemptionsTable).values({
          code: rawCode,
          referrerUserId,
          referredUserId: user.id,
          status: "pending",
        });
      } catch (err) {
        if (classifyAccountDeletionError(err)) throw err;
        return { kind: "duplicate" as const };
      }
      return { kind: "created" as const };
    });
    if (redemption.kind === "not_found") {
      res.status(404).json({ message: "We couldn't find that invite code." });
      return;
    }
    if (redemption.kind === "self") {
      res
        .status(400)
        .json({ message: "You can't redeem your own invite code." });
      return;
    }
    if (redemption.kind === "duplicate") {
      res
        .status(409)
        .json({ message: "This account has already used an invite code." });
      return;
    }
    res.json({
      status: "pending",
      message: `Invite accepted! Capture and confirm a meal to unlock ${REFERRAL_REWARD_DAYS} days of Pro for you both.`,
    });
  } catch (err) {
    if (classifyAccountDeletionError(err)) {
      logger.warn(
        accountDeletionFenceSignal("/v1/referral/redeem"),
        "Account deletion fence rejected referral redemption",
      );
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    logger.error(safeErrorDetails(err), "Referral redemption failed");
    res.status(503).json({
      message: "Referrals are unavailable right now. Please try again later.",
    });
  }
});

// ── POST /v1/referral/activate ──────────────────────────────────────────────
router.post("/v1/referral/activate", async (req, res) => {
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res.status(401).json({ message: "Please sign in first." });
      return;
    }
    const rows = await withReferralIdentity(user.id, async (database) => {
      await assertAccountWritable(user.id, database, true);
      return database
        .select()
        .from(referralRedemptionsTable)
        .where(eq(referralRedemptionsTable.referredUserId, user.id))
        .limit(1);
    });

    if (rows.length === 0) {
      res.json({
        status: "none",
        referredRewarded: false,
        referrerRewarded: false,
        referrerRewardSkipped: false,
      });
      return;
    }

    let redemption = rows[0];

    // ── Qualification check ───────────────────────────────────────────────
    // Only a capture-backed meal save qualifies. The qualification query
    // independently verifies the server-issued capture anchor; plain diary
    // rows, unanchored sync rows, local logs, and an activation request alone
    // cannot claim a reward.
    // The stamp is an atomic UPDATE so concurrent activations qualify exactly
    // once; a loser re-reads the fresh row and works from the winner's state.
    if (redemption.qualifiedAt === null) {
      const qualified = await withReferralIdentity(user.id, (database) =>
        hasSavedDiaryEntry(user.id, database),
      );
      if (!qualified) {
        res.json({
          status: "pending",
          referredRewarded: false,
          referrerRewarded: false,
          referrerRewardSkipped: false,
          message: "Capture and confirm a meal to unlock your invite reward.",
        });
        return;
      }

      const stamped = await withReferralIdentity(user.id, async (database) =>
        database
          .update(referralRedemptionsTable)
          .set({ qualifiedAt: sql`now()`, qualifiedSignal: "server_capture" })
          .where(
            and(
              eq(referralRedemptionsTable.id, redemption.id),
              sql`${referralRedemptionsTable.qualifiedAt} IS NULL`,
            ),
          )
          .returning({ id: referralRedemptionsTable.id }),
      );

      if (stamped.length === 0) {
        // A concurrent activation stamped first — never trust the stale row.
        const fresh = await withReferralIdentity(user.id, (database) =>
          database
            .select()
            .from(referralRedemptionsTable)
            .where(eq(referralRedemptionsTable.id, redemption.id))
            .limit(1),
        );
        if (fresh.length === 0 || fresh[0].qualifiedAt === null) {
          res.json({
            status: "pending",
            referredRewarded: false,
            referrerRewarded: false,
            referrerRewardSkipped: false,
            message: "Capture and confirm a meal to unlock your invite reward.",
          });
          return;
        }
        redemption = fresh[0];
      }
    }

    // ── Referred user's reward — claim-first idempotency ─────────────────
    let referredRewarded = redemption.referredRewardedAt !== null;
    if (!referredRewarded && referralDurabilityMode() === "staged") {
      const claim = await withReferralIdentity(user.id, (database) =>
        claimReferralReward(database, redemption.id, "referred"),
      );
      if (claim.kind === "granted") {
        referredRewarded = true;
      } else if (claim.kind === "claimed") {
        try {
          await grantPromoDays(user.id, REFERRAL_REWARD_DAYS, claim.attemptKey);
          await withReferralIdentity(user.id, (database) =>
            completeReferralReward(
              database,
              redemption.id,
              "referred",
              claim.attemptKey,
            ),
          );
          await withReferralIdentity(user.id, (database) =>
            database
              .update(referralRedemptionsTable)
              .set({ referredRewardedAt: sql`now()`, status: "rewarded" })
              .where(eq(referralRedemptionsTable.id, redemption.id)),
          );
          referredRewarded = true;
        } catch (err) {
          logger.error(
            safeErrorDetails(err),
            "Referred-user staged promotional grant failed",
          );
          await withReferralIdentity(user.id, (database) =>
            failReferralReward(
              database,
              redemption.id,
              "referred",
              claim.attemptKey,
              "provider_failure",
            ),
          );
        }
      }
    } else if (!referredRewarded) {
      const claim = await withReferralIdentity(user.id, async (database) =>
        database
          .update(referralRedemptionsTable)
          .set({ referredRewardedAt: sql`now()`, status: "rewarded" })
          .where(
            and(
              eq(referralRedemptionsTable.id, redemption.id),
              sql`${referralRedemptionsTable.referredRewardedAt} IS NULL`,
            ),
          )
          .returning(),
      );
      if (claim.length > 0) {
        try {
          await grantPromoDays(user.id, REFERRAL_REWARD_DAYS);
          referredRewarded = true;
        } catch (err) {
          logger.error(
            safeErrorDetails(err),
            "Referred-user promotional grant failed",
          );
          await withReferralIdentity(user.id, (database) =>
            database
              .update(referralRedemptionsTable)
              .set({ referredRewardedAt: null, status: "pending" })
              .where(eq(referralRedemptionsTable.id, redemption.id)),
          );
          res.status(502).json({
            status: "pending",
            referredRewarded: false,
            referrerRewarded: false,
            referrerRewardSkipped: false,
            message:
              "We couldn't unlock your reward just now — we'll retry automatically.",
          });
          return;
        }
      } else {
        referredRewarded = true;
      }
    }

    // ── Referrer's reward — claim-first idempotency ──────────────────────
    let referrerRewarded = redemption.referrerRewardedAt !== null;
    const referrerWasDeleted = isDeletedAccountReference(
      redemption.referrerUserId,
    );
    if (!referrerRewarded && !referrerWasDeleted) {
      if (referralDurabilityMode() === "staged") {
        const claim = await withReferralIdentity(user.id, (database) =>
          claimReferralReward(database, redemption.id, "referrer"),
        );
        if (claim.kind === "granted") {
          referrerRewarded = true;
        } else if (claim.kind === "claimed") {
          try {
            await grantPromoDays(
              redemption.referrerUserId,
              REFERRAL_REWARD_DAYS,
              claim.attemptKey,
            );
            await withReferralIdentity(user.id, (database) =>
              completeReferralReward(
                database,
                redemption.id,
                "referrer",
                claim.attemptKey,
              ),
            );
            await withReferralIdentity(user.id, (database) =>
              database
                .update(referralRedemptionsTable)
                .set({ referrerRewardedAt: sql`now()` })
                .where(eq(referralRedemptionsTable.id, redemption.id)),
            );
            referrerRewarded = true;
          } catch (err) {
            logger.error(
              safeErrorDetails(err),
              "Referrer staged promotional grant failed",
            );
            await withReferralIdentity(user.id, (database) =>
              failReferralReward(
                database,
                redemption.id,
                "referrer",
                claim.attemptKey,
                "provider_failure",
              ),
            );
          }
        }
      } else {
        let claimedReferrerReward = false;
        try {
          const rowsClaimed = await withReferralIdentity(
            user.id,
            async (database) =>
              database
                .update(referralRedemptionsTable)
                .set({ referrerRewardedAt: sql`now()` })
                .where(
                  and(
                    eq(referralRedemptionsTable.id, redemption.id),
                    sql`${referralRedemptionsTable.referrerRewardedAt} IS NULL`,
                  ),
                )
                .returning(),
          );
          claimedReferrerReward = rowsClaimed.length > 0;
        } catch (err) {
          if (classifyAccountDeletionError(err)) throw err;
          logger.error(safeErrorDetails(err), "Referrer reward claim failed");
        }

        if (claimedReferrerReward) {
          try {
            await grantPromoDays(
              redemption.referrerUserId,
              REFERRAL_REWARD_DAYS,
            );
            referrerRewarded = true;
          } catch (err) {
            logger.error(
              safeErrorDetails(err),
              "Referrer promotional grant failed",
            );
            await withReferralIdentity(user.id, (database) =>
              database
                .update(referralRedemptionsTable)
                .set({ referrerRewardedAt: null })
                .where(eq(referralRedemptionsTable.id, redemption.id)),
            );
          }
        }
      }
    } else if (referrerWasDeleted) {
      // Account deletion replaces the referrer id with a non-user marker. Never
      // send that marker to RevenueCat or create a provider customer for it.
      // The referred user's already-earned reward remains valid, while the
      // deleted account's reward is intentionally not recreated.
      referrerRewarded = false;
    }

    const activationStatus =
      referredRewarded && (referrerRewarded || referrerWasDeleted)
        ? "rewarded"
        : "pending";
    res.json({
      status: activationStatus,
      referredRewarded,
      referrerRewarded,
      referrerRewardSkipped: referrerWasDeleted,
      message:
        activationStatus === "rewarded"
          ? `You've unlocked ${REFERRAL_REWARD_DAYS} days of Calora Pro. Enjoy!`
          : "Your reward is being finalized — we'll retry automatically.",
    });
  } catch (err) {
    if (classifyAccountDeletionError(err)) {
      logger.warn(
        accountDeletionFenceSignal("/v1/referral/activate"),
        "Account deletion fence rejected referral activation",
      );
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    logger.error(safeErrorDetails(err), "Referral activation failed");
    res.status(503).json({
      message: "Referrals are unavailable right now. Please try again later.",
    });
  }
});

export default router;
