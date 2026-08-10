# Calora EAS Build Preflight

## Verified configuration

- The Expo app root is `artifacts/calora`.
- `artifacts/calora/eas.json` is the only EAS build configuration.
- Every build profile inherits a shared base profile that enables Corepack and pins Node.js 20.19.4 and pnpm 10.26.1.
- There is no custom EAS build workflow or `eas.yml` file. EAS uses its supported default build pipeline.
- `development` creates an iOS simulator development client.
- `development-device` is the internal-distribution development-client profile for real-device deep-link and OAuth testing; Android requests produce an installable APK.
- `preview` creates an Android APK and `production` creates store-ready Android and iOS artifacts.

## Why the previous builds failed

1. The hosted builder selected an older pnpm version, which could not validate this workspace’s pnpm 10 lockfile under `--frozen-lockfile`.
2. A custom workflow was then added to work around that install problem. Its path was specified twice, and its YAML used unsupported step syntax.
3. The custom workflow is not needed: EAS supports `corepack` and `pnpm` directly in `eas.json`. Pinning those values makes the normal EAS pipeline deterministic without replacing its native credential, prebuild, signing, and artifact steps.

## Local validation completed

From a fresh temporary copy of the repository:

```sh
corepack pnpm@10.26.1 install --frozen-lockfile
```

This completed successfully with the lockfile unchanged.

The resolved Expo configuration contains:

- Owner: `vvault07`
- Project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Android package: `com.etiendem.caloraapp`
- Deep-link scheme: `caloraapp`

Application validation also completed successfully:

```sh
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/calora run test
```

All 32 test files and 703 tests passed.

## Before starting a build

In Expo’s GitHub build settings, set the **Root Directory** to the repository root (the top-level directory containing `pnpm-workspace.yaml`).

Then, ensure the EAS build command points to the app directory:

```bash
eas build --path artifacts/calora
```

If you are using the GitHub integration (Auto-build on push), Expo will automatically detect the monorepo structure if the Root Directory is set correctly to the repository root. Setting it to `artifacts/calora` may cause dependency installation failures because `pnpm` will not be able to find the workspace configuration.

For a native OAuth test, choose the `development-device` profile. A remote build is intentionally not started by this preflight.