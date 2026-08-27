# Calora Feature Preservation Matrix

This matrix is the functional contract for the spatial UI modernization. A visual improvement is incomplete if it removes, hides, rewires, or weakens one of these capabilities.

| Surface | Features that must remain available | Rules and boundaries that must not change | Validation evidence |
|---|---|---|---|
| Root application | Theme, account-scoped query state, notification setup, diary sync, referral activation, post-log insights, stack navigation | Account isolation and provider order; no broad error fallback that masks auth or persistence failures | Typecheck, existing root/provider tests, authenticated flow smoke test |
| Loading and onboarding | Hydration recovery, five onboarding steps, goal/profile setup, legal/supporting copy, final activation | Existing persistence and onboarding completion semantics | Fresh-session visual check; complete onboarding once |
| Authentication | Sign in, sign up, reset/recovery paths, session restoration, sign out | Supabase Auth boundary; one refresh-and-retry on token-backed 401; no fake local session | Existing auth tests; browser flow where supported |
| Tab navigation | Home, Recipes, Scan, Progress, Plan; central Scan affordance | Tab order and route names unchanged; active state remains accessible | Tap all five tabs; back navigation |
| Home | Calorie gauge, macro status, quick logging actions, wellness, diary, recipes, Planner peek, all existing modals and navigation | Nutrition math and approved-diary semantics unchanged; wellness entries remain optional/local | Log or open each action; scroll; inspect totals |
| Recipes | Discover, Premium, search/filtering, creation, provenance, saved recipes, detail, logging, Planner interaction | Open-source, user-created, and verified nutrition provenance remain visually distinct | Search/filter, open detail, save/log/add-to-plan |
| Scan and capture | Camera, barcode, food, nutrition label, receipt, voice/text alternatives, draft review, correction, approval | Barcode requires exact UPC match; estimates stay estimates until approval; no silent approval | Exercise all available modes; review and approve a draft |
| Progress | Weight charts, goal celebration, trends, summaries, existing motion | Historical snapshots and displayed data remain truthful; reduced motion honored | Switch ranges/views; inspect charts at narrow width |
| Planner | Today/Week/Shopping workspaces, viewed week, generation, programs, meal insertion/editing, move/copy/replace, undo, logging, shopping state | One viewed-week source of truth; fallback weeks never represented as Program-shaped; shared local mutation path | Switch workspaces/weeks; edit, undo, log, toggle shopping |
| Coach | Consent, suggestions, chat, history, new/clear chat, bounded safe navigation | Fact Context remains closed/fail-closed; allowlisted navigation only; no broad free-text metadata | Consent and unavailable states; send safe prompt; open menu |
| Profile and settings | Appearance, text size, units, reminders, health, subscription, referrals, saved meals, export, deletion, account, privacy, support | RevenueCat, health, referral rewards, export, and destructive safeguards unchanged | Toggle benign settings; open every grouped destination |
| Subscriptions | Entitlement display, purchase/restore/manage affordances | RevenueCat remains server/provider authoritative; no UI-only entitlement grant | Existing subscription tests; open paywall/manage surface |
| Referrals and invite | Referral status and rewards, invite deep-link persistence and activation | Claim-first idempotency, reward caps, and account association unchanged | Existing tests; route/deep-link smoke check |
| Health integrations | Connection state, permissions, data import/sync affordances | Explicit unsupported/unavailable states; no simulated sync success | Open health settings; verify platform-specific state |
| Food Memory | Living/Food Memory surface, accepted memories, legacy diary compatibility | Confirmed-source normalization and historical nutrition snapshots preserved | Open, inspect, and exercise available memory actions |
| Restaurants | Search/lookup, result selection, review, diary approval | Provenance and review-before-log behavior preserved | Search/open/review flow where service is available |
| Modals and sheets | Existing add/edit/review/detail/confirmation surfaces across the app | No nested modal regression; keyboard and scroll remain usable; destructive confirmation retained | Open/close representative sheets; keyboard test |
| Accessibility | Screen-reader labels/roles, touch targets, contrast, text scaling, reduced motion | Semantics cannot be traded for decoration; decorative layers cannot capture touches | Static inspection plus viewport/theme/reduced-motion checks |
| Persistence | Profile, diary, wellness, Planner, shopping, memory, local settings | Hydration failure blocks autosave; destructive clears serialize behind writes; account scoping preserved | Existing persistence tests; reload smoke check |
| Server and legal assets | API behavior, security headers/routes, privacy/terms/support/store docs | No backend or legal behavior changes as part of visual scope | Server security tests; git diff confirms no server changes |

## Change control

Implementation should prefer:

- Shared additive tokens and primitives
- Small, screen-local migrations
- Existing event handlers and state mutation paths
- Layout-only grouping where behavior is already correct
- Explicit labels and states over decorative ambiguity

Implementation must not:

- Replace working feature code with static mockups
- Change API payloads or database structures
- Remove lower-frequency actions
- Turn safety or unavailable states into optimistic success
- Add global gestures that compete with scrolling
- Introduce an unbounded animation loop
- Modify Fact Context rollout controls