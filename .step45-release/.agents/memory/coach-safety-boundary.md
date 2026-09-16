---
name: Coach safety boundary
description: Durable constraints for Calora Coach context, model responses, and navigation actions.
---

Calora Coach is a local conversation feature with bounded context. The server must validate the request, redirect restrictive/medical/eating-disorder topics safely, validate structured model output, and strip anything except known Calora navigation actions. Coach must not mutate diary, targets, planner, reminders, or profile state.

**Why:** Coach handles nutrition and wellness context where fabricated certainty, unsafe restriction advice, or arbitrary model-generated navigation would break Calora's trust boundary.

**How to apply:** Keep context deterministic and explicit about missing data. Show evidence/confidence and limitations in the UI. Require a deliberate product decision before adding any Coach mutation action or medical capability.