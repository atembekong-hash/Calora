# Report 215 — Calora GitHub and Deployment Verification

**Date:** 2026-10-14  
**Repository:** `atembekong-hash/Calora`  
**Protected production branch:** `main`

## 1. GitHub protection

The protected-branch API reports:

- Administrators enforced: `true`.
- Required check: `Run release validation suite`.
- Required approving reviews: `0`.

No protection rule, required check, workflow, secret, or branch setting was weakened or altered.

## 2. Recent change trace

The recent remediation sequence was delivered through protected pull requests, including:

- #144 selectable graph date ranges
- #145 macro trend graph
- #146 Plus entitlement resilience
- #147–#148 Discover/Plus infinite scroll
- #149–#150 recipe rotation
- #151 preparation methods
- #152 Scan tab labels
- #153–#154 generated-image lifecycle
- #155 and #164 image integrity/fail-closed enforcement
- #157–#158 voice capture
- #159 and #163 Auto/Barcode fallback
- #160 Plan-to-Today persistence
- #162 official app icon
- #167 saved bundled-recipe restoration
- #169–#172 certification and environment reports

The latest protected main commit is `e7c98edd667f5c63b402bdf27ba51f114fcfb8a9`, merged through PR #172.

## 3. CI evidence

For the current protected release identity, the required release validation and account-deletion fence checks completed successfully. The native-association monitor has both successful and failure outcomes in recent history; those monitor failures are external/monitor-state signals and were not treated as authorization to trigger a native build. The release validation check remained green.

The repository scripts suite passed **88/88**, including checks for:

- same-SHA release validation gates;
- provider/package attestation;
- API release identity and deployment provenance;
- immutable workflow action pins;
- iOS signing monitor token mapping without token exposure;
- native preflight safety contracts;
- account-deletion and recovery fences.

## 4. Production deployment

Current production endpoints verified:

```text
https://app.mycaloraapp.com/health      HTTP 200
https://app.mycaloraapp.com/api/healthz HTTP 200
```

`/api/version` reports:

```json
{
  "gitCommit": "e7c98edd667f5c63b402bdf27ba51f114fcfb8a9",
  "releaseId": "calora-api-e7c98edd667f-20261014064946520"
}
```

The deployed release therefore matches the protected main commit.

## 5. Native-build compliance

No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, Google Play, or other native build/release/submission was triggered by this mission. Native workflow definitions were inspected only as part of safety/release-contract validation.

## 6. Deployment conclusion

**GitHub synchronization: PASS.**  
**Protected CI: PASS for the required release path.**  
**Production release identity and health: PASS.**  
**Native build restriction: PASS.**

The Report 212–216 documentation changes do not alter runtime source, so no new Railway runtime deployment is technically required beyond the repository’s documentation merge validation.
