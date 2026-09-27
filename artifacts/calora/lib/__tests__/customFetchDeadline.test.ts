import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestTimeoutError,
  customFetch,
  setAuthTokenGetter,
  setAuthTokenRefresher,
  setBaseUrl,
} from "@workspace/api-client-react";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setBaseUrl(null);
  setAuthTokenGetter(null);
  setAuthTokenRefresher(null);
});

describe("customFetch request deadlines", () => {
  it("aborts a caller-scoped request and reports a retryable timeout", async () => {
    vi.useFakeTimers();
    setBaseUrl("https://api.example");
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = customFetch("/api/v1/premium-recipes", {
      method: "GET",
      responseType: "json",
      timeoutMs: 5,
    }).catch((error) => error);

    await vi.advanceTimersByTimeAsync(5);

    expect(await outcome).toBeInstanceOf(ApiRequestTimeoutError);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(
      true,
    );
  });
});
