# 3. Confirmed Defects and Root-Cause Analysis

## Confirmed defect

The backend already exposed authenticated `GET/POST /api/v1/privacy/requests` for access, correction, deletion, portability, restriction, and consent withdrawal. The audited Profile/Settings UI had no client call, form, control, test ID, or discoverable route for that capability. This was a client discoverability/access gap, not a confirmed backend failure.

## Environment blockers

The API offline suite collected 45 files and 494 tests; 462 passed. The 32 failures were import-time database precondition failures because `DATABASE_URL` was absent, not assertion failures. Physical-device, provider, store, and database-backed verification gaps remain explicitly blocked.
