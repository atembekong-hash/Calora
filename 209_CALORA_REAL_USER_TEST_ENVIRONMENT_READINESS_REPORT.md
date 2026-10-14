# Report 209 — Calora Real-User Test Environment Readiness

**Date:** 2026-10-14  
**Mission:** Establish the environment required for comprehensive authenticated, provider-backed, and native Calora validation.  
**Repository:** `atembekong-hash/Calora`  
**Protected baseline inspected:** `origin/main` at `ebd96b3fb70a286ebaa7a884033428e4b10b1a62`  
**Scope boundary:** Read-only environment and access investigation. No application source, production configuration, database data, subscription state, or native build configuration was changed.

## 1. Executive result

**Environment readiness: BLOCKED for complete real-user certification.**

The investigation established that the production service and provider projects are healthy, the connected browser route is available, and the repository contains supported ephemeral QA and device-fixture mechanisms. However, complete real-user execution cannot begin because the required authenticated and native test surfaces are not simultaneously available:

1. The authorized Windows desktop is online and exposes the `CaloraCertification` workspace, but switching execution to it is rejected at the gateway's **session-directory authorization** step.
2. The connected browser has a Calora sign-in form with prefilled fields, but the submitted existing account credentials were rejected as invalid. No credential was extracted, printed, or modified by this mission.
3. The sandbox has no approved Supabase service-role key, test password, or Supabase access token, so it cannot create/sign in an ephemeral QA user through the existing supported provisioning path.
4. The sandbox has no `adb`, Android emulator, Xcode/simulator, Maestro, or Detox tooling. It cannot execute native Android/iOS flows.
5. RevenueCat contains a distinct **Test Store** app and a real `caloraapp_pro` entitlement, but granting Plus access is a provider-state mutation and requires a known isolated customer identity. No such customer identity was created because authenticated QA provisioning is blocked.

The exact owner actions required are listed in Section 10. No native build was triggered.

## 2. Repository and release safety preflight

| Check | Result | Evidence |
|---|---|---|
| Protected main reachable | PASS | `origin/main = ebd96b3fb70a286ebaa7a884033428e4b10b1a62` |
| Worktree before report | PASS | Clean branch `fix/recipe-infinite-scroll`; no pre-existing source changes observed |
| Runtime code modified | NO | This mission adds documentation only |
| Production database modified | NO | Supabase calls were read-only project/schema/SELECT inspection |
| RevenueCat state modified | NO | Project, app, entitlement, offering, and product reads only |
| Railway state modified | NO | Project/service health inspection only |
| Native build/release triggered | NO | No Expo/EAS/APK/AAB/IPA/TestFlight/Play workflow was invoked |

## 3. Desktop/device gateway investigation

### 3.1 Current device state

The device service reports:

- **Device:** `DESKTOP-0UR9SG3`
- **OS/architecture:** Windows amd64
- **State:** `online`
- **Workspace:** `CaloraCertification`
- **Path:** `C:\Users\DynaBook\Desktop\CaloraCertification`
- **Workspace command permission:** `allow_cmd: true`
- **Telemetry:** unavailable because the device does not support device telemetry

The workspace is therefore visible and mapped. This is not an offline-device or missing-folder problem.

### 3.2 Switch attempt

A switch was attempted using the authorized desktop environment and the exact `CaloraCertification` workspace. The gateway returned:

> `Update and connect the selected Desktop to authorize session directories.`

The device status immediately afterward still reported the device online and the workspace present. This establishes a gateway/session-registration failure between workspace discovery and command execution. The failure is not caused by a missing workspace mapping, a missing `allow_cmd` permission, or device offline state.

### 3.3 Native capability conclusion

The sandbox cannot substitute for the desktop because it has no device tooling:

| Tool | Sandbox result |
|---|---|
| `adb` | missing |
| Android `emulator` | missing |
| `xcrun` / `simctl` | missing; impossible on Linux |
| `maestro` | missing |
| `detox` | missing |
| `expo` / `eas` CLI | not installed as global commands |

**Device status:** `BLOCKED` — the physical-device route requires the desktop gateway session to register, and the sandbox has no Android/iOS substitute. No native build was attempted or requested.

## 4. Connected browser investigation

### 4.1 Browser route

The connected **My Browser** route is available and navigated successfully to:

`https://app.mycaloraapp.com/auth/sign-in`

The page rendered the Calora sign-in surface, including email/password sign-in and Google sign-in. This proves browser control and page rendering are operational.

### 4.2 Authentication result

The form was already populated by the connected browser session. The existing form was submitted without revealing or changing the masked password. Calora returned:

> `Invalid login credentials`

No further password attempts were made. No password, token, cookie, or account secret is included in this report.

**Authenticated browser status:** `BLOCKED` — browser automation works, but the available session does not currently provide a valid authenticated Calora identity.

### 4.3 Security boundary respected

The mission did not:

- bypass the sign-in screen;
- disable entitlement checks;
- inject a session or bearer token;
- use a production user's data as a fixture;
- reveal or copy credentials;
- use a hidden admin route to impersonate a user.

## 5. Supabase project and QA-fixture readiness

### 5.1 Production project

Supabase project discovery returned the active healthy Calora project:

- **Project name:** `caloraapp`
- **Project ref:** `pzdulhkpwbrbrgskwwwe`
- **Region:** `us-west-2`
- **PostgreSQL:** 17.6.1.155
- **Status:** `ACTIVE_HEALTHY`

The public schema was inspected read-only. Relevant production tables exist and have RLS enabled, including:

- `calora_users`
- `calora_profiles`
- `calora_subscriptions`
- `calora_recipes`
- `calora_recipe_media`
- `calora_diary_entries`
- `calora_ai_capture_sessions`
- `calora_ai_capture_candidates`
- Coach conversation/settings tables
- sync, consent, referral, deletion, and recovery tables

No migration, insert, update, delete, or configuration operation was performed.

### 5.2 Existing supported provisioning path

The repository already contains a narrowly scoped script:

`scripts/src/provisionQaAccount.ts`

It is designed to create or confirm an internal QA account using:

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALORA_SIGNUP_TEST_PASSWORD`

The API integration test also creates a timestamped ephemeral `@calora.dev` user and deletes it in `afterAll`. This is the correct shape for isolated test execution.

### 5.3 Current secret availability

The sandbox environment was checked by presence only. The following approved provisioning variables are **missing**:

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALORA_SIGNUP_TEST_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`

No secret values were printed or searched for elsewhere.

### 5.4 Current application-user evidence

A read-only query for application users with an `@calora.dev` email returned no rows, and a read-only query of `calora_subscriptions` returned no rows. This does not prove that Supabase Auth has no QA identity because Auth administration is not exposed through the public application table and the required service-role credential is unavailable. It does establish that there is no currently visible application-profile/subscription fixture matching the repository's documented QA convention.

**QA-account status:** `BLOCKED` — supported provisioning code exists, but the required approved secret-manager access is not present in this sandbox.

## 6. RevenueCat entitlement and test-store readiness

RevenueCat project discovery returned the Calora project:

- **Project:** `CaloraApp`
- **Project ID:** `proj9890aae2`

Read-only catalog inspection confirmed:

- Entitlement: `caloraapp_pro` / **CaloraApp Pro**
- Current offering: `default`
- Monthly and annual packages exist
- A separate RevenueCat **Test Store** app exists (`app48c13d884c`)
- iOS and Android production app entries exist separately
- Test Store monthly and annual products are present

This is a suitable provider boundary for a controlled Plus fixture. However:

- no isolated QA customer ID was available;
- no authenticated QA account was available to bind the app user identity;
- no promotional entitlement was granted;
- no store purchase or production subscription was created;
- no RevenueCat state was changed.

The repository's provider helper supports promotional grants, but using that endpoint would be a deliberate provider-state mutation. It must only be performed after a named isolated QA customer is authenticated and a bounded expiry/cleanup plan is confirmed.

**Plus fixture status:** `BLOCKED` — provider catalog is ready; isolated authenticated customer binding is not.

## 7. Railway and production integration readiness

Railway discovery identified the production environment and its three active Calora services:

- `Calora`: Online
- `@workspace/api-server`: Online
- `@workspace/calora`: Online

The environment reported:

- 0 services with issues
- 0 recent failures
- no staged or applying work

No Railway variable, deployment, restart, redeploy, or log mutation was performed. Production infrastructure is therefore not the blocker to establishing QA access.

## 8. Controlled fixtures and cleanup readiness

The repository contains safe fixture mechanisms, including:

- ephemeral Supabase Auth user creation/deletion in the recipe-generation integration suite;
- an idempotent QA-account provisioning script;
- device QA deep-link scenarios for image fallback and recovery behavior;
- cleanup routines for account-owned integration state;
- provider and entitlement unit tests that mock provider calls without mutating live state.

The codebase is therefore capable of supporting controlled testing once credentials and device execution are available. No test fixture was created during this mission because doing so without a valid authenticated identity and secret-manager path would either be impossible or would risk an uncontrolled production artifact.

## 9. Capability matrix

| Capability | Status | Evidence / limitation |
|---|---|---|
| Sandbox repository and tests | READY | Repository available; existing test and fixture infrastructure present |
| Production web reachability | READY | Connected browser navigates to Calora; Railway services online |
| Authenticated browser | BLOCKED | Existing browser form submission returned invalid credentials |
| Supabase project access | READY READ-ONLY | Calora project active healthy; schema readable |
| QA-account creation | BLOCKED | Service-role key and test password absent from approved sandbox environment |
| Plus entitlement fixture | BLOCKED | Requires isolated authenticated customer; no provider mutation performed |
| Create recipe workflow | GUEST/PARTIAL | Guest and source-level paths exist; authenticated generation/persistence cannot be proven without sign-in |
| Restaurants workflow | GUEST/PARTIAL | Public/guest surface can be inspected; populated authenticated product persistence not proven |
| Coach workflow | GUEST/PARTIAL | Guest route can be rendered; account-scoped history, delete, copy, and sync require auth |
| Planner/Diary persistence | GUEST/PARTIAL | UI/source paths exist; real account mutation and cross-session verification require auth |
| Physical Android device | BLOCKED | Desktop gateway rejects session-directory authorization |
| Android emulator in sandbox | NOT AVAILABLE | `adb` and emulator binaries missing |
| iOS simulator in sandbox | NOT AVAILABLE | Linux sandbox; Xcode/simctl unavailable |
| Native E2E runner | NOT AVAILABLE | Maestro and Detox absent; no build authorized |
| Production deployment | HEALTHY | Railway reports all three services online; no change needed |

## 10. Exact owner actions required

### A. To unlock authenticated browser certification

Perform **one** of these specific actions:

1. In the connected browser, complete a valid Calora sign-in using the intended QA/owner account, or complete the Google sign-in flow if that is the authorized account path; then leave the browser on the authenticated Calora app. No password should be sent in chat.
2. Alternatively, place the existing approved QA provisioning values into the project-approved secret manager and make them available to the authorized test runner: Supabase URL, service-role key, and a dedicated QA password. Do not commit them or paste them into chat.

The existing invalid form submission should not be retried until the credentials/session are corrected.

### B. To unlock native Android certification

On `DESKTOP-0UR9SG3`, perform the **different** action required by the gateway result: open the Manus Desktop connector for the `CaloraCertification` workspace and complete the connector's **Update and Connect / session-directory authorization** operation. This is not the earlier USB debugging or generic reconnect step; the current failure is specifically session-directory authorization. After that action, the desktop must expose command execution for the mapped workspace.

Once available, the authorized tester can run device checks against the existing installed APK or development client. This mission does not authorize a new APK/AAB/IPA/EAS build.

### C. To unlock authorized Plus testing

After QA authentication is working, identify the QA's RevenueCat app-user/customer ID through the supported Calora identity flow. Then, if the owner authorizes a bounded sandbox fixture, grant the `caloraapp_pro` entitlement against the RevenueCat **Test Store** customer with a short expiry and revoke/confirm expiry after testing. No production purchase is required and no production customer should be used.

## 11. Execution plan after prerequisites are satisfied

1. Confirm authenticated browser identity without copying credentials.
2. Create or confirm a dedicated `@calora.dev` QA account through the existing supported path.
3. Bind the QA identity to RevenueCat Test Store only; verify `caloraapp_pro` access and expiry.
4. Execute authenticated web journeys: Plus catalogue/detail, Create concept → generated recipe → image lifecycle → save → reopen → refresh, Restaurants populated result and provenance, Favorites persistence, Coach chat/new chat/delete/copy, Planner → Today, Diary, and auth/session refresh.
5. Capture screenshots, response status, release identity, console errors, and persistence evidence without private user data.
6. Execute the device-only matrix on the already available installed app/APK: onboarding/relaunch, Scan Auto/Barcode/Library/Voice, Camera → Today, Plan swipe variants, Plus/Create scrolling, image fallback, Coach keyboard/history, and account/session transitions.
7. Clean up all ephemeral QA user data and any bounded Test Store grant.
8. Publish the next certification report with explicit PASS/FAIL/BLOCKED/NOT TESTED results.

## 12. Final verdict

**209 ENVIRONMENT READINESS: BLOCKED — prerequisites are external and precisely identified.**

The Calora production infrastructure, Supabase project, RevenueCat catalog, repository fixture code, and browser automation route are available. The missing pieces are not source defects that can be safely repaired from the sandbox: authenticated account access, approved QA provisioning secrets, and Desktop session-directory authorization for native execution.

No broad certification is claimed. No native build was triggered. No production data, subscription state, database schema, or deployment was changed.
