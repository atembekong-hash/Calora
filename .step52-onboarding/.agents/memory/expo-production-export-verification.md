---
name: Expo production export verification
description: Reliable verification for Calora's long-running static Expo Go export
---

When a Calora production-style export reaches Metro's final bundle progress and the foreground shell disconnects, do not assume the export failed. Re-run it in a background shell, inspect its log for both platform bundles, manifest completion, asset processing, and the final build message, then restart the dev workflows.

**Why:** The export can take longer than the interactive shell connection while Metro continues successfully; treating the disconnect as a code failure wastes time and can create overlapping Metro processes.

**How to apply:** Use the existing Calora build script, confirm iOS and Android bundle files plus processed assets, and only retry after checking whether a build process is still active.