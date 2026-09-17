---
name: Expo monorepo config
description: Expo 54 schema and Metro configuration constraints for the Calora pnpm workspace
---

Expo 54 should receive Android minimum SDK settings through the `expo-build-properties` plugin, not a duplicate top-level `android.minSdkVersion`. Metro should merge the workspace root into Expo's default watch folders, preserve Expo's default symlink handling, and block generated exports and historical release snapshots.

**Why:** Expo Doctor rejects the duplicate app-config field and flags forced symlink overrides; unblocked generated or historical trees can exhaust or race Metro's watcher while active source remains valid.

**How to apply:** When changing Calora's Expo or Metro configuration, run Expo Doctor and a production bundle check. Preserve `getDefaultConfig` behavior, merge additional watch folders instead of replacing defaults, block `static-build` and `.step*` trees, and avoid forcing `unstable_enableSymlinks` unless a new Expo version proves it necessary.