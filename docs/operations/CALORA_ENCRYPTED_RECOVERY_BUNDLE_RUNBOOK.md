# Calora encrypted recovery bundle runbook

## Purpose

This runbook defines the repository-controlled recovery artifact for Calora's PostgreSQL data plane. It intentionally does not claim that a database dump contains private recipe-photo objects, Auth configuration, RevenueCat state, provider credentials, or Railway configuration. Those are represented by sanitized manifests and must be recovered through their respective control planes.

## Artifact architecture

`scripts/recovery/create-encrypted-backup.mjs` creates a custom-format `pg_dump` archive and a sanitized manifest, packages them into a temporary gzip archive, and encrypts the result with AES-256-GCM. The 32-byte key is supplied only through `CALORA_BACKUP_KEY_B64` from an external secret manager. The key is never written to the repository, workflow logs, or the bundle manifest.

The manifest records the backup ID, creation time, source environment label, source commit when available, database archive checksum, and the status of separate storage/provider manifests. A storage manifest may contain only object counts, checksum-manifest identifiers, bucket aliases, and restore-test status. A provider manifest may contain only provider project identifiers, entitlement/catalog versions, webhook configuration status, and reconciliation timestamps. Neither manifest may contain secrets, tokens, private keys, passwords, or customer rows.

The workflow is `workflow_dispatch` only. It is not a production scheduler. It uploads an encrypted artifact with 30-day GitHub artifact retention and emits explicit failure evidence. The workflow accepts only the source-enforced `staging` and `disposable-rehearsal` target choices, and only from protected `main`. A target is mapped to a distinct protected GitHub Environment (`calora-recovery-staging` or `calora-recovery-disposable`). Each Environment must own its separate database secret and non-secret target variables: `CALORA_RECOVERY_TARGET_ID`, `CALORA_RECOVERY_ENDPOINT_HOST`, and `CALORA_RECOVERY_DATABASE_NAME`. The attestation job validates the selected target, ref, target identity, endpoint host, database name, and owner-approved attestation before the secret-bearing bundle job can start. The bundle job repeats the validation immediately before `pg_dump`.

The target allowlist and metadata checks do not independently prove that a host is the intended database. Owner-controlled Environment variables, protected reviewers, separate secret bindings, and an independent target attestation are required together. A production-like alias, mismatched endpoint metadata, missing binding, unsupported ref, or missing attestation fails before any database command or artifact publication. No production target is permitted by the workflow. The approved scheduling design is an external scheduler or provider-native backup service invoking an immutable, owner-approved workflow/environment on the agreed cadence; the scheduler must enforce one active run per environment, alert on missed/failed runs, retain sanitized evidence, and never receive or print the encryption key. No schedule is enabled by this repository. Before production scheduling or artifact custody is enabled, the owner must approve the storage provider, retention period, key rotation/escrow design, runner trust boundary, alert destination, cadence, and incident owner.

## Create a bundle in an approved non-production environment

```sh
export CALORA_BACKUP_DATABASE_URL='postgresql://...'
export CALORA_BACKUP_KEY_B64='managed-secret-value'
node scripts/recovery/create-encrypted-backup.mjs \
  --output /secure-output/calora-recovery.enc \
  --environment staging \
  --metadata /secure-input/migration-state.json \
  --storage-manifest /secure-input/storage-manifest.json \
  --provider-manifest /secure-input/provider-manifest.json
```

The database URL and key must be injected by the approved secret manager. Do not paste them into the shell history, PR, issue, workflow input, or report. The workflow must be run only against an owner-approved non-production or backup-replica endpoint until production custody is separately approved.

## Validate and restore a bundle

Validation decrypts and verifies the authenticated envelope and manifest without connecting to a database:

```sh
export CALORA_BACKUP_KEY_B64='managed-secret-value'
node scripts/recovery/restore-encrypted-backup.mjs \
  --input /secure-input/calora-recovery.enc \
  --validate-only
```

A restore requires both explicit gates:

```sh
export CALORA_BACKUP_KEY_B64='managed-secret-value'
export CALORA_RECOVERY_NONPRODUCTION=true
export CALORA_RECOVERY_TARGET_ACK=DISPOSABLE_EMPTY_NONPRODUCTION
export CALORA_RECOVERY_DATABASE_URL='postgresql://...'
node scripts/recovery/restore-encrypted-backup.mjs \
  --input /secure-input/calora-recovery.enc
```

The restore command refuses to run without the non-production acknowledgement, does not use `--clean`, does not drop or truncate tables, and uses `--exit-on-error --no-owner --no-privileges`. The target must be a newly created disposable database. After restore, run the source-controlled migration-journal, constraints, RLS, deletion-fence, tenant-isolation, and application-compatibility checks. Destroy the disposable database and temporary plaintext files after evidence capture.

## External-state recovery matrix

| Dependency | Required evidence | Database dump covers it? |
|---|---|---:|
| PostgreSQL schema/data | Encrypted archive, checksum, migration journal state, restore validation | Yes, subject to restore test |
| Recipe-photo object storage | Sanitized object count/checksum manifest and isolated object restore | No |
| Supabase Auth/configuration | Provider configuration attestation and redirect/MFA/password posture | No |
| RevenueCat subscriptions/entitlements | Provider-state reconciliation and catalog/webhook manifest | No |
| Railway source/configuration | Release branch, service source, variables, domains, deployment attestation | No |
| AI/provider credentials | Secret-manager ownership and rotation record | No |

## Owner approvals still required

1. Approve production backup custody, schedule, retention, encryption-key escrow, rotation, and alert destination.
2. Provide the secret-manager binding for `CALORA_RECOVERY_DATABASE_URL` and `CALORA_RECOVERY_BACKUP_KEY_B64`; do not provide either value in chat or repository files.
3. Approve a sanitized storage manifest and a provider-state manifest format.
4. Approve one restore rehearsal from an authorized backup artifact into a disposable environment.
5. Approve any production RLS role/grant migration separately. This branch does not apply the staged security migration to production.

Until those approvals and provider-side records exist, CAL-17 remains blocked even if the isolated dump/restore rehearsal passes.
