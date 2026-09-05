# Native nutrition-goal regression test

`nutrition-goals.yaml` is a Maestro flow for both native platforms. It starts
from clean app storage, completes the local onboarding path, and exercises the
Macro balance editor through keyboard reachability, cancel, invalid-value
validation, immediate target rendering, and persistence after a process
relaunch.

The accessibility behavior is intentionally platform-specific:

- iOS uses a queued `AccessibilityInfo` announcement after the inline error
  commits, so VoiceOver speaks the error without moving focus from the active
  goal field.
- Android uses one assertive live-region update, so TalkBack speaks the inline
  error without receiving a duplicate explicit announcement.
- Each Macro balance row exposes one complete summary, including consumed grams
  and the current saved target grams. The flow asserts those summaries in the
  clean-state run.

## Run it

1. Install the signed Calora build under test on a booted iOS simulator/device
   or Android emulator/device. Its application ID must be
   `com.etiendem.caloraapp`.
2. Ensure Maestro is installed and that only the target device is selected.
3. From `artifacts/calora`, run:

   ```sh
   pnpm test:device:nutrition-goals
   ```

Run the command once for iOS and once for Android before release. The flow uses
`launchApp.clearState`, so it deletes Calora's local app data on the selected
test device; do not point it at a personal production install.

## Screen-reader sign-off

Maestro can verify the native accessibility labels but cannot verify audio
output. With the screen reader enabled, manually confirm both platform runs:

1. Focus a goal field, enter `0` for Protein, and activate **Save goals**.
   The error is announced while focus remains in the editor.
2. Correct the value and save. Swipe through **Protein**, **Carbs**, and **Fat**.
   Each row is announced once with consumed grams and the newly saved target.

Record any device-specific wording or timing issue here before release. The
expected error is: “Enter a positive value for calories and each macro.”

## Native meal-image rendering regression test

`meal-images.yaml` is an independent Maestro flow for the planner's native
image contract. It deep-links to a small QA preview that uses the same
`PlannerMealImage` component as the real planner cards and checks one stable
Breakfast, Lunch, Dinner, and Snack card.

The preview first waits for each card to report **Bundled image ready**. It then
opens the QA-only `scenario=fallback` deep link, which supplies an unavailable
source to Breakfast and a valid-but-wrong bundled key to Lunch. A missing asset
or native load error reports the meal type and name with **Fallback image
active**. A planner identity mismatch reports **Swapped image detected** along
with the expected and received asset keys, then uses the fallback instead of
silently showing the wrong meal. The flow asserts both the visible badge and
the full fallback accessibility label for each state.

Run the command once with a booted iOS simulator/device selected and once with
a booted Android emulator/device selected:

```sh
pnpm test:device:meal-images
```

The flow starts from clean app storage and opens the healthy preview through
the `caloraapp:///meal-image-preview` deep link, then opens the isolated
`caloraapp:///meal-image-preview?scenario=fallback` QA fixture. The fixture only
changes in-memory preview props; it does not write planner data or local
storage. Do not point it at a personal production install.

## Release gate

The release validation command runs this same flow on both platforms and fails
the release if either target fails:

```sh
# From the native host: choose one booted target per platform.
xcrun simctl list devices booted
adb devices

# From artifacts/calora
CALORA_IOS_DEVICE="<exact booted iOS device ID>" \
CALORA_ANDROID_DEVICE="<exact booted Android device ID>" \
  pnpm test:release:meal-images
```

Before running the gate:

1. Build and install the signed Calora build under release on one selected,
   booted iOS simulator/device and one selected, booted Android emulator/device.
   Both installations must use application ID `com.etiendem.caloraapp`.
2. Run `xcrun simctl list devices booted` on the iOS host and `adb devices` on
   the Android host. Copy the exact IDs for the intended targets into
   `CALORA_IOS_DEVICE` and `CALORA_ANDROID_DEVICE`. Maestro 1.40 does not have
   a `maestro devices` command. Selecting one target per platform is required;
   do not rely on an arbitrary connected-device choice.
3. Keep the two targets available for the entire command. The flow clears
   Calora's local storage on each target and opens
   `caloraapp:///meal-image-preview`.

The gate runs iOS first and Android second, prints the selected platform and
device before each run, and continues to the second platform if the first
fails. A failed card is reported by its meal identity and its observed
`Fallback image active` or `Swapped image detected` state. A nonzero exit means
the signed build is not cleared by this meal-image gate.

## Native encrypted-recovery smoke gate

`encrypted-recovery.yaml` runs the same production encrypted-storage path on
iOS and Android. The QA route seeds a valid legacy account snapshot, confirms
that migration replaces plaintext in AsyncStorage with an authenticated
envelope, tampers with that envelope, and verifies that recovery rejects the
tamper while preserving the encrypted bytes for export. It then verifies
account-scoped state switching and clear-all isolation: clearing account A
cannot remove account B's encrypted state.

The export assertion uses the same recovery export handler as the corruption
screen and checks that the shared payload is the encrypted envelope rather than
plaintext state or the SecureStore key. The flow intentionally does not claim
that clear-all deletes the install-wide SecureStore key; that key remains
available for other account scopes by design.

Run the identical flow once on each disposable native target:

```sh
pnpm test:device:encrypted-recovery
```

For exact-device release validation:

```sh
# On the native host, select one booted target per platform.
xcrun simctl list devices booted
adb devices

CALORA_IOS_DEVICE="<exact booted iOS device ID>" \
CALORA_ANDROID_DEVICE="<exact booted Android device ID>" \
  pnpm test:release:encrypted-recovery
```

The gate requires both IDs, runs iOS first and Android second, and fails if
either target fails. Install the signed Calora build with application ID
`com.etiendem.caloraapp` on both disposable targets before running it. Maestro
1.40 does not provide a device-list command, so use the native platform tools
above and do not fabricate IDs or rely on an arbitrary connected device.

The gate prints one `RELEASE EVIDENCE` JSON record after the preflight or native
runs. The record contains only the flow path, application ID, selected target
IDs, platform outcomes, safe Maestro exit codes, an overall result, and an ISO
timestamp. It never captures Maestro output, app state, SecureStore keys, or
the encrypted recovery export. To preserve the record as a release artifact,
provide a path in the release runner:

```sh
CALORA_ENCRYPTED_RECOVERY_EVIDENCE_PATH="$RUNNER_TEMP/encrypted-recovery-evidence.json" \
CALORA_IOS_DEVICE="<exact booted iOS device ID>" \
CALORA_ANDROID_DEVICE="<exact booted Android device ID>" \
  pnpm test:release:encrypted-recovery
```

When `GITHUB_STEP_SUMMARY` is available, the same sanitized JSON is appended
to the workflow summary. A missing target, missing Maestro installation, or
failed platform writes a failed record when an evidence path is provided and
keeps the command nonzero.

The repository workflow `.github/workflows/native-encrypted-recovery.yml` runs
this gate on a labeled native runner and uploads only that sanitized JSON,
including after a failed gate. The workflow enables an installed-build
preflight: it checks the selected iOS target with `xcrun simctl` and the
selected Android target with `adb` before Maestro starts. A missing target or
signed build is recorded in the summary and keeps the workflow nonzero; the
remaining platform is still checked. The runner must already have the signed
Calora build installed with application ID `com.etiendem.caloraapp` on both
selected disposable targets.

## iOS signing preflight

Before queuing a production iOS build, run the read-only signing preflight from
`artifacts/calora`. It checks the EAS App Store credentials for
`com.etiendem.caloraapp`, including the assigned distribution certificate and
provisioning-profile validity. This is an EAS-record check only; a passing
result does not prove that Apple still accepts the stored certificate:

```sh
pnpm test:release:ios-signing
```

The command needs an authenticated `EXPO_TOKEN` in the environment. Keep the
token in the workspace or CI secret store; never put it in a shell transcript,
source file, or chat message. A passing preflight does not start a build.

To run the preflight and then queue the current revision non-interactively:

```sh
pnpm build:ios:production
```

The queue command uses the remote production credentials without attempting to
repair them. If the preflight fails, run
`eas credentials --platform ios` interactively from this app directory, choose
**Build Credentials: Manage everything needed to build your project**, then
**All: Set up all the required credentials to build your project**. If needed,
use **Distribution Certificate: Use an existing one for your project** or
**Distribution Certificate: Add a new one to your account** before retrying.
The failure output is intentionally limited to a failure class, safe status, and
expiration metadata; it never prints certificate material, passwords, tokens, or
raw EAS CLI output.

### Scheduled expiry monitor

The repository's **Monitor iOS signing credential expiry** GitHub Actions
workflow runs the same read-only EAS check daily and can also be started with
**Run workflow**. It uses a 30-day warning window. A warning is a nonzero
check so the scheduled run is visible as an alert; the output names only the
affected credential type, expiration date, days remaining, and the safe repair
path.

Configure the GitHub Actions secret `CALORA_EXPO_TOKEN` with the authenticated
EAS token before enabling the workflow. Never print or commit that token. To
run the same check locally or in another CI system:

```sh
IOS_SIGNING_WARNING_DAYS=30 pnpm test:release:ios-signing:monitor
```

When the monitor warns or fails, repair from `artifacts/calora` with the exact
interactive path below, then rerun the monitor:

```sh
eas credentials --platform ios
```

Choose **Build Credentials: Manage everything needed to build your project**,
then **All: Set up all the required credentials to build your project**. If
needed, choose **Distribution Certificate: Use an existing one for your
project** or **Distribution Certificate: Add a new one to your account**.
Reference: https://docs.expo.dev/app-signing/app-credentials/

### Apple certificate-state rehearsal (macOS only)

Run this controlled rehearsal from a clean release-candidate checkout on a
macOS release host. It first repeats the read-only EAS-record check, then
waits for a production-profile EAS build to finish with the remote credentials.
The build is not submitted to the App Store, but it does consume an EAS build
and creates a signed production artifact:

```sh
test "$(uname -s)" = "Darwin"

# Load EXPO_TOKEN from the workspace/CI secret store; never paste it into a
# command, shell transcript, evidence file, or chat message.
CALORA_IOS_SIGNING_EVIDENCE_PATH="$RUNNER_TEMP/calora-ios-signing-evidence.json" \
  pnpm test:release:ios-signing:apple
```

`test:release:ios-signing:apple` runs through the release-evidence wrapper. It
passes the preflight's exit code through unchanged and writes
`calora-ios-signing-evidence.json` with the result, exit code, failure class,
and only lines beginning with `[ios-signing]`. On a CI runner, omit
`CALORA_IOS_SIGNING_EVIDENCE_PATH` to write automatically under `RUNNER_TEMP`;
set it explicitly on a local macOS host if the evidence needs to be retained:

```sh
CALORA_IOS_SIGNING_EVIDENCE_PATH="$TMPDIR/calora-ios-signing-evidence.json" \
  pnpm test:release:ios-signing:apple
```

The wrapper never writes the captured EAS output, certificate material,
passwords, tokens, build environment, or credential files to the evidence
artifact. It also forwards only the sanitized prefixed lines to the terminal.
If the preflight exits nonzero, inspect `failureClass` before deciding whether
to repair EAS credentials or treat the result as an Apple-side rejection.

### Evidence retention and review

Upload the JSON file as a release-run artifact even when the rehearsal fails,
so the failure class and exit code remain reviewable:

```yaml
- name: Upload sanitized iOS signing evidence
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: calora-ios-signing-evidence
    path: ${{ runner.temp }}/calora-ios-signing-evidence.json
    if-no-files-found: error
    retention-days: 30
```

Review the artifact during release sign-off: confirm `result`, `exitCode`, and
`failureClass`, then review the prefixed lines for the matching repair or
Apple-side outcome. Retain it for 30 days with the release run, or delete a
local copy after sign-off. Do not increase retention or attach additional EAS
logs; if more detail is needed, use the interactive EAS repair path without
adding raw output to the release artifact.

The command deliberately stops before contacting Apple when the EAS record is
missing, malformed, expired, or otherwise not ready:

- `Failure class: EAS_RECORD` means the stored EAS credential record is the
  problem. Apple-side certificate state was not tested.
- `Failure class: APPLE_CERTIFICATE_STATE` means EAS reached the Apple signing
  step and Apple rejected or invalidated the distribution certificate or
  provisioning profile. This is the revoked/invalidated-certificate result.
- `Failure class: EAS_BUILD` means the build failed without a recognizable
  Apple certificate-state response; do not claim that Apple revocation was
  proven.
- `APPLE CERTIFICATE REHEARSAL PASSED` means the completed EAS build reached
  the signing step without an Apple-side certificate rejection.

Save only the command's prefixed summary lines as release evidence. Do not
capture or paste raw EAS CLI output, certificate details, passwords, tokens,
build environment dumps, or credential files. If the first read-only check
reports `EAS_RECORD`, repair the EAS-managed credentials interactively and
repeat the rehearsal; do not relabel that result as an Apple-side failure.

## Native Plus recipe rapid-scroll regression test

`plus-recipes-rapid-scroll.yaml` protects the Plus catalogue while a user
rapidly scrolls through a paginated recipe grid. It requires a signed-in
Calora Plus QA account on the selected native device because clearing app state
would remove the authenticated session and make the catalogue unavailable.

The flow verifies that the loaded grid stays mounted through repeated native
swipes. If the provider fails the next page, it verifies that the existing grid
and the retry action remain available, then retries the request. Stable grid and
pagination-state test IDs make the flow independent of provider recipe names.

Run it once with a booted iOS simulator/device and once with a booted Android
emulator/device:

```sh
pnpm test:device:plus-recipes
```

The provider must return at least one full page for the pagination gesture to
request another page. A failure state is asserted when the provider reproduces
an error; successful runs still verify that the grid remains mounted after the
request settles.
