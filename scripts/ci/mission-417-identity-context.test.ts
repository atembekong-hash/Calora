import assert from "node:assert/strict";
import { createIdentityAssertion, verifyIdentityAssertion, withSignedDatabaseIdentity } from "../../artifacts/security/mission-417/identity-context";

const now = 1_700_000_000;
const secret = "disposable-secret";
const assertion = createIdentityAssertion("user_alpha", secret, now, 60);
assert.equal(verifyIdentityAssertion(assertion, secret, now), "user_alpha");
assert.equal(verifyIdentityAssertion(assertion, "wrong-secret", now), null);
assert.equal(verifyIdentityAssertion(assertion, secret, now + 60), null);
assert.equal(verifyIdentityAssertion(`${assertion.slice(0, -1)}0`, secret, now), null);
assert.notEqual(createIdentityAssertion("user_alpha", secret, now, 60), assertion, "each assertion must use a fresh nonce");
assert.throws(() => createIdentityAssertion("bad.user", secret, now, 60));
assert.throws(() => createIdentityAssertion("user_alpha", secret, now, 0));

const calls: string[] = [];
const client = {
  async query(sql: string, values?: unknown[]) {
    calls.push(`${sql}:${JSON.stringify(values ?? [])}`);
    if (sql === "BEGIN") return;
    if (sql === "COMMIT") return;
    if (sql === "ROLLBACK") return;
    return { rows: [] };
  },
} as any;
const value = await withSignedDatabaseIdentity(client, assertion, async () => "ok");
assert.equal(value, "ok");
assert.deepEqual(calls.map((entry) => entry.split(":")[0]), ["BEGIN", "SELECT set_config($1, $2, true)", "COMMIT"]);
const failing = { ...client, async query(sql: string, values?: unknown[]) { calls.push(`fail:${sql}`); if (sql === "BEGIN" || sql === "ROLLBACK") return; if (sql === "SELECT set_config($1, $2, true)") throw new Error("synthetic failure"); } } as any;
await assert.rejects(() => withSignedDatabaseIdentity(failing, assertion, async () => "never"));
assert.ok(calls.includes("fail:ROLLBACK"));
console.log("mission417 identity assertions: PASS (tamper, expiry, nonce, bounds, commit, rollback)");
