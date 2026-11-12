import { appendFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.env.RELEASE_BASE_REF ?? 'origin/release/calora-production';
const head = process.env.RELEASE_HEAD_REF ?? 'origin/main';
const reportPath = process.env.GITHUB_STEP_SUMMARY;
const outputPath = process.env.RELEASE_HANDOFF_REPORT ?? 'release-handoff-report.md';
const ignored = new Set(['.github/workflows/calora-release-handoff.yml', 'scripts/prepare-release-handoff.mjs']);
const files = execFileSync('git', ['diff', '--name-only', `${base}..${head}`], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).filter((file) => !ignored.has(file));
const safeRoots = ['artifacts/calora/app/', 'artifacts/calora/components/', 'artifacts/calora/lib/', 'artifacts/api-server/', 'artifacts/fatsecret-gateway/', 'packages/', 'shared/'];
const blockedPatterns = [/^\.github\//, /(^|\/)app\.json$/, /(^|\/)(android|ios|eas\.json)(\/|$)/i, /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock)$/, /(^|\/)(migrations?|supabase|railway|infra)(\/|$)/i];
const blocked = files.filter((file) => blockedPatterns.some((pattern) => pattern.test(file)) || !safeRoots.some((root) => file.startsWith(root)));
const safe = files.filter((file) => !blocked.includes(file));
const status = files.length === 0 ? 'UP_TO_DATE' : blocked.length ? 'ACTION_REQUIRED' : 'READY_FOR_RELEASE_PR';
const lines = [
  '# Calora release handoff',
  `- Generated: ${new Date().toISOString()}`,
  `- Main: ${head}`,
  `- Production release: ${base}`,
  `- Status: **${status}**`,
  `- Changed files: ${files.length}`,
  '',
  '## Changed files',
  ...(files.length ? files.map((file) => `- ${file}${blocked.includes(file) ? ' — blocked from automatic promotion' : ''}`) : ['- None']),
];
if (blocked.length) lines.push('', '## Required owner decision', '- Production release drift includes protected configuration, native metadata, dependency, database, or otherwise unallowlisted changes. No release PR was created.', '- Review and split the intended production change before promotion.');
if (reportPath) appendFileSync(reportPath, `${lines.join('\n')}\n`);
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\nchanged_count=${files.length}\nsafe_count=${safe.length}\nblocked_count=${blocked.length}\n`);
console.log(JSON.stringify({ status, changed: files, safe, blocked }, null, 2));
