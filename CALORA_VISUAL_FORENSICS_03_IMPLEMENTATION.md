# Calora Visual Forensics 03 — Implementation

## Central system repair

`artifacts/calora/constants/colors.ts` now defines a complete light/dark semantic palette:

- ordinary foreground, strong foreground, card foreground, and readable muted foreground;
- link, disabled foreground, control, border, input, and hero roles;
- primary/destructive foreground pairs;
- success/warning/destructive foregrounds separated from their decorative tints;
- semantic `sheetOverlay` and `sheetHandle` roles; and
- retained Calora green/coral identity and distinct nutrition chart colors.

The former light muted foreground (`#728078`) was replaced with `#59665f`; the new normal supporting-copy pairs meet the documented 4.5:1 threshold. Light and dark status/control roles are tested rather than inferred.

## Shared component changes

- `components/BottomSheet.tsx` consumes active Calora semantic overlay, card, border, and handle tokens. Standard callers no longer override it with a hard-coded alpha.
- `components/AppChrome.tsx` enables bounded font scaling for titles and keeps the visible back affordance role-correct.
- `components/Surface.tsx` uses a distinct semantic inset treatment instead of surface ambiguity.
- Error fallback retains a system-scheme fallback intentionally because it runs outside `CaloraProvider`; its diagnostic sheet now still uses the semantic sheet-overlay role.

## Route-level corrections

Custom confirmation and chart modals in Recipes, Planner, Profile, Coach, Memory, Account, Progress, Today, Scan, Learning, and graph selection now use active palette overlay semantics where applicable. More, Fasting, Learning, Saved Meals, dashboard customization, Scan, Progress, tab navigation, and settings controls use explicit readable foreground roles rather than decorative fills or opacity for normal text.

Progress uses `useReducedMotion()` for key animated reveals, chart movement, and repeating pulse behavior. Fasting schedule and reminder affordances route to the existing contextual Settings reminder surface. The five-tab order is unchanged: Today → Recipes → Scan → Plan → More; Progress remains available from Today and More; You/Membership/Account remain the Settings sections.

## Regression protection

- `colorSemantics.test.ts` calculates semantic-token contrast and control contrast in both themes.
- `visualIntegrity.test.ts` locks shared sheet roles, readable disabled treatment, visible back/context routes, font scaling, and reduced motion.
- `bottomSheet.test.tsx` supplies a deterministic Calora palette to the provider-backed shared sheet harness.

No backend, data model, account, RevenueCat, authentication, health, image-generation, or deployment behavior changed.
