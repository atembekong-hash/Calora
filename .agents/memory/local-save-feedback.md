---
name: Local save feedback
description: Feedback pattern for Calora’s local-first actions.
---

Calora uses a brief, touch-through “Saved locally” notice for water, mood, activity, and weight check-ins. The notice identifies what changed, fades quickly, and does not replace the persistent local-state copy shown in the UI.

**Why:** Offline-first actions need reassurance, but persistent banners and blocking dialogs would interrupt the calm logging rhythm.

**How to apply:** Use the same lightweight notice for new local mutations that users may wonder about. Keep it short-lived, non-blocking, and explicit about local storage rather than implying server sync.