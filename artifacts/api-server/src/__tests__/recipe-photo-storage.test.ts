import { beforeEach, describe, expect, it, vi } from "vitest";

const { info } = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock("../lib/logger.js", () => ({
  logger: { info },
}));

import {
  eraseRecipePhotoObjects,
  isRecipePhotoStorageConfigured,
  recipePhotoStorageForTests,
} from "../lib/recipe-photo-storage.js";

const EMPTY_LIST = "<?xml version=\"1.0\"?><ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><IsTruncated>false</IsTruncated></ListBucketResult>";

function listXml(keys: string[], truncated = false): string {
  return `<?xml version="1.0"?><ListBucketResult><IsTruncated>${truncated}</IsTruncated>${keys.map((key) => `<Contents><Key>${key}</Key></Contents>`).join("")}</ListBucketResult>`;
}

describe("recipe photo object erasure", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RECIPE_PHOTO_BUCKET", "test-bucket");
    vi.stubEnv("RECIPE_PHOTO_STORAGE_ENDPOINT", "https://storage.example");
    vi.stubEnv("RECIPE_PHOTO_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("RECIPE_PHOTO_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("RECIPE_PHOTO_STORAGE_REGION", "auto");
    vi.stubGlobal("fetch", fetchMock);
  });

  it("reports configuration only when every required storage setting is present", () => {
    expect(isRecipePhotoStorageConfigured()).toBe(true);

    vi.stubEnv("RECIPE_PHOTO_SECRET_ACCESS_KEY", "");
    expect(isRecipePhotoStorageConfigured()).toBe(false);

    vi.stubEnv("RECIPE_PHOTO_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("RECIPE_PHOTO_ACCESS_KEY_ID", "");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "fallback-access-key");
    expect(isRecipePhotoStorageConfigured()).toBe(true);
  });

  it("lists the account prefix and deletes every listed object idempotently", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(listXml([
        "private/recipe-photos/user-1/one.png",
        "private/recipe-photos/user-1/two.png",
        "private/other-user/not-owned.png",
      ])))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(EMPTY_LIST));

    await eraseRecipePhotoObjects("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][0]).toContain("list-type=2");
    expect(fetchMock.mock.calls[0][0]).toContain("prefix=private%2Frecipe-photos%2Fuser-1%2F");
    expect(fetchMock.mock.calls[1][0]).toContain("private/recipe-photos/user-1/one.png");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "DELETE" });
    expect(info).toHaveBeenCalledWith(
      { objectCount: 2, remainingObjectCount: 0 },
      "Recipe photo object erasure completed",
    );
  });

  it("fails closed when objects remain after deletion", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(listXml(["private/recipe-photos/user-1/one.png"])))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(listXml(["private/recipe-photos/user-1/one.png"])));

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/remain after account erasure/i);
  });

  it("fails closed when the S3 listing is unavailable", async () => {
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));

    await expect(eraseRecipePhotoObjects("user-1")).rejects.toThrow(/Unable to list recipe photo objects \(503\)/);
  });

  it("rejects malformed S3 listing responses", () => {
    expect(() => recipePhotoStorageForTests.objectNamesFromS3List("not-xml", "private/recipe-photos/user-1/")).toThrow(/invalid listing/i);
  });

  it("refuses a paginated listing beyond the deletion safety bound", () => {
    expect(() => recipePhotoStorageForTests.objectNamesFromS3List(listXml([], true), "private/recipe-photos/user-1/")).toThrow(/paginated/i);
  });
});
