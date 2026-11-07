# Complete Feature and Interaction Inventory

The current product source exposes five primary tabs and secondary routes for Today, Recipes, Scan, Plan, More, Progress, Insights, Fasting, Steps, Hydration, Learning, Coach, Living Memory, saved meals/recipes, settings, onboarding, subscription management, privacy rights, reminders, goals, dashboard customization, and account deletion.

The product domain audit mapped routes, navigation, dashboard widgets, settings controls, recipe flows, Coach surfaces, learning, health, scanning, and deletion controls. Source-level interaction contracts are generally coherent, but authenticated Coach persistence/copy/deletion and native camera, barcode, voice, permissions, accessibility, and lifecycle behavior remain unavailable for current independent runtime verification.

The inventory also identifies contract drift: a legacy `/v1/coach/respond` compatibility path and orphan privacy export/delete OpenAPI operations do not correspond to current active mobile consumers. These remain a P1 contract-governance finding until removed, routed, or explicitly documented.
