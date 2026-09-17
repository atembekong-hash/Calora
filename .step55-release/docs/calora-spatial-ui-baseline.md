# Calora Spatial UI Modernization Baseline

Date: 2026-08-27  
Scope: Task 522 — controlled visual modernization of the Calora mobile app

## Recovery point

- Branch at implementation start: `main`
- Recovery commit before implementation: `7e2cd73`
- The recovery commit contains the original modernization mission only; no product code had been changed.
- Baseline screenshots:
  - `docs/evidence/calora-baseline-mobile.jpg` — 402 × 874
  - `docs/evidence/calora-baseline-large.jpg` — 768 × 1024

## Baseline verification

The existing application passed before implementation:

- Mobile TypeScript check: PASS
- Vitest: PASS — 61 files, 971 tests
- Static server security tests: PASS — 6 tests
- Expo preview: PASS
- Browser console: no application errors

The diary-sync rejection and quarantine messages emitted during tests are expected negative-path test evidence, not failures.

## Existing visual language

Calora already has a recognizable foundation:

- Warm cream backgrounds
- Coral action color
- Deep green trust and nutrition surfaces
- Rounded cards and controls
- Editorial food photography
- Strong headline typography
- Restrained, supportive copy

The modernization must deepen this identity rather than replace it.

## Baseline opportunities

1. **Depth is inconsistent.** Most information is separated by color and rounded rectangles, but cards, controls, summaries, and overlays do not yet share formal elevation rules.
2. **Press feedback is not universal.** A tactile press primitive exists, but important actions still use mixed feedback patterns.
3. **Motion is screen-specific.** Useful animation primitives exist, but timing, choreography, celebration, loading, and reduced-motion behavior are not yet expressed as one system.
4. **Large layouts stretch.** Wider previews preserve readability but mostly expand surfaces horizontally instead of adapting composition and information density.
5. **High-density screens need clearer layers.** Planner, Scan review, Recipes, Progress, and Profile contain many valuable actions that need stronger grouping and progressive disclosure without losing access.
6. **Chrome has high leverage.** Shared headers and the five-tab shell can establish spatial consistency without changing navigation structure.

## Design constraints

- Controlled modernization, not a rewrite
- Additive and reversible implementation
- No heavy 3D framework
- No database, API, auth, billing, health, referral, or persistence contract changes
- No removal of existing features or information
- No change to five-tab order
- No change to Coach safety or Fact Context boundaries
- No production build, deployment, submission, migration, or destructive operation
- Reduced motion must remain a first-class path
- Light and dark themes must remain supported
- Large text and narrow-phone behavior must remain usable
- Decorative layers must never intercept scrolling or touches

## Target spatial system

Four semantic depth tiers:

1. **Flat** — page background and ungrouped content
2. **Inset** — selected states, progress wells, input regions, and nested summaries
3. **Raised** — cards, grouped controls, and primary content modules
4. **Floating** — navigation, active overlays, menus, and high-priority calls to action

Depth should come from a restrained combination of tonal separation, border highlights, ambient shadow, and tactile movement. It must not rely on opacity-heavy glass, neon effects, or decorative perspective that compromises legibility.

## Target motion system

Four semantic motion tiers:

1. **Micro feedback** — press, selection, toggle, and acknowledgement
2. **Component transition** — expanding groups, tabs, summaries, and modal content
3. **Screen choreography** — bounded staged entrance for major modules
4. **Celebration** — rare, earned moments such as goal completion

Reduced-motion mode should replace movement with immediate state changes or short opacity transitions. Infinite decorative motion is out of scope.

## Pilot acceptance criteria

Home is the representative pilot. It is accepted only if:

- Calorie, macro, and diary numbers remain immediately readable
- Quick actions become more tactile without becoming larger or harder to scan
- Wellness, diary, recipe, and Planner sections gain hierarchy without vertical bloat
- Logging and navigation actions preserve their handlers
- Decorative depth does not intercept scrolling or presses
- Light and dark themes remain legible
- Reduced-motion behavior remains available
- Narrow and larger viewports remain usable
- Typecheck and existing tests remain green
