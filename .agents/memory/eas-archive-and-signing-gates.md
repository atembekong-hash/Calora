---
name: EAS archive and signing gates
description: EAS archive filtering and remote iOS credentials can independently block production builds after Expo prebuild succeeds.
---

EAS production validation has separate gates: the archive must retain any tracked vendored runtime excluded by broad `dist` rules, and the remote App Store provisioning profile must carry every native capability emitted by prebuild.

**Why:** A Calora build passed Expo prebuild and JavaScript bundling but first omitted the vendored Metro runtime from the EAS archive, then reached Xcode and failed because the managed App Store profile lacked Associated Domains, HealthKit, and Push Notifications.

**How to apply:** Validate the EAS archive before queuing a paid build, keep workspace caches/dependencies out of `.easignore`, explicitly retain required vendored `dist` output, and verify remote Apple capability/profile state before expecting a signed IPA.