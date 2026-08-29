---
name: Structured recipe generation budget
description: Output-budget requirement for Calora's structured recipe concept responses.
---

The concept generator must reserve enough completion tokens for the complete five-item JSON contract. A limit sized for a short free-text answer can cut the response in the middle of a JSON string, which is indistinguishable from a generic provider failure unless the parse error is logged.

**Why:** The product asks the model for five concepts with titles, summaries, fit rationale, ingredients, and timing. The former 500-token cap intermittently truncated otherwise successful output and returned a 502 to the person using Create.

**How to apply:** When expanding structured generation output, review the schema and output budget together, retain bounded limits, log server-side parse failures safely, and exercise all response variants with a live acceptance check.