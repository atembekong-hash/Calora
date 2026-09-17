---
name: Capture provider matching
description: Rules for keeping barcode enrichment trustworthy across public nutrition providers.
---

Barcode lookup must require a provider-confirmed UPC match before returning nutrition. Broad text search results are not sufficient because they can return unrelated records with empty or misleading nutrition values.

**Why:** Public nutrition databases contain research and generic records that may look like barcode matches while having no reliable product identity or macros.

**How to apply:** Prefer exact barcode fields from Open Food Facts or USDA branded records, keep unmatched scans explicitly unknown, and preserve the provider label and confidence for review.