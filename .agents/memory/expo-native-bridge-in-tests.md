---
name: Expo native bridge in tests
description: The Calora Vitest environment cannot evaluate Expo native modules without mocks, while production still needs the real SecureStore bridge.
---

Keep native SecureStore loading lazy at the app-module boundary, and provide a Vitest mock for its async key-value contract before provider integration tests mount the real context.

**Why:** Expo modules may evaluate native globals such as EventEmitter and TurboModuleRegistry during import; eager loading makes otherwise valid local-first provider tests fail in node/jsdom.

**How to apply:** Preserve the production SecureStore accessibility option and never add a plaintext test fallback. On browser preview only, use an explicit persistent browser-key fallback because Expo SecureStore's web shim has no native implementation. Test encrypted persistence through the adapter with a mocked SecureStore module.