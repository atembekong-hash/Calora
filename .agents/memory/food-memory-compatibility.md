---
name: Food Memory compatibility
description: Local-first migration boundary between canonical food memories and Calora's existing diary log consumers.
---

Food Memory is the canonical source for capture drafts, accepted nutrition snapshots, corrections, and repeat patterns, while the existing `FoodLog` shape remains a compatibility projection for current screens.

**Why:** The current mobile product renders several surfaces directly from `FoodLog`; an immediate diary rewrite would create a broad regression surface and could silently change existing users' history.

**How to apply:** Migrate existing logs into accepted memories, route new AI capture through draft → review → accept, and keep accepted diary entries tied to the nutrition snapshot captured at approval time.

Review routes must clear their draft parameter after accept, reject, or close; otherwise a route effect can reopen a rejected draft when the screen re-renders.

**Why:** Recipe and planner drafts are handed to the shared review screen through Expo Router params, and retaining the param caused the rejected review to reopen during mobile testing.

**How to apply:** Treat route params as one-time handoff inputs, use draft-only lookup, and replace the route with a clean scan URL after every terminal review action.