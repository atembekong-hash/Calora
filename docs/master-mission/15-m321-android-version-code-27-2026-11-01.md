# Mission 321 — Android versionCode 27 release preparation

**Repository:** `atembekong-hash/Calora`
**Base protected main:** `a364c5ca4276ca2ede609243ed2a29728a1109a8`
**Date:** 2026-11-01

## Source verification

Protected main was fetched and verified to contain the Mission #318 Auto barcode/camera-stability repair and the Mission #319 manual serving-quantity repair. The quantity metadata conversion, authoritative TextInput update, invalid approval guard, and diary serialization are present.

The authoritative Expo configuration was still:

- App version: `1.0.1`
- Package: `com.etiendem.caloraapp`
- Android versionCode: `26`

Repository and GitHub Android workflow history contain no evidence of a relevant distributed build using versionCode `27`. The documented installed artifact and prior Android reports use versionCode `26`.

## Version-code change

This focused change increments only:

```text
artifacts/calora/app.json
  expo.android.versionCode: 26 -> 27

scripts/ci/validate-expo-config.mjs
  required versionCode: 26 -> 27
```

The user-facing version remains `1.0.1`. The Android package identity remains `com.etiendem.caloraapp`. No native source, dependencies, permissions, production data, or backend code changed.

## Signing and installation safety

`eas.json` confirms:

- EAS project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- `appVersionSource: local`
- `requireCommit: true`
- `preview` extends `production`
- `preview` distribution: `internal`
- `preview` Android output: `apk`
- Production credential source: `remote`
- Production `autoIncrement`: `false`

The package identity is unchanged and versionCode 27 is higher than the installed build 26, so Android in-place update compatibility is structurally supported. The sandbox does not have EAS CLI installed and no remote credential inspection was performed; therefore the exact signing-certificate fingerprint cannot be independently verified here. The owner should rely on the configured EAS remote credentials and stop if EAS reports a signing mismatch.

No uninstall or data-clearing step is required or recommended. Existing account, diary, history, and local persistence code is unchanged.

## Build configuration handoff

From a clean Windows PowerShell checkout of the final protected main:

```powershell
git fetch origin main
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
Set-Location artifacts\calora
eas build --platform android --profile preview
```

The expected `git rev-parse HEAD` value will be recorded after this PR merges. The `preview` profile is the correct internally distributable Samsung APK profile. EAS CLI must satisfy `>= 16.17.4`; the configured build image uses Node `20.19.4` and pnpm `10.26.1`.

If the working tree contains local changes, do not reset or delete them. Use a separate clean checkout or clone, then run the commands above.

The resulting APK can be retrieved from the completed EAS build page or the EAS CLI output. Verify the artifact before installation:

- Package: `com.etiendem.caloraapp`
- Version name: `1.0.1`
- Version code: `27`
- Source commit: final protected main SHA
- Build profile: `preview`

## Validation executed before PR delivery

- Expo configuration validator with versionCode 27: **passed**.
- Native authentication/package preflight unit tests: **7 passed**.
- Release workflow contract tests: **9 passed**.
- Mission #319 focused and full validation remains green from protected PR #316: **163 focused tests, 1,942 full client tests, 62 API tests, and 29 web/security/configuration checks passed**.

No native build, APK/AAB generation, OTA update, Railway deployment, app-store submission, uninstall, storage clear, or production-data modification was performed.

## Samsung acceptance checklist

After the owner builds and installs the APK:

1. Confirm the existing application updates without data loss.
2. Confirm authentication and existing diary history remain intact.
3. Open Auto Scan and confirm a stable camera preview.
4. Scan barcode `076314300556`.
5. Confirm the reference quantity display.
6. Enter `9.4 g` and confirm approximately 35 kcal and 8 g carbohydrates.
7. Confirm the review total updates.
8. Enter an invalid quantity and confirm approval is disabled.
9. Approve one disposable QA diary entry.
10. Restart Calora and verify the saved quantity and nutrition remain correct.
11. Test 50 g and 18.8 g.
12. Confirm plus/minus controls and Auto barcode recognition remain functional.

Physical acceptance remains pending until executed on the versionCode 27 APK.

## Final verdict

**READY FOR OWNER-TRIGGERED ANDROID BUILD, pending protected merge.**

The version-code change is narrowly scoped and configuration validation is green. Protected PR delivery and final main verification remain required before the owner builds. The build must not be initiated by Manus.
