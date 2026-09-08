# Calora Branded Domain Connection Report

**Phase:** 3C — Connect `mycaloraapp.com` to Replit through Cloudflare  
**Date:** September 8, 2026  
**Product:** Calora  
**Publisher:** Etiendem Technologies  
**Requested hostname:** `https://mycaloraapp.com`

## Executive summary

The verified Replit production API is healthy and now publicly serving Calora
through the branded domain:

`https://mycaloraapp.com`

The owner completed the Replit Publishing association. Independent checks now
confirm the exact Replit A record, permanent `replit-verify` TXT record, public
DNS resolution, a valid hostname-matched TLS certificate, and successful
production responses for the complete required route matrix.

The restricted Cloudflare token was used only for read-only verification in
this phase. The existing MX, SPF, and DKIM records remain intact. No unrelated
DNS records, email settings, native settings, or deferred hostnames were
changed.

## Verified Replit deployment identity

- Deployment type: autoscale
- Deployment status: active
- Build status: successful
- Visibility: public
- Authoritative production URL: `https://mycaloraapp.com`
- Additional Replit production URL:
  `https://calorie-coach-pie35449.replit.app`
- Production health endpoint: HTTP 200, `{"status":"ok"}`
- Old Replit production URL status: still healthy and serving the API

The branded apex is routed to the API artifact. The Expo web artifact is
isolated at `/mobile`; it is not the branded apex target.

## Cloudflare token capability result

The `CLOUDFLARE_API_TOKEN` value was never printed, logged, persisted, committed,
or included in this report.

Read-only checks performed:

- Cloudflare token verification: active
- `mycaloraapp.com` zone lookup: exactly one active zone found
- `mycaloraapp.com` DNS record read: permitted
- Unrelated `example.com` zone lookup: zero zones returned

The observed result is consistent with a token restricted to the intended
zone. No broader permission was requested or added.

## Cloudflare zone verification

- Zone: `mycaloraapp.com`
- Zone status: active
- Cloudflare is the authoritative DNS provider for the zone
- Zone ID was used internally for read-only API requests and is not required
  for the pending owner action

## Pre-change DNS inventory

The complete visible pre-change inventory contained only the following
email-related records:

| Type | Name | Content / target | Proxy | TTL |
|---|---|---|---|---:|
| MX | `send.mycaloraapp.com` | `feedback-smtp.us-east-1.amazonses.com` | DNS only | 3600 |
| TXT | `resend._domainkey.mycaloraapp.com` | Existing Resend DKIM public key | DNS only | 3600 |
| TXT | `send.mycaloraapp.com` | `v=spf1 include:amazonses.com ~all` | DNS only | 3600 |

The apex currently has no visible A, AAAA, or TXT record. Direct public DNS
lookups also returned no apex A, AAAA, or TXT answer.

## Pre-owner custom-domain checkpoint

Not yet available. The Replit Publishing custom-domain association has not
been created, so Replit has not supplied the exact current DNS values.

No A record, `replit-verify` TXT record, proxy setting, or hostname was
invented, reused, or hardcoded.

Once the owner associates the domain in Replit Publishing, use only the exact
records generated for this deployment. The expected shape may be an apex A
record and a permanent verification TXT record, but that shape is not treated
as authoritative until Replit provides the values.

## Pre-owner DNS mutation checkpoint

None.

- DNS mutation status: not started
- Existing MX record: preserved
- Existing SPF record: preserved
- Existing DKIM record: preserved
- Nameservers: untouched
- Unrelated TXT records: untouched
- Cloudflare services: untouched

Email DNS was not changed or deleted.

## Pre-owner Replit domain checkpoint

Pending owner action. `mycaloraapp.com` is not currently associated with the
verified Replit production deployment through the available controls.

The smallest required owner action is:

1. Open Replit Publishing → Custom Domains for the current published
   deployment.
2. Add exactly `mycaloraapp.com`.
3. Ensure the target is
   `https://calorie-coach-pie35449.replit.app`, not a preview or mobile
   service.
4. Copy the exact DNS records Replit generates.
5. Return to this task so the records can be reviewed before any Cloudflare
   mutation.

## Pre-owner propagation checkpoint

Not started because no Replit DNS instructions have been generated and no
records have been added.

- Apex public A resolution: no answer
- Apex public AAAA resolution: no answer
- Apex public TXT resolution: no answer
- Branded HTTPS certificate: not yet applicable
- Branded HTTPS route validation: not yet applicable

## Pre-owner route checkpoint

The branded hostname cannot yet be probed as a connected Replit service.
All rows below are therefore pending and are not counted as successful:

| Route | Status |
|---|---|
| `https://mycaloraapp.com/` | Pending domain connection |
| `https://mycaloraapp.com/api/healthz` | Pending domain connection |
| `https://mycaloraapp.com/privacy` | Pending domain connection |
| `https://mycaloraapp.com/terms` | Pending domain connection |
| `https://mycaloraapp.com/support` | Pending domain connection |
| `https://mycaloraapp.com/contact` | Pending domain connection |
| `https://mycaloraapp.com/delete-account` | Pending domain connection |
| `https://mycaloraapp.com/subscriptions` | Pending domain connection |
| `https://mycaloraapp.com/help` | Pending domain connection |
| `https://mycaloraapp.com/robots.txt` | Pending domain connection |
| `https://mycaloraapp.com/sitemap.xml` | Pending domain connection |
| `https://mycaloraapp.com/site.webmanifest` | Pending domain connection |

The verified Replit URL remains healthy and was not replaced:

`https://calorie-coach-pie35449.replit.app/api/healthz` → HTTP 200.

## Pre-owner identity checkpoint

The production API pages were previously verified at the Replit URL with:

- Calora branding
- Etiendem Technologies
- `support@mycaloraapp.com`
- canonical `https://mycaloraapp.com/...` URLs on legal/support pages
- no `calora.app` presentation
- no localhost or development URL exposure in the public API pages

The same checks must be rerun against `https://mycaloraapp.com` after DNS and
TLS are active. No secret values were exposed.

## Deferred hostnames and configuration

- `www.mycaloraapp.com`: intentionally deferred
- `api.mycaloraapp.com`: intentionally deferred
- Native auth callbacks: untouched
- Supabase redirects: untouched
- Universal Links: untouched
- Android App Links: untouched
- Expo Router origin: untouched
- Native API URL: untouched
- Invite-link migration: untouched
- Expo/EAS builds: not performed
- GitHub: no push made

## Files and configuration changed

Created:

- `04_CALORA_BRANDED_DOMAIN_CONNECTION_REPORT.md`

Updated through validated artifact configuration replacement:

- `artifacts/api-server/.replit-artifact/artifact.toml`
- `artifacts/calora/.replit-artifact/artifact.toml`

The API artifact now owns `/` and the required API/public paths. The Expo
artifact is served at `/mobile`. No application source, native configuration,
Cloudflare record, or native build was changed.

## External actions performed

- Read-only Cloudflare token verification
- Read-only Cloudflare zone lookup
- Read-only Cloudflare DNS inventory
- Non-mutating unrelated-zone scope check
- Replit deployment status verification
- Public DNS lookups for the apex
- Public health check against the verified Replit URL
- Public DNS-over-HTTPS lookups through Cloudflare and Google resolvers
- TLS handshake and certificate verification for `mycaloraapp.com`
- Complete branded HTTPS route and content matrix
- Public identity and forbidden-content checks
- Confirmation that the original Replit URL remains healthy

## Rollback instructions

The Cloudflare DNS state is currently valid and should not be rolled back.
If the domain must be detached later, remove only the Replit-created apex A
and `replit-verify` TXT records after detaching the hostname in Replit.

After Replit generates exact records and they are intentionally added, any
rollback must first detach the custom domain in Replit, then remove only the
specific Replit-created record IDs. Do not remove or alter the preserved MX,
SPF, DKIM, or unrelated TXT records.

## Remaining blockers

No Phase 3C blockers remain. The intentionally deferred `www` and `api`
hostnames and all native/auth/deep-link migrations remain outside this phase.

## Exact next recommended phase

The next recommended work is a separately approved Phase 4. Do not begin it as
part of this report, and do not change `www`, `api`, native API URLs, auth
callbacks, redirects, app-link configuration, or invite links without an
explicit Phase 4 scope.

## POST-OWNER-ACTION FINAL VERIFICATION

### Current Replit deployment and custom-domain association

The deployment service currently reports:

- `success: true`
- `isDeployed: true`
- `hasSuccessfulBuild: true`
- `visibility: public`
- `deploymentType: autoscale`
- `primaryUrl: https://mycaloraapp.com`
- `additionalUrls: https://calorie-coach-pie35449.replit.app`

The owner-reported Replit Publishing state showed `mycaloraapp.com` as
Verified. Independent metadata now also identifies `mycaloraapp.com` as the
primary production URL, confirming that the branded hostname is associated with
the published project rather than only appearing in the UI.

### Current Cloudflare DNS state

Current Cloudflare API read:

| Type | Name | Content / target | Proxy | TTL |
|---|---|---|---|---:|
| A | `mycaloraapp.com` | `34.111.179.208` | DNS only | 3600 |
| TXT | `mycaloraapp.com` | `replit-verify=ca099224-706d-42a2-b6d4-c23233267a84` | DNS only | 3600 |
| MX | `send.mycaloraapp.com` | `feedback-smtp.us-east-1.amazonses.com` | DNS only | 3600 |
| TXT | `resend._domainkey.mycaloraapp.com` | Existing Resend DKIM public key | DNS only | 3600 |
| TXT | `send.mycaloraapp.com` | `v=spf1 include:amazonses.com ~all` | DNS only | 3600 |

There is exactly one apex A record and no conflicting apex AAAA or CNAME
record in the visible Cloudflare inventory. The A record is DNS-only, as
required. The Replit verification TXT record is present and publicly visible.
The MX, SPF, and DKIM records remain present and unchanged.

### Public DNS evidence

Independent DNS-over-HTTPS lookups returned:

- Cloudflare resolver: `mycaloraapp.com A → 34.111.179.208`
- Google resolver: `mycaloraapp.com A → 34.111.179.208`
- Cloudflare resolver: required `replit-verify` TXT present
- Google resolver: required `replit-verify` TXT present

### TLS and HTTPS evidence

The independent TLS handshake succeeded with:

- Certificate subject: `CN = mycaloraapp.com`
- Subject Alternative Name: `DNS:mycaloraapp.com`
- Issuer: Let's Encrypt `YE2`
- Validity observed: September 8, 2026 through December 7, 2026
- OpenSSL verification: `Verify return code: 0 (ok)`

All requests completed without a redirect loop and ended at the requested
`https://mycaloraapp.com/...` URL. No Replit placeholder page was returned.

### Complete branded HTTPS route matrix

| Route | Status | Content |
|---|---:|---|
| `/` | 200 | API-served Calora HTML |
| `/api/healthz` | 200 | JSON `{"status":"ok"}` |
| `/privacy` | 200 | Calora HTML |
| `/terms` | 200 | Calora HTML |
| `/support` | 200 | Calora HTML |
| `/contact` | 200 | Calora HTML |
| `/delete-account` | 200 | Calora HTML |
| `/subscriptions` | 200 | Calora HTML |
| `/help` | 200 | Calora HTML |
| `/robots.txt` | 200 | `text/plain` |
| `/sitemap.xml` | 200 | XML |
| `/site.webmanifest` | 200 | Manifest JSON |

### Branding and security verification

The complete public content check confirmed:

- Calora
- Etiendem Technologies
- `support@mycaloraapp.com`
- `Eat Smarter. Live Better.`
- canonical `https://mycaloraapp.com` URLs
- no `calora.app`
- no localhost or loopback URLs
- no Replit development or preview URLs
- no Expo preview copy at the branded apex
- no placeholder page
- no secrets or debug information

The API now owns the branded apex. The mobile artifact remains available at
`/mobile` and is not the branded apex target.

### Original Replit URL

The original URL remains healthy:

- `https://calorie-coach-pie35449.replit.app/` → HTTP 200 production content
- `https://calorie-coach-pie35449.replit.app/api/healthz` → HTTP 200

### Deferred hostname and configuration status

- `www.mycaloraapp.com`: intentionally deferred and untouched
- `api.mycaloraapp.com`: intentionally deferred and untouched
- Supabase redirect migration: untouched
- OAuth callback migration: untouched
- Universal Links: untouched
- Android App Links: untouched
- Expo Router origin: untouched
- Native API URL migration: untouched
- Invite-link migration: untouched
- Expo/EAS build: not triggered
- Native build: not triggered
- GitHub push: not performed
- Cloudflare permissions: not broadened
- Email DNS: not changed

## Final verdict

BRANDED DOMAIN CONNECTION COMPLETE
OWNER REPLIT ACTION REQUIRED