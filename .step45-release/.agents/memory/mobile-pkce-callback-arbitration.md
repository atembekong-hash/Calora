---
name: Mobile PKCE callback arbitration
description: Durable safety rules for OAuth callbacks delivered by both Expo WebBrowser and app routing.
---

**Rule:** Treat the browser result and deep-link route as competing deliveries of one PKCE callback. Coalesce exchange attempts by a non-reversible code key, keep in-flight work non-expiring, and replay only short-lived success metadata after validating the live session identity.

**Why:** Android can deliver the same callback to both Expo WebBrowser and Expo Router. Two independent exchanges consume the one-time verifier and make the second path display a misleading missing-verifier failure.

**How to apply:** Never cache raw authorization codes or sessions, never convert a genuine missing-verifier error into success, remove failed exchanges immediately, bound and expire successful markers, and clear settled markers on sign-out or account changes.