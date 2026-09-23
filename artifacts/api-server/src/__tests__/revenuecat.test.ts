import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteRevenueCatSubscriber,
  grantPromoDays,
  hasActivePremiumEntitlement,
} from "../lib/revenuecat";

const fetchMock = vi.hoisted(() => vi.fn());
const originalProjectId = process.env.REVENUECAT_PROJECT_ID;
const originalSecretApiKey = process.env.REVENUECAT_SECRET_API_KEY;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.REVENUECAT_PROJECT_ID = "project-123";
  process.env.REVENUECAT_SECRET_API_KEY = "test-server-secret";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  if (originalProjectId === undefined) delete process.env.REVENUECAT_PROJECT_ID;
  else process.env.REVENUECAT_PROJECT_ID = originalProjectId;
  if (originalSecretApiKey === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
  else process.env.REVENUECAT_SECRET_API_KEY = originalSecretApiKey;
  vi.unstubAllGlobals();
});

describe("hasActivePremiumEntitlement", () => {
  it("authorizes a customer with the configured active Premium entitlement through RevenueCat directly", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ entitlement_id: "entitlement-123", expires_at: "2099-01-01T00:00:00Z" }],
      }));

    await expect(hasActivePremiumEntitlement("premium-user")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.revenuecat.com/v2/projects/project-123/entitlements?limit=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer test-server-secret" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.revenuecat.com/v2/projects/project-123/customers/premium-user/active_entitlements",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("fails closed for an account that has no RevenueCat customer", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }],
      }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(hasActivePremiumEntitlement("new-free-user")).resolves.toBe(false);
  });

  it("requires a server-owned RevenueCat credential", async () => {
    delete process.env.REVENUECAT_SECRET_API_KEY;

    await expect(hasActivePremiumEntitlement("premium-user")).rejects.toThrow(
      "RevenueCat server credential is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("grantPromoDays", () => {
  it("sends a direct authenticated promotional entitlement grant without exposing provider diagnostics", async () => {
    const text = vi.fn().mockResolvedValue("customer=raw-user-id secret=provider-diagnostic");
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ subscriber: { entitlements: {} } }))
      .mockResolvedValueOnce({ ok: false, status: 502, text } as unknown as Response);

    const error = await grantPromoDays("raw-user-id", 30).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("RevenueCat promo grant failed (502)");
    expect(String(error)).not.toContain("raw-user-id");
    expect(text).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.revenuecat.com/v1/subscribers/raw-user-id/entitlements/caloraapp_pro/promotional",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("end_time_ms"),
      }),
    );
  });
});

describe("deleteRevenueCatSubscriber", () => {
  it("deletes through the server-authorized API and positively verifies absence", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(deleteRevenueCatSubscriber("customer-123")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.revenuecat.com/v2/projects/project-123/customers/customer-123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer test-server-secret" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.revenuecat.com/v2/projects/project-123/customers/customer-123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("treats an absent customer as already erased", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(deleteRevenueCatSubscriber("missing-user")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails safely on provider network errors", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network unavailable"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer lookup request failed",
    );
  });
});
