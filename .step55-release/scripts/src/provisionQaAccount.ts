/**
 * Provision a confirmed QA test account for Calora recipe-generation verification.
 *
 * Creates (idempotently) a single confirmed account at qa@calora.dev using the
 * Supabase Admin API.  Email confirmation is bypassed — no SMTP required.
 * The account can then be used for manual browser-flow QA or the automated
 * integration suite (recipe-generation.integration.test.ts).
 *
 * ── Prerequisites ─────────────────────────────────────────────────────────
 *   EXPO_PUBLIC_SUPABASE_URL      — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — Admin/service-role key (add as Replit secret)
 *   CALORA_SIGNUP_TEST_PASSWORD   — Password for the QA account
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *   pnpm --filter @workspace/scripts exec tsx src/provisionQaAccount.ts
 *
 * ── Manual QA flow after provisioning ─────────────────────────────────────
 *   1. Open the Calora mobile preview in the browser.
 *   2. Go to Profile → Sign In (or the auth screen).
 *   3. Enter email: qa@calora.dev and the password from CALORA_SIGNUP_TEST_PASSWORD.
 *   4. Navigate to Recipes → Create.
 *   5. Enter a concept (e.g. "quick lemon chicken") and submit.
 *   6. Verify three idea cards appear (no 401 error banner).
 *   7. Tap one card to generate the full recipe.
 *   8. Verify the recipe saves to My Recipes with no third-party attribution row.
 */

export {};  // make this file a module so top-level await is valid

const QA_EMAIL = "qa@calora.dev";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.CALORA_SIGNUP_TEST_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error("Missing required environment variables:");
  if (!url) console.error("  EXPO_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("  SUPABASE_SERVICE_ROLE_KEY  ← add this as a Replit secret");
  if (!password) console.error("  CALORA_SIGNUP_TEST_PASSWORD");
  process.exit(1);
}

const adminHeaders = {
  "Content-Type": "application/json",
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

// ── Check if the QA account already exists ────────────────────────────────

async function listUsers(): Promise<{ id: string; email: string; email_confirmed_at?: string }[]> {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
    headers: adminHeaders,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to list users (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { users?: { id: string; email: string; email_confirmed_at?: string }[] };
  return data.users ?? [];
}

async function createUser(email: string, pwd: string): Promise<{ id: string }> {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: pwd, email_confirm: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create user (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return data;
}

// ── Main ──────────────────────────────────────────────────────────────────

const users = await listUsers();
const existing = users.find((u) => u.email === QA_EMAIL);

if (existing) {
  const confirmed = existing.email_confirmed_at ? "✓ confirmed" : "✗ not confirmed";
  console.log(`QA account already exists (${confirmed}).`);
  if (!existing.email_confirmed_at) {
    console.log("\nNote: account is not yet confirmed. Re-run this script to confirm it.");
    // Re-confirm by updating the user
    const res = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ email_confirm: true }),
    });
    if (res.ok) console.log("Account has been confirmed.");
    else console.error("Could not confirm the account:", await res.text());
  }
} else {
  await createUser(QA_EMAIL, password);
  console.log("QA account created and confirmed.");
}

console.log("\nNext steps:");
console.log("  • For automated integration tests, ensure SUPABASE_SERVICE_ROLE_KEY is set as a Replit secret,");
console.log("    then run: pnpm --filter @workspace/api-server test recipe-generation.integration");
console.log("  • For manual QA, sign in to the Calora preview as qa@calora.dev and follow the flow");
console.log("    documented at the top of scripts/src/provisionQaAccount.ts.");
