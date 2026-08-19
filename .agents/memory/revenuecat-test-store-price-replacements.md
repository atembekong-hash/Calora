---
name: RevenueCat Test Store price replacements
description: Handling immutable Test Store prices and historical transaction records.
---

Test Store subscription prices are immutable. A price change must use replacement Test Store products, while retaining the established offering, package identifiers, and entitlement.

**Why:** Historical Test Store transactions can prevent RevenueCat from deleting a superseded product. Deletion is not a safe prerequisite for the catalog swap.

**How to apply:** Create correctly priced replacement products, attach them to the existing entitlement and package slots, verify the current offering, then archive old detached products when RevenueCat rejects deletion because of transaction history.