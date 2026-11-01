# 4. Repairs and Regression Protection

Added `artifacts/calora/components/PrivacyRightsSection.tsx`, mounted once under Settings > Trust & privacy. It uses the existing generated API client and backend contract, lists prior account-scoped requests, supports all six request types, accepts an optional bounded note, and keeps formal deletion requests distinct from immediate account deletion.

Added focused component interaction coverage in `artifacts/calora/lib/__tests__/privacyRightsSection.test.tsx` and an isolated Profile mock so existing Profile tests remain deterministic. Focused result: 3 test files and 36 tests passed. Changed-file TypeScript diagnostics and whitespace checks are clean.
