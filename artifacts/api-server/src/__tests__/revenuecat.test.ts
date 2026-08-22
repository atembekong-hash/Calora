import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const proxyMock = vi.hoisted(() => vi.fn());

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = proxyMock;
  },
}));

import { hasActivePremiumEntitlement } from "../lib/revenuecat";

const originalProjectId = process.env.REVENUECAT_PROJECT_ID;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.REVENUECAT_PROJECT_ID = "project-123";
  proxyMock.mockReset();
});

afterEach(() => {
  if (originalProjectId === undefined) delete process.env.REVENUECAT_PROJECT_ID;
  else process.env.REVENUECAT_PROJECT_ID = originalProjectId;
});

describe("hasActivePremiumEntitlement", () => {
  it("allows a customer with the configured active Premium entitlement", async () => {
    proxyMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ entitlement_id: "entitlement-123", expires_at: "2099-01-01T00:00:00Z" }],
      }));

    await expect(hasActivePremiumEntitlement("premium-user")).resolves.toBe(true);
    expect(proxyMock).toHaveBeenNthCalledWith(
      1,
      "revenuecat",
      "/v2/projects/project-123/entitlements?limit=100",
      { method: "GET" },
    );
    expect(proxyMock).toHaveBeenNthCalledWith(
      2,
      "revenuecat",
      "/v2/projects/project-123/customers/premium-user/active_entitlements",
      { method: "GET" },
    );
  });

  it("denies a customer without the configured active Premium entitlement", async () => {
    proxyMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    await expect(hasActivePremiumEntitlement("free-user")).resolves.toBe(false);
  });

  it("fails closed for an account that does not yet have a RevenueCat customer", async () => {
    proxyMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(hasActivePremiumEntitlement("new-free-user")).resolves.toBe(false);
  });

  it("fails closed when RevenueCat cannot verify the customer's entitlements", async () => {
    proxyMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({ message: "unavailable" }, 503));

    await expect(hasActivePremiumEntitlement("premium-user")).rejects.toThrow(
      "RevenueCat subscriber lookup failed (503)",
    );
  });
});