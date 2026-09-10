---
name: Expo plist parser compatibility
description: The Expo SDK 54 plist parser and xmldom override must remain on compatible API behavior
---

Calora's Expo SDK 54 `@expo/plist` parser calls `DOMParser.parseFromString` without a MIME argument. Keep that package on the latest compatible `@xmldom/xmldom` 0.8.x release through a scoped pnpm override; retain newer xmldom versions for unrelated consumers when security hardening requires them.

**Why:** `@xmldom/xmldom` 0.9.x validates MIME types and rejects the omitted argument, causing iOS prebuild to fail in `withIosInfoPlistBaseMod` before native files are configured.

**How to apply:** When updating Expo SDK 54 dependencies or workspace security overrides, verify the resolved `@expo/plist` parser version and run a clean `expo prebuild --no-install --platform ios` before changing app configuration or native credentials.