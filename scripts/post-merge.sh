#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Apply immutable Drizzle migrations (never push in post-merge — push is
# non-transactional and does not maintain a migration history).
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/db run provision-support-objects
