---
name: Encrypted recovery smoke gate
description: Durable design boundary for native encrypted-storage recovery checks.
---

Native encrypted-recovery smoke coverage should exercise the production
AsyncStorage and SecureStore adapters through a deterministic deep-linked QA
route, while capturing the recovery export callback inside the app instead of
depending on an OS share sheet.

**Why:** Share-sheet behavior differs across iOS and Android and is not a
reliable assertion boundary, but the storage adapter, authentication failure,
account key scope, clear ordering, and encrypted export payload are the
security-relevant behavior that must be identical on both targets.

**How to apply:** Keep the flow limited to disposable, namespaced fixture
account keys; run the same Maestro YAML with exact iOS and Android device IDs;
never treat missing native targets as a passing result.