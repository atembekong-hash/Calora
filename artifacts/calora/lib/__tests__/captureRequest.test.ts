import { afterEach, describe, expect, it, vi } from "vitest";
import {
  setAuthTokenGetter,
  setAuthTokenRefresher,
  setBaseUrl,
} from "@workspace/api-client-react";
import {
  CaptureRequestAuthenticationError,
  requestAuthenticatedCaptureAnalysis,
} from "../captureRequest";

const analysisResponse = {
  sessionId: "capture-1",
  clientCorrelationId: "capture-1",
  captureSessionId: null,
  mode: "text",
  status: "review",
  title: "Meal review",
  reviewMessage: "Review before adding.",
  provider: "test",
  candidates: [],
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: new Headers({ "content-type": "application/json" }),
    body: {},
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setBaseUrl(null);
  setAuthTokenGetter(null);
  setAuthTokenRefresher(null);
});

describe("requestAuthenticatedCaptureAnalysis", () => {
  it("uses the active Scan session token and preserves the shared one-time refresh retry", async () => {
    setBaseUrl("https://api.example");
    setAuthTokenGetter(() => null);
    setAuthTokenRefresher(() => "refreshed-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, analysisResponse));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await expect(
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-1",
        },
        "active-session-token",
        controller.signal,
      ),
    ).resolves.toEqual(analysisResponse);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer active-session-token");
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer refreshed-token");
  });

  it("does not send a protected capture request without an active session token", () => {
    const controller = new AbortController();
    expect(() =>
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-1",
        },
        null,
        controller.signal,
      ),
    ).toThrow(CaptureRequestAuthenticationError);
  });
});
