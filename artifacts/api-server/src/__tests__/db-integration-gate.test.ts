import { describe, expect, it } from "vitest";
import { isDatabaseIntegrationTestEnabled } from "./db-integration-gate.js";

describe("database integration test gate", () => {
  it("does not enable database integrations for an inert non-empty URL without explicit approval", () => {
    expect(
      isDatabaseIntegrationTestEnabled({
        DATABASE_URL:
          "postgresql://calora-test:calora-test@127.0.0.1:1/calora_test",
      }),
    ).toBe(false);
  });

  it("requires both explicit approval and a database URL", () => {
    expect(
      isDatabaseIntegrationTestEnabled({
        CALORA_RUN_DB_INTEGRATION_TESTS: "true",
      }),
    ).toBe(false);
    expect(
      isDatabaseIntegrationTestEnabled({
        CALORA_RUN_DB_INTEGRATION_TESTS: "true",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:5432/calora_test",
      }),
    ).toBe(true);
  });

  it("does not treat other flag values as approval", () => {
    expect(
      isDatabaseIntegrationTestEnabled({
        CALORA_RUN_DB_INTEGRATION_TESTS: "1",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:5432/calora_test",
      }),
    ).toBe(false);
  });
});
