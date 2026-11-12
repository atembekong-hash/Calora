import { appendFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const IGNORED_FILES = new Set([
  '.github/workflows/calora-release-handoff.yml',
  'scripts/prepare-release-handoff.mjs',
]);

export const SAFE_ROOTS = [
  'artifacts/calora/app/',
  'artifacts/calora/components/',
  'artifacts/calora/lib/',
  'artifacts/api-server/',
  'artifacts/fatsecret-gateway/',
  'packages/',
  'shared/',
];

export const BLOCKED_PATTERNS = [
  /^\.github\//,
  /(^|\/)app\.json$/,
  /(^|\/)(android|ios|eas\.json)(\/|$)/i,
  /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /(^|\/)(migrations?|supabase|railway|infra)(\/|$)/i,
];

export function parseNameStatus(output) {
  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [rawStatus, ...paths] = line.split('\t');
      const status = rawStatus[0];
      const path = status === 'R' || status === 'C' ? paths[paths.length - 1] : paths[0];
      return { status, path };
    })
    .filter(({ path }) => Boolean(path));
}

export function classifyChanges(changes) {
  const files = changes.filter(({ path }) => !IGNORED_FILES.has(path));
  const blocked = files.filter(({ path }) =>
    BLOCKED_PATTERNS.some((pattern) => pattern.test(path)) ||
    !SAFE_ROOTS.some((root) => path.startsWith(root)),
  );
  const safe = files.filter(({ path }) => !blocked.some((item) => item.path === path));
  const status = files.length === 0 ? 'UP_TO_DATE' : blocked.length ? 'ACTION_REQUIRED' : 'READY_FOR_RELEASE_PR';
  return {
    status,
    changed: files,
    safe,
    blocked,
    manifest: status === 'READY_FOR_RELEASE_PR' ? safe : [],
  };
}

function gitChanges(base, head) {
  return parseNameStatus(execFileSync('git', ['diff', '--name-status', '--find-renames', `${base}..${head}`], { encoding: 'utf8' }));
}

export function runDetector({
  base = process.env.RELEASE_BASE_REF ?? 'origin/release/calora-production',
  head = process.env.RELEASE_HEAD_REF ?? 'origin/main',
  reportPath = process.env.RELEASE_HANDOFF_REPORT,
  outputPath = process.env.RELEASE_HANDOFF_MANIFEST ?? 'release-handoff-manifest.json',
  changes = gitChanges(base, head),
} = {}) {
  const result = classifyChanges(changes);
  const reportLines = [
    '# Calora release handoff',
    `- Generated: ${new Date().toISOString()}`,
    `- Main: ${head}`,
    `- Production release: ${base}`,
    `- Status: **${result.status}**`,
    `- Changed files: ${result.changed.length}`,
    '',
    '## Changed files',
    ...(result.changed.length
      ? result.changed.map(({ status, path }) => `- ${status} ${path}${result.blocked.some((item) => item.path === path) ? ' — blocked from automatic promotion' : ''}`)
      : ['- None']),
  ];
  if (result.blocked.length) {
    reportLines.push('', '## Required owner decision', '- Release drift contains unallowlisted changes. No release PR was created.', '- Review and split the intended production change before promotion.');
  }
  const manifest = {
    version: 1,
    base,
    head,
    status: result.status,
    files: result.manifest,
  };
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (reportPath) appendFileSync(reportPath, `${reportLines.join('\n')}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${result.status}\nchanged_count=${result.changed.length}\nsafe_count=${result.safe.length}\nblocked_count=${result.blocked.length}\nmanifest=${outputPath}\n`);
  }
  return { ...result, manifest, report: reportLines.join('\n') };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  console.log(JSON.stringify(runDetector(), null, 2));
}
