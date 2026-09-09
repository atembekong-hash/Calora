---
name: Plus recipe freshness
description: Product and pagination boundaries for varying default Plus recipe order without weakening provider truth.
---

Default unfiltered Plus browsing may vary by account and UTC-day, but only by deterministically reordering recipes already returned inside one legitimate provider page. The chosen order is fixed for the active browsing session. Search and category results keep provider relevance order unchanged.

**Why:** The owner does not want the same small set permanently leading Plus when enough inventory exists, but global reshuffles can break cursor pagination, overlap or skip provider pages, move cards under an active scroller, and misrepresent exhaustion.

**How to apply:** Restore same-account same-day cards, cursor, terminal state, and scroll on quick revisits. Start a new unfiltered day at page zero without blanking; replace only after the real first page succeeds. Append later pages uniquely, advance only provider cursors, isolate all state by account, and clear protected state on entitlement denial.