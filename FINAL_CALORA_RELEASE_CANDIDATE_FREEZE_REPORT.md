> **SUPERSEDED FOR FUTURE SIGNED BUILDS (2026-08-27):** The release source in this
> report predates the Premium revalidation and broad consent-gated Coach repairs.
> Use `CALORA_PRODUCTION_READINESS_2026-08-27_COACH_CONSENT_ANDROID_APK.md` and
> immutable ref `origin/calora-rc-2026-08-27-coach-consent-apk` instead. This
> historical report remains only as evidence for its earlier candidate.

# Final Calora Release Candidate Freeze Report

**Freeze date:** 2026-08-27  
**Final verdict:** **FROZEN**  
**Signed-device validation decision:** **GO**

## 1. Final verdict

**FROZEN**

Calora has one exact, reproducible, validated release-candidate commit. This verdict authorizes progression to signed Android and iOS physical-device validation. It does not declare the application production-launched or fully production-ready.

The Git commit and tree are immutable source identifiers. The GitHub RC branch is a mutable ref, so build operators must verify and detach at the exact SHA rather than trusting the branch name alone.

## 2. Exact repository and branch

- GitHub repository: `https://github.com/atembekong-hash/Calora.git`
- Validated local branch: `main`
- GitHub release-candidate branch: `calora-rc-2026-08-27`
- GitHub default branch: `main`

The validated local `main` and GitHub `main` diverged from a common ancestor during prior parallel work. The remote-only line contains three older public-pages/branding commits. It was not merged, rebased, reset, overwritten, or force-pushed into the candidate because doing so would have changed the already validated release state.

The exact candidate was instead published non-destructively to the dedicated GitHub release-candidate branch.

## 3. Full immutable commit SHA

`0b95296920f7a7e2da27e7a274496a1d015312f7`

Candidate Git tree:

`8045bfd51fb2bcf304e02e47ac343ded9979c360`

## 4. Short SHA

`0b95296`

## 5. Git working-tree status before freeze

Before validation and freeze:

- Branch: `main`
- HEAD: `0b95296920f7a7e2da27e7a274496a1d015312f7`
- Tracked unstaged modifications: none
- Staged modifications: none
- Untracked files: none
- Initial cached upstream status: 20 commits ahead of `origin/main`

After refreshing the GitHub remote:

- Local-only commits: 20
- Remote-only commits: 3
- Working tree remained clean

## 6. Git working-tree status after freeze

The frozen application candidate itself remains the unchanged commit and tree listed above.

No application source, package, lockfile, schema, migration, generated API client, Expo configuration, or runtime configuration was modified during freeze.

The following post-freeze documentation is intentionally outside the frozen candidate commit:

- `FINAL_CALORA_RELEASE_CANDIDATE_FREEZE_REPORT.md`
- `.agents/memory/MEMORY.md`
- `.agents/memory/calora-release-candidate-freeze.md`

These files document the freeze and must not be used as a reason to substitute a later working-tree state for the signed-build SHA.

## 7. Exact intended changes included

The frozen commit contains the completed, previously reviewed Calora release-candidate work, including:

- Modernized spatial UI, motion, surface, navigation, and screen-state work.
- Premium Recipes recovery, membership routing, filtering, empty states, saved-card reconstruction, accessible controls, and cross-platform detail behavior.
- Calora Coach Fact Context rendering, evidence/action presentation, account-aware history synchronization, accessibility, and reset confirmation behavior.
- Cross-platform sign-out and account-deletion confirmations.
- Device-local Supabase sign-out behavior.
- Visible deletion failure handling.
- Server-authoritative resumable account deletion.
- Dedicated server-only RevenueCat v2 customer lookup, exact-ID validation, deletion, and mandatory post-delete absence verification.
- Fail-closed RevenueCat error handling and regression tests.
- Cross-device diary restore, allowlisted sync metadata persistence, mutation idempotency, tombstones, stale-write conflicts, ownership enforcement, and real-schema integration coverage.
- Correct generated database row declarations and a clean repository-wide TypeScript state.
- API public/legal/support routes and store-facing metadata represented in the validated local line.
- Final audit, RevenueCat deletion, sync remediation, and release-provenance documentation committed before the frozen SHA.

Key terminal commits included by the candidate:

- `3ed3bd41c6e8cf3c93caafb28e82d27b8958930f` — deterministic cross-device diary restore
- `f0b6757f98daa2f428d3479dc472a1a25bf8aa13` — RevenueCat customer erasure and verification
- `0b95296920f7a7e2da27e7a274496a1d015312f7` — final TypeScript provenance and clean type state

## 8. Files deliberately excluded

No intended tracked application changes were excluded; the pre-freeze working tree was clean.

Repository-ignored local/generated material was not committed:

- `node_modules/` directories
- `.cache/`, `.config/`, and local `.expo/` state
- generated `dist/` directories
- TypeScript `*.tsbuildinfo`
- Calora `static-build/`
- Expo-generated `expo-env.d.ts`
- temporary test/scanner output under `/tmp`
- local workflow logs
- local environment/secrets storage

The post-freeze report and memory note listed in section 6 are documentation only and are not part of the signed-build candidate.

## 9. Secret and credential exposure verification

**PASS**

Checks performed:

- No staged or untracked secret/environment file existed before freeze.
- No tracked `.env` file containing live credentials was found.
- No tracked private-key marker, Stripe-style secret key marker, or direct `REVENUECAT_SECRET_API_KEY=` assignment was found outside dummy test data.
- Git history contains one introduction commit for the `REVENUECAT_SECRET_API_KEY` variable name. Its diff contains:
  - server-side `process.env.REVENUECAT_SECRET_API_KEY` access,
  - deletion/restoration of that environment variable in tests,
  - a non-secret dummy test string.
- No actual RevenueCat server secret value was printed, read into the report, committed, or exposed.
- Current tracked references to the variable name are limited to:
  - the API server RevenueCat adapter,
  - focused server tests with a dummy value,
  - the completed RevenueCat verification report.
- No Calora client, Expo public variable, generated API client, or OpenAPI specification references the server secret.
- HoundDog dataflow/secret scan reported zero findings.

The RevenueCat iOS and Android SDK keys in Expo/EAS configuration are intentionally `EXPO_PUBLIC_*` publishable mobile SDK keys, not the server erasure credential. The Supabase anonymous key is likewise a publishable client key. No private service-role or RevenueCat server key is present in those locations.

## 10. Repository-wide typecheck result

**PASS**

Canonical command:

```text
pnpm run typecheck
```

Successful scopes:

- workspace library project references
- API server
- Calora mobile app
- FatSecret gateway
- mockup sandbox
- workspace scripts

No TypeScript error remains.

## 11. Calora test results

**PASS**

Canonical command:

```text
pnpm --filter @workspace/calora run test
```

Results:

- 63 Vitest files passed
- 981 Vitest tests passed
- 0 failed
- 6 static-server security tests passed
- 0 static-server security tests failed

## 12. API test results

**PASS**

Canonical command:

```text
pnpm --filter @workspace/api-server run test
```

Results:

- 30 test files passed
- 1 intentionally skipped
- 380 tests passed
- 4 intentionally skipped
- 0 failed

Expected error/warning logs from explicit fail-closed and fallback test cases did not represent test failures.

## 13. Security test results

**PASS with documented non-blocking build-chain advisories**

Static server regression suite:

- 6 passed
- 0 failed

Security scanners:

- HoundDog: 0 findings
- SAST: 5 medium findings; 0 high/critical
- Dependency audit: 0 critical, 3 high

The five SAST findings are false-positive/expected public configuration:

- two publishable RevenueCat mobile SDK keys in `.replit`
- two publishable RevenueCat mobile SDK keys in `eas.json`
- one placeholder database URL in `env.example`

The dependency findings are transitive build-tool advisories:

1. Two advisories affect `image-size@1.2.1`, reached through Expo CLI/Metro. They concern denial of service when parsing maliciously crafted image formats. Calora does not expose Metro or `image-size` in its production API, and candidate builds process trusted repository assets. The package currently has no patched release identified by the advisory.
2. One advisory affects external-buffer handling in `uuid` v3/v5/v6. Calora receives `uuid@7.0.3` through Expo's Xcode project generator. Inspection confirms Xcode uses `uuid.v4()`, not the affected APIs.

Neither package's implementation is present in the generated mobile JavaScript runtime bundles. The only `image-size` text match in bundles is an icon-name string.

These are recorded as build-chain limitations, not exploitable P0/P1 blockers in the shipped Calora runtime. No dependency was changed during freeze.

## 14. Release-attestation result

**PASS**

Canonical command:

```text
pnpm --filter @workspace/api-server run test:release-attestation
```

Results:

- 13 tests passed
- 0 failed

Coverage includes fail-closed wrong-package, wrong-deployment, wrong-origin, wrong-trust-anchor, missing-certificate, expired-certificate, and hostname-mismatch cases.

The API build identified the release source as:

- Commit: `0b95296920f7a7e2da27e7a274496a1d015312f7`
- Tree: `8045bfd51fb2bcf304e02e47ac343ded9979c360`

## 15. API production build result

**PASS**

Canonical command:

```text
pnpm --filter @workspace/api-server run build
```

The production server bundle, worker bundles, and source maps completed successfully.

## 16. Android production-style bundle result

**PASS**

Canonical non-signed bundle command:

```text
pnpm --filter @workspace/calora run build
```

The existing Calora build script requested the Android Metro bundle with:

- platform: `android`
- development mode: disabled
- hot reload: disabled
- lazy mode: disabled
- minification: enabled

Result:

- Android bundle generated successfully
- Size: 5,712,375 bytes
- SHA-256: `fc6c43dda140d0d3a2cc7f1d000c669b67ea1d3fb6b4bcd076e348c5045ae30f`
- Android manifest generated successfully

The generated `static-build/` output is intentionally Git-ignored and excluded from the candidate.

## 17. iOS production-style bundle result

**PASS**

The same canonical Calora build generated the iOS Metro bundle with:

- platform: `ios`
- development mode: disabled
- hot reload: disabled
- lazy mode: disabled
- minification: enabled

Result:

- iOS bundle generated successfully
- Size: 5,777,356 bytes
- SHA-256: `e8c2e1bf61eedce1f410da0ec9ee15fb86e5758983f1c40439759f8381edf886`
- iOS manifest generated successfully

This was production-style JavaScript bundle generation, not a signed native IPA build.

## 18. `git diff --check` result

**PASS**

The command completed without whitespace errors before the candidate was published to the RC branch.

## 19. GitHub remote verification

**PASS**

Verified remote:

`https://github.com/atembekong-hash/Calora.git`

Verified branch:

`refs/heads/calora-rc-2026-08-27`

`git ls-remote` returned exactly:

`0b95296920f7a7e2da27e7a274496a1d015312f7`

No force push occurred. GitHub `main` was not changed.

## 20. Release tag

None created.

The repository has historical verification/backup tags but no established release-candidate tag workflow. A new tagging convention was not introduced during freeze.

## 21. Known non-blocking limitations

- The dependency-audit build-chain advisories documented in section 13 remain.
- GitHub `main` has a separate three-commit remote-only public-pages/branding line. The frozen RC is intentionally isolated on its exact RC branch rather than merged with that line.
- The GitHub RC branch is a mutable pointer; the immutable commit SHA, not the branch name by itself, is authoritative.
- EAS uses `image: "latest"` and production `autoIncrement`, so signed native binaries are not bit-reproducible from the source SHA alone. The next gate must record EAS build IDs, resolved builder/toolchain details, source SHA, native versions/build numbers, and artifact hashes.
- Production API/store configuration must remain consistent with the values used by the signed EAS production profile.
- Release freeze does not prove physical-device behavior.
- The freeze documentation itself is not included in the candidate SHA.

## 22. Native and physical-device validations still required

The following remain mandatory on signed builds from the exact frozen SHA:

- iOS and Android install/launch
- sign-up, sign-in, sign-out, session refresh, and account deletion
- invite/deep-link/universal-link handoff, including force-quit and no-app states
- camera permission and capture behavior
- barcode scanning and exact provider matching
- photo/receipt/capture flows
- haptics
- HealthKit/Health Connect permissions and imports
- notification and other OS permission behavior
- RevenueCat native store UI, purchase, restore, cancellation/management handoff, and entitlement refresh
- offline/reconnect and cross-device diary restore on real devices
- background/foreground transitions
- device-safe-area, keyboard, accessibility, and performance checks

No physical-device validation is claimed by this report.

## 23. Exact next step for signed Android and iOS builds

Use a clean checkout of the GitHub RC branch and verify the immutable SHA before invoking EAS:

```text
git clone --branch calora-rc-2026-08-27 --single-branch https://github.com/atembekong-hash/Calora.git
cd Calora
git checkout --detach 0b95296920f7a7e2da27e7a274496a1d015312f7
test "$(git rev-parse HEAD)" = "0b95296920f7a7e2da27e7a274496a1d015312f7"
corepack pnpm@10.26.1 install --frozen-lockfile
cd artifacts/calora
eas build --platform android --profile production
eas build --platform ios --profile production
```

The repository does not currently install `eas-cli` locally, so the build operator must use an authenticated EAS CLI version satisfying `eas.json` (`>=16.0.0`) or trigger the equivalent production-profile builds through the existing Expo/EAS GitHub integration with app root `artifacts/calora`.

Both signed builds must identify the source as the exact SHA above. Do not build from current GitHub `main`, a later local checkpoint, or the post-freeze documentation state.

Record each EAS build ID, resolved builder image/toolchain, native version/build number, and final artifact SHA-256. The Android production profile produces an AAB, so validate it through Google Play internal testing rather than attempting direct APK installation. Distribute the signed iOS candidate through TestFlight or the established internal-signing path.

## 24. Final GO/NO-GO decision

**GO for signed Android and iOS physical-device validation.**

**NO-GO for declaring production launch or full production readiness until those signed-device validations pass.**

The frozen Calora release candidate is:

`0b95296920f7a7e2da27e7a274496a1d015312f7`

on:

`origin/calora-rc-2026-08-27`