import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const proxyMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = proxyMock;
  },
}));

import { deleteRevenueCatSubscriber, hasActivePremiumEntitlement } from "../lib/revenuecat";

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
  proxyMock.mockReset();
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

describe("deleteRevenueCatSubscriber", () => {
  it("deletes through the server-authorized v2 API and verifies absence", async () => {
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
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.revenuecat.com/v2/projects/project-123/customers/customer-123",
      expect.objectContaining({ method: "GET" }),
    );
    expect(proxyMock).not.toHaveBeenCalled();
  });

  it("treats a missing customer as already erased", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Customer not found" }, 404));

    await expect(deleteRevenueCatSubscriber("missing-user")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails explicitly when the project is not configured", async () => {
    delete process.env.REVENUECAT_PROJECT_ID;

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat project ID is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails explicitly when the server erasure credential is not configured", async () => {
    delete process.env.REVENUECAT_SECRET_API_KEY;

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer erasure credential is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503])("surfaces lookup status %s without reporting erasure", async (status) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "unavailable" }, status));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      `RevenueCat customer lookup failed (${status})`,
    );
  });

  it("surfaces lookup network failures without reporting erasure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network unavailable"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer lookup request failed",
    );
  });

  it("surfaces lookup timeouts without reporting erasure", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer lookup timed out",
    );
  });

  it("rejects malformed lookup JSON without attempting deletion", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer lookup returned a malformed response",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects a lookup response for a different customer", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "different-customer" }));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer lookup returned a malformed response",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not report erasure when an existing customer cannot be deleted", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(jsonResponse({ message: "forbidden" }, 403));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer deletion failed (403)",
    );
  });

  it("does not treat a deletion 404 as verified erasure after finding an existing customer", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(jsonResponse({ message: "not found" }, 404));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer deletion failed (404)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not report erasure when the deletion request fails on the network", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockRejectedValueOnce(new TypeError("network unavailable"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer deletion request failed",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not report erasure when the deletion request times out", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer deletion timed out",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not report erasure when post-deletion lookup still finds the customer", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer verification failed (customer still exists)",
    );
  });

  it("does not report erasure when post-deletion verification fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "customer-123" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ message: "unavailable" }, 503));

    await expect(deleteRevenueCatSubscriber("customer-123")).rejects.toThrow(
      "RevenueCat customer verification failed (503)",
    );
  });
});