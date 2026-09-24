import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'app/coach.tsx'), 'utf8');

function functionBody(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate ${startMarker}`);
  return source.slice(start, end);
}

describe('Coach screen clear-history lifecycle', () => {
  it('invalidates pending Coach work before clearing visible and persisted history', () => {
    const body = functionBody('const clearConversation = () => {', 'const requestClearConversation');
    const invalidation = body.indexOf("coachSendAdapter.invalidateEpoch('client_rollback')");
    const clearPersisted = body.indexOf('clearCoachHistory()');
    const clearVisible = body.indexOf('setTurns([])');

    expect(invalidation).toBeGreaterThanOrEqual(0);
    expect(invalidation).toBeLessThan(clearPersisted);
    expect(invalidation).toBeLessThan(clearVisible);
    expect(body).toContain('sendRequestIdRef.current += 1');
    expect(body).toContain('setIsSending(false)');
  });

  it('allows only the latest request to own the sending indicator', () => {
    expect(source).toContain('const requestId = ++sendRequestIdRef.current');
    expect(source).toContain('if (requestId === sendRequestIdRef.current) setIsSending(false)');
  });
});
