---
name: GitHub CLI and Replit auth
description: The distinction between Replit’s bound GitHub OAuth connection and local GitHub CLI authentication.
---

A successfully bound GitHub OAuth connection in Replit is separate from the local `gh` CLI credential store. The connector can authenticate GitHub API requests while `gh auth status` still reports no logged-in hosts.

**Why:** Reconnecting the Replit integration does not create or refresh `.config/gh/hosts.yml`; assuming it does can lead to a false “ready to push” conclusion.

**How to apply:** Verify both layers independently. Use the secure connector for API identity/repository checks, and require the owner to complete `gh auth login --web` before treating local CLI push authentication as restored.