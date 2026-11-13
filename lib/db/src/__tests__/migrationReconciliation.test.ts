import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "../..");
const migrationPath = path.join(
  root,
  "migrations/0023_successful_feature_allowances.sql",
);
const expectedHash =
  "f48b43fc930142706f25babeeee9a56e86db2ffa78a375a3ff3aba83f0c899e1";

describe("migration 0023 reconciliation", () => {
  it("uses the exact immutable migration identity and schema guard", async () => {
    const [migration, runner] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(path.join(root, "src/migrate.ts"), "utf8"),
    ]);

    expect(
      createHash("sha256")
        .update(migration.replace(/\r\n/g, "\n"))
        .digest("hex"),
    ).toBe(expectedHash);
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS calora_feature_usage");
    expect(runner).toContain(expectedHash);
    expect(runner).toContain("calora_feature_usage");
    expect(runner).toContain("calora_feature_usage_day_idx");
    expect(runner).toContain(
      "INSERT INTO ${migrationsSchema}.${migrationsTable}",
    );
  });
});
