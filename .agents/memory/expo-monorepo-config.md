---
name: Expo monorepo config
description: Expo 54 schema and Metro configuration constraints for the Calora pnpm workspace
---

Expo 54 should receive Android minimum SDK settings through the `expo-build-properties` plugin, not a duplicate top-level `android.minSdkVersion`. Metro should merge the workspace root into Expo's default watch folders and preserve Expo's default symlink handling.

**Why:** Expo Doctor rejects the duplicate app-config field and flags forced symlink overrides; keeping the defaults still permits the production iOS and Android bundles to resolve the pnpm workspace cleanly.

**How to apply:** When changing Calora's Expo or Metro configuration, run Expo Doctor and a production bundle check. Preserve `getDefaultConfig` behavior, merge additional watch folders instead of replacing defaults, and avoid forcing `unstable_enableSymlinks` unless a new Expo version proves it necessary.