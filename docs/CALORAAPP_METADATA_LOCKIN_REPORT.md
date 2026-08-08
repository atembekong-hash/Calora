# CaloraApp Metadata Lock-In Report

**Date:** 2026-08-08  
**Session scope:** Full product identity rename — "Calora" → "CaloraApp" across the entire repository  
**Outcome:** ✅ COMPLETE — Zero stray customer-facing "Calora" references remain in production code

---

## Canonical Identity (Locked)

| Field | Approved Value |
|---|---|
| Product name | **CaloraApp** |
| Publisher | **Etiendem Technologies** |
| Tagline | **Eat Smarter. Live Better.** |
| Descriptor | **AI Nutrition & Calorie Tracker** |
| Premium tier | **CaloraApp Pro** |
| Domain | **mycaloraapp.com** |
| Copyright | © 2026 Etiendem Technologies |

---

## Files Created

| File | Purpose |
|---|---|
| `artifacts/calora/lib/brand.ts` | Single source of truth for product metadata — BRAND, URLS, EMAILS, SUBSCRIPTION constants |
| `artifacts/calora/eas.json` | EAS build configuration (development, preview, production profiles) |
| `docs/CALORAAPP_PRODUCT_METADATA.md` | Authoritative canonical product document — all identifiers, privacy inventory, third-party services, external blockers |
| `docs/store-metadata/app-store.md` | Apple App Store listing specification |
| `docs/store-metadata/google-play.md` | Google Play Store listing specification |

---

## Files Modified

### `artifacts/calora/app.json`
- `name`: `"Calora"` → `"CaloraApp"`
- `scheme`: `"calora"` → `"caloraapp"`
- `ios.bundleIdentifier`: (missing) → `"com.etiendem.caloraapp"`
- `android.package`: (missing) → `"com.etiendem.caloraapp"`
- `cameraPermission`: `"Calora uses your camera…"` → `"CaloraApp uses your camera…"`
- `slug`: `"calora"` — **PRESERVED** (Expo cloud slug)

### `artifacts/calora/app/index.tsx` (onboarding)
- Loading screen brand wordmark: `calora` → `CaloraApp`
- Progress header brand wordmark: `calora` → `CaloraApp`
- Step 0 body copy: "Calora keeps the numbers useful…" → "CaloraApp…"
- Step 2 body copy: "Calora will learn from your real trend…" → "CaloraApp…"
- Step 4 body copy: "Calora is a wellness tool…" → "CaloraApp…"
- CTA button: "Enter Calora" → "Enter CaloraApp"

### `artifacts/calora/app/(tabs)/profile.tsx` (Settings screen)
- Added `Constants` import from `expo-constants`
- Added `Linking` to react-native imports
- Added `URLS` import from `@/lib/brand`
- Section header: "Calora Plus" → "CaloraApp Pro"
- Badge: "PLUS" → "PRO"
- 3× notification permission dialogs: "Calora to send notifications" → "CaloraApp…"
- Incomplete profile hint: "personalize Calora" → "personalize CaloraApp"
- Appearance subtitle: "how Calora should feel" → "how CaloraApp should feel"
- Living memory subtitle: "signals Calora keeps" → "signals CaloraApp keeps"
- Memory shortcut title: "What Calora remembers" → "What CaloraApp remembers"
- Health row subtitle: "Calora works offline without it" → "CaloraApp…"
- Health disconnect alert: "Calora will stop reading health data" → "CaloraApp…"
- Billing dialog: "Calora Plus entitlement" → "CaloraApp Pro entitlement"
- Billing help dialog: "Calora will support App Store…" → "CaloraApp…"
- Trust card: "everything Calora has stored" → "everything CaloraApp has stored"
- Trust card: "Calora does not share…" → "CaloraApp…"
- Trust card: "funded by Calora Plus subscriptions" → "funded by CaloraApp Pro subscriptions"
- **Added About CaloraApp section** (new) with: CaloraApp info row (dynamic version via Constants), Website link, Privacy Policy link, Terms of Use link, Help & Support link
- Version string: "Calora 1.0 preview · Made for steadier days" → "© 2026 Etiendem Technologies · CaloraApp 1.0 · Made for steadier days"

### `artifacts/calora/app/(tabs)/index.tsx` (Home tab)
- Living state nudge body: "giving Calora more context" → "giving CaloraApp more context"
- Unavailable capture body (×2): "Calora will request microphone/camera access" → "CaloraApp…"
- Coach button accessibility label: "Open Calora Coach" → "Open CaloraApp Coach"
- Coach button label: "Ask Calora" → "Ask CaloraApp"

### `artifacts/calora/app/(tabs)/scan.tsx`
- Camera permission body: "Calora will always show a review" → "CaloraApp…"
- Voice unavailable banner: "Calora will estimate the nutrition" → "CaloraApp…"
- Photo error alert: "Calora could not read that photo" → "CaloraApp…"
- Coach button accessibility label: "Open Calora Coach" → "Open CaloraApp Coach"
- Coach button label: "Ask Calora" → "Ask CaloraApp"

### `artifacts/calora/app/(tabs)/planner.tsx`
- Coach button accessibility label: "Open Calora Coach" → "Open CaloraApp Coach"
- Coach button label: "Ask Calora" → "Ask CaloraApp"
- Memory link accessibility label: "Open what Calora remembers" → "…CaloraApp…"

### `artifacts/calora/app/(tabs)/recipes.tsx`
- Image fallback alt text: "Calora recipe" → "CaloraApp recipe"
- User recipe source tag: "Created in Calora" → "Created in CaloraApp" (×2 — display + data)
- Third-party attribution: "Calora does not claim…" → "CaloraApp…"
- Coach button accessibility label: "Open Calora Coach" → "Open CaloraApp Coach"
- Coach button label: "Ask Calora" → "Ask CaloraApp"
- Fit body copy: "Calora will show exactly how it fits" → "CaloraApp…"
- Footer note: "Calora's nutrition confidence" → "CaloraApp's nutrition confidence"

### `artifacts/calora/app/(tabs)/insights.tsx`
- Coach button accessibility label: "Open Calora Coach" → "Open CaloraApp Coach"
- Coach button label: "Ask Calora" → "Ask CaloraApp"
- Single weigh-in modal: "Calora looks for a trend" → "CaloraApp…"

### `artifacts/calora/app/memory.tsx`
- Screen title: "What Calora remembers" → "What CaloraApp remembers"
- Description text: "from your Calora activity" → "from your CaloraApp activity"

### `artifacts/calora/app/coach.tsx`
- Back button accessibility label: "Close Calora Coach" → "Close CaloraApp Coach"
- Screen title: "Calora Coach" → "CaloraApp Coach"
- Consent body: "saved in Calora" → "saved in CaloraApp"
- Consent note: "Calora's AI service" → "CaloraApp's AI service"
- Consent button: "Continue to Calora Coach" → "Continue to CaloraApp Coach"
- Loading text: "Reading your Calora context…" → "Reading your CaloraApp context…"
- Send button accessibility label: "Ask Calora Coach" → "Ask CaloraApp Coach"
- History role label: `'Calora Coach'` → `'CaloraApp Coach'`

### `artifacts/calora/app/_layout.tsx`
- Code comment: "any Calora notification" → "any CaloraApp notification"

### `artifacts/calora/lib/exportUiHandler.ts`
- `EXPORT_FILENAME`: `'calora-export.json'` → `'caloraapp-export.json'`

### `artifacts/calora/lib/parseErrorExportHandler.ts`
- Share title: `'Calora raw storage data'` → `'CaloraApp raw storage data'`

### `artifacts/calora/lib/hydrationGuard.ts`
- Error message: "Calora could not load your saved local data" → "CaloraApp…"

### `artifacts/calora/lib/livingState.ts`
- Nudge message 1: "gives Calora something real to remember" → "gives CaloraApp…"
- Nudge message 2: "Calora is learning which small choices…" → "CaloraApp is learning…"

### `artifacts/calora/lib/planType.ts`
- Code comment updated

### `artifacts/calora/lib/__tests__/parseErrorExport.test.ts`
- Test assertions: `'Calora raw storage data'` → `'CaloraApp raw storage data'` (×3)

### `artifacts/calora/constants/tokens.ts`
- File comment updated

### `artifacts/api-server/src/routes/coach.ts`
- Fallback message: "your local Calora data is still available" → "…CaloraApp data…"
- System prompt: "You are Calora Coach" → "You are CaloraApp Coach"
- System prompt: "structured Calora context" → "structured CaloraApp context"
- System prompt: `Calora context: …` → `CaloraApp context: …`
- Code comment: "known Calora areas" → "known CaloraApp areas"

### `artifacts/api-server/src/routes/capture.ts`
- System prompt (text mode): "You are Calora's food recognition engine" → "CaloraApp's…"
- System prompt (label mode): "You are Calora's nutrition label reader" → "CaloraApp's…"
- System prompt (photo mode): "You are Calora's food recognition engine" → "CaloraApp's…"
- Voice error message: "Calora will estimate the nutrition" → "CaloraApp…"

### `artifacts/api-server/src/routes/planner.ts`
- System prompt: "You are Calora's weekly meal planner" → "CaloraApp's…"
- Response JSON `provider`: `"Calora AI planner"` → `"CaloraApp AI planner"`

### `replit.md`
- Title, description, and all product references updated to CaloraApp

---

## Identifiers PRESERVED (Do Not Change)

| Identifier | Reason |
|---|---|
| `slug: "calora"` in app.json | Expo cloud project slug — changing requires EAS project migration |
| `@calora/local-state-v2` | AsyncStorage key — persisted user data contract; changing deletes user data |
| `calora-hydration`, `calora-meals`, `calora-goal` | Notification tags scheduled on existing devices |
| `CaloraContext`, `useCalora` | Internal code identifiers — no user exposure |
| `@workspace/calora` | pnpm workspace package name — internal build system |
| `calora_recipe_nutrition` | Database table name — schema stability over naming |
| `calora-onboarding-visual.jpg` | Static asset filename — no user exposure |

---

## TypeScript Validation

| Package | Result |
|---|---|
| `@workspace/calora` | ✅ PASS — 0 errors |
| `@workspace/api-server` | ✅ PASS — 0 errors |
| `@workspace/mockup-sandbox` | ⚠️ 2 pre-existing errors in shadcn/ui components (unrelated to this migration) |

---

## External Actions Required Before Launch

These cannot be completed from the repository and remain **external launch blockers**:

| Item | Status |
|---|---|
| `mycaloraapp.com` domain — DNS and hosting | REQUIRES OWNER ACTION |
| Privacy Policy page (`/privacy`) | **LAUNCH BLOCKER** — required by App Store, Google Play, GDPR |
| Terms of Use page (`/terms`) | **LAUNCH BLOCKER** — required by App Store, Google Play |
| App Store Connect — app record | REQUIRES STORE CONFIGURATION |
| `com.etiendem.caloraapp` bundle ID registration | REQUIRES APPLE DEVELOPER ACCOUNT |
| Google Play Console — app record | REQUIRES STORE CONFIGURATION |
| `com.etiendem.caloraapp` package registration | REQUIRES GOOGLE PLAY ACCOUNT |
| RevenueCat project + SDK integration | REQUIRES OWNER ACTION |
| Store subscription products (`caloraapp_pro_monthly`, `caloraapp_pro_annual`) | REQUIRES STORE CONFIGURATION |
| Email aliases at `mycaloraapp.com` | REQUIRES DNS/EMAIL PROVIDER |
| EAS project credentials (Apple Team ID, ASC App ID, service account key) | REQUIRES CREDENTIAL |

---

## Summary

- **Files modified:** 22
- **Files created:** 5
- **Total "Calora" → "CaloraApp" replacements:** 70+
- **Preserved internal identifiers:** 7 (documented above)
- **TypeScript errors introduced:** 0
- **Customer-facing stray references remaining:** 0
