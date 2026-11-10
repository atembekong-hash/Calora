# Mission 403 — Final Production Dependency Verification

**Date:** 2026-11-07  
**Verdict:** **INCONCLUSIVE**  
**Scope:** Read-only verification of production dependencies that could make retiring `calora-recovery-test-20261107` unsafe

## Executive verdict

The remaining FatSecret gateway was inspected and shows **no Supabase, database, or recipe-storage configuration**. Its visible production configuration therefore has no identified dependency on the temporary recovery project. The gateway’s `REVENUECAT_PROJECT_ID` is an external-provider identifier and is not a Supabase project reference; its protected value was not exposed.

The overall mission cannot be marked PASS because Railway does not expose protected variable values. The API service’s external recipe-photo storage endpoint and bucket settings remain material unresolved checks. The owner must compare those values privately against the recovery project ID/host and confirm they point to the intended external storage service rather than Supabase recovery.

No deployment, restart, source-branch change, environment-variable change, storage access, database write, project mutation, deletion, native build, or store release was performed.

## Immutable identities

- Production Supabase: `caloraapp` / `pzdulhkpwbrbrgskwwwe` / `db.pzdulhkpwbrbrgskwwwe.supabase.co`
- Temporary recovery: `calora-recovery-test-20261107` / `rqiwgktdqiqqwipznyyf` / `db.rqiwgktdqiqqwipznyyf.supabase.co`
- Railway project: `attractive-harmony`

These identities were already verified in Missions 400–402 and remain unchanged. The current check did not repeat the completed API/app endpoint verification except where needed to classify the remaining storage uncertainty.

## Dependency decision table

| Service or integration | Configuration inspected | Verified destination / finding | Recovery dependency | Evidence reference | Remaining owner action |
|---|---|---|---|---|---|
| Railway API service `@workspace/api-server` | Existing engineer finding; visible Railway variable names; source declarations for `EXPO_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, and recipe-photo storage settings | Existing engineer report states production Supabase/database URLs point to `pzdulhkpwbrbrgskwwwe`; visible repository contains no recovery host. Protected recipe-photo endpoint/bucket values are not exposed. | **UNKNOWN** for external storage; **NO** for verified Supabase/database destination | Missions 401–402; repository `artifacts/api-server/.env.example`, `recipe-photo-storage.ts`; Railway API service description | Owner privately compare `RECIPE_PHOTO_STORAGE_ENDPOINT`, `RECIPE_PHOTO_BUCKET`, and aliases (`S3_ENDPOINT`, `AWS_ENDPOINT_URL_S3`, `ENDPOINT`, `S3_BUCKET`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `BUCKET`) against the recovery host/ID. Do not share values. |
| Railway app service `@workspace/calora` | Existing engineer finding; visible source and environment variable names | Production Supabase/API configuration already reported as production; no recovery identifier in visible app source/configuration. | **NO** based on existing production finding | Mission 402; Railway app service description; repository search | None for recovery retirement, provided the existing engineer finding is accepted. |
| Railway FatSecret gateway `@workspace/fatsecret-gateway` | Full non-secret service configuration, source branch, variable names, build/start commands | Gateway runs the FatSecret service from `release/calora-production`. Variables are only `CALORA_GATEWAY_SECRET`, `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`, `FATSECRET_PROVIDER_TIMEOUT_MS`, and `REVENUECAT_PROJECT_ID`. No Supabase URL, database endpoint, storage endpoint, or recovery project ID is configured. | **NO identified recovery dependency** | Railway FatSecret service description; `artifacts/api-server/.env.example`; gateway service deployment metadata | None for Supabase recovery retirement. The protected RevenueCat value can be checked independently if external-provider certification requires it; it cannot reference a Supabase project merely by variable role. |
| Recipe-photo storage integration | Source configuration contract and production variable names | Source uses an S3-compatible endpoint/bucket contract, not Supabase Storage by default. Actual production endpoint and bucket are protected Railway values. | **UNKNOWN** | `artifacts/api-server/src/lib/recipe-photo-storage.ts`; Mission 402 storage findings | Owner compare protected endpoint host and bucket privately. Confirm they do not equal `db.rqiwgktdqiqqwipznyyf.supabase.co`, a recovery Supabase Storage host, or a recovery-specific bucket. |
| Supabase Storage on recovery project | Recovery project metadata only | `storage.buckets` and `storage.objects` exist with RLS enabled; no visible recovery buckets/objects were returned. This does not establish anything about the external S3-compatible production store. | **NO active production dependency identified; storage completeness UNKNOWN** | Mission 402; bounded recovery metadata query | Preserve or explicitly waive storage-recovery evidence before deletion. No private object was accessed. |
| RevenueCat integration | Source variable contract and Railway variable names | API source uses `REVENUECAT_PROJECT_ID`, `REVENUECAT_SECRET_API_KEY`, and `REVENUECAT_ENTITLEMENT_API_KEY`; gateway exposes `REVENUECAT_PROJECT_ID`. This is an external provider, not a Supabase project reference. | **NO recovery-project dependency identified** | `artifacts/api-server/src/lib/revenuecat.ts`; `artifacts/api-server/.env.example`; Railway service descriptions | Any RevenueCat state-recovery test can be performed independently later. Do not run transactions or mutate subscriptions for this mission. |
| Webhook destinations | Repository/deployment declarations searched for recovery ID/host and relevant webhook references | No recovery-project reference found in visible source/configuration. Protected runtime endpoint values were not exposed. | **NO visible dependency; UNKNOWN for hidden runtime values** | Mission 402 source/config search; current targeted search | Owner need only inspect protected webhook/provider URL settings if the deployment dashboard shows such variables. |
| GitHub Actions and deployment configuration | Workflow source and GitHub deployment environment metadata | CI uses local/test URLs or protected QA secrets; no recovery ID appears. The primary Railway environment is `attractive-harmony / production`. GitHub secret-name endpoint did not provide usable names for the attempted environment labels. | **NO visible dependency; UNKNOWN for protected environment values** | Mission 402; `.github/workflows/*`; GitHub environment metadata | No action unless owner can identify a production environment secret containing a Supabase/storage endpoint. Compare privately. |

## Protected-value limitation

The Railway service inspection returns variable names but never their values. The material unresolved names are:

- API: `RECIPE_PHOTO_STORAGE_ENDPOINT`, `RECIPE_PHOTO_BUCKET` and supported aliases such as `S3_ENDPOINT`, `AWS_ENDPOINT_URL_S3`, `ENDPOINT`, `S3_BUCKET`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, and `BUCKET`.
- API: `SUPABASE_SERVICE_ROLE_KEY` is protected, but the project identity is determined by the paired Supabase URL/database endpoint, not by assuming a key reveals its project.
- Gateway: `REVENUECAT_PROJECT_ID` is protected, but it is an external-provider identifier and not a Supabase project reference.
- Any provider/webhook endpoint stored in a protected Railway or GitHub environment variable.

No protected value was printed, exported, serialized, transmitted, or requested from the user.

## Exact owner verification procedure

In Railway, select project **attractive-harmony**, environment **production**, and the API service. Without copying or sending values:

1. Open the variables list and locate `RECIPE_PHOTO_STORAGE_ENDPOINT` and `RECIPE_PHOTO_BUCKET`; also check the documented aliases if present.
2. Compare the endpoint hostname and bucket identifier privately against:
   - Recovery database host: `db.rqiwgktdqiqqwipznyyf.supabase.co`
   - Recovery project ID: `rqiwgktdqiqqwipznyyf`
   - Production database host: `db.pzdulhkpwbrbrgskwwwe.supabase.co`
3. Confirm the production recipe-photo endpoint is the intended external S3-compatible object-storage endpoint and not the temporary Supabase recovery project.
4. Check any webhook/provider URL variables shown in the same production environment for the recovery host/ID.
5. Record only a boolean result: “no recovery reference” or “recovery reference found.” Do not share endpoint URLs, bucket names, access keys, secret keys, or tokens.

If the comparison is negative, the retirement decision changes to **FAIL** and the recovery project must not be deleted. If it is positive and storage/auth evidence is preserved or explicitly waived, this specific dependency check can be closed.

## Final decision table

| Retirement condition | Result | Explanation |
|---|---|---|
| Production and recovery identities verified | PASS | Immutable IDs and hosts are distinct. |
| API/app Supabase/database destination | PASS based on existing engineer evidence | Reported production endpoints point to the production project. |
| FatSecret gateway recovery dependency | PASS / NO identified dependency | No Supabase, database, or storage variables are present. |
| RevenueCat recovery dependency | PASS / NO identified dependency | External provider integration is independent of Supabase project identity. |
| Visible repository/CI recovery references | PASS | Only certification evidence contains the recovery identifier. |
| Production external recipe storage dependency | **OWNER ACTION REQUIRED** | Protected endpoint and bucket values cannot be inspected safely here. |
| Hidden webhook/provider endpoint dependency | OWNER ACTION REQUIRED if such variables exist | No visible recovery reference; protected runtime values remain unavailable. |
| All relevant dependencies verified | **INCONCLUSIVE** | API storage and any hidden runtime endpoint values remain unverified. |

## Final verdict

**INCONCLUSIVE.** No confirmed production dependency on `rqiwgktdqiqqwipznyyf` was found. The FatSecret gateway is clear of Supabase/database/storage configuration. However, PASS cannot be claimed because the API’s protected external-storage endpoint/bucket values and any hidden runtime webhook/provider endpoints cannot be safely inspected through authorized tools.

The smallest remaining action is the owner-operated Railway comparison described above. This mission does not authorize deletion, and CAL-17 remains BLOCKED.
