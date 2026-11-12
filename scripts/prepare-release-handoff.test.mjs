import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges, parseNameStatus } from './prepare-release-handoff.mjs';

test('approves safe source changes and emits an exact manifest', () => {
  const result = classifyChanges([{ status: 'M', path: 'artifacts/calora/lib/foodMemory.ts' }]);
  assert.equal(result.status, 'READY_FOR_RELEASE_PR');
  assert.deepEqual(result.manifest, [{ status: 'M', path: 'artifacts/calora/lib/foodMemory.ts' }]);
});

test('blocks protected configuration and emits no promotion manifest', () => {
  const result = classifyChanges([
    { status: 'M', path: 'artifacts/calora/lib/foodMemory.ts' },
    { status: 'M', path: 'artifacts/calora/app.json' },
  ]);
  assert.equal(result.status, 'ACTION_REQUIRED');
  assert.deepEqual(result.manifest, []);
  assert.deepEqual(result.blocked, [{ status: 'M', path: 'artifacts/calora/app.json' }]);
});

test('ignores the handoff workflow and detector themselves', () => {
  const result = classifyChanges([
    { status: 'M', path: '.github/workflows/calora-release-handoff.yml' },
    { status: 'M', path: 'scripts/prepare-release-handoff.mjs' },
  ]);
  assert.equal(result.status, 'UP_TO_DATE');
  assert.deepEqual(result.manifest, []);
});

test('preserves safe deleted files in the manifest for git rm', () => {
  const result = classifyChanges([{ status: 'D', path: 'artifacts/calora/lib/legacyScan.ts' }]);
  assert.equal(result.status, 'READY_FOR_RELEASE_PR');
  assert.deepEqual(result.manifest, [{ status: 'D', path: 'artifacts/calora/lib/legacyScan.ts' }]);
});

test('parses rename and deletion name-status records safely', () => {
  assert.deepEqual(
    parseNameStatus('M\tartifacts/calora/lib/foodMemory.ts\nD\tartifacts/calora/lib/old.ts\nR100\tartifacts/calora/lib/a.ts\tartifacts/calora/lib/b.ts\n'),
    [
      { status: 'M', path: 'artifacts/calora/lib/foodMemory.ts' },
      { status: 'D', path: 'artifacts/calora/lib/old.ts' },
      { status: 'R', path: 'artifacts/calora/lib/b.ts' },
    ],
  );
});
