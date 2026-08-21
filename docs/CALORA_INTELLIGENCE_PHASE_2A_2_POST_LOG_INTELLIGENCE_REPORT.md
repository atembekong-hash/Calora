# Calora Intelligence Phase 2A.2 — Post-Log Intelligence Report

## Scope delivered

Phase 2A.2 adds one optional, non-blocking and transient response after a
successfully committed local food log. It is evaluated only at the two canonical
commit boundaries (`addLog` and accepted reviewed drafts), never by watching
rendered log state. No draft, scan, photo, barcode, receipt, restaurant,
Planner, Recipe, network confirmation, or background-sync step triggers it
before the user confirms a food log.

Eligible fresh transitions are deliberately bounded to:

- daily calorie target crossing from below 100% to at least 100%;
- protein moving from below 50% to at least 50% of target while calories are at
  least 50% of target;
- one meal moving from below 60% to at least 60% of daily calories when the
  new item contributes at least 100 kcal and 10% of target;
- logging moving from fewer than two meal slots to at least two slots and two
  logs.

All other logs are silent. At most one result is visible; newer eligible logs
replace it and ineligible logs clear it. Editing or deleting the source log
withdraws the active result.

## Safety and privacy boundary

- The selector is pure and fail-closed for hydration, flag, account scope,
  stale/mixed/malformed facts, same snapshot, missing confidence, and ordinary
  changes.
- Output includes only derived wording and Foundation fact references. It
  contains no account identifier, food name, notes, photo, provider payload,
  storage key, or raw log identifier.
- The source identifier used solely to withdraw an active notice is kept in a
  private in-memory ref. The visible payload is ephemeral provider UI state and
  is not added to persisted Calora state, autosave, sync outbox, Coach history,
  living memory, AsyncStorage, React Query persistence, database, or files.
- The root host is mounted inside the existing account-keyed provider, so an
  account remount drops transient memory. It is pointer-transparent, expires
  after 4.2 seconds, and exposes a polite accessibility announcement.
- Only `intelligence.insights.post_log` is enabled. No server, LLM, analytics,
  notification, background, feedback, Coach, Planner, Recipe, or evidence UI
  capability was enabled.

## Validation

Completed on 2026-08-21:

| Check | Result |
| --- | --- |
| Calora TypeScript | passed |
| Focused Intelligence tests | 36 passed across 3 files |
| Calora full suite | 52 files / 914 tests passed, plus 6 static-server checks |
| API TypeScript | passed |
| API full suite | 20 files / 228 tests passed |
| Expo web smoke | onboarding/root rendered; no browser errors |

The local performance harness recorded (development machine, 100 iterations):
context adaptation 0.1248 ms, evidence partitioning 0.0105 ms, confidence
computation 0.0014 ms, watermark generation 0.0653 ms, fact generation
0.1844 ms, baseline selector 0.1025 ms, and Post-Log transition selection
0.0103 ms. Timing is environment-dependent and should be treated as a
regression signal rather than a device guarantee.

## Honest remaining validation debt

No authenticated browser session was available for the smoke test, so an
end-to-end logged-food banner was not exercised in-browser. No physical Android
or iOS device validation was performed. Narrow/large layouts, large text,
TalkBack, and VoiceOver remain unvalidated. Existing pre-release device journey
work should cover those checks before launch.