---
name: Rapid interaction QA
description: How to verify short UI confirmation windows without introducing an automation-timing false failure.
---

For any interaction protected by a short synchronous debounce or confirmation window, use one genuine browser double-click or a same-action pointer sequence. Do not infer a rapid-tap failure from two separately issued automation clicks unless their elapsed time is measured and is within the product window.

**Why:** Browser automation commands can be separated by more than the UI's short guard interval, producing a valid second action that looks like a duplicate-tap regression.

**How to apply:** For debounced taps, retry controls, and undo-like confirmations, test the true same-action gesture first and record the resulting state delta before filing a defect.