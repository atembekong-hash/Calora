---
name: Coach chat menu
description: Durable interaction pattern for Coach chat history and menu actions.
---

Coach's top-right header menu opens a local history panel. It should keep history previews, new-chat, and clear-history actions separate from the active conversation surface; closing the panel must preserve the current chat.

**Why:** Users need to revisit the context of a Coach conversation without losing the calm single-thread chat surface or confusing local history actions with AI mutations.

**How to apply:** Keep the menu navigation-only and local. Preserve existing Coach consent, bounded context, safety handling, and explicit data-reset semantics when extending chat history.