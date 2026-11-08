import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { CaloraDatabase } from "@workspace/db";

export type ReferralRewardSide = "referred" | "referrer";
export type ReferralRewardClaim =
  | { kind: "claimed"; attemptKey: string }
  | { kind: "granted" }
  | { kind: "in_flight" };

export const REFERRAL_REWARD_LEASE_MS = 5 * 60 * 1000;

type RewardExecutor =
  CaloraDatabase | Parameters<Parameters<CaloraDatabase["transaction"]>[0]>[0];

type AttemptRow = {
  id: string;
  attempt_key: string;
  state: "processing" | "retry" | "granted";
  lease_until: Date;
};

function leaseDate(): Date {
  return new Date(Date.now() + REFERRAL_REWARD_LEASE_MS);
}

/**
 * Claims one redemption side for an external provider call. The transaction
 * that calls this function must commit before the provider request begins.
 * An unexpired processing lease is never stolen; an expired lease is safely
 * reclaimable and marked for reconciliation when provider outcome is unknown.
 */
export async function claimReferralReward(
  database: RewardExecutor,
  redemptionId: string,
  side: ReferralRewardSide,
): Promise<ReferralRewardClaim> {
  const existing = (await database.execute(sql`
    SELECT id, attempt_key, state, lease_until
      FROM public.calora_referral_reward_attempts
     WHERE redemption_id = ${redemptionId}::uuid
       AND side = ${side}
     FOR UPDATE
  `)) as unknown as { rows: AttemptRow[] };
  const row = existing.rows[0];
  if (row?.state === "granted") return { kind: "granted" };
  if (
    row?.state === "processing" &&
    new Date(row.lease_until).getTime() > Date.now()
  ) {
    return { kind: "in_flight" };
  }

  const attemptKey = randomUUID();
  const leaseUntil = leaseDate();
  if (!row) {
    await database.execute(sql`
      INSERT INTO public.calora_referral_reward_attempts
        (redemption_id, side, attempt_key, state, lease_until)
      VALUES (${redemptionId}::uuid, ${side}, ${attemptKey}::uuid, 'processing', ${leaseUntil})
    `);
  } else {
    await database.execute(sql`
      UPDATE public.calora_referral_reward_attempts
         SET attempt_key = ${attemptKey}::uuid,
             state = 'processing',
             lease_until = ${leaseUntil},
             reconciliation_required = (state = 'processing'),
             last_error = NULL,
             updated_at = now()
       WHERE id = ${row.id}::uuid
    `);
  }
  return { kind: "claimed", attemptKey };
}

/** Mark a provider-confirmed grant durable, only for the matching claim. */
export async function completeReferralReward(
  database: RewardExecutor,
  redemptionId: string,
  side: ReferralRewardSide,
  attemptKey: string,
): Promise<boolean> {
  const result = (await database.execute(sql`
    UPDATE public.calora_referral_reward_attempts
       SET state = 'granted',
           provider_granted_at = now(),
           lease_until = now(),
           reconciliation_required = false,
           last_error = NULL,
           updated_at = now()
     WHERE redemption_id = ${redemptionId}::uuid
       AND side = ${side}
       AND attempt_key = ${attemptKey}::uuid
       AND state = 'processing'
    RETURNING id
  `)) as unknown as { rows: { id: string }[] };
  return result.rows.length > 0;
}

/** Mark a returned provider failure retryable without holding a DB lock. */
export async function failReferralReward(
  database: RewardExecutor,
  redemptionId: string,
  side: ReferralRewardSide,
  attemptKey: string,
  errorCode: string,
): Promise<boolean> {
  const result = (await database.execute(sql`
    UPDATE public.calora_referral_reward_attempts
       SET state = 'retry',
           lease_until = now(),
           last_error = ${errorCode.slice(0, 80)},
           reconciliation_required = false,
           updated_at = now()
     WHERE redemption_id = ${redemptionId}::uuid
       AND side = ${side}
       AND attempt_key = ${attemptKey}::uuid
       AND state = 'processing'
    RETURNING id
  `)) as unknown as { rows: { id: string }[] };
  return result.rows.length > 0;
}

/** Read-only reconciliation view for a redemption's two provider sides. */
export async function readReferralRewardAttempts(
  database: RewardExecutor,
  redemptionId: string,
): Promise<unknown[]> {
  const result = (await database.execute(sql`
    SELECT side, state, attempt_key, lease_until, provider_granted_at,
           reconciliation_required, last_error
      FROM public.calora_referral_reward_attempts
     WHERE redemption_id = ${redemptionId}::uuid
     ORDER BY side
  `)) as unknown as { rows: unknown[] };
  return result.rows;
}
