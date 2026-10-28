# Calora Experience 07 — Tests and Visual Evidence

## Local results

| Command / suite                           | Result                                                                                                                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec tsc -p tsconfig.json --noEmit` | Pass after feature integration and reviewer-driven repairs.                                                                                                                                                                 |
| Relevant non-DOM Vitest suite             | Pass: 15 files, 201 tests across fasting, Learning state, Progress, persistence, export, navigation, and schema coverage.                                                                                                   |
| Web serving/security tests                | Pass: 15 Node tests.                                                                                                                                                                                                        |
| Server security tests                     | Pass: 6 Node tests.                                                                                                                                                                                                         |
| JSDOM screen suites                       | Blocked locally before test import by sandbox Node 22.13.0 + bundled Undici 8.12.2: `createZstdDecompress` is unavailable. Protected release validation uses Node 24, so those suites remain a CI verification requirement. |

## Review-driven repair evidence

Independent source reviews found and this branch repairs:

1. Under-18 users could start a 10–24 hour timer despite the educational safety boundary.
2. Partial persisted timer state could prevent a fresh timer from starting.
3. The fasting guide opened the generic Learning hub instead of the specific safety lesson.
4. More selected the first persisted weight as “latest,” could repeat units, and used UTC rather than Calora’s local-day key for meal count.
5. Several tests used stale schema literals or omitted durable fasting/Learning fields from export fixtures.

## Visual evidence boundary

The approved reference images guided hierarchy and visual intent. A sandbox Expo web preview could not be rendered to a usable authenticated visual session because required non-secret runtime configuration was unavailable; no Android/iOS build or device run was performed. Therefore physical-device visual certification remains owner/device work, not a claim of completion.

## Required owner-device checklist

1. Validate Fasting schedule selection, optional start/end confirmations, interruption, history, calendar, and reminder deep link on Android and iOS.
2. Review Learning in light/dark mode, large text, back navigation, search, saved/completed state, article reader, and relevant lesson links.
3. Check Progress Overview/Trends/Weight against real local/Health data, including no-record and stale-weight states.
4. Confirm More’s cards, Quick Access, contextual Settings links, and five-tab navigation at normal and enlarged text sizes.
5. Exercise existing Membership, Account deletion, export, local-delete, and Health flows without interpreting the test environment as a production release.
