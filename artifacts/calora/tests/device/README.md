# Native nutrition-goal regression test

`nutrition-goals.yaml` is a Maestro flow for both native platforms. It starts
from clean app storage, completes the local onboarding path, and exercises the
Macro balance editor through keyboard reachability, cancel, invalid-value
validation, immediate target rendering, and persistence after a process
relaunch.

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