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

## iOS signing preflight

Before queuing a production iOS build, run the read-only signing preflight from
`artifacts/calora`. It checks the EAS App Store credentials for
`com.etiendem.caloraapp`, including the assigned distribution certificate and
provisioning-profile validity:

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
The failure output is intentionally limited to status and expiration metadata
and never prints certificate material, passwords, or tokens.

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
