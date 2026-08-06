---
name: Living memory ledger
description: Rules for Calora’s first local adaptive memory layer before visible memory features.
---

Calora’s first adaptive memory layer is a local, normalized ledger rebuilt from confirmed diary, wellness, and planner sources. It is persisted and exportable, but derived UI categories and AI context should not consume it automatically. Current confirmed sources are authoritative on reload, so deleted logs, cleared check-ins, and replaced planner assignments cannot reappear from stale memory.

**Why:** Option A must establish reliable memory before Option B makes that memory visible. A second copy of state would be unsafe if it could outlive the source data or silently become a recommendation.

**How to apply:** Update the ledger alongside explicit user actions, remove observations when source records are deleted, replace planner observations when a plan is regenerated, and keep the ledger invisible until a separate, tested visibility milestone is approved.