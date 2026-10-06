# Calora local security package: sprintf-js

This package is the npm release `sprintf-js@1.0.3` plus a small source-level
security boundary for CVE-2026-97058 / GHSA-hp3w-g68c-fv3c. The upstream
release line through 1.1.3 passes an unbounded format precision directly to
JavaScript numeric formatters. Values above 100, and `%.0g`, throw a
`RangeError`; an unhandled attacker-influenced format string can therefore
terminate a Node.js worker.

The local change parses numeric precision once, clamps it to JavaScript's
maximum supported precision of 100, and handles the `%.0g` lower-bound case by
using precision 1. Valid precision behavior remains unchanged. The dependency
is introduced by `argparse@1.0.10` in build/tooling transitive dependencies and
is not referenced by the Calora web or API runtime bundles, but the patched
local package prevents the unsafe throw everywhere this resolved dependency is
loaded.

The npm registry has no patched upstream release as of 2026-10-06 UTC. Replace
this local package with the first upstream npm release that contains an
equivalent maintained fix, after the release audit and security regression
pass.
