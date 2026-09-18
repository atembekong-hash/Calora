---
name: Onboarding resumption and review
description: Calora onboarding drafts remain local account state, while completed profiles reconcile from the authenticated server before routing.
---

Incomplete onboarding progress is durable and bounded to the seven-step flow. Completing onboarding clears the saved step and syncs the durable profile to the authenticated server. On launch, an authenticated scope must reconcile the server profile before deciding whether to show onboarding: a server profile restores reinstall state, a 404 with a completed local profile bootstraps the server, and a 404 with no completed profile is a genuine first run. Transport failures must not be treated as first run.

**Why:** Users can leave onboarding before finishing, and reinstall removes local storage even when Supabase restores the account session. Rendering onboarding while the server lookup is unresolved causes completed accounts to re-enter setup.

**How to apply:** Keep resume progress in the same account-scoped persistence and hydration path as the rest of Calora state. Gate the onboarding route on both local hydration and authenticated profile reconciliation; route completed-user review separately from first-run onboarding, prefill saved values, and only commit edits at the final step. Clear-all must delete the server profile before allowing a fresh onboarding flow.