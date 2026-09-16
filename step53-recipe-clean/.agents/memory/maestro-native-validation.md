---
name: Maestro native validation
description: Maestro 1.40 device selection depends on native host tooling rather than a Maestro device-list command.
---

Maestro 1.40.0 does not provide a `maestro devices` subcommand. Select exact
booted IDs with `xcrun simctl list devices booted` on macOS and `adb devices`
on an Android host, then pass those IDs to the release gate.

**Why:** The release flow previously documented a removed/unsupported command,
and this Linux workspace cannot provide either native simulator toolchain.

**How to apply:** Treat a zero-device Maestro result as a preflight blocker,
not a native test result. Do not fabricate device IDs or convert a flow that
never reached the app into a pass.