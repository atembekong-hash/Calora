---
name: EAS signing status normalization
description: EAS provisioning-profile status values may arrive lowercase even when the profile is valid.
---

Treat EAS provisioning-profile status values case-insensitively before deciding
whether an App Store signing record is active.

**Why:** The live read-only EAS credentials response returned `active`, while a
strict uppercase-only check incorrectly blocked an otherwise valid signing
record.

**How to apply:** Normalize the status for comparison and keep a regression
fixture for lowercase `active`; continue rejecting non-active states.