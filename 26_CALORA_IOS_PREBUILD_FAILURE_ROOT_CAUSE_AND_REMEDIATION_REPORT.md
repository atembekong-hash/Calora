# Calora iOS Production Prebuild Failure — Root Cause and Remediation Report

**Validation date:** 2026-09-09  
**Repository:** `atembekong-hash/Calora`  
**Source under investigation:** `8297400be2753c563faa19b945d69617c771a43d`  
**Platform:** iOS  
**EAS profile:** `production`  
**EAS environment:** `production`  
**Bundle identifier:** `com.etiendem.caloraapp`  
**EAS Submit:** disabled

## Final verdict

**PASS**

A clean equivalent of:

```text
pnpm --filter @workspace/calora exec expo prebuild --no-install --platform ios
```

completed successfully after the remediation. The generated iOS project
preserved Calora's bundle identifier, associated domain, URL scheme, required
Info.plist values, HealthKit configuration, and canonical branded auth
configuration.

No EAS build, deployment, credential mutation, GitHub push, or branch
protection change was performed.

## Executive summary

The failure was caused by a workspace-wide dependency override, not by
Calora's app configuration or a custom iOS config plugin.

Expo SDK 54's `@expo/plist@0.4.9` calls:

```js
new DOMParser(...).parseFromString(xml)
```

with no MIME argument. The workspace override forced that package's declared
`@xmldom/xmldom ^0.8.8` dependency to `0.9.12`. The `0.9.x` parser validates
the MIME argument and throws when it is `undefined`.

The fix is a scoped pnpm override:

```yaml
"@expo/plist>@xmldom/xmldom": "0.8.15"
```

The existing global `@xmldom/xmldom: 0.9.12` hardening remains in place for
other consumers. This keeps the Expo 54 plist parser on the latest compatible
0.8.x release without weakening the unrelated XML consumers.

## Exact failure reproduction

Starting from the clean release source at
`8297400be2753c563faa19b945d69617c771a43d`, the exact command was run:

```text
pnpm --filter @workspace/calora exec expo prebuild --no-install --platform ios
```

The command created the native directory, then failed during the iOS
`infoPlist` base mod:

```text
✖ Prebuild failed
TypeError: [ios.infoPlist]: withIosInfoPlistBaseMod:
DOMParser.parseFromString: the provided mimeType "undefined" is not valid.
```

The observed stack was:

```text
@xmldom/xmldom@0.9.12/lib/dom-parser.js:225
@expo/plist@0.4.9/build/parse.js:69
@expo/config-plugins@54.0.5/build/plugins/withIosBaseMods.js:290
@expo/cli/.../configureProjectAsync.js
```

The generated native directory and package.json additions from this failed
reproduction were removed before remediation.

## Root-cause analysis

### Expo config and plugin chain

Calora uses the static configuration file:

```text
artifacts/calora/app.json
```

No `app.config.js`, `app.config.ts`, or custom local config-plugin file exists.
The configured plugins are standard Expo or installed package plugins:

- `expo-build-properties`
- `expo-router`
- `expo-font`
- `expo-web-browser`
- `expo-secure-store`
- `expo-camera`
- `react-native-health-connect`
- `@kingstinct/react-native-healthkit`

The failing path is the standard Expo `ios.infoPlist` base mod. It reads the
generated `Info.plist` before applying the app's `ios.infoPlist` values.

### Dependency chain

The relevant resolved chain before remediation was:

```text
@expo/config-plugins@54.0.5
└── @expo/plist@0.4.9
    └── @xmldom/xmldom@0.9.12  # forced by workspace override
```

The declared `@expo/plist@0.4.9` dependency is `@xmldom/xmldom ^0.8.8`.
The workspace-level override in `pnpm-workspace.yaml` changed that dependency
to `0.9.12` for every consumer.

The relevant implementation evidence is:

- `@expo/plist@0.4.9/build/parse.js:69` calls `parseFromString(xml)` with one
  argument.
- `@expo/config-plugins@54.0.5/build/plugins/withIosBaseMods.js:288-290`
  reads `Info.plist` through `@expo/plist`.
- `@xmldom/xmldom@0.9.12/lib/dom-parser.js:223-225` validates the MIME type
  and throws for `undefined`.
- `@xmldom/xmldom@0.8.15` accepts the omitted MIME argument and parses the
  same plist XML successfully.

This proves the failure is an API-contract incompatibility introduced by the
global override. It is not caused by `app.json`, `Info.plist` content, auth
URLs, Apple credentials, or a malformed native target.

## Remediation

### Files changed

Production remediation:

1. `pnpm-workspace.yaml`
   - Kept the global `@xmldom/xmldom: 0.9.12` override.
   - Added the scoped `@expo/plist>@xmldom/xmldom: 0.8.15` override.
   - Updated the comment to distinguish general XML consumers from Expo's
     SDK 54 plist parser.

2. `pnpm-lock.yaml`
   - Added the `@xmldom/xmldom@0.8.15` package entry.
   - Resolved `@expo/plist@0.4.9` to `@xmldom/xmldom@0.8.15`.
   - Retained `@xmldom/xmldom@0.9.12` for other dependency paths.

Documentation/evidence:

3. `26_CALORA_IOS_PREBUILD_FAILURE_ROOT_CAUSE_AND_REMEDIATION_REPORT.md`
4. `.agents/memory/expo-plist-xmldom-compatibility.md`
5. `.agents/memory/MEMORY.md`

### Files intentionally not changed

- `artifacts/calora/app.json`
- `artifacts/calora/lib/auth.ts`
- `artifacts/calora/app/auth/callback.tsx`
- Apple certificates
- Provisioning profiles
- Expo credentials
- Supabase configuration
- EAS configuration
- GitHub branch protection
- Production deployment configuration

## Before/after evidence

### Before

Installed resolution:

```text
@expo/plist@0.4.9 -> @xmldom/xmldom@0.9.12
```

Parser behavior:

```text
0.9.12 undefined-mime=rejected
DOMParser.parseFromString: the provided mimeType "undefined" is not valid.
```

Exact iOS prebuild result: **failed** with the reported `withIosInfoPlistBaseMod`
exception.

### After

Installed resolution:

```text
@expo/plist@0.4.9 -> @xmldom/xmldom@0.8.15
```

Other XML consumers retain:

```text
@xmldom/xmldom@0.9.12
```

Parser behavior:

```text
0.8.15 undefined-mime=accepted plist
```

The exact iOS prebuild command then completed:

```text
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
✔ Updated package.json
- Running prebuild
✔ Finished prebuild
```

The generated `ios/` directory was inspected and removed afterward because
this project does not commit generated native directories.

## Generated iOS identity verification

The generated project was verified before cleanup:

### Bundle identity

`artifacts/calora/ios/Calora.xcodeproj/project.pbxproj` contained:

```text
PRODUCT_BUNDLE_IDENTIFIER = "com.etiendem.caloraapp";
```

### Associated domain

`artifacts/calora/ios/Calora/Calora.entitlements` contained:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:mycaloraapp.com</string>
</array>
```

### Info.plist

`artifacts/calora/ios/Calora/Info.plist` was valid XML and retained:

- `ITSAppUsesNonExemptEncryption = false`
- `CFBundleDisplayName = Calora`
- `caloraapp` URL scheme
- camera permission text
- microphone permission text
- HealthKit share permission text
- Expo Router index route activity configuration

### Canonical auth/deep-link configuration

The static configuration and auth implementation remained unchanged and
continued to assert:

- canonical callback: `https://mycaloraapp.com/auth/callback`
- iOS associated domain: `applinks:mycaloraapp.com`
- Android callback path: `/auth/callback`
- branded host: `mycaloraapp.com`
- legacy `caloraapp` scheme retained only for app/deep-link compatibility,
  not as the canonical auth callback

## Validation results

### Dependency and Expo validation

- `pnpm install --frozen-lockfile` — passed.
- `CI=1 pnpm exec expo install --check` — passed.
- `pnpm dlx expo-doctor@latest` — passed, `18/18 checks passed`.
- `node scripts/ci/validate-expo-config.mjs /tmp/calora-expo-config.json` —
  passed.
- Resolved `@expo/plist@0.4.9` parser dependency — `@xmldom/xmldom@0.8.15`.
- `git diff --check` — passed.

### TypeScript and application tests

- Workspace typecheck — passed.
- Calora Vitest suite — passed, 88 files and 1,224 tests.
- Calora static server security suite — passed, 6 tests.
- API server suite — passed, 37 files; 471 tests passed and 4 tests skipped
  intentionally.
- Native-auth, iOS-signing, and association regression tests — passed, 33
  tests.

### Security audit

`pnpm audit --audit-level high` still reports four pre-existing `js-yaml`
findings (two high and two moderate) in unrelated dependency paths. No
`xmldom` advisory was reported after the scoped resolution. These findings are
outside this iOS prebuild remediation and did not change between the
reproduction and remediation.

## Git status and diff summary

Final source checkout:

```text
Branch: release/calora-onboarding-and-plus
HEAD: 8297400be2753c563faa19b945d69617c771a43d
Remote protected branch: 8297400be2753c563faa19b945d69617c771a43d
```

The final source diff contains only:

```text
pnpm-workspace.yaml
pnpm-lock.yaml
26_CALORA_IOS_PREBUILD_FAILURE_ROOT_CAUSE_AND_REMEDIATION_REPORT.md
.agents/memory/MEMORY.md
.agents/memory/expo-plist-xmldom-compatibility.md
```

The generated `ios/` tree and Expo prebuild's temporary package.json
additions were removed. No unrelated application or native identity changes
remain. The remediation diff is uncommitted and has not been pushed.

## Remaining blockers

1. The signed iOS EAS production build must be retried from the remediation
   commit after this change is reviewed. This mission did not trigger an EAS
   build.
2. Apple signing and provisioning evidence still needs to be exercised by the
   signed native workflow after the build is available.
3. The four pre-existing `js-yaml` audit findings should be handled in a
   separate dependency-security task; they are unrelated to this prebuild
   failure.

## Conclusion

The reported Expo iOS prebuild failure is reproduced, root-caused to the
global xmldom override, and remediated with a scoped Expo-compatible
dependency resolution. A clean iOS prebuild succeeds and the generated native
identity is correct.

**Final verdict: PASS**