---
name: Onboarding resumption and review
description: Calora onboarding progress is local account state, while completed users revisit a prefilled review flow without entering a destructive reset.
---

Incomplete onboarding progress is durable and bounded to the seven-step flow. Completing onboarding clears the saved step; revisiting a completed onboarding flow must preserve the existing profile until the user explicitly finishes the review.

**Why:** Users can leave onboarding before finishing, and treating replay as a data clear would risk losing diary, settings, or consent state.

**How to apply:** Keep resume progress in the same account-scoped persistence and hydration path as the rest of Calora state. Route completed-user review separately from first-run onboarding, prefill saved values, and only commit edits at the final step.