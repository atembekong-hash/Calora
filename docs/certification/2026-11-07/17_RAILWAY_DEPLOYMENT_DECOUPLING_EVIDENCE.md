# Railway Deployment Decoupling Evidence

**Date:** 2026-11-07  
**Project:** `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)  
**Environment:** `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

## Read-only findings

Railway currently has three production services connected directly to `atembekong-hash/Calora@main`:

- `Calora` — service `34cc2dda-a35e-49c4-a93f-b6846c2a0f02`
- `@workspace/api-server` — service `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`
- `@workspace/calora` — service `c9c9f941-10fa-4495-88cf-ba9999a28af7`

The environment had no staged changes. All three services were healthy at the read-only check; no deployment or restart was performed. Recent successful deployments for the first two services were created from `main` at `eefba459` after PR #393, confirming the merge-to-Railway coupling. The `@workspace/calora` service's latest deployment is older and is also connected to `main`.

## Proposed owner-approved change

Use **manual deployment triggering** for the production environment (Railway dashboard setting equivalent to “Trigger Manual”), while retaining `main` as the source branch. This is the smallest, clearest change: GitHub merges continue to update source history, but production does not roll out until an owner explicitly starts a Railway deployment after release validation and serving-SHA review.

If Railway cannot apply a manual trigger consistently across all three services, the fallback is a dedicated protected release branch (for example `release/calora-production`) connected to production, with merges to `main` remaining independent. The release branch must itself be protected and updated only through an approved release PR after the same validation gate.

Do not apply either change automatically in this certification mission. The production configuration is unchanged and remains owner-controlled.

## Release procedure after decoupling

1. Merge source PR through protected `main` only after `Run release validation suite` succeeds.
2. Review the exact merge SHA and release evidence.
3. Owner explicitly triggers the Railway production deployment for that SHA.
4. Verify all three services settle successfully and the public runtime reports the same source identity.
5. Record deployment IDs, serving SHA, health, and rollback reference in the release report.

## Safety verdict

`PRODUCTION_CONFIGURATION_UNCHANGED`. This report is evidence for the owner’s configuration decision; it is not a deployment approval and contains no credentials.
