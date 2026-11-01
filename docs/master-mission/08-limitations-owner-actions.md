# 8. Remaining Limitations and Owner-Only Actions

This mission cannot claim FULL PASS because physical Android/iOS execution, live provider/store/database integration, and exact-baseline reruns remain unavailable. The supported API suite still requires an isolated `DATABASE_URL` environment for its database-dependent files.

Owner-only actions: authorize a disposable device/build workflow if native certification is required; provision an isolated database/provider test environment; and separately authorize any Railway production deployment. Until then, the validated repair should stop at a protected merge-ready PR if merging would trigger an unapproved rollout.
