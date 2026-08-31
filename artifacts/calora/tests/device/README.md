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

The preview waits for each card to report **Bundled image ready**. A missing
asset or native load error reports the meal type and name with **Fallback image
active**. A planner identity mismatch reports **Swapped image detected** along
with the expected and received asset keys, then uses the fallback instead of
silently showing the wrong meal.

Run the command once with a booted iOS simulator/device selected and once with
a booted Android emulator/device selected:

```sh
pnpm test:device:meal-images
```

The flow starts from clean app storage and opens the preview through the
`caloraapp:///meal-image-preview` deep link. Do not point it at a personal
production install.
