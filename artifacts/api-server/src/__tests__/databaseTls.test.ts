import { afterAll, describe, expect, it } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL =
  "postgresql://fixture:fixture@localhost:5432/fixture?sslmode=disable";

const { buildDatabasePoolConfig, pool } = await import("@workspace/db");

afterAll(async () => {
  await pool.end();
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
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
});
