# Consolidated Defect Register

## P0/P1 launch-relevant findings

- Legacy/orphan Coach and privacy contract paths create misleading API surface.
- Android Auto Scan can remain stuck at camera startup after route/resume.
- Current iOS signing-evidence fixture contract has six failures.
- Customer-data tenant isolation is not independently certified at the managed-PostgreSQL boundary.
- Calorie recommendation input/output bounds lack a complete direct validation contract.
- Paid-benefit enforcement and complete billing lifecycle remain uncertified by current evidence.

## Unverified mandatory controls

Signed Android/iOS release candidates, Apple/Google console processing, purchases and restore, Health Connect/HealthKit, TalkBack/VoiceOver, Dynamic Type, camera/microphone, network recovery, database restore, production observability, authenticated Coach persistence, Plus/provider recipe flows, and live generated-media acceptance remain open.

Each finding is mapped to a stable control ID in `02_AUTHORITATIVE_CERTIFICATION_REGISTER.md` and closure actions in `13_RELEASE_BLOCKERS_AND_OWNER_ACTIONS.md`.
