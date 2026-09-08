# Calora Replit Production Restore Report

**Phase:** 3B — Replit production restore and independent verification  
**Date:** September 8, 2026  
**Product:** Calora  
**Publisher:** Etiendem Technologies  
**Canonical domain:** `https://mycaloraapp.com`

## Scope and safety boundary

This phase was limited to restoring and independently verifying the Replit-hosted
production API before any branded-domain connection. No Cloudflare DNS records,
native auth callbacks, Supabase redirects, Universal Links, Android App Links,
Expo Router origin, API client URLs, native builds, or GitHub pushes were changed.

## Root cause

The Replit deployment service reports that a public autoscale deployment record
exists, but its current build is **not successful**:

- `isDeployed: true`
- `visibility: public`
- `deploymentType: autoscale`
- `primaryUrl: https://calorie-coach-pie35449.replit.app`
- `hasSuccessfulBuild: false`

Independent HTTPS probes to the authoritative production URL return Replit's
generic placeholder page, `This app isn't live yet`, with HTTP 404 for `/`,
`/api/healthz`, and all required public routes. This is not an application
response from Calora.

Available Replit logs show repeated startup health-check failures while artifact
processes were being brought up, followed by successful API startup and
successful route requests in a later run. The logs do not show a confirmed
application crash. They do show normal SIGTERM shutdowns of the artifact
processes. The current evidence therefore points to an unpublished, failed, or
not-currently-serving Replit build rather than a verified source-level API
failure.

## Before / after production URL

### Before this phase

- Historical URL: `https://calorie-coach-pie35449.replit.app`
- External behavior: Replit placeholder HTTP 404
- Production deployment state: not independently confirmed

### After workspace verification

- Replit-authoritative URL: `https://calorie-coach-pie35449.replit.app`
- URL ownership/state: confirmed by `getDeploymentInfo()`
- External behavior: unchanged placeholder HTTP 404
- Current successful production build: **not confirmed**
- Branded domain: not connected, by design

There is no verified “after” production URL because Replit has not reported a
successful current build and the existing URL is not serving the API.

## Deployment and build evidence

### Artifact configuration checked

`artifacts/api-server/.replit-artifact/artifact.toml` currently specifies:

- Local and production service port: `8080`
- Production build:
  `pnpm --filter @workspace/api-server run build`
- Production startup:
  `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Production `PORT`: `8080`
- Startup health path: `/api/healthz`

The root `.replit` file remains configured for an autoscale application and
declares the API port `8080`. No deployment configuration edit was necessary.

### Local exact-production-contract verification

- Current workspace commit: `dfe4344eb5ff29a0b6152878532728bd0c2405de`
- Working tree: clean
- Exact API production build: passed
- Built output: `artifacts/api-server/dist/index.mjs` exists and is non-empty
- Local `/api/healthz`: HTTP 200
- Local API startup: listening on port `8080`

## External route matrix

Probe target: `https://calorie-coach-pie35449.replit.app`

| Route | Result | Expected |
|---|---:|---:|
| `/` | 404 placeholder | 200 |
| `/api/healthz` | 404 placeholder | 200 |
| `/privacy` | 404 placeholder | 200 |
| `/terms` | 404 placeholder | 200 |
| `/support` | 404 placeholder | 200 |
| `/contact` | 404 placeholder | 200 |
| `/delete-account` | 404 placeholder | 200 |
| `/subscriptions` | 404 placeholder | 200 |
| `/help` | 404 placeholder | 200 |
| `/robots.txt` | 404 placeholder | 200 |
| `/sitemap.xml` | 404 placeholder | 200 |
| `/site.webmanifest` | 404 placeholder | 200 |

The placeholder body was the same Replit “This app isn't live yet” page rather
than Calora HTML or JSON.

## Branding and security checks

Local route output uses the locked public identity:

- Calora
- Etiendem Technologies
- `https://mycaloraapp.com`
- `support@mycaloraapp.com`
- `Eat Smarter. Live Better.`

The local public-page implementation includes canonical URLs, Open Graph and
Twitter metadata, JSON-LD, robots directives, sitemap output, and the web
manifest. These checks are local-only until a successful public build exists.

No credentials, secret values, or production environment values were printed or
written. No speculative API hostname, DNS record, or native callback was
activated.

## Untouched confirmations

- Cloudflare DNS: untouched
- Apex, `www`, and `api` records: untouched
- Replit custom-domain settings: untouched
- Native auth callbacks: untouched
- Supabase redirects: untouched
- Universal Links and Android App Links: untouched
- Expo Router origin and API client URLs: untouched
- Native builds: untouched
- GitHub: no push made

## Remaining blockers

1. Replit currently reports `hasSuccessfulBuild: false`.
2. The generated Replit production URL is serving the platform placeholder
   rather than the API artifact.
3. The workspace can verify the artifact and inspect deployment state, but it
   cannot click Replit's Publish control or force a new production publication.
4. `api.mycaloraapp.com` must remain deferred until the Replit production URL
   serves successfully and its route matrix passes over HTTPS.

## Required owner action

Open Replit Publishing for this project and publish the current workspace
configuration. The publish must use the existing API artifact production
settings and complete with a successful build. After publishing, the owner
should provide or allow verification of the resulting authoritative URL so the
external route matrix can be rerun.

Do not connect `mycaloraapp.com` or create Cloudflare records until that
verification passes.

## Next step for connecting `mycaloraapp.com`

After a successful Replit publication is independently verified:

1. Confirm the authoritative Replit production URL and successful build state.
2. Re-run the complete HTTPS route and branding matrix.
3. Obtain the exact Replit custom-domain instructions, including the apex A
   record and permanent `replit-verify` TXT value.
4. Have the domain owner add only those Cloudflare records, keeping the Replit
   A record DNS-only.
5. Verify `https://mycaloraapp.com` before considering any later `www` or API
   hostname work.

## Final verdict

OWNER REPLIT ACTION REQUIRED