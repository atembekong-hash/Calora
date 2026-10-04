# Calora local security package: node-forge

This package is the reviewed upstream source at digitalbazaar/forge pull request
#1152, commit `ceba34402e329f0365134f23fe19898756527d65`, which declares package
version `1.4.1-0`. It fixes CVE-2026-85393 / GHSA-86w9-cpqp-85rv by explicitly
checking nested `DigestAlgorithm` child counts during RSA PKCS#1 v1.5 signature
verification. The npm registry has no patched release as of 2026-10-04 UTC.

The local package must be replaced with the first upstream npm release that
contains the same fix, then this document and the matching override must be
removed only after the release audit passes.
