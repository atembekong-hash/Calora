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

## Root cause and restoration

The initial production failure had two parts:

1. Replit had a public deployment record, but its current build was not
   successful. The generated URL consequently served Replit's generic
   `This app isn't live yet` placeholder instead of Calora.
2. After the owner published successfully, three public API routes still
   returned 404 because they were implemented in Express but missing from the
   API artifact's published path allowlist: `/robots.txt`, `/sitemap.xml`, and
   `/site.webmanifest`.

The artifact path allowlist was corrected through the validated artifact
configuration replacement flow, and the owner published again. The current
deployment service state is now:

- `isDeployed: true`
- `visibility: public`
- `deploymentType: autoscale`
- `primaryUrl: https://calorie-coach-pie35449.replit.app`
- `hasSuccessfulBuild: true`

Available Replit logs show transient health-check failures while the two
artifact processes were starting, followed by API startup and a successful
production build. No confirmed application crash was found.

## Before / after production URL

### Before this phase

- Historical URL: `https://calorie-coach-pie35449.replit.app`
- External behavior: Replit placeholder HTTP 404
- Production deployment state: not independently confirmed

### After workspace verification

- Replit-authoritative URL: `https://calorie-coach-pie35449.replit.app`
- URL ownership/state: confirmed by `getDeploymentInfo()`
- External behavior: Calora routes serving successfully over HTTPS
- Current successful production build: **confirmed**
- Branded domain: not connected, by design

The Replit URL is now a verified production URL for the API and its required
public pages. The branded domain remains intentionally deferred.

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
declares the API port `8080`. The API artifact path allowlist now also exposes
`/robots.txt`, `/sitemap.xml`, and `/site.webmanifest`.

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
| `/` | 200 Calora HTML | 200 |
| `/api/healthz` | 200 JSON (`{"status":"ok"}`) | 200 |
| `/privacy` | 200 Calora HTML | 200 |
| `/terms` | 200 Calora HTML | 200 |
| `/support` | 200 Calora HTML | 200 |
| `/contact` | 200 Calora HTML | 200 |
| `/delete-account` | 200 Calora HTML | 200 |
| `/subscriptions` | 200 Calora HTML | 200 |
| `/help` | 200 Calora HTML | 200 |
| `/robots.txt` | 200 text/plain | 200 |
| `/sitemap.xml` | 200 XML | 200 |
| `/site.webmanifest` | 200 manifest JSON | 200 |

The public legal and support pages expose the locked Calora identity and
canonical `https://mycaloraapp.com/...` URLs. The root path is served by the
existing Calora web export and remains branded; its native/web origin
configuration was intentionally not changed in this phase.

## Branding and security checks

Production route output uses the locked public identity:

- Calora
- Etiendem Technologies
- `https://mycaloraapp.com`
- `support@mycaloraapp.com`
- `Eat Smarter. Live Better.`

The production public-page implementation serves canonical URLs, Open Graph and
Twitter metadata, JSON-LD, robots directives, sitemap output, and the web
manifest. No credentials, secret values, or production environment values were
printed or written.

No speculative API hostname, DNS record, or native callback was activated.

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

The Replit production API is restored and verified. The remaining work is the
separate branded-domain connection:

1. Obtain the exact Replit custom-domain instructions, including the apex A
   record and permanent `replit-verify` TXT value.
2. Have the domain owner add only those Cloudflare records, keeping the Replit
   A record DNS-only.
3. Verify `https://mycaloraapp.com` after DNS and TLS activation.
4. Keep `api.mycaloraapp.com` deferred until its own hostname is intentionally
   configured and verified.

## Next step for connecting `mycaloraapp.com`

The next step is the owner-controlled Cloudflare/Replit custom-domain setup
described in the Phase 3A report. This production verification is the
prerequisite evidence for that step.

## Final verdict

REPLIT PRODUCTION RESTORED AND VERIFIED