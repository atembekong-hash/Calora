import { describe, expect, it } from "vitest";
import {
  getAllowedCorsOrigins,
  isCorsOriginAllowed,
} from "../lib/cors-policy";

describe("production CORS policy", () => {
  it("allows native, server-to-server, and same-process requests without Origin", () => {
    expect(isCorsOriginAllowed(undefined, "production")).toBe(true);
  });

  it("allows the verified published Calora origin", () => {
    expect(
      isCorsOriginAllowed(
        "https://calorie-coach-pie35449.replit.app",
        "production",
      ),
    ).toBe(true);
  });

  it("rejects untrusted browser origins in production", () => {
    expect(
      isCorsOriginAllowed("https://attacker.example", "production"),
    ).toBe(false);
  });

  it("supports additional explicit HTTPS origins", () => {
    expect(
      isCorsOriginAllowed(
        "https://staging.example.com",
        "production",
        "https://staging.example.com",
      ),
    ).toBe(true);
  });

  it("rejects configured URLs that are not HTTPS origins", () => {
    expect(() => getAllowedCorsOrigins("http://example.com")).toThrow(
      "Expected an HTTPS origin",
    );
    expect(() => getAllowedCorsOrigins("https://example.com/path")).toThrow(
      "Expected an HTTPS origin",
    );
  });
});