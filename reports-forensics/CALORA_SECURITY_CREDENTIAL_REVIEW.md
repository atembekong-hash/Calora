# Calora Security Credential Review

## Scope
The repository and supplied evidence distinguish the October 21 Railway security incident from later terminal variable-output exposure. Neither event has sufficient provider/audit evidence to establish component scope, affected UTC window, audience, retention, or whether secret values were exposed. No secret was retrieved, printed, copied, rotated, revoked, or used by this forensic synthesis; no production data, build, or deployment was accessed.

## Repository controls
`artifacts/api-server/.env.example:3-6` prohibits deployable values in logs, API responses, workflow summaries, build artifacts, Expo public configuration, and commits. Lines 20-25 identify Supabase URL/anon and server-only service-role categories. Lines 32-40 identify separate RevenueCat least-privilege and privileged keys; lines 42-52 identify storage credentials; lines 74-80 email credentials; lines 109-125 release-attestation material. The P0 report documents bounded verifier codes and exclusion of raw messages, stacks, URLs, keys, tokens, provider bodies, and customer data.

## Required owner review
Treat server-side Supabase signing/admin/database/session, storage, RevenueCat, AI/provider, email, gateway, release/build/signing, CI/GitHub, encryption/signing, OAuth, and private provider credentials as potentially exposed until owner audit establishes otherwise. Review Railway organization/project/environment audit logs, secret-manager version history, provider rotation/revocation history, GitHub/EAS/Railway/Supabase/storage/email/RevenueCat audit events, and the exact terminal-output sink/audience/retention. Public client configuration is not automatically secret, but project alignment, integrity, RLS, abuse, and bundle provenance still require review.

## Verdict
`ROOT_CAUSE_UNDETERMINED; PRODUCTION_BLOCKED_EXTERNAL`. Event-specific exposure and blast radius are unproven; controlled owner-led containment and rotation planning remains required.