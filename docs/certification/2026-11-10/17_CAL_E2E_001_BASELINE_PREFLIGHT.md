# CAL-E2E-001 — Baseline and Environment Preflight

**Date:** 2026-11-10
**Protected main:** `c172d0fbbc00a4880a471f0697df56dc79a3470e`
**Production release branch:** `bf7e31b63e0253da82255609757c32df60e1c741`

## Repository and CI access

GitHub access is available for `atembekong-hash/Calora`. Protected PRs #445–#450 are merged. PRs #397, #398, and #399 remain open. The current source baseline is independently confirmed as protected main `c172d0fb`; the uploaded mission's claimed SHA is accurate.

## Production provenance and health

Both public Calora domains responded successfully:

- `https://app.mycaloraapp.com/health` — `{"status":"ok","service":"calora-web"}`
- `https://workspacecalora-production.up.railway.app/health` — `{"status":"ok","service":"calora-web"}`

Both `/api/version` endpoints returned the same attestation:

- Serving Git commit: `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
- Source tree: `9f3f96b4054fdcffa16e8d0a4dd6039e8133bb2f`
- Source digest: `73affc01d57b1a204670bd940a025fef16dde47151b377535d2f675afa166cd5`
- Release ID: `calora-api-7a56ffb7b1b4-20261110065952124`
- Build timestamp: `2026-11-10T06:59:52.124Z`
- Node major: 22
- Supabase SDK: 2.112.2

**Important provenance gap:** production is serving `7a56ffb`, which is neither current protected main `c172d0fb` nor the current release branch tip `bf7e31b6`. Current source fixes cannot be certified against production until the release reconciliation is explicitly performed and verified.

## Native candidate inventory

Read-only EAS metadata inspection found these finished candidates, both built from the production-attested source SHA `7a56ffb`:

| Platform | Build ID | Profile | App/build | Source SHA | Status |
|---|---|---|---|---|---|
| Android | `d0717b2a-36ae-4345-b9a2-adaca040ab49` | `production-apk` | `1.0.1 (29)` | `7a56ffb` | FINISHED |
| iOS | `805c15cf-1363-43cf-be39-609a29376b81` | `production` | `1.0.1 (19)` | `7a56ffb` | FINISHED |

Artifact URLs were inspected through EAS metadata but no binary was downloaded, installed, submitted, or executed during this preflight. These candidates are provenance-aligned with current production, not with protected main.

## Access/environment matrix

| Dependency | Preflight result | Certification status |
|---|---|---|
| GitHub repository/CI | Available and verified read-only | Available |
| Railway public health/version | Available and verified read-only | Production healthy; source mismatch open |
| EAS metadata | Available and verified read-only | Candidates available |
| Galaxy S20 physical control | Not available in this sandbox | BLOCKED |
| iOS simulator/physical TestFlight execution | Not available in this sandbox | BLOCKED |
| Reachable disposable PostgreSQL | Not available; integration tests remain skip-gated | BLOCKED |
| Supabase applied migration/roles/grants | Not read back | BLOCKED |
| RevenueCat sandbox/store lifecycle | No provider mutation or live lifecycle execution performed | BLOCKED |
| Health Connect/HealthKit | No OS/device execution available | BLOCKED |
| Camera/microphone/network controls | No native runtime available | BLOCKED |
| Test accounts/email recovery | No live user-flow session executed | BLOCKED |

## Sandbox capacity

The sandbox has approximately 8.5 GB free space. Inode usage is high at approximately 93%; no application or deliverable files were deleted. Further broad test/build work should avoid creating duplicate worktrees or large logs and should use existing dependencies.

## Initial flow-ledger disposition

The existing 25-mission certification library and CAL-QA reports provide the source-level inventory and prior evidence. For CAL-E2E-001, previous source/contract evidence is retained as **contract or simulated evidence only**. The following critical integrated journeys are not promoted to PASSED until executed against the actual Android/iOS candidates and current backend provenance:

- install/launch/auth/onboarding/session restoration;
- food search, scan, barcode, voice logging, and nutrition persistence;
- recipe discovery, generated-photo persistence, save/sync, and Plus scrolling;
- planner persistence and account switching;
- hydration, fasting, mood, steps, Progress, and history;
- Health Connect/HealthKit permissions and synchronization;
- Coach context, conversation continuity, Living Memory, and rate-limit/RLS behavior;
- RevenueCat purchase, restore, expiry, refund/revocation, and entitlement isolation;
- logout, deletion, protected-data access, offline recovery, and restart/background journeys.

**Preflight verdict: CONDITIONAL.** Repository, CI, public health, production attestation, and candidate metadata are available. Full autonomous real-user certification is blocked by missing physical-device, iOS runtime, database, provider, and source-to-production reconciliation access. No native build, store submission, production deployment, or destructive operation was initiated.
