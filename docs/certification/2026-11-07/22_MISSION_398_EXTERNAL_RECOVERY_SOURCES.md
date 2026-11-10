# Mission 398 — Trusted External Recovery Sources

## Railway deployment recovery

Source: https://docs.railway.com/deployments

Railway documents deployment lifecycle controls, healthchecks, restart policy, deployment actions, staged changes, deployment teardown, and deployment history as separate operational surfaces. The Railway MCP read-only deployment records for Calora show prior deployments marked `can redeploy` and `can roll back`; no rollback was invoked during Mission 398.

The Railway rollback page at https://docs.railway.com/deployments/rollback did not yield extractable page content through the stateless fetch tool, so no additional rollback semantics are claimed from that page. The available Railway `redeploy` contract can re-run the latest deployment or a specific previous deployment’s build. This is a mutation and was not called.

## Supabase backups and restore

Source: https://supabase.com/docs/guides/platform/backups

The official documentation states:

- Pro, Team, and Enterprise projects receive daily database backups.
- Pro retains seven days, Team 14 days, and Enterprise up to 30 days of daily backups.
- Free-tier projects should regularly export data using `supabase db dump` and maintain off-site backups.
- Physical backups are used for current PostgreSQL versions.
- Database backups contain database metadata but do not include objects stored through the Storage API.
- Restoring a backup restores the project database and makes the project inaccessible during the process; downtime depends on database size.
- PITR can provide recovery points with seconds-level granularity for eligible paid projects; its retention period is configurable and it replaces daily backups while enabled.
- Restoring a database does not restore deleted Storage API objects or external provider state.

## Project metadata

Supabase project `caloraapp` (`pzdulhkpwbrbrgskwwwe`) is `ACTIVE_HEALTHY`, PostgreSQL 17, region `us-west-2`. Its organization metadata reports plan `free`. Therefore paid-plan daily-backup guarantees from the official documentation do not establish coverage for Calora. No backup listing or last-successful-backup artifact was available through the authorized read-only MCP tools, and no backup was created or restored.
