import { afterEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  coachFactContextConsentsTable,
  db,
  usersTable,
} from "@workspace/db";
import {
  acceptCoachFactConsent,
  getCoachFactConsent,
  revokeCoachFactConsent,
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
});