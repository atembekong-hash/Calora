import { afterEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import {
  coachFactContextConsentsTable,
  db,
  usersTable,
} from "@workspace/db";
import {
  acceptCoachFactConsent,
  getCoachFactConsent,
  hasCurrentCoachFactConsent,
  revokeCoachFactConsent,
  COACH_FACT_CONTEXT_CONSENT_PURPOSE,
  COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
} from "../lib/coach-fact-consent.js";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const createdIds: string[] = [];
function externalId(label: string) {
  const id = `coach-consent-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  createdIds.push(id);
  return id;
}

afterEach(async () => {
  if (createdIds.length) {
    await db.delete(usersTable).where(eq(usersTable.externalId, createdIds.pop()!));
    while (createdIds.length) await db.delete(usersTable).where(eq(usersTable.externalId, createdIds.pop()!));
  }
});

describe.skipIf(!HAS_DB)("Coach Fact Context consent ledger (real schema)", () => {
  it("keeps consent isolated by account and removes it with account-owned data", async () => {
    const accountA = externalId("a");
    const accountB = externalId("b");
    expect((await getCoachFactConsent(accountA, null)).state).toBe("not_consented");
    expect((await acceptCoachFactConsent(accountA, null)).state).toBe("consented_current");
    expect((await getCoachFactConsent(accountB, null)).state).toBe("not_consented");
    expect((await revokeCoachFactConsent(accountA, null)).state).toBe("revoked");

    const [owner] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.externalId, accountA));
    expect(owner).toBeTruthy();
    await db.delete(usersTable).where(eq(usersTable.id, owner.id));
    const consentRows = await db.select().from(coachFactContextConsentsTable)
      .where(eq(coachFactContextConsentsTable.userId, owner.id));
    expect(consentRows).toHaveLength(0);
  });

  it("keeps accept/revoke idempotent, rejects stale document versions, and starts a recreated account clean", async () => {
    const account = externalId("lifecycle");
    expect((await acceptCoachFactConsent(account, null)).state).toBe("consented_current");
    expect((await acceptCoachFactConsent(account, null)).state).toBe("consented_current");

    const [owner] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.externalId, account));
    await db.update(coachFactContextConsentsTable)
      .set({ documentVersion: "obsolete-version" })
      .where(and(
        eq(coachFactContextConsentsTable.userId, owner.id),
        eq(coachFactContextConsentsTable.purpose, "coach_fact_context_v1"),
      ));
    expect((await getCoachFactConsent(account, null)).state).toBe("stale_version");

    expect((await revokeCoachFactConsent(account, null)).state).toBe("revoked");
    expect((await revokeCoachFactConsent(account, null)).state).toBe("revoked");
    await db.delete(usersTable).where(eq(usersTable.id, owner.id));

    // The same external identity receives a new internal account row, never a
    // revived old consent decision.
    expect((await getCoachFactConsent(account, null)).state).toBe("not_consented");
  });

  it("returns correct purpose and documentVersion constants on every response shape", async () => {
    const account = externalId("constants");
    const notConsented = await getCoachFactConsent(account, null);
    expect(notConsented.purpose).toBe(COACH_FACT_CONTEXT_CONSENT_PURPOSE);
    expect(notConsented.documentVersion).toBe(COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION);
    expect(notConsented.decidedAt).toBeNull();
    expect(notConsented.revokedAt).toBeNull();

    const accepted = await acceptCoachFactConsent(account, null);
    expect(accepted.purpose).toBe(COACH_FACT_CONTEXT_CONSENT_PURPOSE);
    expect(accepted.documentVersion).toBe(COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION);
    expect(accepted.decidedAt).not.toBeNull();
    expect(accepted.revokedAt).toBeNull();

    const revoked = await revokeCoachFactConsent(account, null);
    expect(revoked.purpose).toBe(COACH_FACT_CONTEXT_CONSENT_PURPOSE);
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.decidedAt).not.toBeNull();
  });

  it("hasCurrentCoachFactConsent returns false for no consent, true for consented, false after revoke", async () => {
    const account = externalId("hasconsent");
    expect(await hasCurrentCoachFactConsent(account, null)).toBe(false);
    await acceptCoachFactConsent(account, null);
    expect(await hasCurrentCoachFactConsent(account, null)).toBe(true);
    await revokeCoachFactConsent(account, null);
    expect(await hasCurrentCoachFactConsent(account, null)).toBe(false);
  });

  it("consent is strictly isolated between two simultaneous accounts", async () => {
    const accountX = externalId("iso-x");
    const accountY = externalId("iso-y");
    await acceptCoachFactConsent(accountX, null);
    // Y must remain isolated even after X accepts.
    expect((await getCoachFactConsent(accountY, null)).state).toBe("not_consented");
    expect(await hasCurrentCoachFactConsent(accountY, null)).toBe(false);
    // X accepting does not affect Y's state.
    await acceptCoachFactConsent(accountY, null);
    await revokeCoachFactConsent(accountX, null);
    // X revoked; Y must remain consented.
    expect((await getCoachFactConsent(accountY, null)).state).toBe("consented_current");
    expect(await hasCurrentCoachFactConsent(accountX, null)).toBe(false);
    expect(await hasCurrentCoachFactConsent(accountY, null)).toBe(true);
  });

  it("state CHECK constraint prevents invalid state values at the DB layer", async () => {
    const account = externalId("constraint");
    // Ensure the user row exists by accepting first, then try to corrupt state.
    await acceptCoachFactConsent(account, null);
    const [owner] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.externalId, account));
    // Attempt to write an invalid state value — the CHECK constraint must reject it.
    await expect(
      db.execute(
        sql`UPDATE calora_coach_fact_context_consents
            SET state = 'invalid_state_value'
            WHERE user_id = ${owner.id}
              AND purpose = ${COACH_FACT_CONTEXT_CONSENT_PURPOSE}`,
      ),
    ).rejects.toThrow();
    // The row must remain unchanged (consented_current).
    expect((await getCoachFactConsent(account, null)).state).toBe("consented_current");
  });
});