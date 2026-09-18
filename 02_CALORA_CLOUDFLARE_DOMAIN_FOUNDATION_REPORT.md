# Calora Phase 3A — Cloudflare Domain + Branded Web Foundation Report

**Report date:** September 8, 2026  
**Authoritative metadata source:** `01_CALORA_FINAL_METADATA_SPECIFICATION.md`  
**Primary domain:** `mycaloraapp.com`  
**DNS provider:** Cloudflare  
**Phase scope:** Branded web foundation only; no native domain or authentication migration

## 1. Executive Summary

The Calora branded web foundation is implemented in the API source and is
healthy locally, but the public domain has not been connected to the
published Replit service.

The public DNS delegation is already at Cloudflare: the authoritative
nameservers observed for `mycaloraapp.com` are `demi.ns.cloudflare.com` and
`rory.ns.cloudflare.com`. However:

- `mycaloraapp.com` has no public A, CNAME, or TXT answer;
- `www.mycaloraapp.com` is NXDOMAIN;
- `api.mycaloraapp.com` is NXDOMAIN;
- no Cloudflare API token, zone ID, account ID, or Cloudflare integration is
  available in this workspace;
- the exact Replit A-record and `replit-verify` TXT values are therefore not
  available and must not be guessed;
- the historical Replit host currently returns the generic “This app isn’t
  live yet” HTTP 404 response in the latest probe.

The API server is the intended public web service. Its local routes return
the Calora-branded homepage, legal/support pages, SEO routes, manifest, and
structured metadata with canonical URLs on `mycaloraapp.com`. No DNS mutation,
Replit custom-domain registration, deployment, native build, or source
configuration change was performed in Phase 3A.

## 2. Current Outcome

DNS mutation was not attempted because Cloudflare access and the exact
Replit-provided DNS values are unavailable. The required final verdict appears
at the end of this report.

## 3. Current Hosting Architecture

### Service serving public/legal pages

The public web pages are served by the API server artifact:

- Artifact: `artifacts/api-server`
- Deployment configuration:
  `artifacts/api-server/.replit-artifact/artifact.toml`
- Production command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Production port: `8080`
- Health path: `/api/healthz`
- Replit deployment mode: root `.replit` declares an autoscale application
  deployment

The Express application mounts the public-page router at the root and under
`/api/legal`, and mounts the API router under `/api`. This means the same
published API service is the intended target for:

```text
/
/privacy
/terms
/support
/contact
/delete-account
/subscriptions
/help
/robots.txt
/sitemap.xml
/site.webmanifest
```

The mobile Expo artifact is a separate mobile preview/build artifact. It is
not the appropriate Cloudflare website target.

### Replit custom-domain status

No custom-domain registration was visible in the repository configuration,
and no account-level Publishing-domain inspection was available from this
workspace. Replit’s official custom-domain documentation states that the
domain must first be added to the published app through the Publishing
tool’s Domains tab. Replit then supplies the exact DNS values.

The relevant Replit guidance is:

- [Custom Domains](https://docs.replit.com/features/publishing/custom-domains)
- [Add a custom domain](https://docs.replit.com/build/add-custom-domain)

### Current Replit host

The historical host is:

`https://calorie-coach-pie35449.replit.app`

It was not removed or changed. The latest external probe returned the
generic Replit “This app isn’t live yet” HTTP 404 page. This is a current
deployment-state observation, not a Phase 3A DNS mutation.

## 4. Cloudflare Access Status

Cloudflare access is **not available** to this workspace.

The secure environment inspection found no configured secret or environment
value for any of the following names:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ZONE_ID
CLOUDFLARE_EMAIL
```

The available Replit integrations contain Railway, RevenueCat, Supabase,
GitHub, and other connectors, but no Cloudflare connector. No Cloudflare
integration was proposed or installed because the task did not authorize
creating a new external connection and manual DNS instructions are
sufficient.

No credential values were requested, printed, or accessed.

## 5. DNS Zone Status

The public DNS was queried read-only through Cloudflare DNS-over-HTTPS.

| Name | Record query | Observed result | Interpretation |
|---|---|---|---|
| `mycaloraapp.com` | NS | `demi.ns.cloudflare.com`, `rory.ns.cloudflare.com` | Cloudflare is authoritative |
| `mycaloraapp.com` | A | No answer | Apex is not connected to Replit |
| `mycaloraapp.com` | CNAME | No answer | No apex CNAME; none should be invented |
| `mycaloraapp.com` | TXT | No answer | No public verification TXT observed |
| `mycaloraapp.com` | MX | No answer | No public MX answer observed; do not alter email settings |
| `www.mycaloraapp.com` | A/CNAME/TXT | NXDOMAIN | `www` is not configured |
| `api.mycaloraapp.com` | A/CNAME/TXT | NXDOMAIN | API subdomain is not configured |

The absence of public MX/TXT answers is not proof that the owner’s email
provider has no private or pending setup. It is a reason to verify the
support mailbox provider before changing DNS. No email-related record was
changed.

## 6. Exact DNS Records Required

The exact numeric A value and verification TXT value are account-specific and
must be copied from Replit Publishing after the owner adds the domain. They
are not present in source, environment variables, or public DNS. Supplying a
made-up value would risk pointing the domain at the wrong service.

### Apex: `mycaloraapp.com`

In Replit Publishing:

1. Open the published **API Server** application.
2. Open **Domains**.
3. Add `mycaloraapp.com`.
4. Copy the exact records Replit displays.

In Cloudflare DNS, create only the following records using the exact values
shown by Replit:

| Type | Name | Value | Proxy | Status |
|---|---|---|---|---|
| `A` | `@` | `<EXACT A VALUE SHOWN BY REPLIT>` | **DNS only / grey cloud** | Required |
| `TXT` | `@` | `replit-verify=<EXACT VALUE SHOWN BY REPLIT>` | Not proxied | Required and permanent |

Replit’s documentation says apex CNAME records are not supported. Do not
create an apex CNAME, speculative A record, localhost record, private-IP
record, preview-host record, or generated Expo-host record.

The `replit-verify` TXT record must remain permanently so Replit can renew
the TLS certificate.

### `www.mycaloraapp.com`

`www` was not configured in Phase 3A. The safest sequence is:

1. Complete and validate the apex first.
2. Add `www.mycaloraapp.com` separately in Replit Publishing Domains if the
   owner wants the alias.
3. Copy the exact record type and values Replit provides for that hostname.
4. Use DNS-only mode for any Replit-provided A record.
5. Preserve the corresponding Replit verification TXT record.

Do not independently create a guessed CNAME for `www`. Replit’s documented
workflow requires each subdomain to be added separately and configured with
the corresponding values shown in Publishing.

The preferred canonical host remains:

`https://mycaloraapp.com`

If `www` is added, it should serve or redirect to the apex through the
verified Replit configuration. It must not become an independent canonical
website.

## 7. API Subdomain Recommendation

`api.mycaloraapp.com` should be **deferred** in Phase 3A.

Reasons:

- the current public DNS has no API record;
- no separate published API hostname was verified;
- the historical public Replit host is currently not live in the latest
  probe;
- no Replit Publishing-domain record for the API subdomain is available;
- the API deployment, health response, CORS behavior, and release identity
  must be verified before activating a client-facing API hostname.

The repository already contains future canonical references to
`https://api.mycaloraapp.com` in the production Expo configuration and
metadata. Those references are not proof that the hostname is operational.
No API DNS record should be created until the backend deployment target is
explicitly published and verified.

No native client API URL, authentication callback, Supabase redirect
allow-list, Universal Link, Android App Link, or Expo Router origin was
changed in this phase.

## 8. Existing Domain References and Classification

The repository-wide search covered `mycaloraapp.com`,
`www.mycaloraapp.com`, `api.mycaloraapp.com`,
`calorie-coach-pie35449.replit.app`, and `calora.app`. Occurrences are
classified below by operational role. Historical reports, attached mission
snapshots, tests, and generated artifacts are not treated as live DNS
configuration.

| Reference | Representative locations | Classification | Phase 3A action |
|---|---|---|---|
| `mycaloraapp.com` | `01_CALORA_FINAL_METADATA_SPECIFICATION.md`, `artifacts/calora/lib/brand.ts`, `artifacts/api-server/src/routes/public-pages.ts`, CORS policy, store metadata, universal-link docs | Future/current canonical source identity | Preserve; no migration of native links |
| `mycaloraapp.com` | `artifacts/calora/app.json`, auth/referral code, association scripts/tests | Existing native/auth/deep-link configuration | Do not change in Phase 3A |
| `www.mycaloraapp.com` | `artifacts/api-server/src/routes/universal-links.ts` host normalization | Allowed branded host variant | No DNS record created; add separately in Replit only if approved |
| `api.mycaloraapp.com` | `artifacts/calora/eas.json`, Phase 2 specification, product metadata docs | Future API canonical; not operationally verified | Defer DNS and client migration |
| `calorie-coach-pie35449.replit.app` | Phase 2 specification, readiness/auth reports, historical public URL tables | Temporary operational host / historical evidence | Preserve; no removal or routing change |
| `calora.app` | Phase 2 prohibition, release validation checks, historical reports, a local test filename | Obsolete/unapproved or internal-only | Do not publish; clean any remaining uploaded artwork later |

Additional source references are grouped as follows:

- **Current runtime/source:** public pages, CORS policy, brand constants,
  referral/invite handling, and store metadata use the approved
  `mycaloraapp.com` identity.
- **Future API configuration:** `artifacts/calora/eas.json` points
  production client configuration at `api.mycaloraapp.com`; this remains
  deferred until the backend target is verified.
- **Temporary/historical Replit references:** older readiness, auth, and
  metadata documents retain the historical Replit host as evidence of the
  previous deployment state.
- **Native migration references:** `app.json`, auth code, referral code,
  association documentation, and preflight scripts already contain branded
  values from earlier work. Phase 3A intentionally did not modify them.
- **Unapproved-domain references:** `calora.app` is not used by the current
  public-page generator. The remaining occurrences are prohibition checks,
  historical reports, mockups/tests, or a local `.app` filename and are not
  DNS records.

## 9. Branded Web Foundation Status

The local API workflow was running on port `8080` during verification.

| Route | Local result | Branded content result |
|---|---:|---|
| `/` | HTTP 200 | Calora title, description, canonical, OG, Twitter, and JSON-LD |
| `/privacy` | HTTP 200 | Calora legal page |
| `/terms` | HTTP 200 | Calora legal page |
| `/support` | HTTP 200 | Calora support page |
| `/contact` | HTTP 200 | Calora contact page |
| `/delete-account` | HTTP 200 | Calora account-deletion page |
| `/subscriptions` | HTTP 200 | Calora subscription page |
| `/help` | HTTP 200 | Calora help page |
| `/robots.txt` | HTTP 200 | Canonical sitemap and crawl rules use `mycaloraapp.com` |
| `/sitemap.xml` | HTTP 200 | URLs use `https://mycaloraapp.com` |
| `/site.webmanifest` | HTTP 200 | Name and short name are Calora |

The public branded host could not be tested because DNS is not configured.
Therefore these are source/local results, not public deployment claims.

### Metadata implemented in source

The API public-page layout currently provides:

- homepage and legal-page titles;
- meta descriptions;
- canonical URLs;
- Open Graph basics;
- Twitter/X summary-large-image basics;
- publisher identity and Calora naming;
- Organization, MobileApplication, and WebSite JSON-LD;
- branded robots and sitemap routes;
- a branded web manifest route.

The generated public-page source references a general social-card asset path.
The final reviewed binary asset was not independently verified in this phase.

No App Store or Google Play availability claim was added or made.

## 10. TLS Status

### Branded domain

TLS is **not provisioned or verifiable** for `mycaloraapp.com` because the
domain does not currently resolve to the Replit deployment and has not been
added to Replit Publishing Domains.

After the owner adds the domain and the exact Replit A/TXT records, Replit
will provision and renew the certificate through DNS validation. Cloudflare
must remain DNS-only for the Replit A record; the orange proxy must not be
enabled because it interferes with Replit certificate issuance and renewal.

### Current Replit host

The current external probe reached `calorie-coach-pie35449.replit.app` but
received the generic HTTP 404 “This app isn’t live yet” response. No Phase 3A
change caused this response, and no attempt was made to replace or remove
that host.

## 11. Validation Results

| Validation | Result |
|---|---|
| Cloudflare is authoritative for apex | **PASS — public NS answers observed** |
| Apex resolves to a hosting target | **BLOCKED — no A/CNAME answer** |
| `www` resolves | **BLOCKED — NXDOMAIN** |
| `api` resolves | **BLOCKED — NXDOMAIN** |
| Local API health `/api/healthz` | **PASS — HTTP 200** |
| Local homepage and required branded routes | **PASS — HTTP 200** |
| Local canonical URLs use `mycaloraapp.com` | **PASS** |
| Local public pages identify Calora | **PASS** |
| Local public pages identify `calora.app` as official | **PASS — no such current source output** |
| Branded HTTPS homepage | **BLOCKED — DNS unavailable** |
| Branded HTTPS legal/support routes | **BLOCKED — DNS unavailable** |
| Branded certificate validity | **BLOCKED — certificate not provisioned/observable** |
| Current Replit host remains source-configured | **PASS — no removal/change performed** |
| Current Replit host external availability | **BLOCKED — latest probe returned generic 404** |
| Email DNS mutation | **PASS — no mutation performed** |

## 12. Exact Records Changed

None.

No Cloudflare API call, Replit Publishing-domain mutation, DNS write, email
record change, source configuration change, deployment, native build, or
GitHub push was performed.

## 13. Exact Owner Actions Still Required

1. In Replit Publishing, select the published API Server application and add
   `mycaloraapp.com` under Domains.
2. Copy the exact Replit-provided apex A value and
   `replit-verify=...` TXT value.
3. In Cloudflare, create the apex A record with the **grey cloud / DNS-only**
   setting.
4. Create the exact Replit verification TXT record and leave it in place
   permanently.
5. Do not change, delete, or replace MX, SPF, DKIM, DMARC, or other
   email-related records. Verify the support mailbox provider before making
   any DNS changes.
6. Wait for Replit certificate provisioning and test:
   `https://mycaloraapp.com/`,
   `/privacy`, `/terms`, `/support`, `/contact`,
   `/delete-account`, `/subscriptions`, `/help`.
7. Only after apex validation, decide whether to add `www` as a separate
   Replit custom domain. Use only Replit-provided values.
8. Keep `api.mycaloraapp.com` deferred until the backend deployment target,
   health response, CORS, release identity, and client migration plan are
   separately verified.

## 14. Security Notes

- No Cloudflare secret or credential was available or exposed.
- No speculative DNS value was created.
- No apex CNAME, localhost address, private address, preview URL, or generated
  Expo host was proposed as a real target.
- Cloudflare proxying must remain disabled for Replit-managed TLS validation.
- The Replit verification TXT record is a continuing certificate-renewal
  dependency and must not be removed.
- Email-related DNS was not changed.
- Native auth callbacks, Supabase redirects, associated domains, Android
  intent filters, invite links, and Expo Router origin were not changed.
- Store availability claims were not added.

## 15. Rollback Status

Rollback is not required because Phase 3A made no external or source
configuration changes.

The existing Replit host was not removed, redirected, or replaced. If the
owner later adds the branded domain, rollback should consist of removing only
the Replit custom-domain association and the owner-created Calora A/TXT
records, while leaving all email records untouched. Do not use rollback to
remove the permanent verification TXT until the custom domain is intentionally
detached.

## 16. Files Changed and Deployment Actions

### Files changed

```text
02_CALORA_CLOUDFLARE_DOMAIN_FOUNDATION_REPORT.md
```

No application source, native configuration, environment variable, secret,
database, workflow, artifact deployment configuration, or store record was
changed.

### Deployment actions taken

None. No publish action, domain registration, DNS mutation, build, EAS/Expo
build, native deployment, or GitHub push was performed.

## 17. Unresolved Blockers

- Owner must connect the apex domain to the published Replit API Server using
  the exact A/TXT values shown in Replit Publishing.
- The current Replit public host is not live in the latest external probe and
  needs deployment-state resolution before branded public validation can
  complete.
- `www` has no configured DNS and should be handled only after apex validation.
- `api.mycaloraapp.com` has no DNS and should remain deferred.
- Public MX/TXT answers were not observed, so support email deliverability
  must be verified independently before any DNS changes.
- Branded TLS, public routes, canonical headers, association files, and
  certificate renewal cannot be validated until DNS and Replit custom-domain
  setup are complete.

## Final verdict

OWNER DNS ACTION REQUIRED