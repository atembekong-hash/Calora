#!/usr/bin/env bash
set -euo pipefail

# Read-only Calora workspace health check.
# This script never deletes, moves, truncates, or modifies files.

ROOT=${1:-"$(git rev-parse --show-toplevel 2>/dev/null || pwd)"}
WARN_PERCENT=${SANDBOX_WARN_PERCENT:-80}
CRITICAL_PERCENT=${SANDBOX_CRITICAL_PERCENT:-90}

if [[ ! -d "$ROOT" ]]; then
  printf 'error: workspace does not exist: %s\n' "$ROOT" >&2
  exit 2
fi

mount_point=$(df -P "$ROOT" | awk 'NR==2 {print $6}')
read -r _ blocks used available use_percent _ < <(df -P "$ROOT" | awk 'NR==2')
read -r _ inode_total inode_used inode_free inode_percent _ < <(df -Pi "$ROOT" | awk 'NR==2')

printf 'Calora sandbox health (read-only)\n'
printf 'workspace: %s\n' "$ROOT"
printf 'mount: %s\n' "$mount_point"
printf 'storage: %s used, %s available (%s)\n' "$(numfmt --to=iec --suffix=B "$((used * 1024))")" "$(numfmt --to=iec --suffix=B "$((available * 1024))")" "$use_percent"
printf 'inodes: %s used, %s free (%s)\n' "$inode_used" "$inode_free" "$inode_percent"
printf 'thresholds: warning %s%%, critical %s%%\n' "$WARN_PERCENT" "$CRITICAL_PERCENT"

percent=${use_percent%%%}
inode_percent_number=${inode_percent%%%}
status=PASS
if (( percent >= CRITICAL_PERCENT || inode_percent_number >= CRITICAL_PERCENT )); then
  status=CRITICAL
elif (( percent >= WARN_PERCENT || inode_percent_number >= WARN_PERCENT )); then
  status=WARNING
fi
printf 'status: %s\n' "$status"

printf '\nLargest immediate workspace directories (read-only estimate):\n'
du -x -d 1 -h "$ROOT" 2>/dev/null | sort -h | tail -n 12 || true

printf '\nRecommended action:\n'
case "$status" in
  PASS) printf '%s\n' 'Continue normal work; avoid creating duplicate dependency trees.' ;;
  WARNING) printf '%s\n' 'Pause large installs and inspect completed jobs, caches, and duplicate worktrees. Do not delete evidence automatically.' ;;
  CRITICAL) printf '%s\n' 'Stop dependency installs and builds. Perform the documented, owner-reviewed recovery procedure before continuing.' ;;
esac

if [[ "$status" == CRITICAL ]]; then
  exit 1
fi
