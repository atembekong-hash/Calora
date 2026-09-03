---
name: Notification inbox
description: Calora's in-app notification history is local, account-scoped, and fed by Expo notification delivery.
---

Calora's notification center should remain an account-scoped local inbox. It records notifications when Expo delivers them, when a notification is tapped, and for notifications still presented when the app resumes; it must not mix one account's history into another account's view.

**Why:** Existing reminders are scheduled entirely on-device, so a local inbox preserves the app's offline/privacy boundary without inventing a server notification dependency.

**How to apply:** Route new local notification categories through the shared inbox capture path and preserve read state, deduplication, bounded history, and explicit clear-history behavior. Add a server push pipeline separately only when product requirements and an authenticated delivery source exist.