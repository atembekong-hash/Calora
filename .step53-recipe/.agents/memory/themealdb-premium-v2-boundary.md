---
name: TheMealDB Premium V2 boundary
description: Safe use of TheMealDB Premium V2 for Calora recipe discovery.
---

TheMealDB Premium V2 is an open-recipe discovery capability, not a Calora
nutrition authority or a substitute for the Calora Plus provider layer. Keep its
key server-only, preserve TheMealDB attribution, and describe any nutrition as
estimated or unavailable.

**Why:** The provider uses a key-in-path API format and provides crowd-sourced
recipe data. Moving it into client code would expose the credential, while
labeling it as verified or conflating it with Plus would weaken provenance and
nutrition trust.

**How to apply:** Use V2 from the API service when the configured key exists.
Normal search remains meal-name search; two through four comma-separated
ingredients use the documented multi-ingredient filter. Validate provider
responses and return generic client failures without reflecting provider URLs,
key material, or raw upstream errors.