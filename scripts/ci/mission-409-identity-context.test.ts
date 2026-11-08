import assert from "node:assert/strict";
import test from "node:test";
import {
  createIdentityAssertion,
  verifyIdentityAssertion,
  withSignedDatabaseIdentity,
  withSignedDatabaseIdentityOnExistingTransaction,
} from "../../artifacts/security/mission-408/identity-context.ts";

test("assertions use bounded identities, cryptographic nonces, and a maximum lifetime", () => {
  const assertion = createIdentityAssertion("user_a", "secret", 1_000, 60);
  assert.equal(verifyIdentityAssertion(assertion, "secret", 1_000), "user_a");
  assert.equal(verifyIdentityAssertion(assertion, "secret", 1_060), null);
  assert.throws(() => createIdentityAssertion("user.with.dot", "secret"));
  assert.throws(() => createIdentityAssertion("user_a", "secret", 1_000, 301));
  assert.notEqual(
    createIdentityAssertion("user_a", "secret", 1_000, 60),
    createIdentityAssertion("user_a", "secret", 1_000, 60),
  );
});

test("malformed, forged, and wrong-secret assertions fail closed", () => {
  const assertion = createIdentityAssertion("user_a", "secret", 1_000, 60);
  assert.equal(verifyIdentityAssertion(assertion.replace("user_a", "user_b"), "secret", 1_000), null);
  assert.equal(verifyIdentityAssertion(assertion, "wrong", 1_000), null);
  assert.equal(verifyIdentityAssertion("not-a-token", "secret", 1_000), null);
  assert.equal(verifyIdentityAssertion(`${assertion}.extra`, "secret", 1_000), null);
});

test("top-level identity helper commits on success and rolls back on failure", async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql === "COMMIT") return {};
      if (sql === "ROLLBACK") return {};
      return {};
    },
  } as never;
  assert.equal(await withSignedDatabaseIdentity(client, "token", async () => "ok"), "ok");
  await assert.rejects(() => withSignedDatabaseIdentity(client, "token", async () => { throw new Error("boom"); }));
  assert.deepEqual(calls.filter((call) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(call)), ["BEGIN", "COMMIT", "BEGIN", "ROLLBACK"]);
});

test("nested identity helper uses a savepoint and restores the outer context", async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.startsWith("SELECT current_setting")) return { rows: [{ value: "outer-token" }] };
      return {};
    },
  } as never;
  assert.equal(await withSignedDatabaseIdentityOnExistingTransaction(client, "inner-token", async () => "nested"), "nested");
  assert(calls.includes("SAVEPOINT calora_identity_context"));
  assert(calls.includes("RELEASE SAVEPOINT calora_identity_context"));
  assert(calls.some((call) => call.startsWith("SELECT set_config")));
});
