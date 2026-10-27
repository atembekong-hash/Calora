# Calora UX 02 — Implementation and navigation

## Implemented navigation

The visible tab order is now exactly:

```text
Today → Recipes → Scan → Plan → More
```

- `Today` replaces the visible Home label.
- `Scan` remains the raised central camera action with its existing inset-safe native bar handling.
- `Progress` (`/(tabs)/insights`) is hidden from tabs, not deleted. It remains available from the existing Today context and More.
- `More` is a real fifth tab at `/(tabs)/more`.
- Settings remains `/(tabs)/profile`, reached through More's gear.
- New protected root-stack routes: `/fasting`, `/learning`, `/saved-meals`, and `/dashboard-layout`.

## More hub

The More tab is intentionally limited to secondary navigation rather than replicating Today. It includes:

- A prominent fasting card driven by persisted state and current time.
- A Progress preview based on existing actual weight or current-day log data, with an honest empty state.
- A Learning entrypoint containing original local educational content.
- Quick access to Saved Meals, Coach, reminders, Calora Pro, goals, and Health connection.
- A personal Calora list that retains clear routes to Fasting, Progress, Learning, Settings, and Health connection.

No signed URLs, recipe previews, health measurements, subscription entitlement values, or fabricated data are exposed by these UI additions.

## New destinations

### Fasting

`/fasting` offers a circular timer, schedule selection (12:12, 14:10, 16:8, custom bounded duration), start/end controls, a finite history, safety language, and direct contextual access to the existing reminder controls. It persists across restarts through the existing account-scoped state snapshot.

### Learning

`/learning` offers local original lessons with search, Nutrition/Fasting/Recipes topics, detail sheets, destination links, and explicit general-education and fasting-safety wording. It does not claim medical credentials or depend on a fictional content service.

### Saved Meals

`/saved-meals` is an entrypoint to the existing Saved Meal store and diary logging action. It was removed from any subscription-adjacent conceptual grouping and is also linked from More and Settings You.

### Dashboard layout

`/dashboard-layout` allows users to hide eligible widgets, move them, choose supported compact/expanded density, and restore recommended defaults. Current Today integration respects visibility for Steps, Hydration, Fasting, nutrient balance, and meal rhythm while leaving core diary and calorie functionality accessible.

## Settings preservation

The existing `You | Membership | Account` pager remains. Two small `You` rows were added for Dashboard customization and Saved Meals; no existing setting, revenue, privacy, data-export, sign-out, deletion, health-sync, or reminder control was removed.
