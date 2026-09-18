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
        json: async () => ({
          objects: [
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
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await eraseRecipePhotoObjects("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: expect.stringContaining('"prefix":"private/recipe-photos/user-1/"'),
    });
    expect(fetchMock.mock.calls[3][0]).toBe("https://storage.test/one");
    expect(fetchMock.mock.calls[3][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[4][1]).toMatchObject({ method: "DELETE" });
    expect(info).toHaveBeenCalledWith({ objectCount: 2 }, "Recipe photo object erasure completed");
  });

  it("fails closed when the sidecar listing is unavailable", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/list recipe photo objects/i);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});