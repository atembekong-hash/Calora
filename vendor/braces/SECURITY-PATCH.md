# Calora local security package: braces

This package is the npm release `braces@3.0.3` plus a small source-level
security boundary for CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm. The upstream
disclosure recommends rejecting excessively nested brace patterns at parse time
because downstream compile and expand walkers are recursive. The local change
adds `MAX_NESTING_DEPTH = 100` before AST construction, preserving ordinary
nested patterns and preventing untrusted deeply-nested input from reaching the
recursive walkers.

The npm registry has no patched release as of 2026-10-04 UTC. Replace this local
package with the first upstream npm release that contains an equivalent
maintained fix, after the release audit and security regression both pass.
