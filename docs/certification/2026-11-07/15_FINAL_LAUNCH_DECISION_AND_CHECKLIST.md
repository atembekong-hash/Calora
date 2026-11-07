# Final Launch Decision and Release Checklist

**Tested commit:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161`  
**Decision:** **NOT CERTIFIED — BLOCKED**

The evidence does not support a US commercial release recommendation. This is not a deployment authorization and no build, store submission, production deployment, purchase, destructive device action, or production-data change was performed.

Before reopening the decision, the owner must close every P0/P1 action in the blocker register with release-candidate-specific evidence:

1. Resolve the managed-PostgreSQL tenant-isolation, roles, migration, storage, observability, rollback, and restore evidence.
2. Fix and retest Android Auto Scan route/resume behavior, then validate a current signed Android release candidate on the Samsung Galaxy S20.
3. Correct the iOS signing-evidence failures and obtain current IPA, signing, App Store Connect, device/simulator, HealthKit, notification, StoreKit, VoiceOver, and Dynamic Type evidence.
4. Close paid-benefit enforcement and execute the complete subscription lifecycle in approved sandbox/store environments.
5. Reconcile legacy/orphan API contracts and validate authenticated Coach retention, deletion, provider, and cost behavior.
6. Add direct recommendation-boundary tests and correct finite, positive, bounded calorie inputs and outputs.
7. Execute current recipes/database/provider, accessibility, offline/recovery, health, and native interaction matrices.

The next certification pass must use the same stable IDs, attach immutable evidence with commit/build/environment provenance, and produce a fresh master report. A passing automated test count alone cannot change this decision.
