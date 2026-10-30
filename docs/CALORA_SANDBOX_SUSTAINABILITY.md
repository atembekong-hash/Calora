# Calora sandbox sustainability and long-term environment assessment

## Guardrail now in the repository

Run the read-only health check from the repository root:

```sh
bash tools/sandbox-health-check.sh
```

The script reports storage, inode usage, the largest immediate workspace directories, and a status. It warns at 80% utilization and returns a critical status at 90%. It never deletes, moves, truncates, or modifies files. Thresholds can be overridden for a local review with `SANDBOX_WARN_PERCENT` and `SANDBOX_CRITICAL_PERCENT`.

The check should be run before a large dependency install, after a long test or build session, and before creating a new worktree. A warning means inspect first; it is not permission to remove files.

## Safe operating procedure

Prefer one canonical Calora checkout and reuse its existing pnpm store. Do not create a new full dependency installation for every task. Use temporary directories only for short-lived compatibility experiments, and remove only those directories after confirming that no process uses them and that any unique output has been preserved.

Treat the following as protected by default: the active checkout, all Git branches and worktrees with uncommitted changes, uploaded attachments, QA evidence, reports, manifests, checksums, and archives. Do not automatically delete any of them.

Completed-job directories may be considered disposable only after all of these checks pass:

1. No active process, service, or job references the directory.
2. It is not the canonical checkout or an active worktree.
3. It contains no uncommitted source or unique evidence.
4. Any required outputs have been copied to a verified archive with a checksum.
5. The owner has authorized the cleanup when the action is destructive.

Keep generated screenshots, browser HTML, logs, test output, and reports in a task-specific directory. Before cleanup, retain a compact index and checksum manifest for important evidence. Prefer compression and split archives for transfer, but preserve the original archive until the transfer checksum has been verified.

## Recovery procedure

When the health check reaches warning level, stop creating duplicate dependencies and inspect `df -Pi`, `du -x --inodes`, active processes, worktrees, and job directories. Preserve uncommitted work before any cleanup. When it reaches critical level, stop installs and builds, archive unique evidence, obtain owner approval for destructive cleanup, remove only verified disposable dependency trees or caches, and remeasure before resuming.

If the sandbox repeatedly approaches the critical threshold, move the reusable development checkout to a persistent environment rather than repeatedly expanding temporary task state. Keep GitHub as the source of truth and maintain an independent backup of important evidence.

## Long-term environment assessment

The current Manus Sandbox is adequate for normal Calora source work when one checkout and one dependency graph are reused. It is isolated per task, can sleep and wake without changing files, and may be recycled after inactivity; intermediate temporary files are not guaranteed to be restored after recycling. Important artifacts and uploaded files are restored according to Manus's sandbox lifecycle documentation.

A Manus Cloud Computer is a separate persistent Ubuntu Server 24.04 LTS VM. Official published tiers are Basic at $10/month with 2 vCPUs, 1 GB RAM, and 35 GB storage; Standard at $30/month with 2 vCPUs, 4 GB RAM, and 70 GB storage; and Advanced at $50/month with 2 vCPUs, 8 GB RAM, and 120 GB storage. Additional storage is documented at $1/month per 10 GB up to 1 TB. Cloud Computers have no GPU. An active subscription is required; after cancellation, the VM is suspended and its data is permanently deleted after the documented grace period unless reactivated. Daily snapshots and manual backups are documented in Manus's Cloud Computer reference.

For Calora, Standard is the minimum sensible Cloud Computer tier if a persistent shared dependency tree and long-running development services are required. Advanced is preferable only if Metro, tests, and other concurrent processes regularly exceed 4 GB RAM. The account-specific device listing currently exposes a Cloud Computer, but it is marked `cloud_pc_sidecar_only` and is not switchable from this task. No purchase, attachment, migration, or paid action was performed.

## Recommendation

Do not rent a Manus Cloud Computer yet solely to solve the recent inode incident. The incident was recoverable, the 150,000-free-inode target was restored, and the new read-only check provides an early warning. Reassess after several large Calora tasks. If the project requires a persistent shared checkout, autonomous background services, or repeated cold-install avoidance, a Standard Cloud Computer is the most integrated paid option; it provides persistence and Manus access but still requires backup discipline and has only 70 GB included storage.

An external VM is potentially cheaper or larger, but it adds provider administration, SSH/firewall hardening, backups, monitoring, and integration work. For reference, DigitalOcean currently lists a Basic 2-vCPU/4-GiB/80-GB Droplet at $24/month, while AWS Lightsail lists a Linux 2-vCPU/4-GiB/80-GB bundle at $44/month. Those services are unmanaged infrastructure choices compared with Manus's integrated agent workflow. Hetzner lists lower-cost development servers, but exact configuration and regional availability should be verified at purchase time.

The recommended sequence is therefore: keep the current sandbox with the guardrails in this document; keep GitHub and verified archives as the recovery sources; use the existing user desktop when a persistent local checkout is sufficient; and consider a paid Cloud Computer only after measuring repeated warning-level events or a concrete need for persistent services.
