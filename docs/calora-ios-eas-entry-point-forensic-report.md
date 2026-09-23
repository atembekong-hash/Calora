# Calora iOS EAS Metro Entry-Point Failure

## Forensic Investigation and Minimal Remediation Report

**Date:** September 15, 2026  
**Repository:** `atembekong-hash/Calora`  
**Affected workflow:** `.github/workflows/calora-testflight-upload.yml`  
**Affected platform:** iOS EAS production build  
**Remediation commit:** `23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14`

---

## 1. Executive summary

The Calora iOS EAS build failed because the GitHub Actions workflow executed EAS commands from the repository root instead of from the Calora Expo app directory.

Calora is an Expo Router application rooted at:

```text
artifacts/calora
```

Its intended entry point is declared in `artifacts/calora/package.json`:

```json
"main": "expo-router/entry"
```

When EAS was invoked from the repository root, Expo did not read that package manifest. It fell back to Expo’s conventional `App.*` entry resolution and attempted to import:

```text
../../App
```

No root-level `App.js`, `App.jsx`, `App.ts`, or `App.tsx` exists, so Metro failed before bundling the application.

The failure was reproduced locally from the repository root. The same production export from `artifacts/calora` succeeded and bundled 2,233 modules through `expo-router/entry.js`.

The minimal fix was to add this workflow default:

```yaml
defaults:
  run:
    working-directory: artifacts/calora
```

No application behavior, dependencies, Expo configuration, Router files, or native identifiers were changed.

The fix was committed and pushed to `main`. The local commit SHA and remote `main` SHA were verified to match:

```text
23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14
```

No EAS build, GitHub Actions run, or TestFlight submission was triggered during this investigation.

---

## 2. Investigation scope and constraints

The investigation was limited to identifying and correcting the Metro/EAS entry-point failure.

The following actions were explicitly excluded:

- Triggering another EAS build
- Triggering GitHub Actions
- Submitting to TestFlight
- Upgrading dependencies
- Changing Expo SDK or Expo Router versions
- Adding a root `App.*` file
- Changing application routes or behavior
- Broad refactoring
- Changing bundle identifiers, project identity, or native version metadata

The intended remediation was therefore a workflow/archive-root correction only.

---

## 3. Repository architecture

### 3.1 Workspace layout

The repository is a pnpm monorepo. The Calora Expo application is not at the repository root:

```text
repository root/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── .easignore
├── .github/
│   └── workflows/
│       └── calora-testflight-upload.yml
├── artifacts/
│   └── calora/
│       ├── package.json
│       ├── app.json
│       ├── eas.json
│       ├── metro.config.js
│       ├── babel.config.js
│       └── app/
│           ├── _layout.tsx
│           ├── index.tsx
│           └── (tabs)/
│               ├── _layout.tsx
│               └── index.tsx
└── vendor/
    └── image-size/
        └── dist/
            └── index.js
```

### 3.2 Repository-root package manifest

The root `package.json` is the workspace manifest:

```json
{
  "name": "workspace",
  "private": true,
  "packageManager": "pnpm@10.26.1"
}
```

It does not define an Expo application entry point and does not contain a `main` field.

### 3.3 Calora package manifest

The Calora package manifest defines the Expo Router entry:

```json
{
  "name": "@workspace/calora",
  "private": true,
  "main": "expo-router/entry"
}
```

The Calora package also owns the Expo, Expo Router, React Native, Metro, and application dependencies used by the mobile app.

### 3.4 Calora Expo configuration

`artifacts/calora/app.json` contains the Calora-specific Expo identity and Router configuration, including:

- Expo name: `Calora`
- Slug: `calora`
- Owner: `vvault07`
- EAS project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Android package: `com.etiendem.caloraapp`
- `expo-router` plugin
- Typed routes
- React Compiler

`artifacts/calora/app.json` and `artifacts/calora/eas.json` are the only
authoritative Expo/EAS configuration files for Calora. The repository root
intentionally has no `app.json`: a direct Expo or EAS command must run from
`artifacts/calora`, while monorepo commands must use `pnpm --filter
@workspace/calora …`. This fails closed rather than silently selecting an
incomplete duplicate configuration.

---

## 4. Failure reproduction

### 4.1 Failing command from repository root

The failure was reproduced with:

```bash
pnpm expo export:embed --eager --platform ios --dev false
```

run from the repository root.

Expo used its default `expo/AppEntry.js`, which attempted to import the conventional root application:

```text
../../App
```

The resulting failure reported that no root `App.js`, `App.jsx`, `App.ts`, or `App.tsx` could be resolved.

This was an entry-point resolution failure. Metro did not reach the point of bundling Calora’s Router tree.

### 4.2 Successful command from the Calora app directory

The same export command succeeded from the app directory:

```bash
cd artifacts/calora
pnpm expo export:embed --eager --platform ios --dev false
```

Successful output included:

```text
React Compiler enabled
Starting Metro Bundler
iOS Bundled ... expo-router/entry.js (2233 modules)
Writing bundle output
Copying 114 asset files
Done writing bundle output
```

### 4.3 Reproduction matrix

| Working directory | Expo entry selected | Result |
|---|---|---|
| Repository root | Default `expo/AppEntry.js` → root `App.*` | Failed |
| `artifacts/calora` | `expo-router/entry` | Passed |

This isolates the failure to the EAS/Expo project root used by the workflow, not to Calora application code.

---

## 5. Workflow analysis

### 5.1 Workflow behavior before remediation

The workflow checked out the repository and installed dependencies, but all shell commands ran from the repository root.

The EAS-related steps were:

```yaml
- name: Link Calora to existing EAS project
  run: eas init --id 1f202325-5b9a-4260-978f-abbd3252b9ee --non-interactive --force

- name: Verify EAS project
  run: eas project:info

- name: Build iOS production app
  run: eas build --platform ios --profile production --non-interactive --wait

- name: Submit latest iOS build to TestFlight
  run: eas submit --platform ios --latest --non-interactive
```

Without a working-directory override, these commands resolved the repository root as the Expo project root.

### 5.2 Minimal remediation

The workflow now contains:

```yaml
jobs:
  testflight:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    defaults:
      run:
        working-directory: artifacts/calora
```

This causes the following commands to execute from the correct Expo app directory:

- `pnpm install --frozen-lockfile`
- `eas init`
- `eas project:info`
- App Store Connect API key file creation
- `eas build`
- `eas submit`

The setup actions themselves remain unchanged.

### 5.3 Why this is the smallest correct fix

The following alternatives were deliberately not used:

#### Adding a root `App.*` file

Rejected because Calora is an Expo Router app. A root `App.*` file would mask the incorrect project root and could create a second, conflicting entry architecture.

#### Changing `main`

Rejected because `artifacts/calora/package.json` already correctly declares:

```json
"main": "expo-router/entry"
```

#### Changing Expo Router or Expo versions

Rejected because the dependency versions were not the cause of the failure. The app-directory export already passed with the existing lockfile.

#### Moving the app or changing application routes

Rejected because the existing app structure is valid and the failure occurs before application behavior is loaded.

#### Replacing or broadening Metro configuration

Rejected because the existing Metro configuration already supports the workspace and the app-directory production export passed.

---

## 6. EAS archive-root verification

Expo’s monorepo guidance requires EAS CLI commands to run from the root of the individual app directory.

Expo’s EAS archive behavior is separate from the CLI project root: the source archive is collected from the Git repository root. This matters because Calora depends on repository-level workspace metadata and a tracked vendored runtime.

The repository root contains:

```text
.easignore
pnpm-workspace.yaml
pnpm-lock.yaml
vendor/image-size/dist/index.js
```

The root `.easignore` preserves the vendored image-size runtime:

```text
!vendor/image-size/
!vendor/image-size/dist/
!vendor/image-size/dist/**
```

### 6.1 Required archive content audit

A deterministic Git archive audit confirmed the required files are present:

```text
artifacts/calora/package.json
artifacts/calora/app.json
artifacts/calora/eas.json
artifacts/calora/metro.config.js
artifacts/calora/babel.config.js
artifacts/calora/app/_layout.tsx
artifacts/calora/app/index.tsx
artifacts/calora/app/(tabs)/_layout.tsx
artifacts/calora/app/(tabs)/index.tsx
.easignore
vendor/image-size/dist/index.js
```

The audit also confirmed that no Calora root entry file exists at:

```text
artifacts/calora/App.js
artifacts/calora/App.jsx
artifacts/calora/App.ts
artifacts/calora/App.tsx
```

That absence is intentional because Expo Router owns the entry point.

### 6.2 Image-size runtime verification

The app’s runtime resolution was checked from `artifacts/calora`:

```text
image-size → @calora/image-size-safe/dist/index.js
```

The resolved runtime exists and `vendor/image-size/dist/index.js` is present in the archive. The image-size override was not modified as part of this fix.

---

## 7. Validation results

### 7.1 Dependency and Expo checks

| Check | Result |
|---|---|
| Frozen pnpm install from app directory | Passed |
| `expo install --check` | Passed |
| `expo-doctor` | 18/18 checks passed |
| Expo config validation | Passed |
| Package entry validation | `expo-router/entry` confirmed |

### 7.2 Type and test checks

| Check | Result |
|---|---|
| Workspace typecheck | Passed |
| Calora Vitest suite | 77 files passed |
| Calora Vitest assertions | 1,151 passed |
| Server security tests | 6 passed |
| Prettier workflow check | Passed |
| Git diff check | Passed |

### 7.3 Production Metro export

Command:

```bash
cd artifacts/calora
pnpm expo export:embed --eager --platform ios --dev false
```

Result:

```text
2,233 modules bundled
114 assets copied
Production bundle written successfully
```

### 7.4 Post-commit repository verification

The final local commit SHA and remote `main` SHA match:

```text
local:  23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14
remote: 23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14
```

The working tree is clean after the remediation commit.

---

## 8. Unrelated local preview note

The Replit local Expo preview workflow separately stopped because Metro attempted to watch a transient deleted path:

```text
/home/runner/workspace/.local/mcp_skills/.old-railway-1DxQ9P2RoQdWy4u515zqe
```

This was a filesystem-watch failure in the development preview. It did not affect the production export validation and is unrelated to the EAS entry-point failure.

The preview was not restarted because the requested investigation explicitly excluded unrelated workflow activity and no application source change required a preview restart.

---

## 9. Final conclusion

The iOS EAS failure was caused by an incorrect working directory in the GitHub Actions workflow.

The repository root is not the Calora Expo project root. Running EAS from that location caused Expo to select the conventional `App.*` entry path instead of Calora’s declared Expo Router entry.

The workflow now runs from `artifacts/calora`, while preserving the repository-root archive and vendored runtime requirements.

The remediation is:

- Minimal
- Limited to workflow configuration
- Reproduced before fixing
- Locally validated after fixing
- Archive-audited
- Committed to Git
- Pushed to `main`
- Verified against the remote SHA

The project is ready for a separately authorized EAS build. No build or TestFlight submission was triggered as part of this investigation.

---

## 10. Reference material

- Expo: [Set up EAS Build with a monorepo](https://docs.expo.dev/build-reference/build-with-monorepos/)
- Expo: [Work with monorepos](https://docs.expo.dev/guides/monorepos/)
- Expo: [Ignore files via `.easignore`](https://docs.expo.dev/build-reference/easignore/)
- Remediation commit: `23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14`
