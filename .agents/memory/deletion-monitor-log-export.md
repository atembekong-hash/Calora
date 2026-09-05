---
name: Published deletion-monitor logs
description: Deployment-log export shape and public API URL prefix for deletion-fence monitoring.
---

Deployment-log retrieval returns formatted log lines rather than the API's original
NDJSON, and request URLs in those lines include the public `/api` mount while
sanitized deletion-fence events retain their internal `/v1/...` route.

**Why:** A monitor that consumes published logs must adapt the transport format
and canonicalize request-status routes without changing the stable event route.

**How to apply:** For future production monitor rehearsals, keep the raw export
temporary, convert only allowlisted aggregate fields to monitor input, and
remove the public `/api` prefix only when classifying request-status records.