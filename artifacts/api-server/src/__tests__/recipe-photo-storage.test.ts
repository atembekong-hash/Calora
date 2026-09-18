import { beforeEach, describe, expect, it, vi } from "vitest";

const { info } = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock("../lib/logger.js", () => ({
  logger: { info },
}));

import { eraseRecipePhotoObjects } from "../lib/recipe-photo-storage.js";

describe("recipe photo object erasure", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEFAULT_OBJECT_STORAGE_BUCKET_ID", "test-bucket");
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists the account prefix and deletes every listed object idempotently", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "google-storage-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { name: "private/recipe-photos/user-1/one.png" },
            { object_name: "private/recipe-photos/user-1/two.png" },
            { name: "private/other-user/not-owned.png" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: "https://storage.test/one" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: "https://storage.test/two" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "test-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "google-storage-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ kind: "storage#objects" }) });

    await eraseRecipePhotoObjects("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(fetchMock.mock.calls[2][0]).toContain("storage.googleapis.com/storage/v1/b/test-bucket/o?");
    expect(fetchMock.mock.calls[2][0]).toContain("prefix=private%2Frecipe-photos%2Fuser-1%2F");
    expect(fetchMock.mock.calls[5][0]).toBe("https://storage.test/one");
    expect(fetchMock.mock.calls[5][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[6][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[9][0]).toContain("storage.googleapis.com/storage/v1/b/test-bucket/o?");
    expect(info).toHaveBeenCalledWith(
      { objectCount: 2, remainingObjectCount: 0 },
      "Recipe photo object erasure completed",
    );
  });

  it("fails closed when recipe photo objects remain after deletion", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "google-storage-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ name: "private/recipe-photos/user-1/one.png" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: "https://storage.test/one" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "google-storage-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ name: "private/recipe-photos/user-1/one.png" }] }),
      });

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/remain after account erasure/i);
  });

  it("fails closed when the sidecar listing is unavailable", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/authorize recipe photo object listing/i);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects malformed Google Storage listing responses", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "test-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "google-storage-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: null }) });

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/invalid listing/i);
  });
});