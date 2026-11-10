# CAL-QA-21 / CAL-QA-24 Release-Provenance Recheck

**Date:** 2026-11-10
**Inspection source:** Calora repository, GitHub refs, public production attestation/health endpoints, and read-only EAS build records
**No production mutation:** Yes
**No native build started:** Yes

## Evidence

| Surface | Observed value | Classification |
|---|---|---|
| Protected `main` | `7951f98ee6edb5e0040f089967136f7044131461` | Current GitHub main ref |
| `release/calora-production` | `bf7e31b63e0253da82255609757c32df60e1c741` | Current GitHub release ref |
| `https://app.mycaloraapp.com/api/version` | `gitCommit=7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`; release ID `calora-api-7a56ffb7b1b4-20261110065952124` | Public serving attestation |
| `https://app.mycaloraapp.com/health` | `status=ok`, `service=calora-web` | Public health evidence |
| `https://workspacecalora-production.up.railway.app/health` | `status=ok`, `service=calora-web` | Public health evidence |
| Existing iOS EAS record | Finished, build profile `production`, app build `18`, source `b8744220d249594e730e9c1fbe4d0308a207aeee` | Stale relative to `7a56ffb` |
| Existing Android EAS record | Finished, profile `production-apk`, app build `28`, source `31ebd95eafdedc1377a34d6b30bdce4c02ad6bb9` | Stale relative to `7a56ffb` |

## Classification

**CAL-QA-21: PARTIAL/BLOCKED.** Public production health and an API release attestation are available, but the serving SHA does not match the current protected `main` or the current production-release branch. The public attestation proves what the API reports, not the complete three-service Railway deployment matrix.

**CAL-QA-24: BLOCKED.** Existing native candidates are tied to earlier SHAs and therefore cannot certify the current release candidate. No new Android or iOS build was authorized by this recheck. Railway MCP inspection was attempted read-only but returned `You don't have the required role (viewer) on this resource`; exact Railway deployment IDs, source metadata, and service-by-service rollout state therefore remain unverified through the connector.

## Required next actions

1. Establish one authoritative candidate SHA and reconcile `main`, `release/calora-production`, and Railway's actual source/deployment state without assuming that a healthy endpoint implies source alignment.
2. Obtain Railway viewer access or equivalent owner-supplied deployment evidence for all production services, including deployment IDs and serving SHAs.
3. If native certification is required for this candidate, obtain a fresh explicit instruction naming the exact Android/iOS build or submission; existing finished EAS artifacts must not be relabeled as current.
4. Re-run release attestation and candidate provenance checks after reconciliation. Any code or release-branch change invalidates evidence tied to `7a56ffb`.

## Verdict

**CONDITIONAL/BLOCKED.** Health is good, but release provenance and current native candidate identity are not reconciled. No production deployment, database mutation, provider change, native build, or store submission was performed.
