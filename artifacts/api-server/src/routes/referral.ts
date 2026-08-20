/**
 * Referral program routes — "1 completed referral = 30 days of Pro for both sides."
 *
 * Flow:
 *   1. Every authenticated user gets a stable invite code (GET /v1/referral).
 *   2. A new user redeems a code once (POST /v1/referral/redeem) → pending.
 *   3. After the new user's first successfully saved meal, the client calls
 *      POST /v1/referral/activate → both parties receive 30 days of Pro via
 *      RevenueCat promotional entitlements.
 *
 * Anti-abuse rules:
 *   • One redemption per referred account (unique index on referred_user_id).
 *   • Self-referrals rejected.
 *   • Rewards extend existing entitlement end dates, never replace them.
 */

import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { db, referralCodesTable, referralRedemptionsTable } from "@workspace/db";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import { grantPromoDays } from "../lib/revenuecat.js";
import { assertAccountWritable, AccountDeletionInProgressError } from "../lib/account-deletion-state.js";
import { hasSavedDiaryEntry } from "../lib/referral-qualification.js";

const router: IRouter = Router();

const REWARD_DAYS = 30;
const INVITE_BASE_URL = "https://mycaloraapp.com/invite";

/** Unambiguous alphabet (no 0/O/1/I) for human-readable invite codes. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Returns the caller's referral code row, creating one on first access. */
async function ensureCode(userId: string): Promise<string> {
  const existing = await db
    .select()
    .from(referralCodesTable)
    .where(eq(referralCodesTable.userId, userId))
    .limit(1);
  if (existing.length > 0) return existing[0].code;

  // Retry on the (vanishingly rare) code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await db.insert(referralCodesTable).values({ userId, code });
      return code;
    } catch (err) {
      // Unique violation on user_id means a concurrent insert won — reuse it.
      const again = await db
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
      res.status(401).json({ message: "Please sign in to view your invite code." });
      return;
    }
    await assertAccountWritable(user.id);

    const code = await ensureCode(user.id);

    const [statRows, ownRedemption] = await Promise.all([
      db
        .select({
          status: referralRedemptionsTable.status,
          value: count(),
        })
        .from(referralRedemptionsTable)
        .where(eq(referralRedemptionsTable.referrerUserId, user.id))
        .groupBy(referralRedemptionsTable.status),
      db
        .select()
        .from(referralRedemptionsTable)
        .where(eq(referralRedemptionsTable.referredUserId, user.id))
        .limit(1),
    ]);

    const pendingCount = statRows.find((r) => r.status === "pending")?.value ?? 0;
    const rewardedCount = statRows.find((r) => r.status === "rewarded")?.value ?? 0;

    res.json({
      code,
      inviteUrl: `${INVITE_BASE_URL}/${code}`,
      rewardDays: REWARD_DAYS,
      stats: {
        pendingCount,
        rewardedCount,
      },
      redemption:
        ownRedemption.length === 0
          ? { status: "none" }
          : {
              status: ownRedemption[0].status === "rewarded" ? "rewarded" : "pending",
              code: ownRedemption[0].code,
            },
    });
  } catch (err) {
    if (err instanceof AccountDeletionInProgressError) {
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    console.error("[referral] summary failed:", err);
    res.status(503).json({ message: "Referrals are unavailable right now. Please try again later." });
  }
});

// ── POST /v1/referral/redeem ────────────────────────────────────────────────
router.post("/v1/referral/redeem", async (req, res) => {
  try {
    const user = await verifyBearerToken(req);
    if (!user) {
      res.status(401).json({ message: "Please sign in to redeem an invite code." });
      return;
    }
    await assertAccountWritable(user.id);

    const rawCode = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    if (rawCode.length < 4 || rawCode.length > 16) {
      res.status(400).json({ message: "That invite code doesn't look right." });
      return;
    }

    const codeRows = await db
      .select()
      .from(referralCodesTable)
      .where(eq(referralCodesTable.code, rawCode))
      .limit(1);
    if (codeRows.length === 0) {
      res.status(404).json({ message: "We couldn't find that invite code." });
      return;
    }

    const referrerUserId = codeRows[0].userId;
    if (referrerUserId === user.id) {
      res.status(400).json({ message: "You can't redeem your own invite code." });
      return;
    }

    const existing = await db
      .select()
      .from(referralRedemptionsTable)
      .where(eq(referralRedemptionsTable.referredUserId, user.id))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ message: "This account has already used an invite code." });
      return;
    }

    try {
      await db.insert(referralRedemptionsTable).values({
        code: rawCode,
        referrerUserId,
        referredUserId: user.id,
        status: "pending",
      });
    } catch {
      // Unique index race: a concurrent redeem won.
      res.status(409).json({ message: "This account has already used an invite code." });
      return;
    }

    res.json({
      status: "pending",
      message: `Invite accepted! Log your first meal to unlock ${REWARD_DAYS} days of Pro for you both.`,
    });
  } catch (err) {
    if (err instanceof AccountDeletionInProgressError) {
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    console.error("[referral] redeem failed:", err);
    res.status(503).json({ message: "Referrals are unavailable right now. Please try again later." });
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
    await assertAccountWritable(user.id);

    const rows = await db
      .select()
      .from(referralRedemptionsTable)
      .where(eq(referralRedemptionsTable.referredUserId, user.id))
      .limit(1);

    if (rows.length === 0) {
      res.json({ status: "none", referredRewarded: false, referrerRewarded: false });
      return;
    }

    let redemption = rows[0];

    // ── Qualification check ───────────────────────────────────────────────
    // Any valid meal saved through an authenticated diary persistence route
    // qualifies. The query independently verifies server ownership; local logs
    // and an activation request alone cannot claim a reward.
    // The stamp is an atomic UPDATE so concurrent activations qualify exactly
    // once; a loser re-reads the fresh row and works from the winner's state.
    if (redemption.qualifiedAt === null) {
      const qualified = await hasSavedDiaryEntry(user.id);
      if (!qualified) {
        res.json({
          status: "pending",
          referredRewarded: false,
          referrerRewarded: false,
          message: "Save your first meal to unlock your invite reward.",
        });
        return;
      }

      const stamped = await db
        .update(referralRedemptionsTable)
        .set({ qualifiedAt: sql`now()`, qualifiedSignal: "diary_sync" })
        .where(
          and(
            eq(referralRedemptionsTable.id, redemption.id),
            sql`${referralRedemptionsTable.qualifiedAt} IS NULL`,
          ),
        )
        .returning({ id: referralRedemptionsTable.id });

      if (stamped.length === 0) {
        // A concurrent activation stamped first — never trust the stale row.
        const fresh = await db
          .select()
          .from(referralRedemptionsTable)
          .where(eq(referralRedemptionsTable.id, redemption.id))
          .limit(1);
        if (fresh.length === 0 || fresh[0].qualifiedAt === null) {
          res.json({
            status: "pending",
            referredRewarded: false,
            referrerRewarded: false,
            message: "Save your first meal to unlock your invite reward.",
          });
          return;
        }
        redemption = fresh[0];
      }
    }

    // ── Referred user's reward — claim-first idempotency ─────────────────
    // The atomic UPDATE ... WHERE referred_rewarded_at IS NULL is the claim:
    // only one concurrent caller wins it and proceeds to the provider grant.
    // On grant failure the claim is released so a later session retries.
    let referredRewarded = redemption.referredRewardedAt !== null;
    if (!referredRewarded) {
      const claim = await db
        .update(referralRedemptionsTable)
        .set({ referredRewardedAt: sql`now()`, status: "rewarded" })
        .where(
          and(
            eq(referralRedemptionsTable.id, redemption.id),
            sql`${referralRedemptionsTable.referredRewardedAt} IS NULL`,
          ),
        )
        .returning();

      if (claim.length > 0) {
        try {
          await grantPromoDays(user.id, REWARD_DAYS);
          referredRewarded = true;
        } catch (err) {
          console.error("[referral] referred grant failed for %s:", user.id, err);
          await db
            .update(referralRedemptionsTable)
            .set({ referredRewardedAt: null, status: "pending" })
            .where(eq(referralRedemptionsTable.id, redemption.id));
          res.status(502).json({
            status: "pending",
            referredRewarded: false,
            referrerRewarded: false,
            message: "We couldn't unlock your reward just now — we'll retry automatically.",
          });
          return;
        }
      } else {
        // A concurrent call won the claim; treat as rewarded.
        referredRewarded = true;
      }
    }

    // ── Referrer's reward — claim-first idempotency ──────────────────────
    let referrerRewarded = redemption.referrerRewardedAt !== null;
    if (!referrerRewarded) {
      let claimedReferrerReward = false;
      try {
        const rowsClaimed = await db
          .update(referralRedemptionsTable)
          .set({ referrerRewardedAt: sql`now()` })
          .where(
            and(
              eq(referralRedemptionsTable.id, redemption.id),
              sql`${referralRedemptionsTable.referrerRewardedAt} IS NULL`,
            ),
          )
          .returning();
        claimedReferrerReward = rowsClaimed.length > 0;
      } catch (err) {
        console.error("[referral] referrer reward claim failed for %s:", redemption.referrerUserId, err);
      }

      if (claimedReferrerReward) {
        try {
          await grantPromoDays(redemption.referrerUserId, REWARD_DAYS);
          referrerRewarded = true;
        } catch (err) {
          // Release the claim so a later activation can retry the grant.
          console.error("[referral] referrer grant failed for %s:", redemption.referrerUserId, err);
          await db
            .update(referralRedemptionsTable)
            .set({ referrerRewardedAt: null })
            .where(eq(referralRedemptionsTable.id, redemption.id));
        }
      }
    }

    res.json({
      status: "rewarded",
      referredRewarded,
      referrerRewarded,
      message: `You've unlocked ${REWARD_DAYS} days of CaloraApp Pro. Enjoy!`,
    });
  } catch (err) {
    if (err instanceof AccountDeletionInProgressError) {
      res.status(423).json({ message: "Account deletion is in progress." });
      return;
    }
    console.error("[referral] activate failed:", err);
    res.status(503).json({ message: "Referrals are unavailable right now. Please try again later." });
  }
});

export default router;
