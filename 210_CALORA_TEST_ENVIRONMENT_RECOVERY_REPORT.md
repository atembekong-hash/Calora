# Report 210 — Calora Test Environment Recovery

**Date:** 2026-10-14  
**Mission:** Recover authenticated browser, QA fixture, RevenueCat Test Store, and native device-testing capability.  
**Repository:** `atembekong-hash/Calora`  
**Starting protected main:** `a4f16d524d1f8f512943e142ba7ac8911e63389e`  
**Scope:** Environment recovery and bounded validation. No native build, production subscription, customer-record mutation, database mutation, or application-source change was performed.

## 1. Final mission verdict

**SUCCESS CONDITION: NOT MET.**

The recovery mission verified that the application and its isolated automated fixture infrastructure are healthy, but it did not recover the two critical execution capabilities required for complete real-user certification:

- authenticated Calora browser access;
- authorized Windows Desktop execution for Android-device testing.

The Desktop remains online and correctly exposes the `CaloraCertification` workspace, but both workspace and device-level switch attempts are rejected by the host authorization gate. The connected browser remains on Calora sign-in after the available credential submission failed and the alternate Google route did not complete.

No unsupported bypass, credential extraction, production customer mutation, or native build was attempted.

## 2. Recovery actions attempted

### 2.1 Desktop workspace reconnect

**Target:** `DESKTOP-0UR9SG3`  
**Workspace:** `CaloraCertification`  
**Mapped path:** `C:\Users\DynaBook\Desktop\CaloraCertification`  
**Workspace command permission reported:** `allow_cmd: true`  
**Device state:** `online`

Attempt 1: selected Desktop plus the exact `CaloraCertification` workspace.

Result:

> `Update and connect the selected Desktop to authorize session directories.`

Attempt 2: selected the Desktop without a workspace to isolate workspace mapping from device authorization.

Result:

> `Device authorization was not granted. The execution device was not changed.`

The second result proves the failure is device/session authorization, not a missing or incorrectly mapped Calora workspace. The desktop remained online in subsequent inventory/status reads.

**Desktop recovery verdict: BLOCKED.**

### 2.2 Authenticated browser recovery

The connected **My Browser** route was available and successfully loaded:

`https://app.mycaloraapp.com/auth/sign-in`

The existing form was submitted without reading, changing, or exposing the masked password. Calora returned:

> `Invalid login credentials`

The alternate **Continue with Google** action was attempted using the existing connected browser session. It did not complete an OAuth redirect; the browser remained on the Calora sign-in page with a loading state and no authenticated session.

No additional credential attempts were made. No token, cookie, password, or account secret was copied or recorded.

**Authenticated browser recovery verdict: BLOCKED.**

### 2.3 QA secret availability

The sandbox was checked by variable presence only. The required approved provisioning variables remain unavailable:

| Variable | Result |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | missing |
| `SUPABASE_SERVICE_ROLE_KEY` | missing |
| `CALORA_SIGNUP_TEST_PASSWORD` | missing |
| `SUPABASE_ACCESS_TOKEN` | missing |

The existing repository provisioning path remains available at:

`scripts/src/provisionQaAccount.ts`

It was not executed because the required approved secret-manager values are unavailable. No password or secret was requested in chat or written to the repository.

**QA-account provisioning verdict: BLOCKED.**

### 2.4 RevenueCat Test Store readiness

Read-only catalog inspection previously confirmed the Calora RevenueCat project, the `caloraapp_pro` entitlement, and a separate Test Store app. During this mission:

- no customer was created;
- no entitlement was granted;
- no purchase or subscription was created;
- no production customer was touched;
- no promotional grant was attempted.

A bounded Test Store grant cannot be safely executed until the isolated QA identity is authenticated and its RevenueCat app-user/customer ID is known.

**RevenueCat Plus fixture verdict: BLOCKED.**

### 2.5 Native tooling recovery

The sandbox was checked for device tooling. None is available:

- `adb`: missing;
- Android `emulator`: missing;
- `xcrun` / `simctl`: missing and unavailable on Linux;
- Maestro: missing;
- Detox: missing.

The Windows Desktop is the only available route to the connected Android device, and that route remains host-authorized but not execution-authorized. No tool installation was attempted on the Desktop because the Desktop session could not be opened and no owner approval exists for arbitrary remote software installation.

**Native tooling verdict: BLOCKED.**

## 3. Actual independent execution evidence

### 3.1 Production health

The deployed production release was verified after the recovery attempts:

| Endpoint | Result |
|---|---|
| `https://app.mycaloraapp.com/health` | HTTP 200; `status: ok`, `service: calora-web` |
| `https://app.mycaloraapp.com/api/healthz` | HTTP 200; `status: ok` |
| `https://app.mycaloraapp.com/api/version` | HTTP 200; release commit `a4f16d524d1f8f512943e142ba7ac8911e63389e` |

**Production health verdict: PASS.**

### 3.2 Public security gates

Unauthenticated production requests were executed without bypassing controls:

| Workflow gate | Request | Result |
|---|---|---|
| Plus recipes | `GET /api/v1/premium-recipes?limit=1` | HTTP 401; sign-in required |
| Restaurant search | `GET /api/v1/restaurant-foods?query=chicken&limit=1` | HTTP 401; sign-in required |
| Create concepts | `POST /api/v1/recipes/concepts` with valid JSON | HTTP 401; sign-in required |

These responses confirm the production authentication boundary is active. They do not count as authenticated workflow success.

**Unauthenticated security-boundary verdict: PASS.**  
**Authenticated workflow verdict: BLOCKED.**

### 3.3 Mobile fixture suites

Focused Calora UI fixture suites were executed for Plus, Create, Restaurants, Coach, Planner, Diary, Favorites, saved recipes, image lifecycle, and persistence contracts.

Result:

- **14 test files passed**
- **159 tests passed**
- Duration: approximately 2.44 seconds

These are deterministic fixture/component tests, not proof of a real authenticated browser or physical-device run.

**Automated mobile fixture verdict: PASS.**

### 3.4 API fixture suites

Focused API fixture suites were executed with isolated non-production placeholder database/provider variables for:

- Premium Recipes / entitlement boundaries;
- Restaurant Foods;
- Create recipe generation;
- Coach;
- Planner;
- Diary;
- Supabase auth boundaries.

Result:

- **7 test files passed**
- **145 tests passed**
- Duration: approximately 2.84 seconds

These tests did not connect to production data and did not create a live QA account.

**Automated API fixture verdict: PASS.**

## 4. Workflow verdict matrix

| Workflow | Verdict | Evidence |
|---|---|---|
| Desktop session-directory authorization | BLOCKED | Device and workspace switch rejected by host authorization gate |
| Authenticated browser sign-in | BLOCKED | Existing form returned invalid credentials; Google route did not complete |
| Dedicated Supabase QA account | BLOCKED | Supported script exists; approved service-role/password values unavailable |
| RevenueCat Test Store Plus entitlement | BLOCKED | Catalog exists; isolated authenticated customer unavailable; no grant attempted |
| Create authenticated concept generation | BLOCKED | Public gate correctly returns 401; authenticated identity unavailable |
| Create generated recipe image lifecycle | BLOCKED | Deterministic tests pass; real authenticated generation cannot start |
| Restaurant search and populated product imagery | BLOCKED | Public gate correctly returns 401; authenticated identity unavailable |
| Coach authenticated conversation | BLOCKED | Fixture tests pass; account-scoped live session unavailable |
| Planner → Today persistence | BLOCKED | Fixture tests pass; real signed-in mutation unavailable |
| Diary authenticated persistence | BLOCKED | Fixture tests pass; real signed-in mutation unavailable |
| Favorites/saved recipe persistence | BLOCKED | Fixture tests pass; authenticated browser/device unavailable |
| Public Discover/bundled recipe rendering | PASS for available web access | Previously live-tested and production health remains healthy; no new defect reproduced |
| Unauthenticated security gates | PASS | Production Plus, Restaurant, and Create endpoints returned expected 401s |
| Automated UI fixture coverage | PASS | 159 focused tests passed |
| Automated API fixture coverage | PASS | 145 focused tests passed |
| Physical Android device | BLOCKED | Desktop host authorization denied |
| Android emulator in sandbox | BLOCKED | `adb` and emulator not installed |
| iOS simulator | BLOCKED | Linux sandbox and no macOS/Xcode route |
| Native build/release | NOT RUN | Explicit project rule prohibits builds without fresh exact instruction |
| Production service health | PASS | Web/API health 200; Railway services previously confirmed online |

## 5. Defect investigation result

No application defect was reproducible from the available environment during this mission.

The observed failures are environment/access failures:

1. Desktop command execution is blocked before workspace process launch.
2. Browser authentication cannot establish a valid Calora session.
3. QA provisioning cannot run without approved secret-manager values.
4. Plus entitlement testing cannot bind to an isolated authenticated customer.
5. Native tools cannot be installed or used from the sandbox, and the Desktop route is not authorized.

The unauthenticated production 401 responses are expected security behavior, not defects.

No source fix was created, so no application deployment was required.

## 6. Exact owner actions required

### Required action 1 — Desktop gateway authorization

On `DESKTOP-0UR9SG3`, open the Manus Desktop connector and complete the specific **Update and Connect / session-directory authorization** operation for:

`C:\Users\DynaBook\Desktop\CaloraCertification`

The exact reason is that the device is online and the folder is mapped, but the host denies execution authorization at the session-directory layer. Generic USB debugging, folder creation, or ordinary reconnect attempts do not address this returned error.

### Required action 2 — Authenticated QA identity

Complete one supported authentication path:

- sign in to Calora in My Browser with a valid authorized QA/owner account; or
- provide the approved QA provisioning values through the secret manager, without sending credentials in chat.

The invalid login should not be retried until corrected.

### Required action 3 — Bounded Plus fixture

After authenticated QA access is established:

1. resolve the QA identity through Calora's supported RevenueCat path;
2. grant `caloraapp_pro` only in the RevenueCat Test Store;
3. use a short expiry;
4. verify Plus workflows;
5. revoke or confirm expiry and clean up all fixture data.

No production subscription or real customer record is required.

## 7. Recovery plan after owner prerequisites

1. Reattempt Desktop switch and prove command execution with a harmless workspace command.
2. Authenticate the browser and verify an authenticated `/api` request.
3. Run the existing ephemeral QA-account setup or confirm the dedicated QA account.
4. Bind the QA identity to RevenueCat Test Store and verify entitlement access.
5. Execute Create, Restaurants, Coach, Planner, Diary, Favorites, saved-recipe, and persistence workflows end to end.
6. Use the already installed Calora application on the connected Android device if Desktop access exposes ADB; do not build a new binary.
7. Capture evidence and clean up ephemeral QA data and Test Store entitlement state.
8. Repair only defects reproduced in those real workflows, then run protected CI, merge, deploy, and retest if a validated source fix is required.

## 8. Safety and build compliance

- No Android or iOS build was triggered.
- No EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play operation was triggered.
- No payment or real subscription was created.
- No production user record was modified.
- No database migration or destructive SQL was run.
- No credentials or access tokens were exposed.
- No authentication or entitlement control was bypassed.

## 9. Final conclusion

**210 CALORA TEST ENVIRONMENT RECOVERY: PARTIAL — AUTOMATED FIXTURE CAPABILITY PASS; AUTHENTICATED AND NATIVE EXECUTION BLOCKED.**

The environment is not ready for the requested complete real-user certification. The remaining blockers require two precise owner-level actions: Desktop session-directory authorization and a valid authorized QA authentication path. All independent safe work was completed, verified, and documented without weakening security or violating the no-native-build rule.
