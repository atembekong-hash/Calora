import { afterEach, describe, expect, it, vi } from "vitest";
import {
  setAuthTokenGetter,
  setAuthTokenRefresher,
  setBaseUrl,
} from "@workspace/api-client-react";
import {
  CaptureRequestAuthenticationError,
  CaptureRequestIdentityChangedError,
  requestAuthenticatedCaptureAnalysis,
} from "../captureRequest";

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

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

function session(userId: string, accessToken: string) {
  return { user: { id: userId }, access_token: accessToken };
}

afterEach(() => {
  vi.unstubAllGlobals();
  setBaseUrl(null);
  setAuthTokenGetter(null);
  setAuthTokenRefresher(null);
  mockGetSession.mockReset();
  mockRefreshSession.mockReset();
});

describe("requestAuthenticatedCaptureAnalysis", () => {
  it("reads the current secure session instead of a stale Scan render token, then refreshes one 401", async () => {
    setBaseUrl("https://api.example");
    mockGetSession.mockResolvedValue({
      data: { session: session("account-a", "fresh-token") },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: session("account-a", "refreshed-token") },
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, analysisResponse));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-1",
        },
        "account-a",
        new AbortController().signal,
      ),
    ).resolves.toEqual(analysisResponse);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer fresh-token");
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer refreshed-token");
  });

  it("does not send a protected Scan request after the active account changes", async () => {
    setBaseUrl("https://api.example");
    mockGetSession.mockResolvedValue({
      data: { session: session("account-b", "account-b-token") },
      error: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-1",
        },
        "account-a",
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(CaptureRequestIdentityChangedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send a protected Scan request without an active account or secure session", async () => {
    expect(() =>
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-1",
        },
        null,
        new AbortController().signal,
      ),
    ).toThrow(CaptureRequestAuthenticationError);

    setBaseUrl("https://api.example");
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requestAuthenticatedCaptureAnalysis(
        {
          mode: "text",
          textInput: "one banana",
          clientCorrelationId: "capture-2",
        },
        "account-a",
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(CaptureRequestAuthenticationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
