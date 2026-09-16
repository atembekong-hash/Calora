---
name: Recipe creator mode ownership
description: Rules for keeping guided recipe creation inputs visible, intentional, and correctly scoped.
---

Each Create starting point owns its visible choices. Pantry ingredients only constrain pantry requests; style, custom prompt, and surprise selections must not inherit them invisibly. A visible draft ingredient must either be included in the generation request or produce a clear validation message before generation.

**Why:** A guided creator is trustworthy only when the request matches what the person can see and has chosen. Shared hidden state can make generated ideas appear arbitrary, while dropped draft text makes the form look broken.

**How to apply:** When adding another Create mode or field, define its request inputs explicitly, expose selection state to assistive technology, and test switching modes before submission.