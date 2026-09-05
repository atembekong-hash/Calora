---
name: Supabase redirect probes
description: How to distinguish accepted Auth redirects from silent Site URL fallback without completing a live email flow.
---

Do not treat a Google authorize `302` or password-recovery `200` as proof that a requested redirect is allow-listed. Supabase can preserve the requested URL during the authorize handoff and return a non-enumerating recovery success even when final delivery would fall back to the configured Site URL.

**Why:** Public status-only probes produced identical responses for the canonical callback, the legacy custom scheme, and a deliberately unlisted URL. An admin-generated recovery link exposed the actual destination and distinguished an accepted redirect from Site URL fallback.

**How to apply:** For release evidence, create a disposable confirmed Auth user, generate recovery links for the canonical, legacy, and known-unlisted destinations through the admin API, inspect only each action link's `redirect_to`, and delete the disposable user in a `finally` block. The canonical destination must survive unchanged; legacy and control URLs must resolve to the Site URL instead.