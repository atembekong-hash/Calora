# Native association monitor

The repository contains a scheduled GitHub Actions check at
`.github/workflows/monitor-native-associations.yml`. It runs daily and can also
be started manually from the workflow page.

The check fetches these production endpoints over HTTPS:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

It fails the workflow if either endpoint is unavailable, redirects, returns
non-JSON content, or no longer contains the required native identity:

- the Calora Apple app ID and exact `/auth/callback` Universal Links component;
- the Calora Android package and `delegate_permission/common.handle_all_urls`;
- the expected Android SHA-256 signing certificate fingerprint.

## CI configuration

Configure these repository **Actions secrets** before enabling the scheduled
check:

- `CALORA_APPLE_TEAM_ID` — the Apple Developer Team ID used in the production
  AASA app ID;
- `CALORA_ANDROID_SHA256_FINGERPRINT` — the expected Android signing
  certificate fingerprint, in colon-separated SHA-256 format. Multiple
  accepted fingerprints may be comma-separated.

The monitor passes these values to the process without printing them. It never
logs the association response bodies. If either secret is missing, the job
fails with a remediation message rather than running an incomplete check.

The production origin is currently defined in the workflow as
`https://calorie-coach-pie35449.replit.app`. Update that non-secret value if
the canonical production host changes.

## Local check

For a local or release check, provide the same values through the environment
without committing them:

```sh
APPLE_TEAM_ID='…' \
ANDROID_SHA256_FINGERPRINT='…' \
node scripts/monitor-native-associations.mjs
```

The script has no third-party runtime dependencies. Its unit tests can be run
with:

```sh
node --test scripts/monitor-native-associations.test.mjs
```