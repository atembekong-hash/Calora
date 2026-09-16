---
name: Living memory ledger
description: Rules for Calora’s first local adaptive memory layer before visible memory features.
---

Calora’s first adaptive memory layer is a local, normalized ledger rebuilt from confirmed diary, wellness, and planner sources. It is persisted and exportable, but derived UI categories and AI context should not consume it automatically. Current confirmed sources are authoritative on reload, so deleted logs, cleared check-ins, and replaced planner assignments cannot reappear from stale memory.

**Why:** Option A must establish reliable memory before Option B makes that memory visible. A second copy of state would be unsafe if it could outlive the source data or silently become a recommendation.

**How to apply:** Update the ledger alongside explicit user actions, remove observations when source records are deleted, replace planner observations when a plan is regenerated, and keep the ledger invisible until a separate, tested visibility milestone is approved.

For cross-platform memory controls, use an in-app confirmation modal rather than relying on `Alert.alert`; the Expo web preview may not surface native alert confirmations consistently.

**Why:** A browser validation pass showed the native alert path could appear to do nothing even though the action was wired, while an in-app modal provided the same explicit consent flow on web and native.

**How to apply:** Use a visible modal with separate confirm and cancel actions for forgetting memory, and test the confirmed state after navigation or reload.