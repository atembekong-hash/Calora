# More Dashboard Reference Redesign

This change refines the existing `MoreScreen` in place. It does not create a new dashboard or remove the existing feature behavior.

The screen now follows the supplied reference hierarchy: a More header with settings affordance, profile/welcome row, a large fasting card with live progress and compact sub-actions, side-by-side Progress and Learning feature cards, an eight-item Quick access grid, and three lower rows for Settings & profile, Health & privacy, and Help & support.

Existing fasting, progress, learning, profile, saved meals, coach, reminders, membership, goals, health-sync, planning, scan, and notification routes remain wired. Local editorial images remain local-only and use `contain` rendering.

Validation completed:

- MoreScreen regression suite: 5/5 passed under Node 22.16.
- Calora TypeScript validation: passed.
- `git diff --check`: passed.
- Web export build: not executed to completion because the sandbox lacks the project-required public build variables (`EXPO_PUBLIC_DOMAIN`, `EXPO_PUBLIC_API_URL`, Supabase public configuration, and RevenueCat public test key). No production variables were changed.
- No native mobile build or store submission was triggered.
