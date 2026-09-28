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

  it("keeps the deadline active while a successful response body is still pending", async () => {
    vi.useFakeTimers();
    setBaseUrl("https://api.example");
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        const response = {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers({ "content-type": "application/json" }),
          body: {},
          text: () => new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                const error = new Error("aborted while reading response");
                error.name = "AbortError";
                reject(error);
              },
              { once: true },
            );
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = customFetch("/api/v1/premium-recipes", {
      method: "GET",
      responseType: "json",
      timeoutMs: 5,
    }).catch((error) => error);

    await vi.advanceTimersByTimeAsync(5);

    expect(await outcome).toBeInstanceOf(ApiRequestTimeoutError);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });

  it("forwards caller cancellation while a response body is still pending", async () => {
    setBaseUrl("https://api.example");
    const externalController = new AbortController();
    let bodyReadStarted!: () => void;
    const bodyRead = new Promise<void>((resolve) => {
      bodyReadStarted = resolve;
    });
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        const response = {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers({ "content-type": "application/json" }),
          body: {},
          text: () => new Promise<string>((_resolve, reject) => {
            bodyReadStarted();
            init?.signal?.addEventListener(
              "abort",
              () => {
                const error = new Error("caller cancelled");
                error.name = "AbortError";
                reject(error);
              },
              { once: true },
            );
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = customFetch("/api/v1/premium-recipes", {
      method: "GET",
      responseType: "json",
      signal: externalController.signal,
      timeoutMs: 500,
    }).catch((error) => error);
    await bodyRead;
    externalController.abort();

    const error = await outcome;
    expect(error).toMatchObject({ name: "AbortError" });
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
