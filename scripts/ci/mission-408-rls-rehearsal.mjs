import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable rehearsal");
const secret = "mission-408-disposable-secret";
const now = Math.floor(Date.now() / 1000);

function assertion(externalUserId, expiresAt = now + 60, nonce = `${externalUserId}-${Math.random()}`) {
  const payload = `${externalUserId}.${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

async function query(client, text, params = []) {
  return client.query(text, params);
}

async function asRole(client, token, operation) {
  await query(client, "BEGIN");
  try {
    await query(client, "SET LOCAL ROLE calora_api_runtime_rls");
    if (token !== undefined) {
      await query(client, "SELECT set_config($1, $2, true)", ["calora.identity_token", token]);
    }
    const result = await operation();
    await query(client, "COMMIT");
    return result;
  } catch (error) {
    await query(client, "ROLLBACK");
    return { error };
  }
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await query(client, "GRANT calora_api_runtime_rls TO CURRENT_USER");
  await query(client, "INSERT INTO public.calora_identity_assertion_secrets(secret_key, secret_value) VALUES ('active', $1)", [secret]);
  const users = await query(client, `
    INSERT INTO public.calora_users(external_id, email, display_name)
    VALUES ('mission408-user-a', 'a@example.test', 'A'), ('mission408-user-b', 'b@example.test', 'B'), ('mission408-user-c', 'c@example.test', 'C')
    RETURNING external_id, id
  `);
  const userA = users.rows.find((row) => row.external_id === "mission408-user-a").id;
  const userB = users.rows.find((row) => row.external_id === "mission408-user-b").id;
  const userC = users.rows.find((row) => row.external_id === "mission408-user-c").id;
  await query(client, "INSERT INTO public.calora_diary_entries(user_id, entry_date, meal, name, serving, calories, protein_g, carbs_g, fat_g, provenance, confidence, client_updated_at) VALUES ($1, CURRENT_DATE, 'lunch', 'A meal', '1 serving', 100, 10, 10, 2, 'mission408', 100, now())", [userA]);
  await query(client, "INSERT INTO public.calora_diary_entries(user_id, entry_date, meal, name, serving, calories, protein_g, carbs_g, fat_g, provenance, confidence, client_updated_at) VALUES ($1, CURRENT_DATE, 'lunch', 'B meal', '1 serving', 200, 20, 20, 4, 'mission408', 100, now())", [userB]);
  await query(client, "INSERT INTO public.calora_diary_entries(user_id, entry_date, meal, name, serving, calories, protein_g, carbs_g, fat_g, provenance, confidence, client_updated_at) VALUES ($1, CURRENT_DATE, 'lunch', 'C meal', '1 serving', 300, 30, 30, 6, 'mission408', 100, now())", [userC]);

  const tokenA = assertion("mission408-user-a", now + 60, "nonce-a-12345678");
  const tokenB = assertion("mission408-user-b", now + 60, "nonce-b-12345678");
  const tokenC = assertion("mission408-user-c", now + 60, "nonce-c-12345678");
  const expired = assertion("mission408-user-a", now - 1, "nonce-expired-123");
  const forged = "mission408-user-b." + (now + 60) + ".nonce-forged-123." + "0".repeat(64);

  const ownerRead = await asRole(client, tokenA, () => query(client, "SELECT name FROM public.calora_diary_entries ORDER BY name"));
  assert.deepEqual(ownerRead.rows.map((row) => row.name), ["A meal"]);

  const verifiedIdentity = await asRole(client, tokenA, () => query(client, "SELECT public.calora_current_external_user_id() AS external_id"));
  assert.equal(verifiedIdentity.rows[0].external_id, "mission408-user-a");

  const crossUserRead = await asRole(client, tokenA, () => query(client, "SELECT external_id FROM public.calora_users WHERE external_id = 'mission408-user-b'"));
  assert.deepEqual(crossUserRead.rows, []);

  const crossRead = await asRole(client, tokenA, () => query(client, "SELECT name FROM public.calora_diary_entries WHERE user_id = $1", [userB]));
  assert.deepEqual(crossRead.rows, []);

  const crossInsert = await asRole(client, tokenA, () => query(client, "INSERT INTO public.calora_diary_entries(user_id, entry_date, meal, name, serving, calories, protein_g, carbs_g, fat_g, provenance, confidence, client_updated_at) VALUES ($1, CURRENT_DATE, 'dinner', 'forged insert', '1', 1, 1, 1, 1, 'mission408', 100, now())", [userB]));
  assert(crossInsert.error, "cross-user insert must fail");

  const crossUpdate = await asRole(client, tokenA, () => query(client, "UPDATE public.calora_diary_entries SET name = 'forged update' WHERE user_id = $1", [userB]));
  assert(!crossUpdate.error && crossUpdate.rowCount === 0, "cross-user update must affect zero rows");

  const crossDelete = await asRole(client, tokenA, () => query(client, "DELETE FROM public.calora_diary_entries WHERE user_id = $1", [userB]));
  assert(!crossDelete.error && crossDelete.rowCount === 0, "cross-user delete must affect zero rows");

  const missingContext = await asRole(client, undefined, () => query(client, "SELECT name FROM public.calora_diary_entries"));
  assert.deepEqual(missingContext.rows, []);

  const expiredContext = await asRole(client, expired, () => query(client, "SELECT name FROM public.calora_diary_entries"));
  assert.deepEqual(expiredContext.rows, []);

  const forgedContext = await asRole(client, forged, () => query(client, "SELECT name FROM public.calora_diary_entries"));
  assert.deepEqual(forgedContext.rows, []);

  const beforeReuse = await asRole(client, tokenA, () => query(client, "SELECT count(*)::int AS count FROM public.calora_diary_entries"));
  assert.equal(beforeReuse.rows[0].count, 1);
  const afterReuse = await asRole(client, undefined, () => query(client, "SELECT count(*)::int AS count FROM public.calora_diary_entries"));
  assert.equal(afterReuse.rows[0].count, 0, "transaction-local context must not leak through the pool");

  const sharedRead = await asRole(client, tokenA, () => query(client, "SELECT count(*)::int AS count FROM public.calora_food_items"));
  assert.equal(sharedRead.rows[0].count, 0);

  const sharedWrite = await asRole(client, tokenA, () => query(client, "INSERT INTO public.calora_food_items DEFAULT VALUES"));
  assert(sharedWrite.error, "shared reference data must not be writable by the runtime role");

  const serverTableRead = await asRole(client, tokenA, () => query(client, "SELECT * FROM public.calora_server_config"));
  assert(serverTableRead.error, "server-owned operational state must not be directly readable by the runtime role");

  const anonymousRole = await query(client, "SELECT has_table_privilege('anon', 'public.calora_diary_entries', 'SELECT') AS can_select");
  assert.equal(anonymousRole.rows[0].can_select, false);
  const bypass = await query(client, "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'calora_api_runtime_rls'");
  assert.equal(bypass.rows[0].rolbypassrls, false);
  const owner = await query(client, "SELECT pg_get_userbyid(relowner) AS owner FROM pg_class WHERE oid = 'public.calora_diary_entries'::regclass");
  assert.notEqual(owner.rows[0].owner, "calora_api_runtime_rls");

  const bRead = await asRole(client, tokenB, () => query(client, "SELECT name FROM public.calora_diary_entries ORDER BY name"));
  assert.deepEqual(bRead.rows.map((row) => row.name), ["B meal"]);

  const cRead = await asRole(client, tokenC, () => query(client, "SELECT name FROM public.calora_diary_entries ORDER BY name"));
  assert.deepEqual(cRead.rows.map((row) => row.name), ["C meal"]);

  const aCannotTouchC = await asRole(client, tokenA, () => query(client, "DELETE FROM public.calora_diary_entries WHERE user_id = $1", [userC]));
  assert(!aCannotTouchC.error && aCannotTouchC.rowCount === 0, "user A must not delete user C data");

  const concurrentA = new Client({ connectionString: databaseUrl });
  const concurrentB = new Client({ connectionString: databaseUrl });
  await Promise.all([concurrentA.connect(), concurrentB.connect()]);
  try {
    const concurrent = await Promise.all([
      asRole(concurrentA, tokenA, () => query(concurrentA, "SELECT count(*)::int AS count FROM public.calora_diary_entries")),
      asRole(concurrentB, tokenB, () => query(concurrentB, "SELECT count(*)::int AS count FROM public.calora_diary_entries")),
    ]);
    assert.equal(concurrent[0].rows[0].count, 1);
    assert.equal(concurrent[1].rows[0].count, 1);
  } finally {
    await Promise.all([concurrentA.end(), concurrentB.end()]);
  }

  console.log(JSON.stringify({
    anonymous: "PASS",
    owner_access: "PASS",
    cross_user_read: "PASS",
    cross_user_insert: "PASS",
    cross_user_update: "PASS",
    cross_user_delete: "PASS",
    missing_context: "PASS",
    forged_context: "PASS",
    expired_context: "PASS",
    pooled_context_reset: "PASS",
    shared_read: "PASS",
    runtime_no_bypass: "PASS",
    runtime_not_owner: "PASS",
    concurrent_contexts: "PASS",
    tests: 20,
  }));
} finally {
  await client.end();
}
