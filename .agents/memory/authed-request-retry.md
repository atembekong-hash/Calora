---
name: Authenticated request retry
description: How Calora client requests recover from stale Supabase access tokens instead of showing false sign-in prompts.
---

**Rule:** Client calls that need a Supabase Bearer token must not treat one 401 as "signed out." `getSession()` can return a stale/unexpired-looking access token (throttled auto-refresh in a backgrounded web preview). On a 401 *with* a token, force `supabase.auth.refreshSession()` once and retry once; only show a sign-in prompt when there is genuinely no session (then skip the network entirely).

**Why:** AI recipe generation showed "Please sign in" 401s to signed-in users, and Retry could never recover because it re-sent the same stale token.

**How to apply:** Use the helper in `artifacts/calora/lib/recipeGeneration.ts` (`postWithAuthRetry`) as the pattern for any new manually-fetched authenticated endpoint; generated-client calls go through the global token getter instead. Server stays authoritative — never bypass its 401 with client-side assumptions.
