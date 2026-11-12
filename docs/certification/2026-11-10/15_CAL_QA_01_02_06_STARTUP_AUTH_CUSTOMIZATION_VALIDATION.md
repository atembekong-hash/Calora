# CAL-QA-01 / CAL-QA-02 / CAL-QA-06 Startup, Auth, Onboarding, and Customization Validation

**Date:** 2026-11-10
**Source basis:** protected main after `5a9761d20b825aef5218e886a818ae26d95bd04b`
**Scope:** authentication, sign-out/session transitions, onboarding resume/review, profile/settings surfaces, subscription interaction guards, health recovery interaction, and Today/customization contracts

The focused client run passed **215/215 tests across 19 files**. Coverage included auth context and callback routing, sign-out, onboarding boundaries, post-auth navigation, profile/settings interactions, profile photo persistence, subscription identity/entitlement guards, Health Connect recovery interactions, responsive interaction contracts, and Today dashboard source contracts.

The run emitted React test-harness `act(...)` warnings from rendered Profile tests but no failed assertions. No native device execution, provider session, database mutation, production deployment, build, or store submission was performed.

These results are **bounded source/UI evidence**, not full CAL-QA certification. Native startup/auth persistence, OS permission behavior, current production serving provenance, cross-device state, and store/provider lifecycle evidence remain outside this run.

**Verdict: bounded validation PASS; full launch certification remains PARTIAL/BLOCKED on external evidence gates.**
