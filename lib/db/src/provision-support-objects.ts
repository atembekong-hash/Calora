import { pool } from "./index";

/**
 * Applies version-controlled PostgreSQL support objects after Drizzle has
 * created the typed tables. This runs only from the managed development
 * post-merge lifecycle, never from API startup or a production build.
 */
export async function provisionDatabaseSupportObjects(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`
    CREATE OR REPLACE FUNCTION calora_assert_deletion_writable(external_user_id TEXT)
    RETURNS VOID AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM calora_account_deletion_states
        WHERE identity_fingerprint = encode(digest(external_user_id, 'sha256'), 'hex')
          AND state <> 'active'
      ) THEN
        RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
      END IF;
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION calora_account_deletion_write_fence()
    RETURNS TRIGGER AS $$
    DECLARE rate_limit_user_id TEXT;
    BEGIN
      IF current_setting('calora.deletion_worker', true) = 'on' THEN
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME = 'calora_users' THEN
        PERFORM calora_assert_deletion_writable(NEW.external_id);
      ELSIF TG_TABLE_NAME = 'calora_referral_codes' THEN
        PERFORM calora_assert_deletion_writable(NEW.user_id);
      ELSIF TG_TABLE_NAME = 'calora_referral_redemptions' THEN
        PERFORM calora_assert_deletion_writable(NEW.referrer_user_id);
        PERFORM calora_assert_deletion_writable(NEW.referred_user_id);
      ELSIF TG_TABLE_NAME = 'calora_referral_qualifications' THEN
        PERFORM calora_assert_deletion_writable(NEW.external_user_id);
      ELSIF TG_TABLE_NAME = 'calora_capture_rate_limits' THEN
        rate_limit_user_id := substring(NEW.key FROM '(?:^|:)user:(.+)$');
        IF rate_limit_user_id IS NOT NULL THEN
          PERFORM calora_assert_deletion_writable(rate_limit_user_id);
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  const fencedTables = [
    "calora_users",
    "calora_referral_codes",
    "calora_referral_redemptions",
    "calora_referral_qualifications",
    "calora_capture_rate_limits",
  ];
  for (const table of fencedTables) {
    await pool.query(`DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON ${table}`);
    await pool.query(`
      CREATE TRIGGER calora_account_deletion_write_fence_trigger
      BEFORE INSERT OR UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence()
    `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  provisionDatabaseSupportObjects()
    .then(async () => {
      await pool.end();
      console.info("Calora database support objects provisioned");
    })
    .catch(async (error: unknown) => {
      await pool.end();
      console.error(error);
      process.exitCode = 1;
    });
}