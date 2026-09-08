# Calora Branded Domain Connection Report

**Phase:** 3C — Connect `mycaloraapp.com` to Replit through Cloudflare  
**Date:** September 8, 2026  
**Product:** Calora  
**Publisher:** Etiendem Technologies  
**Requested hostname:** `https://mycaloraapp.com`

## Executive summary

The verified Replit production API is healthy and publicly serving Calora at:

`https://calorie-coach-pie35449.replit.app`

The restricted Cloudflare token is present and active. The `mycaloraapp.com`
zone is visible and active, and its current DNS inventory contains only email
records. No DNS records were created, changed, or deleted.

The remaining prerequisite is the Replit Publishing custom-domain association.
The available agent controls can inspect deployment state but cannot add a
custom domain or retrieve the exact Replit-generated DNS instructions. DNS
mutation is intentionally stopped until the owner adds `mycaloraapp.com` to
this exact production deployment and provides the generated record values.

## Verified Replit deployment identity

- Deployment type: autoscale
- Deployment status: active
- Build status: successful
- Visibility: public
- Authoritative production URL:
  `https://calorie-coach-pie35449.replit.app`
- Production health endpoint: HTTP 200, `{"status":"ok"}`
- Old Replit production URL status: still healthy and serving the API

No development server, workspace preview, mobile preview, Expo development
server, or localhost target was used.

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

## Exact Replit custom-domain requirements

Not yet available. The Replit Publishing custom-domain association has not
been created, so Replit has not supplied the exact current DNS values.

No A record, `replit-verify` TXT record, proxy setting, or hostname was
invented, reused, or hardcoded.

Once the owner associates the domain in Replit Publishing, use only the exact
records generated for this deployment. The expected shape may be an apex A
record and a permanent verification TXT record, but that shape is not treated
as authoritative until Replit provides the values.

## DNS records created or changed

None.

- DNS mutation status: not started
- Existing MX record: preserved
- Existing SPF record: preserved
- Existing DKIM record: preserved
- Nameservers: untouched
- Unrelated TXT records: untouched
- Cloudflare services: untouched

Email DNS was not changed or deleted.

## Replit domain verification status

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

## DNS propagation and TLS evidence

Not started because no Replit DNS instructions have been generated and no
records have been added.

- Apex public A resolution: no answer
- Apex public AAAA resolution: no answer
- Apex public TXT resolution: no answer
- Branded HTTPS certificate: not yet applicable
- Branded HTTPS route validation: not yet applicable

## External HTTPS route matrix

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

## Canonical, branding, and security verification

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

No application source, native configuration, deployment configuration,
Cloudflare record, or Replit production setting was changed.

## External actions performed

- Read-only Cloudflare token verification
- Read-only Cloudflare zone lookup
- Read-only Cloudflare DNS inventory
- Non-mutating unrelated-zone scope check
- Replit deployment status verification
- Public DNS lookups for the apex
- Public health check against the verified Replit URL

## Rollback instructions

There is currently nothing to roll back because no DNS mutation occurred.

After Replit generates exact records and they are intentionally added, any
rollback must first detach the custom domain in Replit, then remove only the
specific Replit-created record IDs. Do not remove or alter the preserved MX,
SPF, DKIM, or unrelated TXT records.

## Remaining blockers

The Replit Publishing custom-domain association is required before DNS values,
TLS provisioning, and branded HTTPS validation can begin. The agent cannot
perform that account-level Publishing action through the available controls.

## Exact next recommended phase

After the owner adds `mycaloraapp.com` to the verified Replit deployment and
provides the generated DNS instructions, resume Phase 3C at safe DNS review:
compare the exact requested records against this pre-change inventory, add only
the required apex and verification records, then wait for Replit validation
and run the complete branded HTTPS matrix.

## Final verdict

OWNER REPLIT ACTION REQUIRED