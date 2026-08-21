import { and, eq } from "drizzle-orm";
import { coachFactContextConsentsTable, db } from "@workspace/db";
import { ensureUserRow } from "./user-rows.js";

export const COACH_FACT_CONTEXT_CONSENT_PURPOSE = "coach_fact_context_v1" as const;
export const COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION = "2026-08-21" as const;

export type CoachFactConsentState = "not_consented" | "consented_current" | "revoked" | "stale_version";
export type CoachFactConsentStatus = {
  purpose: typeof COACH_FACT_CONTEXT_CONSENT_PURPOSE;
  documentVersion: typeof COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION;
  state: CoachFactConsentState;
  decidedAt: string | null;
  revokedAt: string | null;
};

function noConsent(): CoachFactConsentStatus {
  return {
    purpose: COACH_FACT_CONTEXT_CONSENT_PURPOSE,
    documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
    state: "not_consented",
    decidedAt: null,
    revokedAt: null,
  };
}

function serialize(row: {
  documentVersion: string;
  state: string;
  decidedAt: Date;
  revokedAt: Date | null;
} | undefined): CoachFactConsentStatus {
  if (!row) return noConsent();
  const state: CoachFactConsentState = row.documentVersion !== COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION
    ? "stale_version"
    : row.state === "consented_current" ? "consented_current"
      : row.state === "revoked" ? "revoked" : "not_consented";
  return {
    purpose: COACH_FACT_CONTEXT_CONSENT_PURPOSE,
    documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
    state,
    decidedAt: row.decidedAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export async function getCoachFactConsent(externalUserId: string, email: string | null): Promise<CoachFactConsentStatus> {
  const userId = await ensureUserRow(externalUserId, email);
  const [row] = await db.select({
    documentVersion: coachFactContextConsentsTable.documentVersion,
    state: coachFactContextConsentsTable.state,
    decidedAt: coachFactContextConsentsTable.decidedAt,
    revokedAt: coachFactContextConsentsTable.revokedAt,
  }).from(coachFactContextConsentsTable).where(and(
    eq(coachFactContextConsentsTable.userId, userId),
    eq(coachFactContextConsentsTable.purpose, COACH_FACT_CONTEXT_CONSENT_PURPOSE),
  )).limit(1);
  return serialize(row);
}

export async function acceptCoachFactConsent(externalUserId: string, email: string | null): Promise<CoachFactConsentStatus> {
  const userId = await ensureUserRow(externalUserId, email);
  const now = new Date();
  await db.insert(coachFactContextConsentsTable).values({
    userId,
    purpose: COACH_FACT_CONTEXT_CONSENT_PURPOSE,
    documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
    state: "consented_current",
    decidedAt: now,
    revokedAt: null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [coachFactContextConsentsTable.userId, coachFactContextConsentsTable.purpose],
    set: {
      documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
      state: "consented_current",
      decidedAt: now,
      revokedAt: null,
      updatedAt: now,
    },
  });
  return getCoachFactConsent(externalUserId, email);
}

export async function revokeCoachFactConsent(externalUserId: string, email: string | null): Promise<CoachFactConsentStatus> {
  const userId = await ensureUserRow(externalUserId, email);
  const now = new Date();
  await db.insert(coachFactContextConsentsTable).values({
    userId,
    purpose: COACH_FACT_CONTEXT_CONSENT_PURPOSE,
    documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
    state: "revoked",
    decidedAt: now,
    revokedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [coachFactContextConsentsTable.userId, coachFactContextConsentsTable.purpose],
    set: {
      documentVersion: COACH_FACT_CONTEXT_CONSENT_DOCUMENT_VERSION,
      state: "revoked",
      decidedAt: now,
      revokedAt: now,
      updatedAt: now,
    },
  });
  return getCoachFactConsent(externalUserId, email);
}

export async function hasCurrentCoachFactConsent(externalUserId: string, email: string | null): Promise<boolean> {
  return (await getCoachFactConsent(externalUserId, email)).state === "consented_current";
}