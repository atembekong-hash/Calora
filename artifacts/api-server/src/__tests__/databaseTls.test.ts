import { afterAll, describe, expect, it } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalMigrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;
process.env.DATABASE_URL =
  "postgresql://fixture:fixture@localhost:5432/fixture?sslmode=disable";
delete process.env.MIGRATION_DATABASE_URL;

const { buildDatabasePoolConfig, getMigrationDatabaseUrl, pool } = await import("@workspace/db");

afterAll(async () => {
  await pool.end();
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalMigrationDatabaseUrl === undefined) {
    delete process.env.MIGRATION_DATABASE_URL;
  } else {
    process.env.MIGRATION_DATABASE_URL = originalMigrationDatabaseUrl;
  }
});

describe("database TLS configuration", () => {
  it("pins the Supabase pooler CA while retaining hostname verification", () => {
    const config = buildDatabasePoolConfig(
      "postgresql://runtime:fixture@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require",
    );

    expect(config.connectionString).not.toContain("sslmode=");
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(config.ssl?.ca).toContain("BEGIN CERTIFICATE");
  });

  it("does not inject the Supabase CA for another database host", () => {
    const config = buildDatabasePoolConfig(
      "postgresql://runtime:fixture@db.internal.example:5432/calora?sslmode=require",
    );

    expect(config.connectionString).toContain("sslmode=verify-full");
    expect(config.ssl).toBeUndefined();
  });

  it("uses a dedicated migration credential when one is configured", () => {
    process.env.MIGRATION_DATABASE_URL =
      "postgresql://migrator:fixture@localhost:5432/calora_migrations?sslmode=disable";

    expect(getMigrationDatabaseUrl()).toContain("calora_migrations");
    expect(getMigrationDatabaseUrl()).not.toBe(process.env.DATABASE_URL);
  });

  it("fails closed when production migration credentials are absent", () => {
    const nodeEnv = process.env.NODE_ENV;
    const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;
    process.env.NODE_ENV = "production";
    delete process.env.MIGRATION_DATABASE_URL;

    try {
      expect(getMigrationDatabaseUrl).toThrow("MIGRATION_DATABASE_URL must be set");
    } finally {
      if (nodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = nodeEnv;
      }
      if (migrationDatabaseUrl === undefined) {
        delete process.env.MIGRATION_DATABASE_URL;
      } else {
        process.env.MIGRATION_DATABASE_URL = migrationDatabaseUrl;
      }
    }
  });
});
