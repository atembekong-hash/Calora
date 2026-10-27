import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { generate, markError, updateStored, toResource, signUrl, warn } =
  vi.hoisted(() => ({
    generate: vi.fn(),
    markError: vi.fn(),
    updateStored: vi.fn(),
    toResource: vi.fn((row: unknown) => row),
    signUrl: vi.fn(),
    warn: vi.fn(),
  }));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { images: { generate } },
}));

vi.mock("../lib/recipe-photo-storage.js", () => ({
  createRecipePhotoSignedUrl: signUrl,
}));

vi.mock("../lib/recipe-media.js", () => ({
  RECIPE_MEDIA_MODEL: "gpt-image-2.5-flare",
  RECIPE_MEDIA_REVIEW_PREVIEW_URL_TTL_SECS: 900,
  RECIPE_MEDIA_URL_TTL_SECS: 3600,
  buildRecipePhotoPrompt: vi.fn(() => "safe prompt"),
  issueRecipeMediaUrlState: vi.fn(),
  markRecipeMediaError: markError,
  toRecipeMediaResource: toResource,
  updateRecipeMediaStored: updateStored,
}));

vi.mock("../lib/logger.js", () => ({
  logger: { warn },
  safeErrorDetails: vi.fn(() => ({ errorClass: "test_error" })),
}));

import {
  generateClaimedRecipeMedia,
  RECIPE_MEDIA_FAILURE_CATEGORIES,
} from "../lib/recipe-media-generation.js";

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_external_id: "owner-that-must-not-be-logged",
  client_recipe_id: "qa-recipe-test",
  content_hash: "a".repeat(64),
  recipe_payload: {
    clientRecipeId: "qa-recipe-test",
    title: "Lemony lentil bowl",
    description: "A bright dinner",
    ingredients: ["lentils"],
    instructions: ["Cook."],
    dietaryContext: [],
  },
  image_id: "22222222-2222-4222-8222-222222222222",
  object_key:
    "private/recipe-photos/owner/22222222-2222-4222-8222-222222222222.png",
  model_version: "gpt-image-2.5-flare:low:1024:v1",
  prompt_version: "recipe-photo-semantic-v4-ingredient-fidelity",
  status: "generating",
  semantic_review_state: "needs_review",
  attempts: 1,
  last_error_code: null,
  last_attempt_at: new Date("2026-10-26T00:00:00.000Z"),
  url_last_issued_at: null,
  created_at: new Date("2026-10-26T00:00:00.000Z"),
  updated_at: new Date("2026-10-26T00:00:00.000Z"),
};

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

function validImage() {
  return {
    data: [{ b64_json: Buffer.from("synthetic-image").toString("base64") }],
  };
}

describe("recipe media generation diagnostics", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    generate.mockResolvedValue(validImage());
    markError.mockResolvedValue(true);
    updateStored.mockResolvedValue({ ...ROW, status: "stored" });
    signUrl.mockResolvedValue("https://storage.example/signed-put");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [
      "provider response error",
      () =>
        generate.mockRejectedValueOnce(
          new Error("provider body must not leak"),
        ),
      RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_RESPONSE,
    ],
    [
      "invalid output",
      () => generate.mockResolvedValueOnce({ data: [] }),
      RECIPE_MEDIA_FAILURE_CATEGORIES.INVALID_OUTPUT,
    ],
    [
      "storage upload error",
      () =>
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
        ),
      RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD,
    ],
    [
      "storage upload timeout",
      () => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError())),
      RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD_TIMEOUT,
    ],
    [
      "post-upload database transition error",
      () =>
        updateStored.mockRejectedValueOnce(
          new Error("database detail must not leak"),
        ),
      RECIPE_MEDIA_FAILURE_CATEGORIES.DATABASE_TRANSITION,
    ],
  ] as const)(
    "classifies %s without exposing raw details",
    async (_name, arrange, expectedCategory) => {
      arrange();

      await expect(
        generateClaimedRecipeMedia(
          "owner-that-must-not-be-logged",
          ROW as never,
        ),
      ).rejects.toBeDefined();

      expect(markError).toHaveBeenCalledWith(
        "owner-that-must-not-be-logged",
        ROW.id,
        expectedCategory,
        ROW.attempts,
      );
      const serializedLogs = JSON.stringify(warn.mock.calls);
      expect(serializedLogs).not.toContain("provider body must not leak");
      expect(serializedLogs).not.toContain("database detail must not leak");
      expect(serializedLogs).toContain(expectedCategory);
      expect(serializedLogs).toContain("retryable_error_recorded");
    },
  );

  it("classifies a provider AbortError as provider_timeout", async () => {
    generate.mockRejectedValueOnce(abortError());

    await expect(
      generateClaimedRecipeMedia("owner", ROW as never),
    ).rejects.toBeDefined();

    expect(markError).toHaveBeenCalledWith(
      "owner",
      ROW.id,
      RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_TIMEOUT,
      ROW.attempts,
    );
    expect(fetch as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("retains only bounded provider HTTP diagnostics", async () => {
    const error = Object.assign(new Error("provider body must not leak"), {
      status: 400,
      error: {
        message: "secret provider response body",
        code: "invalid_image_request",
        type: "invalid_request_error",
      },
    });
    generate.mockRejectedValueOnce(error);

    await expect(
      generateClaimedRecipeMedia("owner", ROW as never),
    ).rejects.toBeDefined();

    const serializedLogs = JSON.stringify(warn.mock.calls);
    expect(serializedLogs).toContain('"providerStatus":400');
    expect(serializedLogs).toContain("invalid_image_request");
    expect(serializedLogs).toContain("invalid_request_error");
    expect(serializedLogs).not.toContain("secret provider response body");
    expect(serializedLogs).not.toContain("provider body must not leak");
  });

  it("records reconciliation_unverified when the retryable state write fails", async () => {
    generate.mockRejectedValueOnce(new Error("provider failure"));
    markError.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      generateClaimedRecipeMedia("owner", ROW as never),
    ).rejects.toBeDefined();

    const serializedLogs = JSON.stringify(warn.mock.calls);
    expect(serializedLogs).toContain("reconciliation_unverified");
    expect(serializedLogs).not.toContain("database unavailable");
  });

  it("classifies a provider completion after its deadline as provider_timeout", async () => {
    vi.useFakeTimers();
    let resolveProvider!: (value: unknown) => void;
    generate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProvider = resolve;
        }),
    );

    const pending = generateClaimedRecipeMedia("owner", ROW as never);
    await vi.advanceTimersByTimeAsync(30_000);
    resolveProvider(validImage());

    await expect(pending).rejects.toBeDefined();
    expect(markError).toHaveBeenCalledWith(
      "owner",
      ROW.id,
      RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_TIMEOUT,
      ROW.attempts,
    );
  });

  it("uses one bounded generation request and records successful transition only after upload", async () => {
    await expect(
      generateClaimedRecipeMedia("owner", ROW as never),
    ).resolves.toMatchObject({
      status: "stored",
    });

    expect(generate).toHaveBeenCalledOnce();
    expect(fetch as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
    expect(updateStored).toHaveBeenCalledOnce();
    expect(markError).not.toHaveBeenCalled();
  });
});
