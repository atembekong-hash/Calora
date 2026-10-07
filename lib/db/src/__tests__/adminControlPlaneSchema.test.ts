import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "../..");

describe("admin control-plane schema provenance", () => {
  it("keeps the forward migration and empty-target baseline aligned", async () => {
    const [migration, baseline] = await Promise.all([
      readFile(
        path.join(root, "migrations/0017_admin_control_plane.sql"),
        "utf8",
      ),
      readFile(
        path.join(root, "bootstrap/0000_calora_empty_target_baseline.sql"),
        "utf8",
      ),
    ]);
    for (const table of [
      "calora_coach_reports",
      "calora_admin_principals",
      "calora_admin_sessions",
      "calora_admin_audit_events",
    ]) {
      expect(migration).toContain(table);
      expect(baseline).toContain(table);
    }
    expect(migration).toContain("calora_admin_audit_events_immutable");
    expect(baseline).toContain("calora_admin_audit_events_immutable");
    expect(migration).toContain("calora_coach_v2_write_fence");
  });
});
