import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteRevenueCatSubscriber,
  grantPromoDays,
  hasActivePremiumEntitlement,
  RevenueCatProviderError,
} from "../lib/revenuecat";

const fetchMock = vi.hoisted(() => vi.fn());
const originalProjectId = process.env.REVENUECAT_PROJECT_ID;
const originalEntitlementApiKey = process.env.REVENUECAT_ENTITLEMENT_API_KEY;
const originalSecretApiKey = process.env.REVENUECAT_SECRET_API_KEY;
const originalTestOrigin = process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.REVENUECAT_PROJECT_ID = "project-123";
  process.env.REVENUECAT_ENTITLEMENT_API_KEY = "test-entitlement-read-secret";
  process.env.REVENUECAT_SECRET_API_KEY = "test-server-secret";
  process.env.NODE_ENV = "test";
  delete process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  if (originalProjectId === undefined) delete process.env.REVENUECAT_PROJECT_ID;
  else process.env.REVENUECAT_PROJECT_ID = originalProjectId;
  if (originalEntitlementApiKey === undefined) delete process.env.REVENUECAT_ENTITLEMENT_API_KEY;
  else process.env.REVENUECAT_ENTITLEMENT_API_KEY = originalEntitlementApiKey;
  if (originalSecretApiKey === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
  else process.env.REVENUECAT_SECRET_API_KEY = originalSecretApiKey;
  if (originalTestOrigin === undefined) delete process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN;
  else process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = originalTestOrigin;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hasActivePremiumEntitlement", () => {
  it("uses only a clean loopback HTTPS override during an explicit test runtime", async () => {
    process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = "https://127.0.0.1:9443";
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }] }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(hasActivePremiumEntitlement("staging-user")).resolves.toBe(false);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://127.0.0.1:9443/v2/projects/project-123/entitlements?limit=100",
    );
  });

  it.each([
    "http://127.0.0.1:9443",
    "https://example.test",
    "https://127.0.0.1:9443/path",
    "https://user:pass@127.0.0.1:9443",
    "https://127.0.0.1:9443?redirect=1",
  ])("rejects an unsafe test provider origin: %s", async (origin) => {
    process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = origin;
    await expect(hasActivePremiumEntitlement("staging-user")).rejects.toMatchObject({
      name: "RevenueCatConfigurationError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a test-provider origin outside an explicit test runtime", async () => {
    process.env.NODE_ENV = "production";
    process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = "https://127.0.0.1:9443";
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "entitlement-123", lookup_key: "caloraapp_pro" }] }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(hasActivePremiumEntitlement("staging-user")).resolves.toBe(false);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.revenuecat.com/v2/projects/project-123/entitlements?limit=100",
    );
  });

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
        headers: expect.objectContaining({ Authorization: "Bearer test-entitlement-read-secret" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.revenuecat.com/v2/projects/project-123/customers/premium-user/active_entitlements",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer test-entitlement-read-secret" }),
      }),
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

  it("requires a separate server-owned entitlement credential", async () => {
    delete process.env.REVENUECAT_ENTITLEMENT_API_KEY;

    await expect(hasActivePremiumEntitlement("premium-user")).rejects.toBeInstanceOf(
      RevenueCatProviderError,
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
    delete process.env.REVENUECAT_ENTITLEMENT_API_KEY;
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

  it("waits for a bounded propagation window before treating a successful delete as incomplete", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    const deletion = deleteRevenueCatSubscriber("customer-123");
    await vi.runAllTimersAsync();

    await expect(deletion).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "https://api.revenuecat.com/v2/projects/project-123/customers/customer-123",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("keeps deletion retryable when the provider has not converged within the bounded verification window", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValue(jsonResponse({ id: "customer-123" }));

    const deletion = deleteRevenueCatSubscriber("customer-123");
    const rejection = expect(deletion).rejects.toThrow(
      "RevenueCat customer verification failed (customer still exists)",
    );
    await vi.runAllTimersAsync();

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("treats an absent customer as already erased", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(deleteRevenueCatSubscriber("missing-user")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails safely on provider network errors", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network unavailable"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toMatchObject({
      name: "RevenueCatUpstreamError",
    });
  });
});
