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
